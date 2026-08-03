import { SidebarProvider } from '@/context/SidebarContext'
import Sidebar from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { getDevice } from '@/lib/device'
import { createServiceClient } from '@/lib/supabase/service'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ app: string }>
}) {
  const device = await getDevice()
  const { app: workspaceSlug } = await params

  const service = createServiceClient()
  const { data: workspace } = await service
    .from('workspaces')
    .select('name')
    .eq('slug', workspaceSlug)
    .single()

  const workspaceName = workspace?.name || 'Workspace'

  if (device === 'mobile') {
    return (
      <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface">
        <main className="pb-28">{children}</main>
        <MobileBottomNav workspaceSlug={workspaceSlug} workspaceName={workspaceName} />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#FAFAF7]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SidebarProvider>
  )
}
