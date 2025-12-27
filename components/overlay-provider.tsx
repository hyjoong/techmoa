"use client";

import type { PropsWithChildren } from "react";
import { OverlayProvider } from "overlay-kit";

export function AppOverlayProvider({ children }: PropsWithChildren) {
  return <OverlayProvider>{children}</OverlayProvider>;
}
