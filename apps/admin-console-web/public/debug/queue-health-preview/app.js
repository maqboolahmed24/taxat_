const persistedContract = {
  basisHash: "sha256:d08e5f2d3788c574acbbecf2d8fce7387c9c9c053f82d7ccdbb29f2a2cb7c6c5",
  healthScore: 28,
  healthState: "SATURATED",
  intervention: "STAFFING_REVIEW",
  pressureScore: 72,
  reasonCodes: [
    "WORK_QUEUE_HEALTH_DEGRADED",
    "WORK_QUEUE_SATURATED",
    "WORK_QUEUE_UTILIZATION_SATURATED",
    "WORK_QUEUE_WAIT_PROBABILITY_HIGH",
    "WORK_QUEUE_BACKLOG_AGE_HIGH",
    "QUEUE_STAFFING_REVIEW_REQUIRED",
  ],
  sourcePolicy: "PERSISTED_WORK_QUEUE_HEALTH_CONTRACT_ONLY",
};

function text(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function renderReasons() {
  const root = document.querySelector("#reasonRows");
  if (!root) {
    return;
  }
  root.textContent = "";
  persistedContract.reasonCodes.forEach((code, index) => {
    const row = document.createElement("tr");
    const order = document.createElement("td");
    order.textContent = String(index + 1);
    const codeCell = document.createElement("td");
    codeCell.textContent = code;
    const source = document.createElement("td");
    source.textContent = "work_queue_health_contract.reason_codes";
    row.append(order, codeCell, source);
    root.append(row);
  });
}

text("#healthScore", `${persistedContract.healthScore}/100`);
text("#healthState", persistedContract.healthState);
text("#pressureScore", `${persistedContract.pressureScore}/100`);
text("#recommendationState", persistedContract.intervention);
text("#recommendationBasis", "Recommendation state is copied from the serialized contract.");
text("#basisHash", persistedContract.basisHash);
text("#sourcePolicy", persistedContract.sourcePolicy);

const pressureFill = document.querySelector("#pressureFill");
if (pressureFill) {
  pressureFill.style.width = `${persistedContract.pressureScore}%`;
}

renderReasons();
