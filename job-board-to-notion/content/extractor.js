/* global buildError, buildOk */
(function () {
  if (!window.JBTN) {
    window.JBTN = { extractors: {} };
  }

  function detectSource(hostname) {
    if (!hostname) return null;
    if (hostname.includes("linkedin.com")) return "linkedin";
    if (hostname.includes("cake.me")) return "cake";
    if (hostname.includes("104.com.tw")) return "104";
    return null;
  }

  function extractCurrentPage() {
    const source = detectSource(window.location.hostname);
    if (!source) {
      return buildError("Unsupported page. This site is not configured.");
    }

    const extractor = window.JBTN.extractors[source];
    if (!extractor) {
      return buildError("Extractor not available for this site.");
    }

    try {
      // TODO: Some pages render data after navigation; consider waiting or observing DOM changes.
      const data = extractor();
      if (!data || !data.jobTitle || !data.companyName) {
        return buildError("Extraction failed. Required fields missing.");
      }
      return buildOk(data);
    } catch (err) {
      return buildError(`Extraction failed: ${err.message || err}`);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "EXTRACT_JOB") return;
    const result = extractCurrentPage();
    sendResponse(result);
  });
})();
