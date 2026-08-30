import type { PypusTool, ToolContext } from "./shared";
import { MEMBERS_TOOLS } from "./members";
import { FEES_TOOLS } from "./fees";
import { ATTENDANCE_TOOLS } from "./attendance";
import { EXPENSES_TOOLS } from "./expenses";
import { TEAM_TOOLS } from "./team";

export type { PypusTool, ToolContext } from "./shared";

// Add a new module by creating lib/pypus/tools/<module>.ts with its own
// `export const <MODULE>_TOOLS: PypusTool[] = [...]` and listing it here —
// nothing else needs to change.
export const PYPUS_TOOLS: PypusTool[] = [
  ...MEMBERS_TOOLS,
  ...FEES_TOOLS,
  ...ATTENDANCE_TOOLS,
  ...EXPENSES_TOOLS,
  ...TEAM_TOOLS,
];

export async function runPypusTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const tool = PYPUS_TOOLS.find((t) => t.name === name);
  if (!tool) return { error: `Unknown tool "${name}"` };
  try {
    return await tool.run(ctx, args);
  } catch (err) {
    console.error(`pypus tool ${name} failed`, err);
    return { error: `Tool "${name}" could not read the database.` };
  }
}
