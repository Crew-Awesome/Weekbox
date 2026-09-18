import { router } from "./router.service.js";
import { gameBananaApi } from "../../providers/gamebanana/gamebanana.provider.js";

import { modModal } from "../../../ui/js/home/modal/index.js";
import { sidebar as sidebar2 } from "../../../ui/js/sidebar.js";

function getWeekboxLinkFromArgs(
  args = typeof window === "undefined" ? [] : window.NL_ARGS,
) {
  if (!Array.isArray(args)) return null;
  return (
    args.find(
      (argument) =>
        typeof argument === "string" &&
        argument
          .trim()
          .replace(/^"|"$/g, "")
          .toLowerCase()
          .startsWith("weekbox:"),
    ) || null
  );
}

function parseWeekboxLink(value) {
  const link = String(value || "")
    .trim()
    .replace(/^"|"$/g, "");
  const directMatch = link.match(/^weekbox:\/\/mod(?:\/|,)(\d+)\/?$/i);
  if (directMatch) return { type: "mod", id: Number(directMatch[1]) };
  try {
    const url = new URL(link);
    if (url.protocol !== "weekbox:") return null;
    const type = url.hostname.toLowerCase();
    const id = Number(url.pathname.replace(/^\//, ""));
    if (type !== "mod" || !Number.isInteger(id) || id <= 0) return null;
    return { type, id };
  } catch {
    return null;
  }
}
async function openWeekboxLink(value) {
  const target = parseWeekboxLink(value);
  if (!target) return false;
  const engineId = gameBananaApi.getEngineIdForSubmission(
    `${target.type}s`,
    target.id,
  );
  if (engineId) return sidebar2.openEngine(engineId);
  await router.navigate("home");
  await modModal.open(target.id);
  return true;
}
async function openLaunchDeepLink() {
  const link = getWeekboxLinkFromArgs();
  if (!link) return false;
  await Neutralino.window.focus().catch(() => {});
  return openWeekboxLink(link);
}

export {
  getWeekboxLinkFromArgs,
  parseWeekboxLink,
  openWeekboxLink,
  openLaunchDeepLink,
};
