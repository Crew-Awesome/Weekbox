function looksLikeHtmlResponse(sample) {
  return /<(?:!doctype\s+html|html\b|head\b|body\b|form\b)/i.test(
    String(sample || ""),
  );
}

function getHtmlResponseError(sample) {
  const html = String(sample || "");
  if (!looksLikeHtmlResponse(html)) return null;
  const lower = html.toLowerCase();

  // If this is a Google Drive download confirmation page, it is not an error
  const hasConfirmationForm =
    /<form[^>]+action="[^"]*(?:download|uc\?)[^"]*"/i.test(html) ||
    /id=["'](?:download-form|downloadForm|uc-download-link)["']/i.test(html) ||
    /name=["'](?:confirm|uuid)["']/i.test(html);
  if (hasConfirmationForm) {
    return null;
  }

  if (
    lower.includes("quota exceeded") ||
    lower.includes("too many users have viewed or downloaded this file recently") ||
    lower.includes("ha superado la cuota") ||
    lower.includes("ha superado su cuota")
  ) {
    return new Error(
      "Google Drive download quota exceeded. Try another download link or try again later.",
    );
  }
  if (
    lower.includes("access denied") ||
    lower.includes("you need access") ||
    lower.includes("sign in to continue")
  ) {
    return new Error(
      "Google Drive denied access to this file. Check its sharing permissions or use another download link.",
    );
  }
  if (
    lower.includes("file not found") ||
    lower.includes("sorry, the file you have requested does not exist")
  ) {
    return new Error(
      "Google Drive could not find this file. It may have been deleted.",
    );
  }
  const title = html
    .match(/<(?:title|h1)[^>]*>([^<]+)<\/\s*(?:title|h1)>/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  return new Error(
    `The download server returned a web page instead of an archive${title ? ` (${title})` : ""}. Choose another download or try again later.`,
  );
}

module.exports = { looksLikeHtmlResponse, getHtmlResponseError };
