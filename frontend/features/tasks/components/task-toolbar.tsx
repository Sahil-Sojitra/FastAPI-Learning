import type { RefObject } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type TaskView = "board" | "list";

export function TaskToolbar({
  view,
  search,
  searchInput,
  loaded,
  loading,
  hasMore,
  canRefresh,
  onView,
  onSearch,
  onRefresh,
}: {
  view: TaskView;
  search: string;
  searchInput: RefObject<HTMLInputElement | null>;
  loaded: boolean;
  loading: boolean;
  hasMore: boolean;
  canRefresh: boolean;
  onView: (view: TaskView) => void;
  onSearch: (query: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="toolbar">
      <div className="view-toggle" role="group" aria-label="Task layout">
        <Button
          tone="ghost"
          icon="board"
          aria-pressed={view === "board"}
          onClick={() => onView("board")}
        >
          Board
        </Button>
        <Button
          tone="ghost"
          icon="list"
          aria-pressed={view === "list"}
          onClick={() => onView("list")}
        >
          List
        </Button>
      </div>
      <div className="toolbar-actions">
        <div className="search-field">
          <Icon name="search" className="search-icon" />
          <input
            ref={searchInput}
            type="search"
            aria-keyshortcuts="Alt+/"
            aria-label={hasMore ? "Search loaded tasks" : "Search tasks"}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={
              hasMore ? "Search loaded tickets" : "Search title or TB-ID"
            }
            disabled={!loaded}
          />
          {search ? (
            <IconButton
              className="clear-search"
              icon="close"
              label="Clear search"
              onClick={() => {
                onSearch("");
                searchInput.current?.focus();
              }}
            />
          ) : (
            <kbd aria-hidden="true">Alt /</kbd>
          )}
        </div>
        <IconButton
          icon="refresh"
          className={`refresh${loading && loaded ? " is-loading" : ""}`}
          label="Refresh tasks"
          disabled={!canRefresh}
          onClick={onRefresh}
        />
      </div>
    </div>
  );
}
