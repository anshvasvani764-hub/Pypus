import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPypusTool, type ToolContext } from "@/lib/pypus/tools";
import type { ResolvedContext } from "@/lib/pypus/tools/resolved-context";

/** Same shape check as app/api/pypus/chat — trusts nothing but the shape. */
function sanitizeResolvedContext(raw: unknown): ResolvedContext | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    (r.entityType === "member" || r.entityType === "expense" || r.entityType === "team_member") &&
    typeof r.entityId === "string" &&
    r.entityId &&
    typeof r.entityName === "string"
  ) {
    return { entityType: r.entityType, entityId: r.entityId, entityName: r.entityName };
  }
  return null;
}

/**
 * Voice mode's Live API session runs in the browser and calls this once per
 * function-call the model makes, then feeds the result straight back into
 * the same session as a toolResponse. This keeps real gym data access
 * (Supabase + RLS) server-side, exactly like the text chat's tool loop —
 * voice mode is just a different transport for the same tools.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let workspaceId: unknown;
  let name: unknown;
  let args: unknown;
  let resolvedContext: unknown;
  try {
    ({ workspaceId, name, args, resolvedContext } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof workspaceId !== "string" || typeof name !== "string") {
    return NextResponse.json({ error: "workspaceId and name are required" }, { status: 400 });
  }

  const ctx: ToolContext = {
    supabase,
    workspaceId,
    resolvedContext: sanitizeResolvedContext(resolvedContext),
    navigationSuggestion: null,
  };

  const result = await runPypusTool(name, (args as Record<string, unknown>) ?? {}, ctx);

  return NextResponse.json({
    result,
    resolvedContext: ctx.resolvedContext ?? null,
    navigationSuggestion: ctx.navigationSuggestion ?? null,
  });
}
