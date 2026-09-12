import { createServiceClient } from "@/lib/supabase/service";
import type { BusinessBrainDraft, BusinessBrainSaveResult } from "./types";

/**
 * Writes a reviewed/confirmed draft into the 8 EXISTING Business Brain
 * tables (business_models, business_entities, entity_fields,
 * entity_relationships, business_rules, business_workflows, business_terms,
 * business_knowledge). Does not create, rename, or alter any table.
 *
 * Uses the service-role client for the writes themselves (same pattern as
 * app/actions/import-members.ts and friends) because these 8 tables were
 * created with RLS enabled but no policies yet — caller MUST have already
 * verified workspace access with checkWorkspaceAccess() before calling this.
 *
 * No RPC/transaction exists yet for this, so this is a plain sequence of
 * inserts. If a step fails partway through, whatever was already inserted
 * stays (traceable via the returned businessModelId) and the response says
 * exactly which step and table failed — see acceptance criteria in the
 * original request. A future version could wrap this in a Postgres function
 * for atomicity; out of scope for this lab/test page.
 */
export async function saveBusinessBrainDraft(
  workspaceId: string,
  draft: BusinessBrainDraft
): Promise<BusinessBrainSaveResult> {
  const supabase = createServiceClient();
  const counts = {
    business_models: 0,
    business_entities: 0,
    entity_fields: 0,
    entity_relationships: 0,
    business_rules: 0,
    business_workflows: 0,
    business_terms: 0,
    business_knowledge: 0,
  };

  // 1. business_models
  const { data: modelRow, error: modelErr } = await supabase
    .from("business_models")
    .insert({
      workspace_id: workspaceId,
      name: draft.business.name || "Untitled business",
      description: draft.business.description || null,
      model_json: draft,
      status: "draft",
    })
    .select("id")
    .single();

  if (modelErr || !modelRow) {
    return {
      success: false,
      failedStep: "business_models",
      error: modelErr?.message || "Failed to create business_models row",
      counts,
    };
  }
  const businessModelId = modelRow.id as string;
  counts.business_models = 1;

  // 2. business_entities — keep a key -> id map for relationships + fields
  const entityIdByKey = new Map<string, string>();
  for (const entity of draft.entities) {
    const { data: entityRow, error: entityErr } = await supabase
      .from("business_entities")
      .insert({
        workspace_id: workspaceId,
        business_model_id: businessModelId,
        key: entity.key,
        name: entity.name,
        display_name: entity.display_name ?? entity.name,
        description: entity.description ?? null,
        config: {},
        status: "active",
      })
      .select("id")
      .single();

    if (entityErr || !entityRow) {
      return {
        success: false,
        businessModelId,
        failedStep: `business_entities (key: ${entity.key})`,
        error: entityErr?.message || "Failed to insert entity",
        counts,
      };
    }
    entityIdByKey.set(entity.key, entityRow.id as string);
    counts.business_entities++;

    // 3. entity_fields for this entity
    let order = 0;
    for (const field of entity.fields) {
      const { error: fieldErr } = await supabase.from("entity_fields").insert({
        entity_id: entityRow.id,
        key: field.key,
        label: field.label,
        description: field.description ?? null,
        data_type: field.data_type || "text",
        required: field.required ?? false,
        default_value: field.default_value ?? null,
        options: field.options ?? [],
        validation: field.validation ?? {},
        display_order: order++,
      });

      if (fieldErr) {
        return {
          success: false,
          businessModelId,
          failedStep: `entity_fields (entity: ${entity.key}, field: ${field.key})`,
          error: fieldErr.message,
          counts,
        };
      }
      counts.entity_fields++;
    }
  }

  // 4. entity_relationships — resolve source/target key -> entity id
  for (const rel of draft.relationships) {
    const sourceId = entityIdByKey.get(rel.source_key);
    const targetId = entityIdByKey.get(rel.target_key);
    if (!sourceId || !targetId) {
      // Skip relationships that reference an entity key the model didn't
      // actually produce, rather than failing the whole save.
      continue;
    }

    const { error: relErr } = await supabase.from("entity_relationships").insert({
      workspace_id: workspaceId,
      source_entity_id: sourceId,
      target_entity_id: targetId,
      relationship_type: rel.relationship_type || "related_to",
      source_label: rel.source_label ?? null,
      target_label: rel.target_label ?? null,
      config: rel.config ?? {},
    });

    if (relErr) {
      return {
        success: false,
        businessModelId,
        failedStep: `entity_relationships (${rel.source_key} -> ${rel.target_key})`,
        error: relErr.message,
        counts,
      };
    }
    counts.entity_relationships++;
  }

  // 5. business_rules
  for (const rule of draft.rules) {
    const { error: ruleErr } = await supabase.from("business_rules").insert({
      workspace_id: workspaceId,
      business_model_id: businessModelId,
      name: rule.name,
      description: rule.description ?? null,
      rule_type: rule.rule_type ?? null,
      trigger: rule.trigger ?? null,
      conditions: rule.conditions ?? {},
      actions: rule.actions ?? [],
      priority: rule.priority ?? 0,
      status: "active",
      version: 1,
    });

    if (ruleErr) {
      return {
        success: false,
        businessModelId,
        failedStep: `business_rules (${rule.name})`,
        error: ruleErr.message,
        counts,
      };
    }
    counts.business_rules++;
  }

  // 6. business_workflows
  for (const wf of draft.workflows) {
    const { error: wfErr } = await supabase.from("business_workflows").insert({
      workspace_id: workspaceId,
      name: wf.name,
      description: wf.description ?? null,
      trigger: wf.trigger ?? null,
      steps: wf.steps ?? [],
      status: "draft",
    });

    if (wfErr) {
      return {
        success: false,
        businessModelId,
        failedStep: `business_workflows (${wf.name})`,
        error: wfErr.message,
        counts,
      };
    }
    counts.business_workflows++;
  }

  // 7. business_terms — upsert on (workspace_id, system_term)
  for (const term of draft.terms) {
    const { error: termErr } = await supabase
      .from("business_terms")
      .upsert(
        {
          workspace_id: workspaceId,
          system_term: term.system_term,
          business_term: term.business_term,
          plural_term: term.plural_term ?? null,
          description: term.description ?? null,
        },
        { onConflict: "workspace_id,system_term" }
      );

    if (termErr) {
      return {
        success: false,
        businessModelId,
        failedStep: `business_terms (${term.system_term})`,
        error: termErr.message,
        counts,
      };
    }
    counts.business_terms++;
  }

  // 8. business_knowledge
  for (const item of draft.knowledge) {
    const { error: knowledgeErr } = await supabase.from("business_knowledge").insert({
      workspace_id: workspaceId,
      category: item.category || "general",
      title: item.title,
      content: item.content,
      metadata: item.metadata ?? {},
      source: item.source || "onboarding",
      status: "active",
    });

    if (knowledgeErr) {
      return {
        success: false,
        businessModelId,
        failedStep: `business_knowledge (${item.title})`,
        error: knowledgeErr.message,
        counts,
      };
    }
    counts.business_knowledge++;
  }

  return { success: true, businessModelId, counts };
}
