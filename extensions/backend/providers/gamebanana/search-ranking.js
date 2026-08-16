function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .trim();
}

function searchWords(query) {
  return [...new Set(normalize(query).split(" "))].filter(
    (word) =>
      (word.length > 1 || /^\d+$/.test(word)) &&
      !["an", "the", "fnf", "mod", "vs"].includes(word),
  );
}

function distance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[right.length];
}

export function getSearchTitleRelevance(mod, query) {
  const title = normalize(mod?._sName || mod?.title).replace(
    /^(?:fnf|friday night funkin)(?:\s+the)?\s*/,
    "",
  );
  const normalizedQuery = normalize(query);
  const words = searchWords(query);
  if (!title || !normalizedQuery || !words.length) return 0;
  const matchingWords = words.filter((word) => title.includes(word)).length;
  if (matchingWords < words.length && !title.includes(normalizedQuery))
    return 0;
  const penalty =
    /\b(?:port|mod folder|chart|rechart|remix|cover|fanmade|reskin|restyle|lyrics|optimized|hotfix|fix|playable|template|oneshot)\b/.test(
      title,
    )
      ? 50000
      : 0;
  return Math.max(
    1,
    (title === normalizedQuery ? 1000000 : 0) +
      (title.startsWith(normalizedQuery) ? 300000 : 0) +
      (title.includes(normalizedQuery) ? 200000 : 0) +
      matchingWords * 1000 -
      penalty,
  );
}

export function getTypoSearchVariants(query) {
  const normalizedQuery = String(query || "").trim();
  const variants = new Set();
  if (/\d+$/.test(normalizedQuery)) {
    const withoutNumber = normalizedQuery.replace(/\d+$/, "").trim();
    if (withoutNumber.length >= 3) variants.add(withoutNumber);
  }
  const words = normalizedQuery.split(/\s+/);
  if (words.at(-1)?.length >= 5) {
    words[words.length - 1] = words.at(-1).slice(0, -1);
    variants.add(words.join(" "));
  }
  return [...variants].filter((variant) => variant !== normalizedQuery);
}

export function getSearchTypoRelevance(mod, query) {
  const words = searchWords(query);
  const titleWords = normalize(mod?._sName || mod?.title).split(" ");
  if (!words.length || !titleWords.length) return 0;
  const candidates = [
    ...titleWords,
    ...titleWords
      .slice(0, -1)
      .map((word, index) => word + titleWords[index + 1]),
  ];
  const fullQuery = normalize(query).replaceAll(" ", "");
  if (
    words.some((word) => /^\d+$/.test(word)) &&
    !candidates.some((candidate) => candidate.startsWith(fullQuery))
  )
    return 0;
  const distances = words.map((word) =>
    Math.min(...candidates.map((candidate) => distance(word, candidate))),
  );
  if (
    distances.some(
      (value, index) =>
        value >
        (/^\d+$/.test(words[index]) || words[index].length >= 5 ? 1 : 0),
    )
  )
    return 0;
  return (
    10000 -
    distances.reduce((total, value) => total + value, 0) * 100 +
    (candidates.some((candidate) => distance(fullQuery, candidate) <= 1)
      ? 1000
      : 0)
  );
}
