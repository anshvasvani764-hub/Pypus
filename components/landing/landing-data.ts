// ─────────────────────────────────────────────────────────────────
// EDIT THIS FILE to update landing page content — no code changes needed
// elsewhere. TESTIMONIALS and FAQ_ITEMS below are PLACEHOLDERS — replace
// every single one with a real client review / real FAQ before launch.
// ─────────────────────────────────────────────────────────────────

export const STATS = [
  { count: 2, decimal: 0, suffix: "", label: "Gyms live on free trial" },
  { count: 15, decimal: 0, suffix: "+", label: "Gyms visited across Gurugram" },
  { count: 5, decimal: 0, suffix: "", label: "Modules — one connected system" },
  { count: 24, decimal: 0, suffix: "hr", label: "Average setup time" },
];
// NOTE(Ansh): these are your real early numbers as of Aug 2026. Update
// "Gyms live on free trial" as you close more — don't inflate this, small
// honest numbers build more trust with gym owners than fake big ones.

export const PROOF_LOGOS = [
  "MGL FITNESS STUDIO",
  "POWERHOUSE GYM",
  "11F FITNESS",
  "ENERGY FITNESS",
  "HR ACADEMY",
];
// Real trial gyms + HR Academy (Ansh's own venture) — updated Aug 2026.
// Add new names here as more gyms come on trial.

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

// Real feedback from gyms on the Pypus trial — collected by Ansh during
// in-person visits and WhatsApp check-ins.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Since we started using Pypus, our day-to-day gym work gets done a lot faster.",
    name: "MGL Fitness Studio",
    role: "Gym on free trial",
    photo: "/testimonials/mgl-fitness-studio.png",
  },
  {
    quote: "The tracking has genuinely helped us stay on top of dues and attendance.",
    name: "Powerhouse Gym",
    role: "Gym on free trial",
    photo: "/testimonials/powerhouse-gym.png",
  },
  {
    quote: "The automation is really helpful — it saves us time every single day.",
    name: "11F Fitness",
    role: "Unisex gym, on free trial",
    photo: "/testimonials/11f-fitness.png",
  },
  {
    quote: "It's simple to use, and it makes running the gym a lot easier for our team.",
    name: "Energy Fitness",
    role: "Gym on free trial",
    photo: "/testimonials/energy-fitness.png",
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

// Drafted from the questions gym owners actually ask during door-to-door
// outreach. Ansh — tweak wording/pricing details if anything's changed, but
// these are ready to ship, not placeholders.
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How is this better than running my gym on a register or Excel?",
    answer:
      "It removes the manual work. Attendance logs itself when a member checks in, dues track themselves the moment a payment lands, and your monthly report is already built instead of something you piece together by hand.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes — you get a 14-day trial that's completely free, no card required. You're treated exactly like a paying gym during the trial and get access to every feature, not a limited demo version.",
  },
  {
    question: "Do I have to move all my member data in at once?",
    answer:
      "No. Upload your existing member list from Excel or a WhatsApp export and we map it into Pypus for you. You can also add members one by one as they walk in — there's no big-bang migration required.",
  },
  {
    question: "What if my staff isn't comfortable with new software?",
    answer:
      "Pypus is built for a front desk, not a developer. Checking a member in is one tap. Most staff are comfortable within their first shift, and there's no training manual to read first.",
  },
  {
    question: "Is my members' data safe and private?",
    answer:
      "Your data is stored on secure, access-controlled infrastructure and only your workspace can see it. Staff logins have role-based permissions, so front desk staff only see what they need to.",
  },
  {
    question: "What happens if I want to cancel?",
    answer:
      "There's no lock-in contract. If you ever want to stop, you can export your member and payment data and cancel any time — no long-term commitment required.",
  },
  {
    question: "Does it work if I have more than one branch?",
    answer:
      "Yes — the Scale plan supports unlimited staff logins and multi-branch reporting, so you can see attendance, payments and revenue across every branch from one dashboard.",
  },
];
