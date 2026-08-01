import {
  Mail,
  Phone,
  CalendarDays,
  CreditCard,
  StickyNote,
} from "lucide-react";
import MemberAvatar from "@/components/shared/MemberAvatar";
import type { Member } from "@/lib/members/types";

interface MemberOverviewTabProps {
  member: Member;
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-900 font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export function MemberOverviewTab({ member }: MemberOverviewTabProps) {
  const joinedDate = new Date(member.joined_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="grid grid-cols-1 gap-5 mt-5">
      {/* Avatar + Contact */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center gap-4">
        <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={56} />
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Contact Details</h2>
          <div>
            <InfoRow icon={Mail} label="Email" value={member.email} />
            <InfoRow icon={Phone} label="Phone" value={member.phone} />
            <InfoRow icon={CalendarDays} label="Joined" value={joinedDate} />
          </div>
        </div>
      </div>

      {/* Notes */}
      {member.notes && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Notes</h2>
          <div>
            <InfoRow icon={StickyNote} label="Internal Notes" value={member.notes} />
          </div>
        </div>
      )}
    </div>
  );
}
