const testBtn = document.getElementById("testBtn");
const saveBtn = document.getElementById("saveBtn");
const appliedBtn = document.getElementById("appliedBtn");
const statusEl = document.getElementById("status");
const resultJsonEl = document.getElementById("resultJson");
const savedStatusEl = document.getElementById("savedStatus");
const jobTitleEl = document.getElementById("jobTitle");
const companyNameEl = document.getElementById("companyName");
const jobLinkEl = document.getElementById("jobLink");

let currentJob = null;

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type || "muted"}`;
}

function setResult(data) {
  resultJsonEl.textContent = JSON.stringify(data || {}, null, 2);
}

function setExtracted(job) {
  currentJob = job || null;
  jobTitleEl.textContent = (job && job.jobTitle) || "-";
  companyNameEl.textContent = (job && job.companyName) || "-";
  jobLinkEl.textContent = (job && job.link) || "-";
}

function setSavedStatus(record) {
  if (!record) {
    savedStatusEl.textContent = "Not saved yet.";
    savedStatusEl.className = "status muted";
    saveBtn.disabled = false;
    appliedBtn.disabled = true;
    return;
  }
  const date = record.savedAt ? new Date(record.savedAt).toLocaleString() : "unknown date";
  const status = (record.status || "").toLowerCase();
  if (status === "applied") {
    savedStatusEl.textContent = `You already applied this on ${date}. Applied.`;
    savedStatusEl.className = "status applied";
  } else {
    savedStatusEl.textContent = `You saved this on ${date}. NOT YET APPLIED!.`;
    savedStatusEl.className = "status ready";
  }
  saveBtn.disabled = true;
  appliedBtn.disabled = status === "applied";
}

function runExtraction() {
  setStatus("Extracting job data...", "muted");
  setResult({});
  chrome.runtime.sendMessage({ type: "EXTRACT_CURRENT" }, (response) => {
    if (!response) {
      setStatus("No response from background.", "error");
      return;
    }
    if (response.ok) {
      setStatus("Extraction ready.", "ok");
      setExtracted(response.data.extracted);
      setSavedStatus(response.data.saved);
    } else {
      setStatus(response.error || "Extraction failed.", "error");
      setExtracted(null);
      setSavedStatus(null);
    }
    setResult(response.data || response);
  });
}

testBtn.addEventListener("click", () => {
  setStatus("Testing Notion connection...", "muted");
  setResult({});
  chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, (response) => {
    if (!response) {
      setStatus("No response from background.", "error");
      return;
    }
    if (response.ok) {
      setStatus("Notion connection looks good.", "ok");
    } else {
      setStatus(response.error || "Notion test failed.", "error");
    }
    setResult(response.data || response);
  });
});

saveBtn.addEventListener("click", () => {
  if (!currentJob) {
    runExtraction();
    return;
  }
  setStatus("Saving to Notion...", "muted");
  setResult({});
  chrome.runtime.sendMessage({ type: "SAVE_TO_NOTION", job: currentJob }, (response) => {
    if (!response) {
      setStatus("No response from background.", "error");
      return;
    }
    if (response.ok) {
      setStatus("Saved to Notion successfully.", "ok");
      runExtraction();
    } else {
      setStatus(response.error || "Save failed.", "error");
    }
    setResult(response.data || response);
  });
});

appliedBtn.addEventListener("click", () => {
  if (!currentJob) {
    runExtraction();
    return;
  }
  setStatus("Marking as Applied...", "muted");
  setResult({});
  chrome.runtime.sendMessage({ type: "MARK_APPLIED", job: currentJob }, (response) => {
    if (!response) {
      setStatus("No response from background.", "error");
      return;
    }
    if (response.ok) {
      setStatus("Marked as Applied.", "ok");
      setSavedStatus(response.data.saved);
    } else {
      setStatus(response.error || "Update failed.", "error");
    }
    setResult(response.data || response);
  });
});

runExtraction();
