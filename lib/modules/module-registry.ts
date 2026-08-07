import { Users, Clock, CreditCard, Sparkles, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleSlug = "members" | "attendance" | "fees" | "expenses";

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
    title: "Members",
    description: "Members, dues, memberships and history",
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    requiredPermission: "members.view",
  },
  {
    slug: "attendance",
    title: "Attendance",
    description: "Daily check-ins for members and staff",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    requiredPermission: "attendance.view",
  },
  {
    slug: "fees",
    title: "Fees",
    description: "Manage memberships, payments and billing",
    icon: CreditCard,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    requiredPermission: "fees.view",
  },
  {
    slug: "expenses",
    title: "Expenses",
    description: "Track fixed, one-time and monthly expenses",
    icon: Wallet,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    requiredPermission: "expenses.view",
  },
];

export const COMING_SOON_CARD = {
  title: "More modules",
  description: "Expenses, Team, Reports and more are coming soon.",
  icon: Sparkles,
};