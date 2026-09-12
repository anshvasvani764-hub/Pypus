import { NextResponse } from "next/server";
import { checkWorkspaceAccess } from "@/lib/business-brain/access";
import { saveBusinessBrainDraft } from "@/lib/business-brain/save";
import type { BusinessBrainDraft } from "@/lib/business-brain/types";

/** Minimal structural validation — this is a lab/test page, not a public API,
 *  so this only guards against obviously malformed input, not every edge case. */
function validateDraft(raw: unknown): { ok: true; draft: BusinessBrainDraft } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "draft is required" };
  const d = raw as Record<string, unknown>;

  const business = d.business as Record<string, unknown> | undefined;
  if (!business || typeof business.name !== "string" || !business.name.trim()) {
    return { ok: false, error: "draft.business.name is required" };
  }

  const arrays = ["entities", "relationships", "rules", "workflows", "terms", "knowledge"] as const;
  for (const key of arrays) {
    if (d[key] !== undefined && !Array.isArray(d[key])) {
      return { ok: false, error: `draft.${key} must be an array` };
    }
  }

  const entities = Array.isArray(d.entities) ? (d.entities as Record<string, unknown>[]) : [];
  for (const e of entities) {
    if (typeof e.key !== "string" || !e.key.trim()) {
      return { ok: false, error: "every entity needs a non-empty key" };
    }
  }

  return {
    ok: true,
    draft: {
      business: {
        name: String(business.name),
        type: typeof business.type === "string" ? business.type : "",
        description: typeof business.description === "string" ? business.description : "",
      },
      entities: entities.map((e) => ({
        key: String(e.key),
        name: typeof e.name === "string" ? e.name : String(e.key),
        display_name: typeof e.display_name === "string" ? e.display_name : undefined,
        description: typeof e.description === "string" ? e.description : undefined,
        fields: Array.isArray(e.fields)
          ? (e.fields as Record<string, unknown>[]).map((f) => ({
              key: String(f.key ?? ""),
              label: typeof f.label === "string" ? f.label : String(f.key ?? ""),
              description: typeof f.description === "string" ? f.description : undefined,
              data_type: typeof f.data_type === "string" ? f.data_type : "text",
              required: typeof f.required === "boolean" ? f.required : false,
              default_value: f.default_value ?? null,
              options: f.options ?? [],
              validation: f.validation ?? {},
            }))
          : [],
      })),
      relationships: Array.isArray(d.relationships)
        ? (d.relationships as Record<string, unknown>[]).map((r) => ({
            source_key: String(r.source_key ?? ""),
            target_key: String(r.target_key ?? ""),
            relationship_type: typeof r.relationship_type === "string" ? r.relationship_type : "related_to",
            source_label: typeof r.source_label === "string" ? r.source_label : undefined,
            target_label: typeof r.target_label === "string" ? r.target_label : undefined,
            config: r.config ?? {},
          }))
        : [],
      rules: Array.isArray(d.rules)
        ? (d.rules as Record<string, unknown>[]).map((r) => ({
            name: String(r.name ?? ""),
            description: typeof r.description === "string" ? r.description : undefined,
            rule_type: typeof r.rule_type === "string" ? r.rule_type : undefined,
            trigger: typeof r.trigger === "string" ? r.trigger : undefined,
            conditions: r.conditions ?? {},
            actions: r.actions ?? [],
            priority: typeof r.priority === "number" ? r.priority : 0,
          }))
        : [],
      workflows: Array.isArray(d.workflows)
        ? (d.workflows as Record<string, unknown>[]).map((w) => ({
            name: String(w.name ?? ""),
            description: typeof w.description === "string" ? w.description : undefined,
            trigger: typeof w.trigger === "string" ? w.trigger : undefined,
            steps: w.steps ?? [],
          }))
        : [],
      terms: Array.isArray(d.terms)
        ? (d.terms as Record<string, unknown>[]).map((t) => ({
            system_term: String(t.system_term ?? ""),
            business_term: String(t.business_term ?? ""),
            plural_term: typeof t.plural_term === "string" ? t.plural_term : undefined,
            description: typeof t.description === "string" ? t.description : undefined,
          }))
        : [],
      knowledge: Array.isArray(d.knowledge)
        ? (d.knowledge as Record<string, unknown>[]).map((k) => ({
            category: typeof k.category === "string" ? k.category : "general",
            title: String(k.title ?? ""),
            content: String(k.content ?? ""),
            metadata: k.metadata ?? {},
            source: typeof k.source === "string" ? k.source : "onboarding",
          }))
        : [],
    },
  };
}

export async function POST(request: Request) {
  let workspaceId: unknown;
  let draft: unknown;
  try {
    ({ workspaceId, draft } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof workspaceId !== "string" || !workspaceId) {
    return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 });
  }

  const access = await checkWorkspaceAccess(workspaceId);
  if (!access.ok) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const validated = validateDraft(draft);
  if (!validated.ok) {
    return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
  }

  try {
    const result = await saveBusinessBrainDraft(workspaceId, validated.draft);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err) {
    console.error("business-brain/save: unexpected error", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unexpected error while saving" },
      { status: 500 }
    );
  }
}
