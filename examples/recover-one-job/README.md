# The create response disappeared. Recover the same video job.

You send a request and the connection closes before the job ID reaches your app. The first request may already have reached the service. Give your UI a **check existing job** action before it offers another take.

## Keep one private record before submitting

Save the account context, request ID and exact JSON locally. This example fingerprints the saved file, so editing the prompt in place cannot silently change the recovery payload. Byte-for-byte matching is the local guard here. Keep prompts, keys and job responses in your private workspace.

[The SeedanceCheap API builder](https://pesoszpesosz.github.io/seedancecheap-video-cookbook/api-request.html?from=github) prepares the JSON and separate commands for checking availability, creating, looking up and downloading. [The API reference](https://seedancecheap.com/api) documents `GET /v1/videos/by-request/{request_id}` and identical-request replay.

## Decide from the lookup

Look up the **saved request ID in the same account**. Bind the response to that lookup before updating your UI.

| What you observed | Next step |
| --- | --- |
| The create response never arrived | Look up the saved request ID. |
| The lookup was rate-limited or unavailable | Keep the original ID and check again after the reported wait. |
| The lookup returned 401, 403 or 404 | Verify the account, access and saved ID before deciding what to do. |
| The original is still processing | Poll the returned job ID. |
| The original is ready | Download that job’s file before expiry and review it before using it. |
| The original failed or expired | Read its terminal receipt and any funding adjustment. |
| The saved payload has changed | Restore the original for recovery. Save changed inputs as a separately reviewed request with a new ID. |

A lookup error describes the lookup. The API separately documents that an explicit **generation admission** 503 reserves no charge. When you choose to replay after checking the original, follow the documented rule to use the same request ID and unchanged inputs. An automatic retry loop would hide the distinction between these outcomes.

## Run the offline cases

```sh
python examples/recover-one-job/recovery.py
```

[The source](recovery.py) runs 13 synthetic cases, including a missing create response, changed inputs, a 503 on lookup, an active job and a ready job. It accepts already-read data and makes no API call. A ready result still needs download, playback and creative review. The fixtures contain no customer data and show no live delivery or credit restoration.

From the SeedanceCheap team, with Codex.
