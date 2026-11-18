import type { ReactNode } from "react";
import { Icon } from "./icon";

export function Notice({
  tone = "success",
  children,
  action,
}: {
  tone?: "success" | "error" | "info";
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className="notice"
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon
        name={tone === "error" ? "alert" : tone === "info" ? "info" : "check"}
      />
      <div className="notice-copy">{children}</div>
      {action}
    </div>
  );
}
