import { redirect } from 'next/navigation'
import { SidebarProvider } from '@/context/SidebarContext'
import { SearchProvider } from '@/context/SearchContext'
import Sidebar from '@/components/layout/Sidebar'
import { MobileNavDrawer } from '@/components/mobile/MobileNavDrawer'
import { MobileNavProvider } from '@/context/MobileNavContext'
import { GlobalHeader } from '@/components/layout/GlobalHeader'
import { getDevice } from '@/lib/device'
import { createServiceClient } from '@/lib/supabase/service'
import { getSubscriptionState } from '@/lib/subscriptions/get-subscription-status'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ app: string }>
}) {
  const device = await getDevice()
  const { app: workspaceSlug } = await params

  // Resolve workspace id + name once, then gate on subscription status.
  // NOTE: this uses the service-role client purely to look up the
  // workspace row and check billing status — it does not read gym data
  // (members/fees/attendance), so it does not widen what an unauthenticated
  // caller can see. Per-workspace data access is still governed by RLS
  // inside each page/action. This gate does NOT replace real session auth —
  // see PYPUS_AUTH_TODO.md for the separate auth gap that still needs fixing.
  const supabase = createServiceClient()
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', workspaceSlug)
    .single()

  if (workspace?.id) {
    const subState = await getSubscriptionState(workspace.id)
    if (!subState.allowed) {
      redirect(`/subscribe/${workspaceSlug}?reason=${subState.status}`)
    }
  }

  if (device === 'mobile') {
    return (
      <MobileNavProvider>
        <div className="font-ve min-h-screen w-full overflow-x-hidden bg-ve-surface text-ve-on-surface">
          <MobileNavDrawer workspaceSlug={workspaceSlug} />
          <main className="pb-6">{children}</main>
        </div>
      </MobileNavProvider>
    )
  }

  const workspaceName = workspace?.name ?? workspaceSlug

  return (
    <SidebarProvider>
      <SearchProvider>
        <div className="flex min-h-screen bg-[#FAFAF7]">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <GlobalHeader workspaceName={workspaceName} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </SearchProvider>
    </SidebarProvider>
  )
}