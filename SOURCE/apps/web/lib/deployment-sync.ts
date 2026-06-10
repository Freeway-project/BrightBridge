"use client";

const DIRTY_KEY = "__coursebridge_unsaved_sources__";

function getDirtySources(): Set<string> {
  const win = window as Window & { [DIRTY_KEY]?: Set<string> };
  if (!win[DIRTY_KEY]) {
    win[DIRTY_KEY] = new Set<string>();
  }
  return win[DIRTY_KEY]!;
}

export function setUnsavedChanges(source: string, dirty: boolean) {
  const dirtySources = getDirtySources();

  if (dirty) {
    dirtySources.add(source);
  } else {
    dirtySources.delete(source);
  }
}

export function clearUnsavedChanges(source: string) {
  setUnsavedChanges(source, false);
}

export function hasUnsavedChanges() {
  return getDirtySources().size > 0;
}
