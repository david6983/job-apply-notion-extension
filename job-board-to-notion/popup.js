const testBtn = document.getElementById("testBtn");
const extractBtn = document.getElementById("extractBtn");
const statusEl = document.getElementById("status");
const resultJsonEl = document.getElementById("resultJson");

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type || "muted"}`;
}

function setResult(data) {
  resultJsonEl.textContent = JSON.stringify(data || {}, null, 2);
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

extractBtn.addEventListener("click", () => {
  setStatus("Extracting job data...", "muted");
  setResult({});
  chrome.runtime.sendMessage({ type: "EXTRACT_CURRENT" }, (response) => {
    if (!response) {
      setStatus("No response from background.", "error");
      return;
    }
    if (response.ok) {
      setStatus("Saved to Notion successfully.", "ok");
    } else {
      setStatus(response.error || "Extraction failed.", "error");
    }
    setResult(response.data || response);
  });
});
