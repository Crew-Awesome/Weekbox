function findDescendantPids(processes, rootPid) {
  const root = Number.parseInt(rootPid, 10);
  if (!Number.isSafeInteger(root) || root <= 0) return [];
  const childrenByParent = /* @__PURE__ */ new Map();
  for (const process of processes) {
    const pid = Number.parseInt(process.pid, 10);
    const parentPid = Number.parseInt(process.parentPid, 10);
    if (!Number.isSafeInteger(pid) || !Number.isSafeInteger(parentPid))
      continue;
    const children = childrenByParent.get(parentPid) || [];
    children.push(pid);
    childrenByParent.set(parentPid, children);
  }
  const descendants = [];
  const queue = [...childrenByParent.get(root) || []];
  const seen = /* @__PURE__ */ new Set([root]);
  while (queue.length > 0) {
    const pid = queue.shift();
    if (seen.has(pid)) continue;
    seen.add(pid);
    descendants.push(pid);
    queue.push(...childrenByParent.get(pid) || []);
  }
  return descendants;
}

function parseWindowsProcessTree(output) {
  if (!String(output || "").trim()) return [];
  try {
    const parsed = JSON.parse(output);
    return (Array.isArray(parsed) ? parsed : [parsed]).map((process) => ({
      pid: process.ProcessId,
      parentPid: process.ParentProcessId
    }));
  } catch {
    return [];
  }
}

function parsePosixProcessTree(output) {
  return String(output || "").split(/\r?\n/).map((line) => line.trim().match(/^(\d+)\s+(\d+)$/)).filter(Boolean).map((match) => ({ pid: match[1], parentPid: match[2] }));
}

export { parseWindowsProcessTree, parsePosixProcessTree, findDescendantPids };
