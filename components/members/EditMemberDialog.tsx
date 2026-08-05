"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { Member } from "@/lib/members/types";
import { updateMember } from "@/app/actions/member-profile";

interface EditMemberDialogProps {
  member: Member;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditMemberDialog({
  member,
  workspaceId,
  onClose,
  onSuccess,
}: EditMemberDialogProps) {
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const updates: any = {};
    if (name !== member.name) updates.name = name;
    if (phone !== member.phone) updates.phone = phone;
    if (email !== member.email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    const result = await updateMember(workspaceId, member.id, updates);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Failed to update member");
    }

    setIsSubmitting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Member</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
             {/* Name */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Name *
               </label>
               <input
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 required
                 className="w-full px-4 py-2.5 bg-gray-50 border border-gray-400 rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                 placeholder="Member name"
               />
             </div>

             {/* Phone */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Phone Number *
               </label>
               <input
                 type="tel"
                 value={phone}
                 onChange={(e) => setPhone(e.target.value)}
                 required
                 className="w-full px-4 py-2.5 bg-gray-50 border border-gray-400 rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                 placeholder="+91 98765 43210"
               />
             </div>

             {/* Email */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Email
               </label>
               <input
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full px-4 py-2.5 bg-gray-50 border border-gray-400 rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                 placeholder="member@example.com"
               />
             </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
