"use client";

import Link from "next/link";
import { Phone, CalendarDays, ChevronRight } from "lucide-react";
import type { Member } from "@/lib/members/types";
import { feeStatusStyle, type DerivedFeeStatus } from "@/lib/members/fee-status";
import MemberAvatar from "@/components/shared/MemberAvatar";

interface MemberCardProps {
  member: Member;
  href: string;
  feeStatus: DerivedFeeStatus;
  planName: string | null;
}

export function MemberCard({ member, href, feeStatus, planName }: MemberCardProps) {
  const joinedDate = new Date(member.joined_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const badge = feeStatusStyle(feeStatus);

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={48} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {member.name}
          </h3>

          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {member.phone}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {joinedDate}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">
                {planName ?? "No plan"}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.classes}`}
              >
                {badge.label}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}
