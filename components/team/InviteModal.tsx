'use client';

import { useState } from 'react';
import { X, Copy, MessageSquare, Check } from 'lucide-react';
import { generateInvite } from '@/app/actions/invites';

interface RoleOption {
  id: string;
  name: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentUserId: string;
  roles: RoleOption[];
}

export function InviteModal({ isOpen, onClose, workspaceId, currentUserId, roles }: InviteModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [customRoleName, setCustomRoleName] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [invite, setInvite] = useState<{ link: string; roleName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setInvite(null);

    try {
      let roleId = selectedRoleId;
      let roleName = '';

      if (useCustomRole) {
        const trimmed = customRoleName.trim();
        if (!trimmed) {
          setError('Please enter a role name');
          setLoading(false);
          return;
        }
        roleName = trimmed;
      } else {
        const role = roles.find((r) => r.id === selectedRoleId);
        if (!role) {
          setError('Please select a role');
          setLoading(false);
          return;
        }
        roleName = role.name;
      }

      const result = await generateInvite({
        workspaceId,
        roleId: useCustomRole ? '' : roleId,
        roleName,
        createdBy: currentUserId,
      });

      setInvite({ link: result.link, roleName: result.roleName });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsAppShare() {
    if (!invite) return;
    const text = `You're invited to join my team on Pypus as ${invite.roleName}. Click the link to accept:\n\n${invite.link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleClose() {
    setInvite(null);
    setError(null);
    setSelectedRoleId('');
    setCustomRoleName('');
    setUseCustomRole(false);
    setCopied(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Staff</h2>
          <button
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!invite ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomRole(false)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      !useCustomRole ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomRole(true)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      useCustomRole ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    New
                  </button>
                </div>
              </div>

              {useCustomRole ? (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Role Name</label>
                  <input
                    type="text"
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                    placeholder="e.g. Receptionist"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Select Role</label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="">Choose a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </p>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Invite'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider mb-1">Invite link</p>
                <p className="text-sm text-gray-900 break-all">{invite.link}</p>
                <p className="text-xs text-gray-500 mt-1">Role: {invite.roleName}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Share on WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
