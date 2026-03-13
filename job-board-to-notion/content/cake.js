/* global cleanText, getFirstMatch, safeString */
(function () {
  window.JBTN = window.JBTN || { extractors: {} };

  function extractCompanyName(rawText) {
    const text = cleanText(rawText);
    if (!text) return "";
    const parts = text.split(" ").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (/[A-Za-z]/.test(last)) return last;
    return text;
  }

  function getCompanyFromLogoAlt() {
    const logo = document.querySelector("img.CompanyLogo-module-scss-module__2L-8SG__logo");
    const alt = logo ? cleanText(logo.alt) : "";
    if (!alt) return "";
    const stripped = alt.replace(/^Logo of\s+/i, "").replace(/\.$/, "");
    return extractCompanyName(stripped);
  }

  function extractCake() {
    const titleSelectors = [
      "h1.JobDescriptionLeftColumn-module-scss-module__16Kv_a__title",
      "h1",
      ".job-header__title",
      "[data-testid='job-title']"
    ];

    const companySelectors = [
      ".JobDescriptionLeftColumn-module-scss-module__16Kv_a__name h2",
      ".job-header__company-name",
      ".job-header__company-name a",
      "[data-testid='company-name']",
      ".company-name"
    ];

    const jobTitle = getFirstMatch(titleSelectors);
    let companyName = getFirstMatch(companySelectors);
    if (!companyName) {
      companyName = getCompanyFromLogoAlt();
    }

    return {
      link: safeString(window.location.href),
      jobTitle: cleanText(jobTitle),
      companyName: extractCompanyName(companyName),
      source: "cake"
    };
  }

  window.JBTN.extractors.cake = extractCake;
})();
