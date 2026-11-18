"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { IconButton } from "./button";

export function Modal({
  title,
  icon,
  danger,
  close,
  busy,
  variant,
  children,
}: {
  title: string;
  icon: IconName;
  danger?: boolean;
  close: () => void;
  busy: boolean;
  variant?: "drawer" | "command";
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const modal = ref.current;
    modal?.showModal();
    return () => modal?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      data-variant={variant}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <header className="dialog-header">
        <span className="dialog-emblem" data-danger={danger || undefined}>
          <Icon name={icon} />
        </span>
        <h2 id={titleId}>{title}</h2>
        <IconButton
          className="dialog-close"
          icon="close"
          label="Close dialog"
          disabled={busy}
          onClick={close}
        />
      </header>
      <div className="dialog-content">{children}</div>
    </dialog>
  );
}
