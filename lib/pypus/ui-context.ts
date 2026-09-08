export type UIEntityType =
  | "member"
  | "plan"
  | "expense"
  | "team_member"
  | "lead"
  | "payment"
  | "customer"
  | string;

export interface UIEntityRef {
  type: UIEntityType;
  id: string;
  name?: string | null;
}

export interface UIActionContext {
  action: string;
  label?: string;
  entity?: UIEntityRef | null;
}

export interface PypusUIContext {
  route: string;
  screen: string;
  module: string | null;
  selectedEntity: UIEntityRef | null;
  visibleEntities: UIEntityRef[];
  visibleData: Record<string, string | number | boolean | null>;
  availableActions: UIActionContext[];
  recentAction: UIActionContext | null;
  capturedAt: string;
}

export function inferUIContextFromPath(pathname: string): Pick<
  PypusUIContext,
  "route" | "screen" | "module"
> {
  const parts = pathname.split("/").filter(Boolean);
  const module = parts[1] ?? null;

  if (module === "members" && parts[2]) {
    return { route: pathname, screen: "member_details", module: "members" };
  }
  if (module === "members") {
    return { route: pathname, screen: "members", module: "members" };
  }
  if (module === "fees" && parts[2] === "plans") {
    return { route: pathname, screen: "fees_plans", module: "fees" };
  }
  if (module === "fees") {
    return { route: pathname, screen: "fees", module: "fees" };
  }
  if (module === "attendance") {
    return { route: pathname, screen: "attendance", module: "attendance" };
  }
  if (module === "expenses") {
    return { route: pathname, screen: "expenses", module: "expenses" };
  }
  if (module === "team") {
    return { route: pathname, screen: "team", module: "team" };
  }
  if (module === "automations") {
    const sub = parts[2] ?? "";
    return { route: pathname, screen: sub ? `automations_${sub}` : "automations", module: "automations" };
  }
  if (module === "settings") {
    return { route: pathname, screen: "settings", module: "settings" };
  }
  if (module === "workspace") {
    return { route: pathname, screen: "workspace", module: null };
  }

  return { route: pathname, screen: "home", module: null };
}
