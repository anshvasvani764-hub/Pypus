"use client";

import { useState, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import type { Member } from "@/lib/members/types";
import { MOCK_MEMBERS, getMemberPlanName } from "@/lib/members/mock-data";
import MemberAvatar from "@/components/shared/MemberAvatar";

interface QuickCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCheckinModal({ isOpen, onClose }: QuickCheckinModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedMember(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const matches = selectedMember
    ? []
    : searchQuery.trim()
      ? MOCK_MEMBERS.filter((m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : [];

  function handleSelect(member: Member) {
    setSelectedMember(member);
  }

  function handleClose() {
    onClose();
  }

  function handleConfirm() {
    if (selectedMember) {
      setSelectedMember(null);
      setSearchQuery("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Mark Attendance
          </h2>
          <button
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedMember(null);
              }}
              placeholder="Search member by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Search results */}
          {!selectedMember && matches.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {matches.map((member) => {
                return (
                  <button
                    key={member.id}
                    onClick={() => handleSelect(member)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-400">{getMemberPlanName(member.id)}</p>
                    </div>
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!selectedMember && searchQuery.trim() && matches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">No member found</p>
              <p className="mt-1 text-sm text-gray-500">
                Try searching by name
              </p>
            </div>
          )}

          {/* Selected member confirmation */}
          {selectedMember && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <MemberAvatar name={selectedMember.name} avatarUrl={selectedMember.avatar_url} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedMember.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getMemberPlanName(selectedMember.id)}
                  </p>
                </div>
            </div>
          )}

          {/* Placeholder for future features */}
          <p className="text-xs text-gray-400 text-center">
            QR code and face recognition coming soon
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMember}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedMember
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Confirm Check-in
          </button>
        </div>
      </div>
    </div>
  );
}