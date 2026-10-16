import sqlite3
import unittest

from metrics import database, report, seed


class OriginalRequestMetrics(unittest.TestCase):
    def setUp(self):
        self.db = database()
        seed(self.db)

    def tearDown(self):
        self.db.close()

    def test_four_originals_are_not_six_attempts(self):
        self.assertEqual(report(self.db), {
            "original_requests": 4,
            "attempts": 6,
            "retry_attempts": 2,
            "completed_file_requests": 2,
            "downloadable_requests": 1,
            "accounts_with_completed_files": 1,
            "active_original_requests": 1,
            "failed_original_requests": 1,
        })

    def test_naive_join_inflates_completed_originals(self):
        wrong = self.db.execute("""
            SELECT COUNT(*) FROM jobs AS j
            JOIN attempts AS a ON a.job_id = j.job_id
            WHERE j.status IN ('ready', 'expired')
              AND j.completed_at IS NOT NULL AND j.completed_bytes > 0
        """).fetchone()[0]
        self.assertEqual(wrong, 4)
        self.assertEqual(report(self.db)["completed_file_requests"], 2)

    def test_expiry_removes_access_not_completion_history(self):
        self.db.execute("UPDATE jobs SET status = 'expired', file_key = NULL "
                        "WHERE job_id = 'J_A'")
        result = report(self.db)
        self.assertEqual(result["completed_file_requests"], 2)
        self.assertEqual(result["downloadable_requests"], 0)
        self.assertEqual(result["accounts_with_completed_files"], 1)

    def test_request_key_is_scoped_to_account(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO jobs (job_id, account_id, request_id, status) "
                            "VALUES ('duplicate', 'account_A', 'request_1', 'queued')")
        self.db.execute("INSERT INTO jobs (job_id, account_id, request_id, status) "
                        "VALUES ('other_account', 'account_B', 'request_1', 'queued')")
        self.assertEqual(report(self.db)["original_requests"], 5)

    def test_unstarted_job_does_not_reduce_retry_count(self):
        self.db.execute("INSERT INTO jobs (job_id, account_id, request_id, status) "
                        "VALUES ('unstarted', 'account_B', 'request_5', 'queued')")
        result = report(self.db)
        self.assertEqual(result["original_requests"], 5)
        self.assertEqual(result["attempts"], 6)
        self.assertEqual(result["retry_attempts"], 2)
        self.assertEqual(result["active_original_requests"], 2)
        self.assertNotEqual(result["attempts"] - result["original_requests"],
                            result["retry_attempts"])

    def test_empty_database_has_zero_counts(self):
        empty = database()
        try:
            self.assertTrue(all(value == 0 for value in report(empty).values()))
        finally:
            empty.close()

    def test_duplicate_attempt_and_orphan_attempt_are_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO attempts VALUES ('J_A', 1, 'ready')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO attempts VALUES ('missing', 1, 'ready')")


if __name__ == "__main__":
    unittest.main()
