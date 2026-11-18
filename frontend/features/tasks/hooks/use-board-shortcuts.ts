"use client";

import { useEffect, type RefObject } from "react";

export function useBoardShortcuts({
  blocked,
  searchInput,
  canSearch,
  canCreate,
  onCreate,
  onCommands,
}: {
  blocked: boolean;
  searchInput: RefObject<HTMLInputElement | null>;
  canSearch: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onCommands: () => void;
}) {
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        !blocked &&
        !event.repeat &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.code === "KeyK"
      ) {
        event.preventDefault();
        onCommands();
        return;
      }
      if (
        blocked ||
        event.metaKey ||
        event.ctrlKey ||
        !event.altKey ||
        event.shiftKey ||
        event.repeat ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)))
      )
        return;
      if (event.code === "Slash" && canSearch) {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.code === "KeyN" && canCreate) {
        event.preventDefault();
        onCreate();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [blocked, canSearch, canCreate, onCreate, onCommands, searchInput]);
}
