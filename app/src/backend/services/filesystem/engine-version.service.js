var ENGINE_VERSION_PATTERN = /^(?:Latest|Nightly|[a-z]+-\d{1,4}|v?\d{1,4}\.\d{1,4}(?:\.\d{1,4})?(?:[a-z][a-z0-9.-]*|[-+][0-9a-z][0-9a-z.-]*)?|\d{1,3}\.\d{1,3}\.\d{2}\.\d{2}\.\d{2})$/i;
function isValidEngineVersion(version) {
  return ENGINE_VERSION_PATTERN.test(String(version || ""));
}

export { isValidEngineVersion };
