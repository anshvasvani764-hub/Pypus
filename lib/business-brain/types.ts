/**
 * Shapes for the Business Brain onboarding-agent TEST page only.
 * Mirrors the 8 existing Supabase tables (business_models, business_entities,
 * entity_fields, entity_relationships, business_rules, business_workflows,
 * business_terms, business_knowledge) — see lib/business-brain/save.ts for
 * exactly how each field maps to a column.
 *
 * Kept deliberately generic (no gym/agency/etc. specific fields) — the LLM
 * fills these in from whatever business the owner describes.
 */

export interface BusinessBrainField {
  key: string;
  label: string;
  description?: string;
  data_type: string; // "text" | "number" | "date" | "boolean" | "select" | ... (free text, not enforced)
  required?: boolean;
  default_value?: unknown;
  options?: unknown;
  validation?: unknown;
}

export interface BusinessBrainEntity {
  key: string; // stable slug, unique within this draft — used to resolve relationships
  name: string;
  display_name?: string;
  description?: string;
  fields: BusinessBrainField[];
}

export interface BusinessBrainRelationship {
  source_key: string; // an entities[].key
  target_key: string; // an entities[].key
  relationship_type: string; // e.g. "one_to_many"
  source_label?: string;
  target_label?: string;
  config?: unknown;
}

export interface BusinessBrainRule {
  name: string;
  description?: string;
  rule_type?: string;
  trigger?: string;
  conditions?: unknown;
  actions?: unknown;
  priority?: number;
}

export interface BusinessBrainWorkflow {
  name: string;
  description?: string;
  trigger?: string;
  steps?: unknown;
}

export interface BusinessBrainTerm {
  system_term: string;
  business_term: string;
  plural_term?: string;
  description?: string;
}

export interface BusinessBrainKnowledge {
  category: string;
  title: string;
  content: string;
  metadata?: unknown;
  source?: string;
}

export interface BusinessBrainDraft {
  business: {
    name: string;
    type: string;
    description: string;
  };
  entities: BusinessBrainEntity[];
  relationships: BusinessBrainRelationship[];
  rules: BusinessBrainRule[];
  workflows: BusinessBrainWorkflow[];
  terms: BusinessBrainTerm[];
  knowledge: BusinessBrainKnowledge[];
}

/** What the /chat endpoint returns after every turn. */
export interface BusinessBrainChatResult {
  reply: string;
  readyToSave: boolean;
  draft: BusinessBrainDraft;
}

/** What the /save endpoint returns — used to render "Saved successfully" + row counts. */
export interface BusinessBrainSaveResult {
  success: boolean;
  businessModelId?: string;
  counts?: {
    business_models: number;
    business_entities: number;
    entity_fields: number;
    entity_relationships: number;
    business_rules: number;
    business_workflows: number;
    business_terms: number;
    business_knowledge: number;
  };
  failedStep?: string;
  error?: string;
}

export function emptyDraft(): BusinessBrainDraft {
  return {
    business: { name: "", type: "", description: "" },
    entities: [],
    relationships: [],
    rules: [],
    workflows: [],
    terms: [],
    knowledge: [],
  };
}
