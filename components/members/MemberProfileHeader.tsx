"use client";

import { useState } from "react";
import { MessageCircle, Pencil, Trash2, MoreVertical } from "lucide-react";
import type { Member } from "@/lib/members/types";
import { feeStatusStyle, type DerivedFeeStatus } from "@/lib/members/fee-status";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { sendReminder } from "@/app/actions/member-reminders";
import { EditMemberDialog } from "./EditMemberDialog";
import { DeleteMemberDialog } from "./DeleteMemberDialog";
import { useRouter } from "next/navigation";

interface MemberProfileHeaderProps {
  member: Member;
  workspaceName: string;
  workspaceSlug: string;
  feeStatus: DerivedFeeStatus;
  planName: string | null;
  payableFeeId: string | null;
}

export function MemberProfileHeader({
  member,
  workspaceName,
  workspaceSlug,
  feeStatus,
  planName,
  payableFeeId,
}: MemberProfileHeaderProps) {
  const router = useRouter();
  const joinedDate = new Date(member.joined_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const badge = feeStatusStyle(feeStatus);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSendReminder(type: "fees" | "attendance") {
    const result = await sendReminder({
      workspaceId: member.workspace_id,
      memberId: member.id,
      memberPhone: member.phone,
      memberName: member.name,
      workspaceName,
      feeId: payableFeeId,
      type,
    });

    if (result.success && result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
      setToast("Reminder sent");
    } else {
      setToast(result.error || "Failed to send reminder");
    }
    setShowReminderMenu(false);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      {showEditDialog && (
        <EditMemberDialog
          member={member}
          workspaceId={member.workspace_id}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            router.refresh();
            setToast("Member updated successfully");
            setTimeout(() => setToast(null), 3000);
          }}
        />
      )}

      {showDeleteDialog && (
        <DeleteMemberDialog
          member={member}
          workspaceId={member.workspace_id}
          workspaceSlug={workspaceSlug}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        {toast && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-lg text-sm text-gray-900">
            {toast}
          </div>
        )}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={64} />

            <div>
              <h1 className="text-xl font-semibold text-gray-900">{member.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}
              >
                {badge.label}
              </span>
              <p className="mt-1 text-sm text-gray-500">{planName ?? "No plan assigned"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Joined {joinedDate}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setShowReminderMenu(!showReminderMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Send Reminder
              </button>
              {showReminderMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowReminderMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1">
                    <button
                      onClick={() => handleSendReminder("fees")}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Send fees reminder
                    </button>
                    <button
                      onClick={() => handleSendReminder("attendance")}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Send attendance reminder
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* More Options Menu */}
            <div className="relative">
              <button
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showOptionsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOptionsMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-lg py-1">
                    <button
                      onClick={() => {
                        setShowEditDialog(true);
                        setShowOptionsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Member
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        setShowDeleteDialog(true);
                        setShowOptionsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Member
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
