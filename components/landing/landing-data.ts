// ─────────────────────────────────────────────────────────────────
// EDIT THIS FILE to update landing page content — no code changes needed
// elsewhere. TESTIMONIALS and FAQ_ITEMS below are PLACEHOLDERS — replace
// every single one with a real client review / real FAQ before launch.
// ─────────────────────────────────────────────────────────────────

export const STATS = [
  { count: 120, decimal: 0, suffix: "+", label: "Gyms & academies onboarded" },
  { count: 18000, decimal: 0, suffix: "+", label: "Members managed daily" },
  { count: 99.9, decimal: 1, suffix: "%", label: "Uptime this year" },
  { count: 24, decimal: 0, suffix: "hr", label: "Average setup time" },
];
// TODO(Ansh): these numbers are placeholder demo numbers. Replace with your
// real current figures before this goes live — don't ship fake stats.

export const PROOF_LOGOS = [
  "11F UNISEX GYM",
  "HR ACADEMY",
  "PULSE FITNESS",
  "IRONCORE STUDIO",
  "FLEXPOINT",
];
// TODO(Ansh): replace with your actual paying/trial client names once you
// have permission to display them publicly.

export const MODULES = [
  { code: "[MEM]", accent: "#3B82F6", title: "Members", desc: "Full profiles, plans, and join/renewal history in one searchable list." },
  { code: "[ATT]", accent: "#10B981", title: "Attendance", desc: "One-tap check-ins with automatic streaks and no-show alerts." },
  { code: "[PAY]", accent: "#F59E0B", title: "Payments", desc: "Track dues, partial payments and fee status — clear, calm and always current." },
  { code: "[REP]", accent: "#8B5CF6", title: "Reports", desc: "Revenue, retention and attendance trends — updated live, exportable anytime." },
  { code: "[EXP]", accent: "#EC4899", title: "Expenses", desc: "Log rent, staff and equipment costs, and watch your real monthly profit take shape." },
];

export const STEPS = [
  { num: "01 — Import", title: "Bring your existing data", desc: "Upload your member list from Excel or WhatsApp exports. We map it into the system for you." },
  { num: "02 — Configure", title: "Pick your modules", desc: "Turn on only what you need — Members and Payments today, add Reports next month." },
  { num: "03 — Go live", title: "Start checking members in", desc: "Your front desk starts using it the same day. No training manual required." },
];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  /** optional real photo path, e.g. "/testimonials/rohit-kapoor.jpg" — falls back to initials avatar if omitted */
  photo?: string;
}

// ⚠️ PLACEHOLDER DATA — these are NOT real reviews. Ansh will replace every
// entry here with a real client quote (and ideally a real photo) before launch.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "REPLACE ME — real client quote goes here.",
    name: "Client name",
    role: "Role, Gym name",
  },
  {
    quote: "REPLACE ME — real client quote goes here.",
    name: "Client name",
    role: "Role, Gym name",
  },
  {
    quote: "REPLACE ME — real client quote goes here.",
    name: "Client name",
    role: "Role, Gym name",
  },
];

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "₹999",
    period: "Up to 100 members",
    features: ["All 5 modules", "1 staff login", "Email support"],
    ctaLabel: "Start free trial",
    ctaHref: "/login",
  },
  {
    name: "Growth",
    price: "₹2,499",
    period: "Up to 500 members",
    features: ["All 5 modules", "5 staff logins", "WhatsApp fee reminders", "Priority support"],
    featured: true,
    ctaLabel: "Start free trial",
    ctaHref: "/login",
  },
  {
    name: "Scale",
    price: "₹4,999",
    period: "Unlimited members, multi-branch",
    features: ["All 5 modules", "Unlimited staff logins", "Multi-branch reporting", "Dedicated onboarding"],
    ctaLabel: "Talk to us",
    ctaHref: "/login",
  },
];
// TODO(Ansh): confirm final pricing before launch — these numbers came from
// the original design mock, not a locked pricing decision.

export interface FaqItem {
  question: string;
  answer: string;
}

// ⚠️ PLACEHOLDER DATA — replace every question/answer with real FAQs you've
// actually gotten from prospects during door-to-door outreach.
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "REPLACE ME — real question goes here?",
    answer: "REPLACE ME — real answer goes here.",
  },
  {
    question: "REPLACE ME — real question goes here?",
    answer: "REPLACE ME — real answer goes here.",
  },
  {
    question: "REPLACE ME — real question goes here?",
    answer: "REPLACE ME — real answer goes here.",
  },
  {
    question: "REPLACE ME — real question goes here?",
    answer: "REPLACE ME — real answer goes here.",
  },
];
