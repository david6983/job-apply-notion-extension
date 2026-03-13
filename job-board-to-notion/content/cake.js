/* global cleanText, getFirstMatch, safeString */
(function () {
  window.JBTN = window.JBTN || { extractors: {} };

  function extractCake() {
    const titleSelectors = [
      "h1",
      ".job-header__title",
      "[data-testid='job-title']"
    ];

    const companySelectors = [
      ".job-header__company-name",
      ".job-header__company-name a",
      "[data-testid='company-name']",
      ".company-name"
    ];

    const jobTitle = getFirstMatch(titleSelectors);
    const companyName = getFirstMatch(companySelectors);

    return {
      link: safeString(window.location.href),
      jobTitle: cleanText(jobTitle),
      companyName: cleanText(companyName),
      source: "cake"
    };
  }

  window.JBTN.extractors.cake = extractCake;
})();
