// ──────────────────────────────────────────────
// Member bulk-import — processing/result screen contract
//
// ImportUploadModal (Agent 2) renders <ImportProcessingResult /> once the
// owner confirms the import and the server action has been called. Agent 3
// owns the component body (components/import/ImportProcessingResult.tsx);
// this file only pins down the props so both sides can build against a
// stable interface.
// ──────────────────────────────────────────────

import type { ImportResult } from "@/lib/import/types";

export interface ImportProcessingResultProps {
  /** 'processing' while the server action is in flight, 'done' once
   *  `result` has arrived (success or failure — check `result.success`). */
  status: "processing" | "done";
  /** Null while status is 'processing'. Populated with the server action's
   *  return value once status flips to 'done'. */
  result: ImportResult | null;
}
