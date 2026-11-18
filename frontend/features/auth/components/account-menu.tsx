"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function AccountMenu({
  email,
  signOut,
}: {
  email?: string;
  signOut: () => void;
}) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <Button
          tone="ghost"
          className="account-trigger"
          aria-label="Account menu"
        >
          <span className="avatar" aria-hidden="true">
            {email ? email[0].toUpperCase() : <Icon name="user" />}
          </span>
          <span className="account-details">
            <strong>{email?.split("@")[0] ?? "Your account"}</strong>
            <span>Personal workspace</span>
          </span>
          <Icon className="account-caret" name="chevrons" />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className="pop-menu account-menu"
          side="top"
          align="start"
          sideOffset={9}
          collisionPadding={10}
        >
          <Menu.Label className="menu-label account-menu-label">
            <span>Signed in as</span>
            <strong>{email ?? "Your account"}</strong>
          </Menu.Label>
          <Menu.Separator className="menu-divider" />
          <Menu.Item className="menu-item menu-danger" onSelect={signOut}>
            <Icon name="logout" /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
