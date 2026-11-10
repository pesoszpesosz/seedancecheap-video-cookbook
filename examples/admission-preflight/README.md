# Check the status cases before connecting a generation button

[SeedanceCheap.com](https://seedancecheap.com/?utm_source=github&utm_medium=code_example&utm_campaign=admission_preflight_oct16&utm_content=example_header) — from our team, with Codex.

This small Python example turns already-loaded public policy and selected-model availability dictionaries into a **review** or **wait** result. It makes no network call, requests no key and never charges, generates, reserves funding or retries a job.

Use the [original explanation](https://seedancecheap.gitbook.io/seedancecheap-docs/) for the public response fields, selected-model association and current-status limits. The implementation is [preflight.py](preflight.py); the executable cases are [test_preflight.py](test_preflight.py). Both use only Python's standard library.

## Run the synthetic cases locally

From the cookbook repository root, run:

```sh
python -m unittest discover -s examples/admission-preflight -p "test_preflight.py" -v
```

The suite contains one unittest method with 20 subcases. It uses a synthetic `now=2000` clock and performs no live status check or request. `OK` means the decision example passed these inputs; it does not prove model capacity, delivery, visual quality, customer eligibility or a purchase.

| Case | Input difference | Expected decision |
| --- | --- | --- |
| 1 | Available format, explicit paid choice | REVIEW_PAID_FUNDING |
| 2 | Trial explicitly chosen and policy enabled | REVIEW_TRIAL_ELIGIBILITY |
| 3 | Trial explicitly chosen and policy paused | WAIT_TRIAL_PAUSED |
| 4 | Model admission unavailable | WAIT_CAPACITY |
| 5 | Admission unknown | WAIT_UNVERIFIED |
| 6 | Observation older than 120 seconds | WAIT_UNVERIFIED |
| 7 | Timestamp more than 60 seconds ahead | WAIT_UNVERIFIED |
| 8 | Boolean timestamp | WAIT_UNVERIFIED |
| 9 | Nonfinite timestamp | WAIT_UNVERIFIED |
| 10 | Missing confirmed format list | WAIT_FORMAT |
| 11 | Requested format absent from list | WAIT_FORMAT |
| 12 | Global admission policy disabled | WAIT_ADMISSION |
| 13 | String "true" instead of Boolean true | WAIT_ADMISSION |
| 14 | Reference inputs chosen while disabled | WAIT_REFERENCES |
| 15 | Reference inputs explicitly permitted | REVIEW_PAID_FUNDING |
| 16 | No explicit funding choice | CHOOSE_FUNDING |
| 17 | Availability response missing | WAIT_UNVERIFIED |
| 18 | Policy response missing | WAIT_ADMISSION |
| 19 | Exactly 120 seconds old | REVIEW_PAID_FUNDING |
| 20 | Exactly 60 seconds ahead | REVIEW_PAID_FUNDING |

## Check the exact format in a saved request

Save the JSON from the [free API planner](https://pesoszpesosz.github.io/seedancecheap-video-cookbook/api-request.html?model=veo31-text-8s-720&from=github#prepare-heading) as `request.json`. From the repository root, fetch the public catalog and compare it locally.

```sh
curl --fail --silent --show-error --max-time 15 https://seedancecheap.com/api/availability/catalog | python examples/admission-preflight/check_request.py request.json
```

On Windows PowerShell, use `curl.exe` in the same command. The only network call is the public GET. The checker reads the saved request and catalog locally. It checks the observation for the exact recipe ID and requires the ratio and size in one `available_formats` row. For example, a portrait size paired with `16:9` needs review even when both the size and ratio appear in different rows.

- `REVIEW_FUNDING` (exit 0) means a fresh observation lists the exact format. [Review the current quote and your funding](https://seedancecheap.com/api?model=veo31-text-8s-720&utm_source=github&utm_medium=code_example&utm_campaign=api_request_guide&utm_content=exact_format#availability) before any separate submit. If you picked a different recipe, select it in the checker.
- `WAIT_CAPACITY`, `WAIT_FORMAT` or `WAIT_UNVERIFIED` (exit 1) means the catalog does not support continuing on that observation.
- `INVALID_REQUEST` (exit 2) means the saved file is unreadable, malformed or missing the model, ratio or size.

The checker never opens an account, buys credits, reserves capacity, sends the saved prompt, or submits a job. It checks admission and format only. Review duration, input mode, account eligibility and price separately.

Run both offline test files with `python -m unittest discover -s examples/admission-preflight`.

## What to add in an actual client

Keep each observation bound to the model URL that produced it. Supply a valid current Unix-seconds `now`, reject failed reads, and avoid accepting a response from an earlier model selection. The two-minute age and one-minute future tolerance mirror the inspected public UI as a teaching example; they are not a capacity reservation or SLA.

A review result is a next-screen decision, not submit authorization. Verify the actual account's funding, trial eligibility, live format and current price before a separate explicit request. A paused trial must never silently switch to paid funding. Preserve an existing request ID and exact inputs when recovering a missed response.

At our 16 October 2026 native check, new-generation admission, introductory trials and reference-image inputs were temporarily unavailable. This is a dated observation. Check current Studio status before purchasing or submitting. The code does not query that status for you.

This is a simplified teaching example under the repository license. It is not a complete SDK, a production-ready validator, a live availability monitor or a tested new video. No private customer data, credentials or supplier identities are included.
