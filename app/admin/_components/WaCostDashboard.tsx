export interface WaCostRow {
  workspace_id: string;
  business_name: string;
  messages_total: number;
  messages_last_7d: number;
  messages_last_30d: number;
  fee_reminder_count: number;
  receipt_count: number;
  other_count: number;
  failed_count: number;
  estimated_cost_inr: number;
  last_wa_activity_at: string | null;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WaCostDashboard({ rows }: { rows: WaCostRow[] }) {
  const totalMessages = rows.reduce((sum, r) => sum + r.messages_total, 0);
  const totalCost = rows.reduce((sum, r) => sum + Number(r.estimated_cost_inr), 0);
  const totalFailed = rows.reduce((sum, r) => sum + r.failed_count, 0);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">WhatsApp cost dashboard</h1>
          <p className="text-sm text-slate-400">
            Estimated — until Meta&apos;s status webhook confirms a message&apos;s billing category,
            the number below uses our send-time guess. Update rate-card prices in Supabase
            (<code className="text-emerald-400">wa_rate_card</code>) to match your current Meta billing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total messages</p>
            <p className="mt-1 text-2xl font-semibold">{totalMessages.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Estimated total cost</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">{formatInr(totalCost)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Failed sends</p>
            <p className="mt-1 text-2xl font-semibold text-red-400">{totalFailed.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">Msgs (total)</th>
                <th className="px-4 py-3 font-medium">Last 7d</th>
                <th className="px-4 py-3 font-medium">Fee reminders</th>
                <th className="px-4 py-3 font-medium">Receipts</th>
                <th className="px-4 py-3 font-medium">Failed</th>
                <th className="px-4 py-3 font-medium">Est. cost</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No WhatsApp activity logged yet — sends will start showing up here once the
                    tracking patch is deployed and live.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.workspace_id} className="border-t border-slate-800 hover:bg-slate-900/50">
                  <td className="px-4 py-3 font-medium">{r.business_name}</td>
                  <td className="px-4 py-3">{r.messages_total}</td>
                  <td className="px-4 py-3">{r.messages_last_7d}</td>
                  <td className="px-4 py-3">{r.fee_reminder_count}</td>
                  <td className="px-4 py-3">{r.receipt_count}</td>
                  <td className="px-4 py-3">
                    {r.failed_count > 0 ? (
                      <span className="text-red-400">{r.failed_count}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {formatInr(Number(r.estimated_cost_inr))}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatWhen(r.last_wa_activity_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
