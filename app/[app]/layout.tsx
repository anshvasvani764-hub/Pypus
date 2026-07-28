import { SidebarProvider } from '@/context/SidebarContext'
import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ app: string }>
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#FAFAF7]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SidebarProvider>
  )
}