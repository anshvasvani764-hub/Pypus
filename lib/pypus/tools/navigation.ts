import type { PypusTool } from "./shared";

/**
 * Relative (workspace-scoped) routes the agent is allowed to point the user
 * to, taken from context/PYPUS_AGENT_UI_NAVIGATION_GUIDE.md. Keep this list
 * in sync with that guide — only static pages here; a page needing a
 * specific record id (e.g. one member's profile) isn't something the agent
 * can safely deep-link to from a text answer, so those are left out.
 */
const KNOWN_PAGES: Record<string, { route: string; label: string }> = {
  home: { route: "", label: "Home" },
  workspace: { route: "workspace", label: "Workspace" },
  members: { route: "members", label: "Members" },
  members_import: { route: "members/import", label: "Import members" },
  attendance: { route: "attendance", label: "Attendance" },
  fees: { route: "fees", label: "Fees" },
  fees_plans: { route: "fees/plans", label: "Membership plans" },
  expenses: { route: "expenses", label: "Expenses" },
  team: { route: "team", label: "Team" },
  automations_receipts: { route: "automations/receipts", label: "Receipts automation" },
  automations_fee_reminders: { route: "automations/fee-reminders", label: "Fee reminders automation" },
  settings: { route: "settings", label: "Settings" },
  assistant: { route: "assistant", label: "AI Assistant" },
};

const suggestPage: PypusTool = {
  name: "suggest_page",
  riskLevel: "low",
  description:
    "Call this whenever your answer tells the owner to go to a specific screen — a how-to question (e.g. \"fee plan kaise banaye\", \"receipt kaise bheju\") or a direct location question (e.g. \"fee plan kaha banta hai\", \"receipt kaha jayegi\"). Pass the page key from the known list. This attaches a one-tap button that takes the owner straight there, in addition to your explained-in-words navigation steps — always give both, never the button alone. Do not call this for questions that aren't about reaching a screen.",
  parameters: {
    type: "object",
    properties: {
      page: {
        type: "string",
        enum: Object.keys(KNOWN_PAGES),
        description: "Key of the destination page, from the known page list.",
      },
      label: {
        type: "string",
        description:
          "Short button text shown to the owner (a few words, e.g. \"Fee plans par jao\"). Falls back to a default label for the page if omitted.",
      },
    },
    required: ["page"],
  },
  async run(ctx, args) {
    const page = String(args.page ?? "");
    const known = KNOWN_PAGES[page];
    if (!known) {
      return { error: "unknown_page" as const, availablePages: Object.keys(KNOWN_PAGES) };
    }
    const label = typeof args.label === "string" && args.label.trim() ? args.label.trim() : known.label;
    // Recorded on the shared ToolContext (mirrors how resolvedContext is
    // threaded through) so the route handler can hand it back to the
    // client once the tool loop finishes — see app/api/pypus/chat/route.ts.
    ctx.navigationSuggestion = { route: known.route, label };
    return { ok: true, route: known.route, label };
  },
};

export const NAVIGATION_TOOLS: PypusTool[] = [suggestPage];
