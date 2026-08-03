'use client';

import { useState } from 'react';
import { Users, UserPlus, Trash2, Mail, Calendar } from 'lucide-react';
import { InviteModal } from './InviteModal';
import { removeMember } from '@/app/actions/invites';

interface Role {
  id: string;
  name: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string | null;
  role_id: string | null;
  is_active: boolean;
  joined_at: string | null;
  users: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  roles: {
    name: string | null;
  } | null;
}

interface TeamViewMobileProps {
  workspaceSlug: string;
  workspaceId: string;
  members: Member[];
  roles: Role[];
  currentUserId: string;
}

export function TeamViewMobile({ workspaceSlug, workspaceId, members, roles, currentUserId }: TeamViewMobileProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    try {
      await removeMember(workspaceId, memberId);
    } catch {
      // error handled by action toast or silent fail
    } finally {
      setRemovingId(null);
    }
  }

  const activeMembers = members.filter((m) => m.is_active);

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-28">
      <div className="px-5 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-ve-on-surface">Team</h1>
            <p className="text-sm text-ve-on-surface-variant mt-0.5">
              Manage staff and access
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-ve-primary px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
          >
            <UserPlus size={16} />
            Add Staff
          </button>
        </div>

        <div className="space-y-3">
          {activeMembers.length === 0 ? (
            <div className="rounded-2xl border border-ve-outline-variant/20 bg-ve-surface-container-low p-6 text-center">
              <p className="text-sm text-ve-on-surface-variant">No team members yet.</p>
            </div>
          ) : (
            activeMembers.map((member) => {
              const name = member.users?.full_name || member.users?.email || 'Unknown';
              const email = member.users?.email || '—';
              const roleLabel = member.roles?.name || member.role || '—';
              const joined = member.joined_at
                ? new Date(member.joined_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—';

              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-ve-outline-variant/20 bg-ve-surface-container-low p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-ve-primary-container flex items-center justify-center text-ve-on-primary-container text-sm font-bold shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ve-on-surface truncate">{name}</p>
                        <p className="text-xs text-ve-on-surface-variant truncate">{email}</p>
                      </div>
                    </div>
                    {member.user_id !== currentUserId && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={removingId === member.id}
                        className="p-2 rounded-full text-ve-on-surface-variant/60 hover:text-ve-error active:scale-95 disabled:opacity-50 transition-colors shrink-0"
                        aria-label={`Remove ${name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-ve-primary/20 bg-ve-primary/10 px-3 py-1 text-xs font-bold text-ve-primary">
                      {roleLabel}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-ve-on-surface-variant">
                      <Calendar size={12} />
                      {joined}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <InviteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        roles={roles}
      />
    </div>
  );
}
