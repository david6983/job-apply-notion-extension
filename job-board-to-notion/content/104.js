/* global cleanText, getFirstMatch, safeString */
(function () {
  window.JBTN = window.JBTN || { extractors: {} };

  function extract104() {
    const titleSelectors = [
      "h1",
      ".job-title",
      "[data-qa='job-title']",
      ".job-header__title"
    ];

    const companySelectors = [
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
})();
