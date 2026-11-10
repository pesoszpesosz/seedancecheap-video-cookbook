# Check a planned video format in n8n

Use this read-only workflow before starting an automated video job. It catches a common setup error. A size and aspect ratio can each appear in the public catalog while their combination is unavailable for your recipe.

1. Save [workflow.json](workflow.json) and import it as a new, inactive workflow in n8n.
2. Open **Choose recipe and format**. Copy only `model`, `ratio` and `size` from your saved request. The example uses `veo31-text-8s-720`, `9:16` and `720x1280`. Leave the prompt and account details in your own saved file.
3. Click **Execute workflow** manually and inspect **Review or wait**. The workflow reads the public catalog once per execution with an unauthenticated GET.

| Decision | What it means |
| --- | --- |
| `REVIEW_FUNDING` | A fresh observation lists that exact recipe and format. Review the live quote, duration, input mode and your funding separately. |
| `WAIT_FORMAT` | The catalog has no row with both your ratio and size for that recipe. |
| `WAIT_CAPACITY` | The recipe was unavailable at the time of the check. |
| `WAIT_UNVERIFIED` | The public read failed or the recipe observation was missing, unknown or stale. |
| `INVALID_REQUEST` | A required setting is missing. |

Try a second manual run with `16:9` and the same portrait size of `720x1280`. When the recipe is available with the original format rows, that mismatch returns `WAIT_FORMAT`. Availability can change between runs. Do not connect this output directly to a paid submission without a separate review step.

Tested by importing into a fresh n8n 2.46.7 instance. Using the live catalog, the portrait pair returned `REVIEW_FUNDING` and the mismatched pair returned `WAIT_FORMAT`.

The workflow uses built-in n8n nodes and one public endpoint. It needs no API key, pinned data, account ID, file upload or private job. It makes no generation or purchase request. The 120-second freshness check is a local rule for this example. It does not reserve capacity or guarantee a delivered format.

From the SeedanceCheap team, with Codex. [Open the live quote and format checker](https://seedancecheap.com/api?model=veo31-text-8s-720&utm_source=github&utm_medium=code_example&utm_campaign=n8n_format_preflight&utm_content=live_quote#availability). Select the matching recipe if you change the example.
