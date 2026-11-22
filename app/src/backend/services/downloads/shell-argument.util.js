export function quoteCommandArgument(value) {
  const argument = String(value ?? "").replace(/[\r\n]/g, "");
  if (typeof window !== "undefined" && window.NL_OS === "Windows") {
    return `"${argument.replace(/["^]/g, "^$&")}"`;
  }
  const escaped = argument.replaceAll("'", "'\"'\"'");
  return `'${escaped}'`;
}
