export function setBoundedCache(map, key, value, maxSize = 100) {
  if (!map || !key) return;
  if (map.size >= maxSize) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}
