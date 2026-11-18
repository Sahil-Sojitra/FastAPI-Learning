import type { ComponentProps } from "react";
import { Icon, type IconName } from "./icon";

type ButtonProps = ComponentProps<"button"> & {
  tone?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  busy?: boolean;
};

export function Button({
  tone = "secondary",
  icon,
  busy,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`button button-${tone}${className ? ` ${className}` : ""}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} />
      )}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  label: string;
  icon: IconName;
}) {
  return (
    <Button
      {...props}
      title={props.title ?? label}
      aria-label={label}
      icon={icon}
      tone="ghost"
      className={`icon-button${className ? ` ${className}` : ""}`}
    />
  );
}
