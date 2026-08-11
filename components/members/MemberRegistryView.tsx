"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberFilters } from "./MemberFilters";
import { MemberCard } from "./MemberCard";
import { AddMemberModal } from "./AddMemberModal";
import { createMember } from "@/app/actions/member-admin";
import type { Member } from "@/lib/members/types";
import type { DerivedFeeStatus } from "@/lib/members/fee-status";

interface MemberRegistryViewProps {
  members: Member[];
  workspaceSlug: string;
  workspaceId: string;
  attendanceMap: Record<string, { total: number; percentage: number }>;
  feeStatusMap: Record<string, DerivedFeeStatus>;
  planNameMap: Record<string, string | null>;
}

function filterMembers(
  members: Member[],
  filter: string,
  query: string,
  attendanceMap: Record<string, { total: number; percentage: number }>,
  feeStatusMap: Record<string, DerivedFeeStatus>
): Member[] {
  let result = members;

  switch (filter) {
    case "fee_due":
      result = result.filter((m) => {
        const st = feeStatusMap[m.id];
        return st === "due" || st === "overdue";
      });
      break;
    case "low_attendance": {
      result = result.filter((m) => {
        const s = attendanceMap[m.id];
        return s.total > 0 && s.percentage < 60;
      });
      break;
    }
    case "recent": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter((m) => new Date(m.joined_at) >= thirtyDaysAgo);
      break;
    }
    default:
      break;
  }

  if (query.trim()) {
    const q = query.toLowerCase().trim();
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }

  return result;
}

export function MemberRegistryView({
  members,
  workspaceSlug,
  workspaceId,
  attendanceMap,
  feeStatusMap,
  planNameMap,
}: MemberRegistryViewProps) {
  const router = useRouter();
  const { searchQuery: query } = useSearch();
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(
    () => filterMembers(members, activeFilter, query, attendanceMap, feeStatusMap),
    [members, activeFilter, query, attendanceMap, feeStatusMap]
  );

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <PageHeader
        title="Members"
        subtitle={`${members.length} member${members.length !== 1 ? "s" : ""} in your gym`}
        backHref={`/${workspaceSlug}/workspace`}
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        }
      />

      {/* Search + Filters */}
      <div className="mt-6 space-y-3">
        <MemberFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>

      {/* Grid */}
      <div className="mt-6">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                href={`/${workspaceSlug}/members/${member.id}`}
                feeStatus={feeStatusMap[member.id]}
                planName={planNameMap[member.id]}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No members found</p>
            <p className="mt-1 text-sm text-gray-500">
              {query ? `No results for "${query}"` : "Try a different filter"}
            </p>
          </div>
        )}
      </div>

      {/* Count footer */}
      {filtered.length > 0 && filtered.length !== members.length && (
        <p className="mt-4 text-xs text-gray-400">
          Showing {filtered.length} of {members.length} members
        </p>
      )}

      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (data) => {
          const result = await createMember(workspaceId, data);
          if (result.success) {
            router.refresh();
          }
          return result;
        }}
      />
    </div>
  );
}
