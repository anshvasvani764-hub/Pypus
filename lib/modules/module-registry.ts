import { Users, Clock, Wallet, UsersRound, BarChart3, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleSlug = "members" | "attendance" | "expenses" | "team" | "reports";

export interface ModuleRegistryEntry {
  slug: ModuleSlug;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  requiredPermission: string;
}

export const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  {
    slug: "members",
    title: "Customers",
    description: "Members, dues, memberships and history",
    icon: Users,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    requiredPermission: "members.view",
  },
  {
    slug: "attendance",
    title: "Attendance",
    description: "Daily check-ins for members and staff",
    icon: Clock,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    requiredPermission: "attendance.view",
  },
  {
    slug: "expenses",
    title: "Expenses",
    description: "Track rent, salaries, supplies and more",
    icon: Wallet,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    requiredPermission: "expenses.view",
  },
  {
    slug: "team",
    title: "Team",
    description: "Staff, coaches, shifts and payroll",
    icon: UsersRound,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    requiredPermission: "team.view",
  },
  {
    slug: "reports",
    title: "Reports",
    description: "Sales, retention and business health",
    icon: BarChart3,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    requiredPermission: "reports.view",
  },
];

export const COMING_SOON_CARD = {
  title: "More modules",
  description: "Inventory, Marketing and Bookings are coming soon.",
  icon: Sparkles,
};