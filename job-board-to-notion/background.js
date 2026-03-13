importScripts("lib/utils.js", "lib/config.js", "lib/notion.js");

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

async function extractFromActiveTab() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    return buildError("Could not find active tab.");
  }

  const extraction = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB" }).catch(() => null);
  if (!extraction) {
    return buildError("No response from content script. Is this a supported job page?");
  }
  return extraction;
}

async function checkNotionSaved(link) {
  if (!link) return null;
  const found = await findExistingJobByLink(NOTION_TOKEN, NOTION_DATABASE_ID, link);
  if (!found.ok) return null;
  return found.data || null;
}

async function handleExtractCurrent() {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return buildError("Missing Notion credentials.");
  }
  if (
    NOTION_TOKEN === "secret_xxx_replace_me" ||
    NOTION_DATABASE_ID === "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ) {
    return buildError("Please set NOTION_TOKEN and NOTION_DATABASE_ID in lib/config.js");
  }

  const extraction = await extractFromActiveTab();
  if (!extraction.ok) {
    return extraction;
  }

  const job = extraction.data;
  const savedRecord = await checkNotionSaved(job.link);
  return buildOk({ extracted: job, saved: savedRecord });
}

async function handleTestConnection() {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return buildError("Missing Notion credentials.");
  }
  if (
    NOTION_TOKEN === "secret_xxx_replace_me" ||
    NOTION_DATABASE_ID === "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ) {
    return buildError("Please set NOTION_TOKEN and NOTION_DATABASE_ID in lib/config.js");
  }
  return testConnection(NOTION_TOKEN, NOTION_DATABASE_ID);
}

async function handleSaveToNotion(job) {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return buildError("Missing Notion credentials.");
  }
  if (
    NOTION_TOKEN === "secret_xxx_replace_me" ||
    NOTION_DATABASE_ID === "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ) {
    return buildError("Please set NOTION_TOKEN and NOTION_DATABASE_ID in lib/config.js");
  }

  let payloadJob = job;
  if (!payloadJob) {
    const extraction = await extractFromActiveTab();
    if (!extraction.ok) return extraction;
    payloadJob = extraction.data;
  }

  const alreadySaved = await checkNotionSaved(payloadJob.link);
  if (alreadySaved) {
    return { ok: false, error: "Already saved to Notion.", data: { saved: alreadySaved } };
  }

  // TODO: Consider proxying Notion calls for production security.
  const saved = await createNotionPage(NOTION_TOKEN, NOTION_DATABASE_ID, payloadJob);
  if (!saved.ok) {
    return { ok: false, error: saved.error, data: { extracted: payloadJob } };
  }

  return buildOk({ extracted: payloadJob, notion: saved.data });
}

async function handleMarkApplied(job) {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return buildError("Missing Notion credentials.");
  }
  if (
    NOTION_TOKEN === "secret_xxx_replace_me" ||
    NOTION_DATABASE_ID === "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ) {
    return buildError("Please set NOTION_TOKEN and NOTION_DATABASE_ID in lib/config.js");
  }

  let payloadJob = job;
  if (!payloadJob) {
    const extraction = await extractFromActiveTab();
    if (!extraction.ok) return extraction;
    payloadJob = extraction.data;
  }

  const existing = await findExistingJobByLink(NOTION_TOKEN, NOTION_DATABASE_ID, payloadJob.link);
  if (!existing.ok || !existing.data || !existing.data.pageId) {
    return buildError("Not saved in Notion yet.");
  }

  const updated = await updateJobStage(NOTION_TOKEN, existing.data.pageId, "Applied");
  if (!updated.ok) {
    return buildError(updated.error);
  }

  const savedRecord = {
    savedAt: existing.data.savedAt,
    status: "Applied"
  };

  return buildOk({ extracted: payloadJob, saved: savedRecord });
}

async function handleGetStats() {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return buildError("Missing Notion credentials.");
  }
  if (
    NOTION_TOKEN === "secret_xxx_replace_me" ||
    NOTION_DATABASE_ID === "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ) {
    return buildError("Please set NOTION_TOKEN and NOTION_DATABASE_ID in lib/config.js");
  }
  return getAppliedStats(NOTION_TOKEN, NOTION_DATABASE_ID);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "EXTRACT_CURRENT") {
    handleExtractCurrent().then(sendResponse);
    return true;
  }

  if (message.type === "TEST_CONNECTION") {
    handleTestConnection().then(sendResponse);
    return true;
  }

  if (message.type === "SAVE_TO_NOTION") {
    handleSaveToNotion(message.job).then(sendResponse);
    return true;
  }

  if (message.type === "MARK_APPLIED") {
    handleMarkApplied(message.job).then(sendResponse);
    return true;
  }

  if (message.type === "GET_STATS") {
    handleGetStats().then(sendResponse);
    return true;
  }
});
