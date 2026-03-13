importScripts("lib/utils.js", "lib/config.js", "lib/notion.js");

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
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

  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    return buildError("Could not find active tab.");
  }

  const extraction = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB" }).catch(() => null);
  if (!extraction) {
    return buildError("No response from content script. Is this a supported job page?");
  }
  if (!extraction.ok) {
    return extraction;
  }

  const job = extraction.data;
  // TODO: Consider proxying Notion calls for production security.
  const saved = await createNotionPage(NOTION_TOKEN, NOTION_DATABASE_ID, job);
  if (!saved.ok) {
    return { ok: false, error: saved.error, data: { extracted: job } };
  }

  return buildOk({ extracted: job, notion: saved.data });
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
});
