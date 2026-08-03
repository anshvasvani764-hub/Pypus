import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { acceptInvite } from '@/app/actions/invites';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await acceptInvite(token);
    if (result.success && result.workspaceSlug) {
      redirect(`/${result.workspaceSlug}`);
    } else if (result.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <h1 className="text-lg font-bold text-red-900">Invalid invite</h1>
            <p className="mt-2 text-sm text-red-700">{result.error}</p>
          </div>
        </div>
      );
    }
  }

  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') || 'http';
  const origin = `${protocol}://${host}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re invited</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in or create an account to accept this invite and join the team.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`${origin}/login?next=/invite/${token}`}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Sign in
          </a>
          <a
            href={`${origin}/signup?next=/invite/${token}`}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create account
          </a>
        </div>
      </div>
    </div>
  );
}
