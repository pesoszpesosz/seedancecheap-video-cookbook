"""Synthetic SQLite example. No network, customer data, or generation calls."""

import json
import sqlite3


SCHEMA = """
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    status TEXT NOT NULL,
    completed_at TEXT,
    completed_bytes INTEGER NOT NULL DEFAULT 0,
    file_key TEXT,
    UNIQUE (account_id, request_id)
);
CREATE TABLE attempts (
    job_id TEXT NOT NULL REFERENCES jobs(job_id),
    attempt_no INTEGER NOT NULL CHECK (attempt_no > 0),
    status TEXT NOT NULL,
    PRIMARY KEY (job_id, attempt_no)
);
"""

# Each job appears once, including jobs that have not started an attempt.
# Aggregate the many-side first, then join the one-row-per-job result.
REPORT_SQL = """
WITH attempt_counts AS (
    SELECT job_id, COUNT(*) AS n
    FROM attempts
    GROUP BY job_id
), per_job AS (
    SELECT j.*, COALESCE(a.n, 0) AS attempt_count,
           CASE WHEN j.status IN ('ready', 'expired')
                      AND j.completed_at IS NOT NULL
                      AND j.completed_bytes > 0
                THEN 1 ELSE 0 END AS completed_file
    FROM jobs AS j
    LEFT JOIN attempt_counts AS a ON a.job_id = j.job_id
)
SELECT COUNT(*) AS original_requests,
       COALESCE(SUM(attempt_count), 0) AS attempts,
       COALESCE(SUM(CASE WHEN attempt_count > 1
                         THEN attempt_count - 1 ELSE 0 END), 0)
           AS retry_attempts,
       COALESCE(SUM(completed_file), 0) AS completed_file_requests,
       COALESCE(SUM(CASE WHEN completed_file = 1 AND status = 'ready'
                             AND file_key IS NOT NULL AND file_key <> ''
                        THEN 1 ELSE 0 END), 0) AS downloadable_requests,
       COUNT(DISTINCT CASE WHEN completed_file = 1 THEN account_id END)
           AS accounts_with_completed_files,
       COALESCE(SUM(CASE WHEN status IN ('queued', 'processing')
                        THEN 1 ELSE 0 END), 0) AS active_original_requests,
       COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0)
           AS failed_original_requests
FROM per_job;
"""


def database():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(SCHEMA)
    return db


def seed(db):
    db.executemany(
        "INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            ("J_A", "account_A", "request_1", "ready",
             "2026-10-01T12:00:00Z", 1000, "synthetic/a.mp4"),
            ("J_B", "account_A", "request_2", "expired",
             "2026-10-01T13:00:00Z", 2000, None),
            ("J_C", "account_B", "request_3", "failed", None, 0, None),
            ("J_D", "account_B", "request_4", "processing", None, 0, None),
        ],
    )
    db.executemany(
        "INSERT INTO attempts VALUES (?, ?, ?)",
        [("J_A", 1, "failed"), ("J_A", 2, "timeout"), ("J_A", 3, "ready"),
         ("J_B", 1, "ready"), ("J_C", 1, "failed"), ("J_D", 1, "processing")],
    )
    db.commit()


def report(db):
    return dict(db.execute(REPORT_SQL).fetchone())


if __name__ == "__main__":
    connection = database()
    seed(connection)
    print(json.dumps(report(connection), indent=2))
    connection.close()
