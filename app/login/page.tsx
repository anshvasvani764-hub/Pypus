import { getDevice } from '@/lib/device'
import { LoginViewMobile } from '@/components/mobile/onboarding/LoginView.mobile'
import { LoginPageDesktop } from '@/components/auth/LoginPageDesktop'
import { LocalDevLogin } from './LocalDevLogin'

export default async function LoginPage() {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_TEST_EMAIL &&
    process.env.NEXT_PUBLIC_DEV_TEST_PASSWORD
  ) {
    return <LocalDevLogin />
  }

  if ((await getDevice()) === 'mobile') {
    return <LoginViewMobile />
  }

  return <LoginPageDesktop />
}
