function cleanText(value) {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function getFirstMatch(selectors, root) {
  const base = root && root.querySelector ? root : document;
  if (!base || !selectors || !selectors.length) return null;
  for (const selector of selectors) {
    const el = base.querySelector(selector);
    if (el && el.textContent) {
      const text = cleanText(el.textContent);
      if (text) return text;
    }
  }
  return null;
}

function safeString(value, fallback) {
  const cleaned = cleanText(value);
  return cleaned || fallback || "";
}

function toIsoNow() {
  return new Date().toISOString();
}

function buildError(message) {
  return { ok: false, error: message };
}

function buildOk(data) {
  return { ok: true, data: data };
}

if (typeof window !== "undefined") {
  window.cleanText = cleanText;
  window.getFirstMatch = getFirstMatch;
  window.safeString = safeString;
  window.toIsoNow = toIsoNow;
  window.buildError = buildError;
  window.buildOk = buildOk;
}

if (typeof self !== "undefined") {
  self.cleanText = cleanText;
  self.getFirstMatch = getFirstMatch;
  self.safeString = safeString;
  self.toIsoNow = toIsoNow;
  self.buildError = buildError;
  self.buildOk = buildOk;
}
