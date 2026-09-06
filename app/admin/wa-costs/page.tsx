import { isAdminAuthenticated } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import AdminPasswordGate from "@/app/admin/_components/AdminPasswordGate";
import WaCostDashboard, { type WaCostRow } from "@/app/admin/_components/WaCostDashboard";

export const dynamic = "force-dynamic"; // always fresh — this is a live cost dashboard, never cache it

export default async function WaCostsPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return <AdminPasswordGate />;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("admin_wa_cost_overview");

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-red-400">
        Failed to load WA cost data: {error.message}
      </div>
    );
  }

  return <WaCostDashboard rows={(data ?? []) as WaCostRow[]} />;
}
