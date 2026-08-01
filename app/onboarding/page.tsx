import { getDevice } from '@/lib/device'
import { OnboardingViewMobile } from '@/components/mobile/onboarding/OnboardingView.mobile'
import { OnboardingPageDesktop } from './_components/OnboardingPageDesktop'

export default async function OnboardingPage() {
  if ((await getDevice()) === 'mobile') {
    return <OnboardingViewMobile />
  }

  return <OnboardingPageDesktop />
}
