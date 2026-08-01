import { headers } from 'next/headers'

export type Device = 'mobile' | 'desktop'

export async function getDevice(): Promise<Device> {
  const h = await headers()
  return h.get('x-device') === 'mobile' ? 'mobile' : 'desktop'
}

export async function isMobile(): Promise<boolean> {
  return (await getDevice()) === 'mobile'
}
