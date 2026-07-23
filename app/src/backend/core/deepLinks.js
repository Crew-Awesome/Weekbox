import { gameBananaApi } from "../api/gamebanana.js";
import { modModal } from "../../ui/js/home/modal/index.js";
import { sidebar } from "../../ui/js/sidebar.js";
import { router } from "./router.js";

function parseWeekboxLink(value) {
  const directMatch = String(value || "")
    .trim()
    .match(/^weekbox:\/\/mod(?:\/|,)(\d+)\/?$/i);
  if (directMatch) return { type: "mod", id: Number(directMatch[1]) };

  try {
    const url = new URL(value);
    if (url.protocol !== "weekbox:") return null;
    const type = url.hostname.toLowerCase();
    const id = Number(url.pathname.replace(/^\//, ""));
    if (type !== "mod" || !Number.isInteger(id) || id <= 0) return null;
    return { type, id };
  } catch (error) {
    return null;
  }
}

export async function openWeekboxLink(value) {
  const target = parseWeekboxLink(value);
  if (!target) return false;

  const engineId = gameBananaApi.getEngineIdForSubmission(
    `${target.type}s`,
    target.id,
  );
  if (engineId) return sidebar.openEngine(engineId);

  await router.navigate("home");
  await modModal.open(target.id);
  return true;
}

export async function openLaunchDeepLink() {
  const link = window.NL_ARGS?.find((argument) =>
    argument.toLowerCase().startsWith("weekbox:"),
  );
  if (!link) return false;
  await Neutralino.window.focus().catch(() => {});
  return openWeekboxLink(link);
}
