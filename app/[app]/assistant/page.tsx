import { getDevice } from '@/lib/device'
import { AssistantView as AssistantViewMobile } from '@/components/mobile/AssistantView.mobile'
import { AssistantViewDesktop } from '@/components/dashboard/AssistantViewDesktop'

export default async function AssistantPage({
  params,
}: {
  params: Promise<{ app: string }>
}) {
  const { app: workspaceSlug } = await params

  if ((await getDevice()) === 'mobile') {
    return <AssistantViewMobile workspaceSlug={workspaceSlug} />
  }

  return <AssistantViewDesktop />
}
