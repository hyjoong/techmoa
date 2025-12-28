"use client";

import { overlay } from "overlay-kit";
import { AuthModal } from "@/components/auth/auth-modal";

const DIALOG_EXIT_MS = 200;

export function openAuthModal(defaultTab?: "login" | "signup") {
  overlay.open(({ isOpen, close, unmount }) => (
    <AuthModal
      open={isOpen}
      defaultTab={defaultTab}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          return;
        }
        close();
        window.setTimeout(unmount, DIALOG_EXIT_MS);
      }}
    />
  ));
}
