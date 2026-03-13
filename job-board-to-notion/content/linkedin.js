/* global cleanText, getFirstMatch, safeString */
(function () {
  window.JBTN = window.JBTN || { extractors: {} };

  function extractLinkedIn() {
    const titleSelectors = [
      "h1.top-card-layout__title",
      "h1.topcard__title",
      "h1.jobs-unified-top-card__job-title",
      "h1.t-24",
      "h1"
    ];

    const companySelectors = [
      "a.topcard__org-name-link",
      ".top-card-layout__card .top-card-layout__company-name",
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name",
      "a.topcard__org-name-link"
    ];

    const jobTitle = getFirstMatch(titleSelectors);
    const companyName = getFirstMatch(companySelectors);

    return {
      link: safeString(window.location.href),
      jobTitle: cleanText(jobTitle),
      companyName: cleanText(companyName),
      source: "linkedin"
    };
  }

  window.JBTN.extractors.linkedin = extractLinkedIn;
})();
