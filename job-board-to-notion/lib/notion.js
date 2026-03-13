/* global cleanText, buildError, buildOk */
const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function validateConfig(token, databaseId) {
  if (!cleanText(token)) {
    return buildError("Missing Notion token.");
  }
  if (!cleanText(databaseId)) {
    return buildError("Missing Notion database ID.");
  }
  return buildOk({ token: cleanText(token), databaseId: cleanText(databaseId) });
}

function getTodayDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getCandidatureTypeFromUrl(url) {
  const value = cleanText(url).toLowerCase();
  if (value.includes("linkedin.com")) return "linkedin";
  if (value.includes("104.com.tw")) return "104";
  if (value.includes("cake.me")) return "cake";
  return "website";
}

function buildTypeDeCandidature(value) {
  // TODO: Switch to { select: { name: value } } if the property is a select.
  return { multi_select: [{ name: value }] };
}

function buildLinkProperty(link) {
  // Link is rich_text in this database.
  return { rich_text: [{ text: { content: link || "" } }] };
}

function buildLocationProperty(value) {
  // Location is multi_select in this database.
  return { multi_select: [{ name: value }] };
}

function buildNotionProperties(job) {
  const link = cleanText(job.link);
  const company = cleanText(job.companyName);
  const position = cleanText(job.jobTitle);
  const candidature = getCandidatureTypeFromUrl(link);

  return {
    "Company": {
      title: [{ text: { content: company } }]
    },
    "Position": {
      rich_text: [{ text: { content: position } }]
    },
    "Link": buildLinkProperty(link),
    "Stage": {
      select: { name: "Ready to Apply" }
    },
    "Applied date": {
      date: { start: getTodayDateString() }
    },
    "Location": buildLocationProperty("Taiwan"),
    "Type de candidature": buildTypeDeCandidature(candidature)
  };
}

function buildNotionPayload(databaseId, job) {
  if (!job || !cleanText(job.jobTitle) || !cleanText(job.companyName)) {
    return buildError("Missing required job fields.");
  }

  return buildOk({
    parent: { database_id: databaseId },
    properties: buildNotionProperties(job)
  });
}

async function notionRequest(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = json && Object.keys(json).length ? ` ${JSON.stringify(json)}` : "";
    let message = json && json.message ? json.message : `Notion API error (${res.status}).`;
    if (json && json.code === "validation_error") {
      message = `${message} (Check property names/types in Notion.)`;
    }
    return buildError(`${message}${details}`.trim());
  }
  return buildOk(json);
}

function readSelectName(prop) {
  if (!prop) return "";
  if (prop.select && prop.select.name) return prop.select.name;
  return "";
}

function readDateStart(prop) {
  if (!prop || !prop.date) return "";
  return prop.date.start || "";
}

function buildSavedRecordFromPage(page) {
  if (!page || !page.properties) return null;
  const props = page.properties;
  const savedAt = readDateStart(props["Applied date"]) || page.created_time || "";
  const status = readSelectName(props["Stage"]) || "";
  return { pageId: page.id, savedAt, status };
}

async function createNotionPage(token, databaseId, job) {
  const configCheck = validateConfig(token, databaseId);
  if (!configCheck.ok) return configCheck;

  const payload = buildNotionPayload(databaseId, job);
  if (!payload.ok) return payload;

  // TODO: Add retry/backoff and rate-limit handling for production use.
  return notionRequest(`${NOTION_API_BASE}/pages`, token, payload.data);
}

async function findExistingJobByLink(token, databaseId, link) {
  const configCheck = validateConfig(token, databaseId);
  if (!configCheck.ok) return configCheck;
  if (!cleanText(link)) return buildOk(null);

  const body = {
    filter: {
      property: "Link",
      rich_text: {
        equals: cleanText(link)
      }
    },
    page_size: 1
  };

  const res = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = json && json.message ? json.message : `Notion API error (${res.status}).`;
    return buildError(message);
  }

  const page = json.results && json.results[0] ? json.results[0] : null;
  if (!page) return buildOk(null);
  return buildOk(buildSavedRecordFromPage(page));
}

async function updateJobStage(token, pageId, stageName) {
  if (!cleanText(pageId)) {
    return buildError("Missing Notion page id.");
  }

  const body = {
    properties: {
      "Stage": {
        select: { name: stageName }
      }
    }
  };

  const res = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = json && json.message ? json.message : `Notion API error (${res.status}).`;
    return buildError(message);
  }

  return buildOk(json);
}

async function testConnection(token, databaseId) {
  const configCheck = validateConfig(token, databaseId);
  if (!configCheck.ok) return configCheck;

  const res = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION
    }
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json && json.message ? json.message : `Notion API error (${res.status}).`;
    return buildError(message);
  }

  const props = json.properties || {};
  const required = {
    "Company": "title",
    "Position": "rich_text",
    "Link": "rich_text",
    "Stage": "select",
    "Applied date": "date",
    "Location": "multi_select",
    "Type de candidature": "multi_select"
  };

  for (const [name, type] of Object.entries(required)) {
    if (!props[name]) {
      return buildError(`Database missing property: ${name}.`);
    }
    if (props[name].type !== type) {
      return buildError(`Property type mismatch for ${name}. Expected ${type}.`);
    }
  }

  return buildOk({
    databaseId: databaseId,
    title: json.title && json.title[0] ? json.title[0].plain_text : "(untitled)"
  });
}

if (typeof self !== "undefined") {
  self.createNotionPage = createNotionPage;
  self.testConnection = testConnection;
  self.findExistingJobByLink = findExistingJobByLink;
  self.updateJobStage = updateJobStage;
}
