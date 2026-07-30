'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getISTDateString } from '@/lib/utils/date'

/**
 * Shared helper: validates the caller's session and returns the auth user.
 * Throws a plain error if there's no valid session.
 */
async function requireSession() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthenticated')
  }
  return user
}

// ---------------------------------------------------------------------------
// registerMember
// ---------------------------------------------------------------------------
export async function registerMember(
  workspaceId: string,
  phone: string
): Promise<{ error?: string }> {
  // 1. Validate session
  let user: Awaited<ReturnType<typeof requireSession>>
  try {
    user = await requireSession()
  } catch {
    return { error: 'Not signed in. Please refresh and try again.' }
  }

  // 2. Validate phone (must have at least 7 digits)
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) {
    return { error: 'Please enter a valid phone number.' }
  }

  const service = createServiceClient()

  // 3. Verify the workspace exists
  const { data: ws, error: wsErr } = await service
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .single()

  if (wsErr || !ws) {
    return { error: 'Workspace not found.' }
  }

  // 4. Guard: prevent duplicate member rows (race-condition safety)
  const { data: existing } = await service
    .from('members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('auth_user_id', user.id)
    .single()

  if (existing) {
    // Already registered — treat as success so the page can redirect
    return {}
  }

  // 5. Insert the new member row using Google profile data
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Member'
  const email = user.email ?? ''
  const avatarUrl = user.user_metadata?.avatar_url ?? null

  const { error: insertErr } = await service.from('members').insert({
    workspace_id: workspaceId,
    name,
    email,
    phone,
    avatar_url: avatarUrl,
    auth_user_id: user.id,
    plan_id: null,
    trainer_id: null,
  })

  if (insertErr) {
    console.error('registerMember insert error:', insertErr)
    return { error: 'Could not register. Please try again.' }
  }

  return {}
}

// ---------------------------------------------------------------------------
// markAttendance
// ---------------------------------------------------------------------------
export type AttendanceResult =
  | { alreadyCheckedIn: true; checkInTime: string }
  | { alreadyCheckedIn: false; checkInTime: string }
  | { error: string }

export async function markAttendance(
  workspaceId: string
): Promise<AttendanceResult> {
  // 1. Validate session
  let user: Awaited<ReturnType<typeof requireSession>>
  try {
    user = await requireSession()
  } catch {
    return { error: 'Not signed in.' }
  }

  const service = createServiceClient()

  // 2. Resolve member row
  const { data: member, error: memberErr } = await service
    .from('members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('auth_user_id', user.id)
    .single()

  if (memberErr || !member) {
    return { error: 'Member not found for this workspace.' }
  }

  const today = getISTDateString() // YYYY-MM-DD in Asia/Kolkata

  // 3. Look for an existing attendance row today
  const { data: existing } = await service
    .from('attendance')
    .select('id, check_in')
    .eq('workspace_id', workspaceId)
    .eq('member_id', member.id)
    .eq('date', today)
    .single()

  if (existing?.check_in) {
    return { alreadyCheckedIn: true, checkInTime: existing.check_in }
  }

  // 4. Insert new attendance row
  const checkInTime = new Date().toISOString()
  const { error: insertErr } = await service.from('attendance').insert({
    workspace_id: workspaceId,
    member_id: member.id,
    date: today,
    check_in: checkInTime,
    check_out: null,
    status: 'present',
  })

  if (insertErr) {
    console.error('markAttendance insert error:', insertErr)
    return { error: 'Could not mark attendance. Please try again.' }
  }

  return { alreadyCheckedIn: false, checkInTime }
}

// ---------------------------------------------------------------------------
// getFeesStatus
// ---------------------------------------------------------------------------
export type FeeStatusResult =
  | {
      hasDue: true
      amount: number
      dueDate: string
      status: 'due' | 'overdue'
      planName: string
    }
  | { hasDue: false }
  | { error: string }

export async function getFeesStatus(
  workspaceId: string
): Promise<FeeStatusResult> {
  // 1. Validate session
  let user: Awaited<ReturnType<typeof requireSession>>
  try {
    user = await requireSession()
  } catch {
    return { error: 'Not signed in.' }
  }

  const service = createServiceClient()

  // 2. Resolve member row
  const { data: member, error: memberErr } = await service
    .from('members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('auth_user_id', user.id)
    .single()

  if (memberErr || !member) {
    return { error: 'Member not found.' }
  }

  // 3. Find the most urgent due/overdue fee
  const { data: fees, error: feeErr } = await service
    .from('fees')
    .select('amount_snapshot, paid_amount, due_date, status, plan_name_snapshot')
    .eq('workspace_id', workspaceId)
    .eq('member_id', member.id)
    .in('status', ['due', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)

  if (feeErr) {
    console.error('getFeesStatus error:', feeErr)
    return { error: 'Could not check fees.' }
  }

  if (!fees || fees.length === 0) {
    return { hasDue: false }
  }

  const fee = fees[0]
  const amount =
    (fee.amount_snapshot ?? 0) - (fee.paid_amount ?? 0)

  return {
    hasDue: true,
    amount,
    dueDate: fee.due_date,
    status: fee.status as 'due' | 'overdue',
    planName: fee.plan_name_snapshot ?? 'Plan',
  }
}
