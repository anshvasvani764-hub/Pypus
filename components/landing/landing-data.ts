// ─────────────────────────────────────────────────────────────────
// EDIT THIS FILE to update landing page content — no code changes needed
// elsewhere. TESTIMONIALS and FAQ_ITEMS below are PLACEHOLDERS — replace
// every single one with a real client review / real FAQ before launch.
// ─────────────────────────────────────────────────────────────────

export const STATS = [
  { count: 8, decimal: 0, suffix: "+", label: "Gyms growing with us" },
  { count: 24, decimal: 0, suffix: "/7", label: "Support, always on" },
  { count: 10, decimal: 0, suffix: "+", label: "Automations & modules to scale your business" },
];
// NOTE(Ansh): updated to the 3 numbers you asked for on Aug 8 — "8+ gyms
// growing with us", "24/7 support", "10+ automations & modules". Bump the
// gym count as you close more trials; keep it honest, it's what builds
// trust with gym owners.

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
  { code: "[MEM]", accent: "#3B82F6", title: "Members", desc: "Every member's profile, plan and renewal history lives in one searchable list — nobody is ever 'that one guy we lost track of' again." },
  { code: "[ATT]", accent: "#10B981", title: "Attendance", desc: "Front desk taps a name, the streak builds itself — and the moment someone's about to fall off, a WhatsApp nudge goes out on its own." },
  { code: "[PAY]", accent: "#F59E0B", title: "Payments", desc: "The fee reminder sends itself on WhatsApp before it's even due. The receipt generates itself the second the payment lands. You remember neither." },
  { code: "[REP]", accent: "#8B5CF6", title: "Reports", desc: "Revenue, retention and attendance trends update live in the background — so your month-end report is basically already written." },
  { code: "[EXP]", accent: "#EC4899", title: "Expenses", desc: "Log rent, staff and equipment costs once, and watch your real monthly profit take shape automatically." },
];

export const STEPS = [
  { num: "01 — Setup", title: "Create your workspace and start managing", desc: "Bring your member list in from Excel, then switch on what actually saves you time: WhatsApp fee reminders, auto-generated receipts, and attendance that tracks itself." },
  { num: "02 — Configure", title: "Pick your automations", desc: "Turn on only what you need — WhatsApp reminders and payments today, reports and expenses next month." },
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
    features: ["All 5 automations", "1 staff login", "Email support"],
    ctaLabel: "Start free trial",
    ctaHref: "/login",
  },
  {
    name: "Growth",
    price: "₹2,499",
    period: "Up to 500 members",
    features: ["All 5 automations", "5 staff logins", "WhatsApp fee reminders", "Priority support"],
    featured: true,
    ctaLabel: "Start free trial",
    ctaHref: "/login",
  },
  {
    name: "Scale",
    price: "₹4,999",
    period: "Unlimited members, multi-branch",
    features: ["All 5 automations", "Unlimited staff logins", "Multi-branch reporting", "Dedicated onboarding"],
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
