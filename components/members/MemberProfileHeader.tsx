"use client";

import { useState } from "react";
import { MessageCircle, CreditCard } from "lucide-react";
import type { Member } from "@/lib/members/types";
import { getMemberPlanName } from "@/lib/members/mock-data";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { sendReminder } from "@/app/actions/member-reminders";

interface MemberProfileHeaderProps {
  member: Member;
  workspaceName: string;
}

export function MemberProfileHeader({ member, workspaceName }: MemberProfileHeaderProps) {
  const joinedDate = new Date(member.joined_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const planName = getMemberPlanName(member.id);
  const feeStatus: "paid" | "due" | "overdue" | null = member.plan_id ? "due" : null;
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSendReminder(type: "fees" | "attendance") {
    const result = await sendReminder({
      workspaceId: member.workspace_id,
      memberId: member.id,
      memberPhone: member.phone,
      memberName: member.name,
      workspaceName,
      feeId: null,
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
            {feeStatus && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                Due
              </span>
            )}
            <p className="mt-1 text-sm text-gray-500">{planName}</p>
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
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Mark payment received (UI only)"
          >
            <CreditCard className="h-4 w-4" />
            Mark Paid
          </button>
        </div>
      </div>
    </div>
  );
}
