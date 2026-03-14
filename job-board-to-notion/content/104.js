/* global cleanText, getFirstMatch, safeString */
(function () {
  window.JBTN = window.JBTN || { extractors: {} };

  if (!window.location || !window.location.hostname) return;
  if (!window.location.hostname.includes("104.com.tw")) return;

  const STATUS_ID = "jbtn-apply-status";

  function getTitleElement() {
    const selectors = [
      ".hero-corp",
      "h1",
      ".job-title",
      "[data-qa='job-title']",
      ".job-header__title"
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function upsertStatusBadge(isApplied) {
    const target = getTitleElement();
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

  function checkAppliedStatus() {
    const link = safeString(window.location.href);
    chrome.runtime.sendMessage({ type: "CHECK_SAVED_STATUS", link }, (response) => {
      if (!response || !response.ok) return;
      const saved = response.data ? response.data.saved : null;
      const status = saved && saved.status ? String(saved.status).toLowerCase() : "";
      upsertStatusBadge(status === "applied");
    });
  }

  function extract104() {
    const titleSelectors = [
      ".hero-corp",
      "h1",
      ".job-title",
      "[data-qa='job-title']",
      ".job-header__title"
    ];

    const companySelectors = [
      ".hero-head-company-title",
      ".company-name",
      ".company-name a",
      "[data-qa='company-name']",
      ".company-header__name"
    ];

    const jobTitle = getFirstMatch(titleSelectors);
    const companyName = getFirstMatch(companySelectors);

    return {
      link: safeString(window.location.href),
      jobTitle: cleanText(jobTitle),
      companyName: cleanText(companyName),
      source: "104"
    };
  }

  window.JBTN.extractors["104"] = extract104;

  checkAppliedStatus();
})();
