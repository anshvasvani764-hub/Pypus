"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  inferUIContextFromPath,
  type PypusUIContext,
  type UIActionContext,
  type UIEntityRef,
} from "@/lib/pypus/ui-context";

interface PypusUIContextValue {
  uiContext: PypusUIContext;
  registerContext: (patch: Partial<PypusUIContext>) => void;
  setSelectedEntity: (entity: UIEntityRef | null) => void;
  recordAction: (action: UIActionContext) => void;
}

const PypusUIContextReact = createContext<PypusUIContextValue | null>(null);

function uniqueEntities(entities: UIEntityRef[]): UIEntityRef[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = `${entity.type}:${entity.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function PypusUIContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const inferred = useMemo(() => inferUIContextFromPath(pathname), [pathname]);
  const [uiContext, setUIContext] = useState<PypusUIContext>(() => ({
    ...inferred,
    selectedEntity: null,
    visibleEntities: [],
    visibleData: {},
    availableActions: [],
    recentAction: null,
    capturedAt: new Date().toISOString(),
  }));

  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    const memberId = inferred.screen === "member_details" ? parts[2] : null;

    setUIContext((prev) => ({
      ...prev,
      ...inferred,
      selectedEntity:
        memberId && prev.selectedEntity?.type === "member" && prev.selectedEntity.id === memberId
          ? prev.selectedEntity
          : memberId
            ? { type: "member", id: memberId }
            : null,
      visibleEntities: [],
      visibleData: {},
      availableActions: [],
      recentAction: null,
      capturedAt: new Date().toISOString(),
    }));
  }, [pathname, inferred]);

  // Generic UI awareness hook: modules can mark important interactive elements
  // with data-pypus-* attributes. New modules do not need changes in this provider.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const actionEl = target?.closest<HTMLElement>("[data-pypus-action]");
      const entityEl = target?.closest<HTMLElement>("[data-pypus-entity-id]");
      if (!actionEl && !entityEl) return;

      const entityId = entityEl?.dataset.pypusEntityId;
      const entityType = entityEl?.dataset.pypusEntityType;
      const entityName = entityEl?.dataset.pypusEntityName;
      const action = actionEl?.dataset.pypusAction;
      const label = actionEl?.dataset.pypusActionLabel;

      const entity = entityId && entityType
        ? { type: entityType, id: entityId, name: entityName ?? null }
        : null;

      setUIContext((prev) => ({
        ...prev,
        selectedEntity: entity ?? prev.selectedEntity,
        recentAction: action ? { action, label, entity } : prev.recentAction,
        capturedAt: new Date().toISOString(),
      }));
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const registerContext = useCallback((patch: Partial<PypusUIContext>) => {
    setUIContext((prev) => ({
      ...prev,
      ...patch,
      visibleEntities: uniqueEntities(patch.visibleEntities ?? prev.visibleEntities),
      availableActions: patch.availableActions ?? prev.availableActions,
      capturedAt: new Date().toISOString(),
    }));
  }, []);

  const setSelectedEntity = useCallback((entity: UIEntityRef | null) => {
    setUIContext((prev) => ({ ...prev, selectedEntity: entity, capturedAt: new Date().toISOString() }));
  }, []);

  const recordAction = useCallback((action: UIActionContext) => {
    setUIContext((prev) => ({
      ...prev,
      recentAction: action,
      selectedEntity: action.entity ?? prev.selectedEntity,
      capturedAt: new Date().toISOString(),
    }));
  }, []);

  const value = useMemo(
    () => ({ uiContext, registerContext, setSelectedEntity, recordAction }),
    [uiContext, registerContext, setSelectedEntity, recordAction]
  );

  return <PypusUIContextReact.Provider value={value}>{children}</PypusUIContextReact.Provider>;
}

export function usePypusUIContext() {
  const value = useContext(PypusUIContextReact);
  if (!value) throw new Error("usePypusUIContext must be used inside PypusUIContextProvider");
  return value;
}
