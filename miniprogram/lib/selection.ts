export function toggleSelection(selectedIds: string[], id: string): string[] {
  if (!id) {
    return selectedIds;
  }

  if (selectedIds.includes(id)) {
    return selectedIds.filter((selectedId) => selectedId !== id);
  }

  return [...selectedIds, id];
}

export function selectAll(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}
