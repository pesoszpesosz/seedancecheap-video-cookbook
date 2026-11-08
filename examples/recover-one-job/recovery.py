"""Read-only decision examples for recovering an existing video request."""

import hashlib
import json
import re


def fingerprint(payload):
    """Keep the original request ID and a digest of its exact saved bytes."""
    original = json.loads(payload)
    request_id = original.get("request_id") if isinstance(original, dict) else None
    if not isinstance(request_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", request_id):
        raise ValueError("This example needs a URL-safe request ID in the original JSON.")
    return {"request_id": request_id, "sha256": hashlib.sha256(payload).hexdigest()}


def next_step(saved, payload, http_status=None, job=None):
    """Classify a read of the original ID. This function makes no requests."""
    if fingerprint(payload) != saved:
        return "STOP_CHANGED_INPUT"
    if http_status is None:
        return "LOOK_UP_ORIGINAL_ID"
    if http_status in (401, 403, 404):
        return "CHECK_ACCOUNT_AND_ORIGINAL_ID"
    if http_status != 200:
        return "WAIT_AND_CHECK_SAME_ID"
    job_id = job.get("id") if isinstance(job, dict) else None
    if not isinstance(job_id, str) or not re.fullmatch(r"vid_[A-Za-z0-9_-]+", job_id):
        return "CHECK_LOOKUP_RECEIPT"
    if job.get("request_id", saved["request_id"]) != saved["request_id"]:
        return "CHECK_LOOKUP_RECEIPT"
    status = job.get("status")
    if status == "ready":
        return "DOWNLOAD_AND_REVIEW_EXISTING_JOB"
    if status in ("failed", "expired"):
        return "READ_TERMINAL_RECEIPT"
    if status in ("queued", "processing", "running"):
        return "POLL_EXISTING_JOB"
    return "CHECK_LOOKUP_RECEIPT"


def demo():
    original = b'{"request_id":"example_001","prompt":"Synthetic fixture"}'
    saved = fingerprint(original)
    job = {"id": "vid_example", "request_id": saved["request_id"]}
    cases = [
        ("Lost create response", original, None, None, "LOOK_UP_ORIGINAL_ID"),
        ("Prompt changed", original.replace(b"Synthetic", b"Different"), None, None, "STOP_CHANGED_INPUT"),
        ("Lookup unavailable", original, 503, None, "WAIT_AND_CHECK_SAME_ID"),
        ("Lookup rate limited", original, 429, None, "WAIT_AND_CHECK_SAME_ID"),
        ("Lookup not found", original, 404, None, "CHECK_ACCOUNT_AND_ORIGINAL_ID"),
        ("Lookup forbidden", original, 403, None, "CHECK_ACCOUNT_AND_ORIGINAL_ID"),
        ("Active original", original, 200, {**job, "status": "processing"}, "POLL_EXISTING_JOB"),
        ("Ready original", original, 200, {**job, "status": "ready"}, "DOWNLOAD_AND_REVIEW_EXISTING_JOB"),
        ("Expired original", original, 200, {**job, "status": "expired"}, "READ_TERMINAL_RECEIPT"),
        ("Failed original", original, 200, {**job, "status": "failed"}, "READ_TERMINAL_RECEIPT"),
        ("Missing job ID", original, 200, {"status": "ready"}, "CHECK_LOOKUP_RECEIPT"),
        ("Unknown job state", original, 200, job, "CHECK_LOOKUP_RECEIPT"),
        ("Different request ID", original, 200, {**job, "request_id": "other"}, "CHECK_LOOKUP_RECEIPT"),
    ]
    for label, payload, status, receipt, expected in cases:
        actual = next_step(saved, payload, status, receipt)
        if actual != expected:
            raise RuntimeError(f"{label}: expected {expected}, got {actual}")
        print(f"{label}: {actual}")
    print(f"{len(cases)} synthetic cases passed.")


if __name__ == "__main__":
    demo()
