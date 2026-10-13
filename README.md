# CAD – Cloud Workflow Resilience Lab

## Project
A browser-based interface connected to a real AWS Step Functions workflow for the BCSE355L Cloud Architecture Design Digital Assignment.

## Main AWS service
**AWS Step Functions** – `CAD-CloudWorkflowResilience`

The state machine manages branching, Lambda tasks, parallel processing, a Wait state, retries, Catch handling, and workflow completion.

## AWS backend
- API Gateway HTTP API: `Building`
- `POST /workflow` → `CAD-StartWorkflow`
- `GET /workflow-status` → `CAD-WorkflowStatus`
- AWS Step Functions: `CAD-CloudWorkflowResilience`
- AWS Lambda: `CAD-Payment`
- AWS Lambda: `CAD-Inventory`
- AWS Lambda: `CAD-OrderProcessing`
- AWS Lambda: `CAD-Refund`
- AWS IAM: execution permissions
- Amazon CloudWatch: logging/monitoring

## Enhancement
**Failure Injection + Resilience Testing**

The website can intentionally send `force_payment_failure: true` to the Payment Lambda. The Payment Lambda then raises an error. Step Functions applies its configured retry policy and, after the retries are exhausted, the Catch path invokes Refund and ends in `PaymentFailed`.

The failure injection is a testing feature. It does not replace AWS's normal error handling; it gives us a controlled way to test the resilience path during a demonstration.

## Important implementation note
The current AWS `CAD-Payment` Lambda supports controlled failure as an **always-fail** mode. The website therefore exposes only that supported failure mode. The previous "fail once" and "fail twice" options were removed because they were frontend-only options and were not implemented by the AWS backend.

## Run locally
Use a local HTTP server so the browser has a normal HTTP origin and API Gateway CORS works correctly:

```powershell
cd "C:\Users\nithi\OneDrive\Documents\Nithish\aws-sagemaker-simulation\CAD-CloudWorkflowResilience"
python -m http.server 8000
```

Then open:

`http://localhost:8000`

Do not open `index.html` directly with `file://`.

## Demo cases
1. **Successful Premium** – `PREM1001`, amount `7500`, Failure Injection OFF.
2. **Successful Normal** – `NORM1001`, amount `2500`, Failure Injection OFF.
3. **Payment Failure** – `FAIL1001`, amount `8000`, Failure Injection ON, Always fail.

## What the website shows
- Actual Step Functions execution ARN
- Actual execution status from `/workflow-status`
- Correct Premium/Normal branch based on amount
- Successful workflow path
- Failure/Retry/Catch/Refund path for an intentionally failed payment
- Execution analytics that match the configured workflow behavior rather than displaying retries for a successful execution

## AWS verification
After running a case, open:

**AWS Console → Step Functions → CAD-CloudWorkflowResilience → Executions**

Open the latest execution to show the real AWS state-machine graph and its result.
