function sameProcessId(left, right) {
  return String(left) === String(right);
}

function getOsProcessId(process) {
  return process?.pid ?? process?.id ?? null;
}

export { sameProcessId, getOsProcessId };
