/**
 * Moves one item up or down a sorted list and returns the new sortOrder for
 * every item, so gaps and duplicate orders heal on each move.
 */
export function reorder<T extends { id: string }>(items: T[], id: string, direction: "up" | "down"): { id: string; sortOrder: number }[] {
  const list = [...items];
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) return [];
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return list.map((x, n) => ({ id: x.id, sortOrder: n }));
  [list[i], list[j]] = [list[j], list[i]];
  return list.map((x, n) => ({ id: x.id, sortOrder: n }));
}
