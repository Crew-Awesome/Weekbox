import { isDependencySubmission } from "../../utils/gamebanana/submission-links.js";
export const EXCLUDED_ENGINE_SUBMISSIONS = new Map([
  ["mods:309789", "psych"],
  ["mods:44201", "fpsplus"],
  ["mods:598553", "codename"],
  ["mods:535203", "pslice"],
  ["mods:479714", "psychonline"],
]);

const NON_DEPENDENCY_REQUIREMENTS = new Set(EXCLUDED_ENGINE_SUBMISSIONS.keys());

function buildToolTimingDetails(api, data) {
  return {
    timeAgo: api.getTimeAgo(data._tsDateAdded),
    submittedTimeAgo: api.getTimeAgo(data._tsDateAdded),
    modifiedTimeAgo: data._tsDateModified
      ? api.getTimeAgo(data._tsDateModified)
      : "",
    updatedTimeAgo: data._tsDateUpdated
      ? api.getTimeAgo(data._tsDateUpdated)
      : "",
  };
}

function buildToolDownloadDetails(api, data, file) {
  return {
    downloadUrl: file?._sDownloadUrl || "",
    fileSize: Number(file?._nFilesize || 0),
    fileSizeStr: file
      ? api.formatBytes(file._nFilesize || 0)
      : "No download available",
    downloadOptions: file
      ? [
          {
            id: `file:${file._idRow || data._idRow}`,
            type: "tool",
            name: file._sFile || file._sDescription || "Download",
            fileSize: Number(file._nFilesize || 0),
            fileSizeStr: api.formatBytes(file._nFilesize || 0),
            downloadUrl: file._sDownloadUrl,
          },
        ]
      : [],
  };
}

export function buildToolDetails(api, data, file, images) {
  const id = `tool:${data._idRow}`;
  return {
    id,
    dependencyId: id,
    type: "tool",
    title: data._sName || "Unknown Tool",
    author: data._aSubmitter?._sName || "Unknown Creator",
    description: data._sText || "<p>No description available.</p>",
    likes: data._nLikeCount || 0,
    views: data._nViewCount || 0,
    ...buildToolTimingDetails(api, data),
    images,
    ...buildToolDownloadDetails(api, data, file),
    thumbnail: images[0] || null,
    gameBananaUrl: `https://gamebanana.com/tools/${data._idRow}`,
  };
}

function getModDownloadDetails(api, downloadOptions, loadingDownloads) {
  const preferredDownload = api.getPreferredDownloadOption(downloadOptions);
  const downloadButtonLabel =
    preferredDownload?.type === "external"
      ? api.getExternalDownloadLabel(preferredDownload.downloadUrl)
      : null;
  return {
    fileSizeStr: loadingDownloads
      ? "Checking downloads…"
      : preferredDownload
        ? preferredDownload.fileSize > 0
          ? api.formatBytes(preferredDownload.fileSize)
          : "Unknown size"
        : "No download available",
    fileSize: preferredDownload?.fileSize || 0,
    downloadUrl: preferredDownload?.downloadUrl || "",
    downloadType: preferredDownload?.type || null,
    downloadButtonLabel,
  };
}

function getModClassification(api, data) {
  return {
    gameId: Number(data._aGame?._idRow || data._idGame || 0),
    isDeleted: api.isDeletedMod(data),
    categoryId: api.getCategoryId(data._aCategory),
    kind:
      api.getModKindForCategories(
        data._aCategory,
        data._aSuperCategory,
        data._aRootCategory,
        data._aSubCategory,
        data._idCategory,
      ) || "mod",
    engineId: api.getEngineIdForCategories(
      data._aCategory,
      data._aSuperCategory,
      data._aRootCategory,
      data._aSubCategory,
      data._idCategory,
    ),
  };
}

export function buildModDetails(
  api,
  data,
  images,
  downloadOptions = [],
  requirements = [],
  { loadingDownloads = false, loadingRequirements = false } = {},
) {
  return {
    id: data._idRow,
    title: data._sName,
    author: data._aSubmitter?._sName || "Unknown Creator",
    authorId: data._aSubmitter?._idRow || null,
    authorAvatar: data._aSubmitter?._sAvatarUrl || "",
    credits: getModCredits(data),
    requirementLinks: getRequirementLinks(data),
    description: data._sText || "<p>No description available.</p>",
    likes: data._nLikeCount || 0,
    views: data._nViewCount || 0,
    timeAgo: api.getTimeAgo(data._tsDateAdded),
    submittedTimeAgo: api.getTimeAgo(data._tsDateAdded),
    modifiedTimeAgo: data._tsDateModified
      ? api.getTimeAgo(data._tsDateModified)
      : "",
    updatedTimeAgo: data._tsDateUpdated
      ? api.getTimeAgo(data._tsDateUpdated)
      : "",
    images,
    ...getModDownloadDetails(api, downloadOptions, loadingDownloads),
    downloadOptions,
    requirements,
    loadingDownloads,
    loadingRequirements,
    gameBananaUrl: `https://gamebanana.com/mods/${data._idRow}`,
    ...getModClassification(api, data),
  };
}

function getModCredits(data) {
  return (Array.isArray(data?._aCredits) ? data._aCredits : [])
    .map((group) => ({
      name: group._sGroupName || "Contributors",
      authors: (Array.isArray(group._aAuthors) ? group._aAuthors : [])
        .map((author) => ({
          id:
            author._idRow ||
            (author._sProfileUrl || author._sUrl)?.match(
              /\/members\/(\d+)(?:\/|$)/i,
            )?.[1] ||
            null,
          name: author._sName || "Unknown Contributor",
          role: author._sRole || "",
          avatar: author._sAvatarUrl || author._sUpicUrl || "",
          url: author._sUrl || "",
        }))
        .filter((author) => author.name),
    }))
    .filter((group) => group.authors.length);
}

export function getRawRequirements(data) {
  if (Array.isArray(data?._aRequirements)) return data._aRequirements;
  if (Array.isArray(data?._aRequirements?.value))
    return data._aRequirements.value;
  return [];
}

function getRequirementLinks(data) {
  const rawRequirements = getRawRequirements(data);
  const requirements = Array.isArray(rawRequirements[0])
    ? rawRequirements
    : rawRequirements.length >= 2
      ? [rawRequirements]
      : [];
  return requirements
    .filter(
      ([name, url]) =>
        name && isDependencySubmission(url, NON_DEPENDENCY_REQUIREMENTS),
    )
    .map(([name, url]) => ({ title: name, url }));
}
export function isDependencyRequirement(url) {
  return isDependencySubmission(url, NON_DEPENDENCY_REQUIREMENTS);
}
