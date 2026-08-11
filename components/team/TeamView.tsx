'use client';

import { useState } from 'react';
import { Users, UserPlus, Trash2, MoreVertical, Mail, Calendar } from 'lucide-react';
import { InviteModal } from './InviteModal';
import { removeMember } from '@/app/actions/invites';
import { useSearch } from '@/context/SearchContext';

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

interface TeamViewProps {
  workspaceSlug: string;
  workspaceId: string;
  members: Member[];
  roles: Role[];
  currentUserId: string;
}

export function TeamView({ workspaceSlug, workspaceId, members, roles, currentUserId }: TeamViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { searchQuery } = useSearch();

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

  const activeMembers = members.filter((m) => {
    if (!m.is_active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (m.users?.full_name || m.users?.email || 'Unknown').toLowerCase();
      const email = (m.users?.email || '').toLowerCase();
      const roleLabel = (m.roles?.name || m.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || roleLabel.includes(q);
    }
    return true;
  });

  return (
    <div className="w-full max-w-6xl px-8 py-10 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage staff and their access to this workspace.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    No team members yet. Click &quot;Add Staff&quot; to invite someone.
                  </td>
                </tr>
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
                    <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 text-sm font-bold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{joined}</td>
                      <td className="px-6 py-4">
                        {member.user_id !== currentUserId && (
                          <button
                            onClick={() => handleRemove(member.id)}
                            disabled={removingId === member.id}
                            className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            aria-label={`Remove ${name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
