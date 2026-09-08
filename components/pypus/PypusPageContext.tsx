"use client";

import { useEffect } from "react";
import { usePypusUIContext } from "@/context/PypusUIContext";
import type { PypusUIContext } from "@/lib/pypus/ui-context";

/** Server-to-client bridge for page-specific semantic UI context. */
export function PypusPageContext({
  children,
  context,
}: {
  children: React.ReactNode;
  context: Partial<PypusUIContext>;
}) {
  const { registerContext } = usePypusUIContext();

  useEffect(() => {
    registerContext(context);
  }, [context, registerContext]);

  return <>{children}</>;
}
