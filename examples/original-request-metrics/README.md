# Count original requests when your API retries a job

A retry is another execution attempt for an existing request. If a dashboard counts attempt rows as requests, one troublesome job can look like several customers or several delivered files. This small SQLite experiment makes the difference reproducible.

The fixture is invented. It contains no customer records, private production schema, API calls or video generation. Python's standard library is sufficient.

## Run the experiment

From this directory, run:

```sh
python metrics.py
python -m unittest -v
```

The first command prints:

```json
{
  "original_requests": 4,
  "attempts": 6,
  "retry_attempts": 2,
  "completed_file_requests": 2,
  "downloadable_requests": 1,
  "accounts_with_completed_files": 1,
  "active_original_requests": 1,
  "failed_original_requests": 1
}
```

The second command runs seven tests covering join inflation, expiry, account-scoped keys, a job with no attempts, empty data, and duplicate/orphan attempt rejection.

## Keep the units visible

| Original request | Account | Attempts | Current request state | Completion record | Download key now |
| --- | --- | --- | --- | --- | --- |
| J_A | account_A | failed → timeout → ready | ready | timestamp and positive bytes | present |
| J_B | account_A | ready | expired | timestamp and positive bytes | absent |
| J_C | account_B | failed | failed | absent | absent |
| J_D | account_B | processing | processing | absent | absent |

There are four original requests and six attempts. Two completed files belong to one account. The expired file still has a completion history even though it is no longer downloadable.

An account is not a verified person. A completed-file record is not a verified download, an accepted creative result, or a settled sale. This fixture is not a production success-rate estimate.

## Reproduce the counting mistake

This join counts J_A three times because J_A has three attempt rows:

```sql
SELECT COUNT(*)
FROM jobs AS j
JOIN attempts AS a ON a.job_id = j.job_id
WHERE j.status IN ('ready', 'expired')
  AND j.completed_at IS NOT NULL
  AND j.completed_bytes > 0;
-- 4 joined rows, but only 2 original requests with completed files
```

`COUNT(*)` counts joined rows. The filter uses the original job's state, so even J_A's earlier failed attempts pass it once that original job is ready.

For a simple completion count, query the original-request table directly. If attempts are needed in the same report, group attempts by original job before joining them. [metrics.py](metrics.py) uses this pattern:

```sql
WITH attempt_counts AS (
    SELECT job_id, COUNT(*) AS n
    FROM attempts
    GROUP BY job_id
)
SELECT COUNT(*) AS original_requests,
       COALESCE(SUM(COALESCE(a.n, 0)), 0) AS attempts,
       COALESCE(SUM(CASE WHEN a.n > 1 THEN a.n - 1 ELSE 0 END), 0)
           AS retry_attempts
FROM jobs AS j
LEFT JOIN attempt_counts AS a ON a.job_id = j.job_id;
```

The left join keeps queued jobs with no attempt yet. Compute retries per job: blindly subtracting all original jobs from all attempts undercounts retries when some jobs have zero attempts. In this fixture, adding one unstarted job changes original requests from 4 to 5, while attempts stay 6 and retries stay 2.

## Keep completion history when storage expires

This example records completion time and byte count on the original job. Expiry changes its state and clears its file key; it does not erase those historical fields. The report counts a historical completion only when the example's state is ready/expired and both completion fields are present and valid.

Current downloadability is a separate narrower predicate: ready, completed, and a nonempty storage key. A production system should check actual storage/access state too. A key's presence alone does not guarantee that an object still exists or that a viewer may access it.

## Keep request identity separate from retries

`UNIQUE(account_id, request_id)` prevents two original rows with the same account-scoped request key. Another account can use the same request ID. Attempt identity is independently unique as `(job_id, attempt_no)`.

These constraints demonstrate counting and identity boundaries; they are not a complete idempotent API implementation. A real handler also needs authenticated account ownership, input-hash conflict detection, transactional admission, replay of the existing result, crash recovery, and protection against duplicate external execution. A timeout does not establish that the first execution stopped.

## References and disclosure

- [SQLite aggregate functions](https://www.sqlite.org/lang_aggfunc.html): row counting and distinct aggregates.
- [SQLite constraints](https://www.sqlite.org/lang_createtable.html): UNIQUE, CHECK and foreign keys.
- [Python sqlite3](https://docs.python.org/3/library/sqlite3.html): the standard-library database interface.

Published by the [SeedanceCheap team](https://seedancecheap.com/?utm_source=github&utm_medium=example&utm_campaign=original_request_metrics_oct16&utm_content=disclosure), prepared with Codex. The code and assertions were run locally with synthetic data. No production performance or customer outcome is claimed.
