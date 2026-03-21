/* global cleanText, safeString */
(function () {
  window.JBTN = window.JBTN || { extractors: {} };

  const STATUS_ID = "jbtn-apply-status";

  function isVisible(el) {
    if (!el) return false;
    const rects = el.getClientRects();
    return !!(rects && rects.length);
  }

  function getFirstElement(selectors, root) {
    const base = root && root.querySelector ? root : document;
    if (!base || !selectors || !selectors.length) return null;
    for (const selector of selectors) {
      const el = base.querySelector(selector);
      if (el && isVisible(el)) return el;
    }
    return null;
  }

  function getTextFromSelectors(selectors, root) {
    const el = getFirstElement(selectors, root);
    if (!el) return "";
    return cleanText(el.textContent);
  }

  function includesRemote(value) {
    return /remote/i.test(cleanText(value));
  }

  function includesTaiwan(value) {
    return /taiwan/i.test(cleanText(value));
  }

  function looksLikeTaiwanRemote(value) {
    return /taiwan\s*\(\s*remote\s*\)/i.test(cleanText(value));
  }

  function normalizeLinkedInLocationText(value) {
    const cleaned = cleanText(value);
    if (!cleaned) return "";
    const parts = cleaned
      .split(/[·•]/)
      .map((part) => cleanText(part))
      .filter(Boolean);
    return parts[0] || cleaned;
  }

  function isNonLocationText(value) {
    const text = cleanText(value).toLowerCase();
    if (!text) return true;
    if (/\bago\b/.test(text)) return true;
    if (/\bapplicant\b/.test(text) || /\bapplicants\b/.test(text)) return true;
    if (/\bapplied\b/.test(text)) return true;
    if (/\bclick(ed)?\b/.test(text) && /\bapply\b/.test(text)) return true;
    if (/^\d+\s*(hours?|days?|minutes?)\b/.test(text)) return true;
    return false;
  }

  function getLinkedInRawLocationText(root) {
    const containerSelectors = [
      ".job-details-jobs-unified-top-card__tertiary-description-container",
      ".job-details-jobs-unified-top-card__primary-description-container",
      ".jobs-unified-top-card__tertiary-description-container",
      ".jobs-unified-top-card__primary-description-container"
    ];

    const container = getFirstElement(containerSelectors, root);
    if (container) {
      const lowEmphasis = container.querySelectorAll(".tvm__text--low-emphasis");
      for (const el of lowEmphasis) {
        const text = cleanText(el.textContent);
        if (!isNonLocationText(text)) {
          return normalizeLinkedInLocationText(text);
        }
      }

      const containerText = normalizeLinkedInLocationText(container.textContent);
      if (containerText && !isNonLocationText(containerText)) {
        return containerText;
      }
    }

    const fallbackText = normalizeLinkedInLocationText(
      getTextFromSelectors(
        [
          ".job-details-jobs-unified-top-card__tertiary-description-container .tvm__text--low-emphasis",
          ".job-details-jobs-unified-top-card__primary-description-container .tvm__text--low-emphasis",
          ".jobs-unified-top-card__tertiary-description-container .tvm__text--low-emphasis",
          ".jobs-unified-top-card__primary-description-container .tvm__text--low-emphasis"
        ],
        root
      )
    );

    if (fallbackText && !isNonLocationText(fallbackText)) {
      return fallbackText;
    }

    return "";
  }

  function deriveLinkedInLocation({ jobTitle, locationText }) {
    const title = cleanText(jobTitle);
    const location = cleanText(locationText);

    if (looksLikeTaiwanRemote(title)) {
      return "Taiwan, Remote";
    }

    if (includesRemote(title)) {
      return "APAC (remote)";
    }

    if (includesTaiwan(location) && (includesRemote(location) || looksLikeTaiwanRemote(location))) {
      return "Taiwan, Remote";
    }

    if (includesRemote(location)) {
      return "APAC (remote)";
    }

    return normalizeLinkedInLocationText(location);
  }

  function toAbsoluteUrl(url) {
    const cleaned = cleanText(url);
    if (!cleaned) return "";
    try {
      return new URL(cleaned, window.location.origin).toString();
    } catch (err) {
      return cleaned;
    }
  }

  function toCanonicalLinkedInJobUrl(url) {
    const cleaned = cleanText(url);
    if (!cleaned) return "";
    try {
      const parsed = new URL(cleaned, window.location.origin);
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch (err) {
      return cleaned;
    }
  }

  function getCurrentJobIdFromLocation() {
    try {
      const parsed = new URL(window.location.href);
      const id = parsed.searchParams.get("currentJobId");
      return id && /^[0-9]+$/.test(id) ? id : "";
    } catch (err) {
      return "";
    }
  }

  function buildJobViewUrl(jobId) {
    if (!jobId) return "";
    return `https://www.linkedin.com/jobs/view/${jobId}/`;
  }

  function getJobDetailsRoot() {
    const rootSelectors = [
      ".job-details-jobs-unified-top-card",
      ".jobs-unified-top-card",
      ".jobs-unified-top-card__content--two-pane",
      ".job-details-jobs-unified-top-card__content",
      ".jobs-unified-top-card__content"
    ];

    for (const selector of rootSelectors) {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) return el;
    }

    return document;
  }

  function getTitleElement(root) {
    const selectors = [
      "h1.t-24.t-bold.inline a",
      "h1.t-24.t-bold.inline",
      ".job-details-jobs-unified-top-card__job-title",
      "h1.jobs-unified-top-card__job-title",
      "h1.t-24",
      "h1"
    ];
    return getFirstElement(selectors, root);
  }

  function upsertStatusBadge(isApplied, root) {
    const target = getTitleElement(root);
    if (!target || !target.parentElement) return;

    let badge = document.getElementById(STATUS_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = STATUS_ID;
      badge.style.marginTop = "6px";
      badge.style.fontSize = "12px";
      badge.style.fontWeight = "700";
      target.parentElement.insertBefore(badge, target.nextSibling);
    }

    if (isApplied) {
      badge.textContent = "Applied";
      badge.style.color = "#2f7a3f";
    } else {
      badge.textContent = "Not applied";
      badge.style.color = "#b63a2d";
    }
  }

  function getCurrentJobLink(root) {
    const titleAnchor = getFirstElement(
      [
        "h1.t-24.t-bold.inline a",
        ".job-details-jobs-unified-top-card__job-title a",
        "h1.jobs-unified-top-card__job-title a",
        "h1.t-24 a",
        "h1 a"
      ],
      root
    );

    if (titleAnchor && titleAnchor.getAttribute) {
      const href = titleAnchor.getAttribute("href");
      const abs = toAbsoluteUrl(href);
      const canonical = toCanonicalLinkedInJobUrl(abs);
      if (canonical) return canonical;
    }

    const jobId = getCurrentJobIdFromLocation();
    if (jobId) {
      return buildJobViewUrl(jobId);
    }

    return safeString(window.location.href);
  }

  function checkAppliedStatus() {
    const root = getJobDetailsRoot();
    const link = getCurrentJobLink(root);
    if (!link) return;
    chrome.runtime.sendMessage({ type: "CHECK_SAVED_STATUS", link }, (response) => {
      if (!response || !response.ok) return;
      const saved = response.data ? response.data.saved : null;
      const status = saved && saved.status ? String(saved.status).toLowerCase() : "";
      upsertStatusBadge(status === "applied", root);
    });
  }

  function extractLinkedInJob() {
    const root = getJobDetailsRoot();

    const titleSelectors = [
      "h1.t-24.t-bold.inline a",
      "h1.t-24.t-bold.inline",
      ".job-details-jobs-unified-top-card__job-title",
      "h1.jobs-unified-top-card__job-title",
      "h1.t-24",
      "h1"
    ];

    const companySelectors = [
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name"
    ];

    const jobTitle = getTextFromSelectors(titleSelectors, root);
    const companyName = getTextFromSelectors(companySelectors, root);
    const rawLocationText = getLinkedInRawLocationText(root);
    const location = deriveLinkedInLocation({ jobTitle, locationText: rawLocationText });

    const link = getCurrentJobLink(root);

    if (!jobTitle) {
      console.warn("LinkedIn extractor: job title not found in selected job panel.");
    }
    if (!companyName) {
      console.warn("LinkedIn extractor: company name not found in selected job panel.");
    }
    if (!rawLocationText) {
      console.warn("LinkedIn extractor: location text not found in selected job panel.");
    }

    if (!jobTitle || !companyName) return null;

    return {
      link: link,
      jobTitle: jobTitle,
      companyName: companyName,
      location: location,
      source: "linkedin"
    };
  }

  window.JBTN.extractors.linkedin = extractLinkedInJob;

  checkAppliedStatus();
  document.addEventListener("click", () => {
    window.clearTimeout(window.__jbtnLinkedInStatusTimer);
    window.__jbtnLinkedInStatusTimer = window.setTimeout(checkAppliedStatus, 250);
  });
})();
