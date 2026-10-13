# CAD – Cloud Workflow Resilience Lab

A browser-based demonstration interface for exploring AWS Step Functions workflow orchestration, conditional branching, Lambda tasks, parallel processing, retry policies, failure handling, and refunds.

> **Deployment note:** GitHub Pages hosts only the static frontend (HTML, CSS, and JavaScript). The workflow execution is handled by AWS services configured separately. Publishing this repository does not create or deploy the AWS backend.

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Concepts Explained](#concepts-explained)
- [Architecture](#architecture)
- [Workflow Logic](#workflow-logic)
- [Failure Injection and Resilience Testing](#failure-injection-and-resilience-testing)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Run Locally](#run-locally)
- [Deploy to GitHub](#deploy-to-github)
- [Deploy with GitHub Pages](#deploy-with-github-pages)
- [AWS Backend Requirements](#aws-backend-requirements)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)
- [Security and Cost Considerations](#security-and-cost-considerations)
- [Limitations and Future Improvements](#limitations-and-future-improvements)
- [Learning Outcomes](#learning-outcomes)

## Project Overview

**CAD – Cloud Workflow Resilience Lab** is a visual learning and demonstration project for cloud workflow orchestration. It provides a web interface in which a user can enter an order ID and order amount, start a workflow, observe its reported execution status, and examine success or failure-handling paths.

The intended backend uses **AWS Step Functions** as the workflow orchestrator, **AWS Lambda** for individual processing tasks, **Amazon API Gateway** as the HTTP interface, **AWS IAM** for permissions, and **Amazon CloudWatch** for logs and monitoring.

The project is designed to demonstrate not only the normal processing path but also how a workflow can respond when a payment task fails.

## Problem Statement

In a cloud application, a business process often involves multiple independent operations. For example, processing an order may require validating the request, deciding which processing path to use, attempting payment, checking inventory, preparing the order, and handling failures.

If each operation is connected manually, the overall process can become difficult to maintain and monitor. A failure in one operation may also leave the process in an unclear or incomplete state.

This project illustrates how a workflow orchestrator can coordinate these steps, define the order in which they execute, run independent tasks in parallel, retry selected failures, and invoke a recovery or refund task when necessary.

## Objectives

1. Demonstrate how AWS Step Functions coordinates a multi-step workflow.
2. Show conditional branching based on an order amount.
3. Integrate task operations through AWS Lambda.
4. Illustrate parallel execution of independent tasks.
5. Demonstrate a timed Wait state.
6. Test retry and failure-handling behaviour using controlled payment failures.
7. Display execution identifiers, statuses, events, and summary analytics in a browser interface.
8. Publish the static frontend through GitHub Pages and maintain the source code in GitHub.

## Concepts Explained

### AWS Step Functions

AWS Step Functions is a workflow orchestration service. A workflow is defined as a state machine made up of states and transitions. Each state represents an operation, decision, wait, parallel branch, or terminal result.

Rather than having the browser directly coordinate every backend task, the application can submit a request to start a state machine execution. Step Functions then manages the configured sequence and branching of tasks.

### State machine

A state machine describes the workflow's logic: which state runs first, what happens after a successful task, which conditions select a branch, and how errors are handled.

### AWS Lambda

AWS Lambda runs individual functions without requiring the project owner to manage a traditional server. In this project, Lambda functions are intended for payment, inventory checks, order preparation, and refunds. Lambda functions must be deployed and configured in AWS separately.

### Amazon API Gateway

API Gateway provides HTTP endpoints that the browser can call. The frontend is intended to use:

- `POST /workflow` to request a new workflow execution.
- `GET /workflow-status` to retrieve the status of an execution.

The actual API base URL and integration configuration must match the deployed AWS resources.

### Conditional branching (`Choice`)

A Choice state evaluates a condition and routes execution to the appropriate next state. In this project, the displayed business rule is:

- Amount greater than ₹5,000: `PremiumProcessing`
- Amount less than or equal to ₹5,000: `NormalProcessing`

The state machine in AWS must implement the same rule for the visual display to accurately represent backend execution.

### Parallel processing (`Parallel`)

A Parallel state can run independent branches at the same time and continue after its branches have completed. This project illustrates inventory checking and order preparation as separate branches.

### Wait state

A Wait state pauses execution for a configured duration or until a specified time. The interface describes a five-second wait before successful completion; confirm that the deployed state machine uses the same setting.

### Retry

A Retry policy tells Step Functions which errors should trigger another attempt and how retry behaviour is configured. The total number of attempts includes the initial attempt plus retries. For example, a policy configured for three retries can result in four total attempts if every attempt fails.

### Catch and recovery

A Catch rule directs execution to a different state after a matching error is no longer recoverable through the configured retry policy. The intended failure path invokes a Refund Lambda and ends in a `PaymentFailed` state.

A refund in this educational demonstration is a workflow action; it should not be interpreted as a real financial refund unless the backend is explicitly integrated with a payment provider and tested safely.

### Failure injection

Failure injection intentionally creates a controlled error to test the workflow's resilience. It helps demonstrate whether retries occur, whether the failure is caught, and whether the configured recovery path runs.

Failure injection should be used only in a test environment. The frontend option, API request fields, Lambda implementation, and state-machine error rules must all agree for the scenario to work as intended.

## Architecture

```text
User's browser
  |
  | HTTPS request
  v
GitHub Pages (static HTML, CSS and JavaScript)
  |
  | POST /workflow
  | GET /workflow-status
  v
Amazon API Gateway
  |
  v
API integration / Lambda handlers
  |
  v
AWS Step Functions state machine
  |
  +--> Validate order
  |
  +--> Check amount (Choice)
  |      +--> PremiumProcessing
  |      +--> NormalProcessing
  |
  +--> Payment Lambda
  |      |
  |      +--> Success
  |      |      +--> Parallel state
  |      |             +--> Inventory Lambda
  |      |             +--> Order Processing Lambda
  |      |      +--> Wait
  |      |      +--> WorkflowSuccess
  |      |
  |      +--> Failure --> Retry policy
  |                            |
  |                            +--> Catch --> Refund Lambda
  |                                             |
  |                                             +--> PaymentFailed
  |
  +--> CloudWatch logs and monitoring
```

This diagram represents the intended architecture. The exact transitions, error names, and integrations are determined by the state machine and Lambda/API configurations actually deployed in AWS.

## Workflow Logic

### Normal success path

1. The user enters an order ID and a positive amount.
2. The frontend validates that the inputs are present and valid.
3. The browser sends a request to API Gateway.
4. The backend starts an execution of the Step Functions state machine.
5. The workflow validates the order.
6. A Choice state selects the premium or normal branch based on the configured amount rule.
7. The payment task executes.
8. If payment succeeds, inventory checking and order preparation are run through the configured Parallel state.
9. The workflow waits for the configured duration.
10. The state machine reaches its success state.
11. The frontend polls the status endpoint and displays the returned final status.

### Payment failure path

1. A test request asks the backend to force a payment failure.
2. The Payment Lambda raises an error according to its implementation.
3. Step Functions applies the configured Retry policy.
4. If the task still fails after the retries, a matching Catch rule can route execution to the refund operation.
5. The workflow reaches its configured failure terminal state.
6. The browser displays the reported status and failure-path information.

The exact number of attempts depends on the deployed Retry configuration. The browser's analytics are only reliable if they reflect the actual backend result and retry policy.

## Failure Injection and Resilience Testing

The project enhancement is **Failure Injection + Resilience Testing**. Its purpose is to make error-handling behaviour visible during a demonstration.

The project documentation previously described a backend that supports an always-fail payment scenario using `force_payment_failure: true`. However, the uploaded JavaScript sends a `failure_mode` field and contains a `once` option. These request formats are not automatically equivalent.

**Before demonstrating failure handling, verify and align all of the following:**

1. The HTML controls expose only modes that the backend really supports.
2. The JavaScript sends the field names and values expected by the API/Lambda implementation.
3. The Payment Lambda interprets the request as intended.
4. The Step Functions Retry policy matches the displayed attempt counts.
5. The Catch rule handles the actual error raised by the Payment Lambda.
6. The Refund task and terminal failure state are configured in the state machine.
7. The status endpoint returns the actual execution status.

Do not claim that a “fail once, then recover” scenario works until it has been implemented and verified in AWS.

## Technology Stack

| Technology | Role |
|---|---|
| HTML5 | Structure of the browser interface |
| CSS3 | Styling, responsive layout, workflow diagram, and status indicators |
| JavaScript | Input validation, HTTP requests, polling, event display, and interface updates |
| Amazon API Gateway | HTTP endpoints for starting and monitoring workflows |
| AWS Step Functions | Workflow orchestration and state transitions |
| AWS Lambda | Individual business operations |
| AWS IAM | Permissions between AWS services |
| Amazon CloudWatch | Logs and monitoring |
| Git and GitHub | Source control and project hosting |
| GitHub Pages | Static frontend deployment |

## Repository Structure

The repository should use these filenames:

```text
CAD-CloudWorkflowResilience/
├── index.html
├── style.css
├── script.js
├── README.md
└── .nojekyll        # Optional for a plain static site
```

- `index.html`: page structure and interface components.
- `style.css`: visual design and responsive layout.
- `script.js`: browser-side logic and API communication.
- `README.md`: project overview, architecture, setup, deployment, and troubleshooting.
- `.nojekyll`: optional empty file that disables Jekyll processing for a plain static site.

Keep these files in the same directory unless you update the references in `index.html`.

## Prerequisites

For local development and deployment, you need:

- A GitHub account.
- Git installed on your computer, or GitHub Desktop.
- A web browser.
- Python 3 if you want to use the local HTTP server shown below.
- Access to the AWS account and resources if you intend to execute the live workflow.
- A deployed API Gateway endpoint with the required routes and integrations.
- Correct CORS configuration for the origin from which the frontend is served.

GitHub Pages can host the frontend without AWS credentials. AWS access is required to configure or troubleshoot the backend, not to publish the static files.

## Run Locally

1. Place `index.html`, `style.css`, and `script.js` in the same project directory.
2. Open PowerShell or a terminal in that directory.
3. Start a local HTTP server:

   ```powershell
   python -m http.server 8000
   ```

4. Open `http://localhost:8000` in your browser.
5. Use the browser developer tools (usually F12) to inspect Console and Network errors.

Do not open the HTML file directly using a `file://` URL. An HTTP origin is more appropriate for testing browser requests and CORS.

If Python is not installed, use another local static HTTP server.

## Deploy to GitHub

### Option A: Upload through the GitHub website

1. Sign in to GitHub.
2. Select **New repository**.
3. Enter a repository name such as `CAD-CloudWorkflowResilience`.
4. Add a description such as: `AWS Step Functions workflow resilience lab with retry and failure-handling demonstration`.
5. Choose **Public** if you want to use GitHub Pages with a GitHub Free account and make the project accessible publicly. Review the privacy implications first.
6. Create the repository. If you plan to upload files through the web interface, you may initialize it with a README, but avoid creating a duplicate README.
7. Open the repository and choose **Add file → Upload files**.
8. Upload the correctly named `index.html`, `style.css`, `script.js`, and `README.md`.
9. Commit the changes to the `main` branch.
10. Verify that all four files appear in the repository root.

### Option B: Push using Git

Create an empty GitHub repository first. Then open a terminal in the local project directory. Replace `YOUR-USERNAME` with your GitHub username.

```bash
git init
git add index.html style.css script.js README.md
git commit -m "Initial commit: Cloud Workflow Resilience Lab"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/CAD-CloudWorkflowResilience.git
git push -u origin main
```

If Git reports that a remote named `origin` already exists, inspect it with `git remote -v` before changing it. Authenticate to GitHub when prompted. Never commit passwords, access keys, private configuration, or other credentials.

## Deploy with GitHub Pages

1. Open your GitHub repository.
2. Select **Settings**.
3. In the sidebar, open **Pages**.
4. Under **Build and deployment**, select **Deploy from a branch** as the source.
5. Choose the `main` branch.
6. Choose the `/(root)` folder.
7. Click **Save**.
8. Wait for the Pages deployment to complete. Check the repository's **Actions** tab if deployment fails.
9. Return to **Settings → Pages** and open the published site using **Visit site**.

For a project repository, the published URL generally follows this format:

`https://YOUR-USERNAME.github.io/CAD-CloudWorkflowResilience/`

The actual username and repository name determine the final URL. The first deployment or a new update can take several minutes.

### Validate the published site

- Confirm that the published page loads over HTTPS.
- Confirm that the CSS and JavaScript files load without 404 errors.
- Open browser developer tools and check Console and Network.
- Test the frontend controls.
- If live AWS calls fail, check the API endpoint, CORS configuration, backend logs, and request/response format.

## AWS Backend Requirements

GitHub Pages does not deploy or configure AWS resources. The backend must already exist or be created separately.

The project README supplied with the original files identifies these intended resources:

- Step Functions state machine: `CAD-CloudWorkflowResilience`
- API Gateway HTTP API: `Building`
- `POST /workflow` integration: `CAD-StartWorkflow`
- `GET /workflow-status` integration: `CAD-WorkflowStatus`
- Payment Lambda: `CAD-Payment`
- Inventory Lambda: `CAD-Inventory`
- Order processing Lambda: `CAD-OrderProcessing`
- Refund Lambda: `CAD-Refund`
- IAM permissions for the relevant service integrations
- CloudWatch logs and monitoring

These names describe the intended resources and must be checked against the actual AWS account. They are not created by the GitHub deployment instructions.

### API contract

The frontend expects the start endpoint to return an execution ARN, either directly or inside a JSON `body` string. It then polls the status endpoint using the execution ARN and expects a status value such as `RUNNING` or `SUCCEEDED`.

The actual request payload and response format must match the deployed Lambda/API integration. In particular, reconcile the current JavaScript's `failure_mode` field with the backend's documented `force_payment_failure` field before testing failure injection.

### CORS

Configure API Gateway or the relevant backend to allow the exact published GitHub Pages origin. For a project site, this is usually the origin `https://YOUR-USERNAME.github.io`, not the full path containing the repository name.

Allow only the methods and headers required by the application, such as `GET`, `POST`, and `Content-Type`. Do not use CORS as a substitute for authentication or authorization; CORS is a browser access policy, not an API security mechanism.

## Testing Guide

Run these scenarios only against an environment configured for testing.

| Scenario | Example input | Expected behaviour |
|---|---|---|
| Premium success | Order ID `PREM1001`, amount `7500` | Premium branch, payment success, parallel tasks, wait, successful terminal state |
| Normal success | Order ID `NORM1001`, amount `2500` | Normal branch, payment success, parallel tasks, wait, successful terminal state |
| Payment failure | Order ID `FAIL1001`, amount `8000`, supported failure injection enabled | Retries according to the deployed policy; matching Catch path and refund task if configured |

These are expected outcomes, not proof that the live AWS backend is currently working. Verify each execution in the AWS console:

**AWS Console → Step Functions → `CAD-CloudWorkflowResilience` → Executions**

Open the latest execution to inspect its actual state transitions and final result. Use CloudWatch logs to investigate Lambda or integration errors.

## Troubleshooting

### The website is blank or has no styling

- Confirm that `index.html` is at the publishing root.
- Confirm the filenames are exactly `style.css` and `script.js`.
- Check that the HTML references use those exact names.
- Inspect Network for 404 errors and Console for JavaScript exceptions.

### GitHub Pages does not publish

- Confirm that Pages is enabled in repository Settings.
- Confirm the selected branch and folder contain `index.html`.
- Check the Actions tab for deployment errors.
- Wait a few minutes and reload the site.

### API requests fail in the browser

- Confirm the API base URL is correct and the API is deployed.
- Check the browser Network tab for the request URL, status code, and response.
- Check CORS configuration for the GitHub Pages origin.
- Verify that `POST /workflow` and `GET /workflow-status` exist and are correctly integrated.
- Inspect API Gateway and Lambda logs for backend errors.
- Verify that the API response contains the expected execution ARN and status fields.

### The workflow starts but the UI shows an error

- Inspect the API response body.
- Confirm that the execution ARN is returned in the expected format.
- Confirm that the status endpoint accepts the execution ARN query parameter.
- Check that the response's status field uses the expected value and capitalization.
- Compare the displayed workflow with the actual Step Functions execution graph.

### Failure injection does not behave as expected

- Compare the frontend payload with the Payment Lambda's expected input.
- Confirm whether the backend supports `failure_mode`, `force_payment_failure`, or another documented field.
- Check the Retry policy's error matching and maximum attempts.
- Confirm that Catch handles the thrown error and invokes the Refund task.
- Do not trust hard-coded frontend retry counts unless they match the real execution.

## Security and Cost Considerations

- Never put AWS access keys, passwords, session tokens, or other secrets in `script.js` or any file published to GitHub Pages.
- Treat the API endpoint as publicly discoverable. A URL embedded in frontend code is not a secret.
- Validate input on the backend; browser-side validation can be bypassed.
- Apply least-privilege IAM permissions and appropriate API protections, such as authentication, throttling, and resource limits where applicable.
- Keep failure injection restricted to a test environment. Never trigger real payments or refunds during uncontrolled testing.
- Review AWS pricing for API Gateway, Lambda, Step Functions, CloudWatch, and any other services used. Monitor usage and configure budgets or alerts as appropriate.
- GitHub Pages makes the published website publicly accessible. Do not publish private project information or credentials.

## Limitations and Future Improvements

Potential improvements include:

1. Align the frontend and backend request/response contracts and document them explicitly.
2. Remove or disable any failure mode that is not implemented in the AWS backend.
3. Derive retry counts and execution analytics from actual backend execution data rather than hard-coded assumptions.
4. Add clearer loading, timeout, and API error states.
5. Improve accessibility, keyboard navigation, and small-screen workflow visualisation.
6. Add automated checks for HTML, CSS, JavaScript, and deployment.
7. Add API authentication and rate limiting appropriate to the intended audience.
8. Document the state-machine definition and the IAM permissions required for each integration.
9. Add screenshots of the running interface and verified AWS execution graph to the repository.

## Learning Outcomes

This project provides practical exposure to:

- Cloud workflow orchestration.
- State-machine design and transition logic.
- Conditional and parallel execution.
- Serverless functions and HTTP APIs.
- Retry policies, Catch handling, and failure recovery.
- Browser-to-cloud API communication and CORS.
- Git version control and repository management.
- Static website deployment using GitHub Pages.
- Cloud monitoring and troubleshooting through execution history and logs.

## References

- [AWS Step Functions Developer Guide](https://docs.aws.amazon.com/step-functions/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [Amazon API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/)
- [Amazon CloudWatch User Guide](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html)
- [GitHub Docs: Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [GitHub Docs: Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

---

**Project:** CAD – Cloud Workflow Resilience Lab  
**Purpose:** Educational demonstration of AWS Step Functions orchestration and resilience patterns.  
**Deployment model:** Static frontend on GitHub Pages; backend services deployed and operated separately in AWS.
