import { getDevice } from '@/lib/device'
import { LoginViewMobile } from '@/components/mobile/onboarding/LoginView.mobile'
import { LoginPageDesktop } from '@/components/auth/LoginPageDesktop'

export default async function LoginPage() {
  if ((await getDevice()) === 'mobile') {
    return <LoginViewMobile />
  }

  return <LoginPageDesktop />
}
