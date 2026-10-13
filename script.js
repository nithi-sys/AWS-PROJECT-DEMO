/* =========================================================
   AWS STEP FUNCTIONS - CLOUD WORKFLOW RESILIENCE LAB
   ========================================================= */


/* =========================================================
   API
   ========================================================= */

const API_URL =
    "https://u29lkq3ji8.execute-api.ap-south-1.amazonaws.com";


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

let running = false;


/* =========================================================
   WORKFLOW STATE
   ========================================================= */

function setState(name, status) {

    const element =
        document.querySelector(
            `[data-state="${name}"]`
        );

    if (!element) return;

    element.classList.remove(
        "active",
        "done",
        "failed"
    );

    if (status) {
        element.classList.add(status);
    }
}


function clearStates() {

    document
        .querySelectorAll("[data-state]")
        .forEach(element => {

            element.classList.remove(
                "active",
                "done",
                "failed"
            );

        });

}


/* =========================================================
   EVENTS
   ========================================================= */

function clearEvents() {

    $("events").innerHTML = `
        <div class="empty">
            Run a workflow to view execution events.
        </div>
    `;

    $("eventCount").textContent =
        "0 events";
}


function addEvent(message, type = "ok") {

    const box = $("events");

    const empty =
        box.querySelector(".empty");

    if (empty) {
        empty.remove();
    }

    const row =
        document.createElement("div");

    row.className = "event";

    row.innerHTML = `
        <time>
            ${new Date().toLocaleTimeString()}
        </time>

        <span class="${type}">
            ${message}
        </span>
    `;

    box.prepend(row);

    $("eventCount").textContent =
        `${box.children.length} events`;
}


/* =========================================================
   RESET ANALYTICS
   ========================================================= */

function resetAnalytics() {

    $("attempts").textContent = "—";
    $("retries").textContent = "—";
    $("recovery").textContent = "—";

    $("analyticsStatus").textContent =
        "READY";

    $("score").textContent = "—";
    $("scoreText").textContent = "0%";

    $("scoreBar").style.width = "0%";
}


/* =========================================================
   RESET UI
   ========================================================= */

function resetUI() {

    clearStates();

    clearEvents();

    $("retryArea")
        .classList
        .add("hidden");

    $("failurePath")
        .classList
        .add("hidden");

    $("runStatus").textContent =
        "Ready to execute";

    $("finalStatus").textContent =
        "READY";

    $("executionId").textContent =
        "No execution";

    resetAnalytics();

}


/* =========================================================
   DISPLAY RETRIES
   ========================================================= */

function displayRetries(
    numberOfRetries,
    recovery
) {

    const area = $("retryArea");

    const boxes = $("retryBoxes");

    area.classList.remove("hidden");

    boxes.innerHTML = "";

    for (
        let i = 1;
        i <= numberOfRetries;
        i++
    ) {

        const box =
            document.createElement("div");

        box.className =
            recovery && i === numberOfRetries
                ? "retry-box success"
                : "retry-box failed";

        box.textContent =
            `Retry ${i}`;

        boxes.appendChild(box);
    }
}


/* =========================================================
   SHOW SUCCESS
   ========================================================= */

function showSuccess(failureMode) {

    const amount =
        Number($("amount").value);

    const branch =
        amount > 5000
            ? "PremiumProcessing"
            : "NormalProcessing";


    const successfulStates = [

        "ValidateOrder",
        "CheckAmount",
        branch,
        "Payment",
        "ParallelProcessing",
        "InventoryCheck",
        "OrderPreparation",
        "WaitState",
        "WorkflowSuccess"

    ];


    successfulStates.forEach(
        state => setState(state, "done")
    );


    $("failurePath")
        .classList
        .add("hidden");


    if (failureMode === "once") {

        /*
         * First payment attempt failed.
         * Step Functions retried.
         * Second attempt succeeded.
         */

        displayRetries(1, true);

        $("attempts").textContent =
            "2";

        $("retries").textContent =
            "1";

        $("recovery").textContent =
            "RECOVERED";

        $("score").textContent =
            "100%";

        $("scoreText").textContent =
            "100%";

        $("scoreBar").style.width =
            "100%";

        addEvent(
            "Payment recovered after 1 retry"
        );

    }
    else {

        $("retryArea")
            .classList
            .add("hidden");

        $("attempts").textContent =
            "1";

        $("retries").textContent =
            "0";

        $("recovery").textContent =
            "NOT NEEDED";

        $("score").textContent =
            "100%";

        $("scoreText").textContent =
            "100%";

        $("scoreBar").style.width =
            "100%";

    }


    $("analyticsStatus").textContent =
        "SUCCEEDED";
}


/* =========================================================
   SHOW FAILURE
   ========================================================= */

function showFailure(failureMode) {

    setState(
        "Payment",
        "failed"
    );


    setState(
        "Refund",
        "done"
    );


    setState(
        "PaymentFailed",
        "failed"
    );


    $("failurePath")
        .classList
        .remove("hidden");


    /*
     * State Machine currently has:
     *
     * MaxAttempts = 3
     *
     * Therefore:
     *
     * Initial attempt
     * Retry 1
     * Retry 2
     * Retry 3
     *
     * Total = 4 attempts
     */

    displayRetries(3, false);


    $("attempts").textContent =
        "4";

    $("retries").textContent =
        "3";

    $("recovery").textContent =
        "REFUND INITIATED";

    $("score").textContent =
        "85%";

    $("scoreText").textContent =
        "85%";

    $("scoreBar").style.width =
        "85%";

    $("analyticsStatus").textContent =
        "FAILED";


    addEvent(
        "Payment retries exhausted",
        "bad"
    );

    addEvent(
        "Catch path activated",
        "bad"
    );

    addEvent(
        "Refund Lambda invoked"
    );

}


/* =========================================================
   START WORKFLOW
   ========================================================= */

async function runWorkflow() {

    if (running) {
        return;
    }

    running = true;


    resetUI();


    /* -----------------------------------------------------
       READ INPUT
       ----------------------------------------------------- */

    const orderId =
        $("orderId")
            .value
            .trim();


    const amount =
        Number(
            $("amount").value
        );


    const failureMode =
        $("failureToggle").checked
            ? $("failureMode").value
            : "none";


    /* -----------------------------------------------------
       VALIDATE ORDER ID
       ----------------------------------------------------- */

    if (!orderId) {

        addEvent(
            "Order ID is required",
            "bad"
        );

        $("runStatus").textContent =
            "Enter an Order ID";

        $("finalStatus").textContent =
            "ERROR";

        $("analyticsStatus").textContent =
            "ERROR";

        running = false;

        return;
    }


    /* -----------------------------------------------------
       VALIDATE AMOUNT
       ----------------------------------------------------- */

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        addEvent(
            "Amount must be greater than 0",
            "bad"
        );

        $("runStatus").textContent =
            "Enter a valid amount";

        $("finalStatus").textContent =
            "ERROR";

        $("analyticsStatus").textContent =
            "ERROR";

        running = false;

        return;
    }


    /* -----------------------------------------------------
       VALIDATE FAILURE MODE
       ----------------------------------------------------- */

    const allowedModes = [
        "none",
        "once",
        "always"
    ];


    if (!allowedModes.includes(failureMode)) {

        addEvent(
            "Invalid failure mode",
            "bad"
        );

        running = false;

        return;
    }


    /* -----------------------------------------------------
       UI
       ----------------------------------------------------- */

    $("runStatus").textContent =
        "Starting AWS workflow...";

    $("finalStatus").textContent =
        "STARTING";

    $("executionId").textContent =
        "Starting...";


    if (failureMode === "none") {

        addEvent(
            "Normal workflow selected"
        );

    }
    else if (failureMode === "once") {

        addEvent(
            "Failure injection: Fail once, then recover"
        );

    }
    else {

        addEvent(
            "Failure injection: Always fail"
        );

    }


    /* -----------------------------------------------------
       REQUEST BODY
       ----------------------------------------------------- */

    const requestBody = {

        order_id:
            orderId,

        amount:
            amount,

        failure_mode:
            failureMode

    };


    console.log(
        "Sending to AWS:",
        requestBody
    );


    /* -----------------------------------------------------
       CALL API GATEWAY
       ----------------------------------------------------- */

    try {

        addEvent(
            "Sending request to API Gateway"
        );


        const response =
            await fetch(
                `${API_URL}/workflow`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )

                }
            );


        const data =
            await response.json();


        console.log(
            "API response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to start workflow"
            );
        }


        /*
         * API Gateway / Lambda may return:
         *
         * {
         *   executionArn: "..."
         * }
         *
         * or:
         *
         * {
         *   body: "{\"executionArn\":\"...\"}"
         * }
         */

        const result =
            typeof data.body === "string"
                ? JSON.parse(data.body)
                : data;


        const executionArn =
            result.executionArn;


        if (!executionArn) {

            throw new Error(
                "AWS did not return execution ARN"
            );
        }


        $("executionId").textContent =
            executionArn
                .split(":")
                .pop();


        $("runStatus").textContent =
            "AWS execution running...";

        $("finalStatus").textContent =
            "RUNNING";


        addEvent(
            "Real AWS Step Functions execution started"
        );


        /* -------------------------------------------------
           MONITOR
           ------------------------------------------------- */

        await monitorExecution(
            executionArn,
            failureMode
        );

    }
    catch (error) {

        console.error(
            error
        );


        addEvent(
            "AWS error: " +
            error.message,
            "bad"
        );


        $("runStatus").textContent =
            "AWS request failed";

        $("finalStatus").textContent =
            "ERROR";

        $("analyticsStatus").textContent =
            "ERROR";

    }
    finally {

        running = false;

    }

}


/* =========================================================
   MONITOR EXECUTION
   ========================================================= */

async function monitorExecution(
    executionArn,
    failureMode
) {

    let status =
        "RUNNING";


    while (
        status === "RUNNING" ||
        status === "QUEUED"
    ) {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    2000
                )
        );


        const statusUrl =
            `${API_URL}/workflow-status` +
            `?executionArn=` +
            encodeURIComponent(
                executionArn
            );


        const response =
            await fetch(
                statusUrl
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to read workflow status"
            );
        }


        const result =
            typeof data.body === "string"
                ? JSON.parse(data.body)
                : data;


        status =
            result.status;


        $("finalStatus").textContent =
            status;


        $("analyticsStatus").textContent =
            status;


        $("runStatus").textContent =
            `AWS execution: ${status}`;


        addEvent(
            `Step Functions status: ${status}`
        );

    }


    /* -----------------------------------------------------
       SUCCESS
       ----------------------------------------------------- */

    if (status === "SUCCEEDED") {

        showSuccess(
            failureMode
        );


        $("runStatus").textContent =
            "AWS workflow completed successfully";

        $("finalStatus").textContent =
            "SUCCEEDED";


        addEvent(
            "Real AWS workflow completed successfully"
        );

    }


    /* -----------------------------------------------------
       FAILURE
       ----------------------------------------------------- */

    else {

        showFailure(
            failureMode
        );


        $("runStatus").textContent =
            `AWS workflow ended with ${status}`;

        $("finalStatus").textContent =
            status;


        addEvent(
            `Real AWS workflow ended with ${status}`,
            "bad"
        );

    }

}


/* =========================================================
   RUN BUTTON
   ========================================================= */

$("runBtn")
    .addEventListener(
        "click",
        runWorkflow
    );


/* =========================================================
   RESET
   ========================================================= */

$("resetBtn")
    .addEventListener(
        "click",
        () => {

            running = false;

            $("orderId").value = "";

            $("amount").value = "";

            $("failureToggle").checked =
                false;

            $("failureMode").value =
                "always";

            $("failureMode").disabled =
                true;

            resetUI();

        }
    );


/* =========================================================
   QUICK TESTS
   ========================================================= */

document
    .querySelectorAll(".quick")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const amount =
                        button.dataset.amount;

                    const mode =
                        button.dataset.mode;


                    $("orderId").value =
                        mode === "none"
                            ? "ORD" +
                              Date.now()
                                .toString()
                                .slice(-4)
                            : "FAIL" +
                              Date.now()
                                .toString()
                                .slice(-4);


                    $("amount").value =
                        amount;


                    if (mode === "none") {

                        $("failureToggle").checked =
                            false;

                        $("failureMode").disabled =
                            true;

                    }
                    else {

                        $("failureToggle").checked =
                            true;

                        $("failureMode").disabled =
                            false;

                        $("failureMode").value =
                            mode;

                    }


                    runWorkflow();

                }
            );

        }
    );


/* =========================================================
   FAILURE TOGGLE
   ========================================================= */

$("failureToggle")
    .addEventListener(
        "change",
        event => {

            $("failureMode").disabled =
                !event.target.checked;

        }
    );