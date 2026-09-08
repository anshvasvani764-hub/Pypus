# Pypus Agent — UI, Pages, Navigation & User-Help Guide

**Purpose:** This document is the product/UI knowledge base for the Pypus AI Agent. The agent should use it to answer questions such as **“fee plan kaise banaye?”, “receipt kaise bheju?”, “member ki fee kaha dikhegi?”, “attendance kaha mark karu?”** and to guide the user to the correct screen.

**Source of truth:** current Pypus repository (`main`) code. Routes and behavior below are based on the implemented app structure and should not be invented. If a requested function is not documented/implemented here, the agent must say it is not currently available rather than hallucinating a UI flow.

---

## 1. Core Navigation Model

Pypus is workspace-based. The route parameter `[app]` is the **workspace slug**.

Base route pattern:

`/{workspaceSlug}`

Desktop app layout provides:
- Left sidebar
- Global header
- Main page content
- Persistent AI Assistant panel

Mobile app layout provides:
- Mobile navigation drawer
- Main page content
- Persistent AI Assistant panel

The application layout resolves the workspace and applies subscription gating before rendering the workspace UI.

### Main sidebar

The primary desktop navigation contains:

1. **Home** → `/{workspaceSlug}`
2. **AI Assistant** → `/{workspaceSlug}/assistant`
3. **Automations** → opens an Automations sub-navigation
4. **Workspace** → `/{workspaceSlug}/workspace`
5. **Settings** → `/{workspaceSlug}/settings`

Automations sub-navigation contains:
- **Receipts** → `/{workspaceSlug}/automations/receipts`
- **Fee reminders** → `/{workspaceSlug}/automations/fee-reminders`

The sidebar has expanded, collapsed, and hover modes. This is UI behavior only and does not change where features live.

---

## 2. Workspace / Module Hub

### Page
`/{workspaceSlug}/workspace`

### What it is
The **Your workspace** page is the module hub. It shows a snapshot of business stats and cards for available modules.

Implemented module navigation is generated from the module registry and includes the business modules currently registered in the application. The workspace page also explicitly exposes **Team**.

Known module routes from the current application structure:

- `/{workspaceSlug}/members` — Members
- `/{workspaceSlug}/attendance` — Attendance
- `/{workspaceSlug}/fees` — Fees
- `/{workspaceSlug}/expenses` — Expenses
- `/{workspaceSlug}/team` — Team
- `/{workspaceSlug}/automations/...` — Automations
- `/{workspaceSlug}/settings` — Settings
- `/{workspaceSlug}/assistant` — AI Assistant

The workspace page also has an **Ask Pypus AI** entry point.

### Agent guidance
If the user asks “workspace me kya kya hai?”, explain that this is the central module hub and tell them which module to open for their task.

---

# 3. MEMBERS

## Members list

### Route
`/{workspaceSlug}/members`

### Purpose
Member registry / member management.

The page loads members and displays member-level information including:
- Member identity
- Attendance information
- Fee status
- Membership plan information

The member registry also calculates attendance statistics and derives fee status/plan information for each member.

### Typical user questions

**“Member kaha milenge?”**
→ Open **Workspace → Members**.

**“Kisi member ki details dekhni hai.”**
→ Open **Members**, then select the member.

### Member detail

### Route
`/{workspaceSlug}/members/{memberId}`

The repository has a dedicated member detail page.

Known member-specific sub-pages:
- `/{workspaceSlug}/members/{memberId}/attendance`
- `/{workspaceSlug}/members/{memberId}/fees`

Therefore, when the user asks for one member's attendance or fees, guide them from **Members → select member → Attendance/Fees**.

### Member import

### Route
`/{workspaceSlug}/members/import`

Use this when the user asks about importing members.

---

# 4. ATTENDANCE

## Attendance register

### Route
`/{workspaceSlug}/attendance`

### Purpose
Manage/check today's attendance for members.

The attendance page loads:
- Members
- Today's attendance records
- Fee summaries for members

It has separate desktop and mobile views.

### Agent answers

**“Attendance kaha mark karni hai?”**
→ **Workspace → Attendance**.

**“Aaj ki attendance dekhni hai.”**
→ **Workspace → Attendance**.

**“Kisi particular member ki attendance dekhni hai.”**
→ **Members → select member → Attendance**.

Do not claim a specific button label or QR workflow unless the current UI/code confirms it.

---

# 5. FEES

## Fees dashboard

### Route
`/{workspaceSlug}/fees`

### Purpose
Overall fee management and collection view.

The page loads members, fee records and monthly revenue data. It calculates:
- Monthly collection/revenue
- Expected revenue
- Pending collection / pending dues
- Overdue count on mobile
- Per-member fee status and plan information

### Agent answers

**“Fees kaha manage hoti hain?”**
→ **Workspace → Fees**.

**“Kis member ki fee pending hai?”**
→ **Fees** and use the member/fee information shown there; alternatively open **Members → member → Fees** for one member.

**“Monthly collection kitni hui?”**
→ **Fees** dashboard.

---

# 6. MEMBERSHIP PLANS — CREATE / EDIT / ENABLE / VIEW MEMBERS

## Plans page

### Route
`/{workspaceSlug}/fees/plans`

### Purpose
Create and manage gym membership packages.

The Plans page explicitly exposes these actions:
- Create plan
- Edit plan
- Enable/disable plan
- View members on a plan

The page has a **Membership Plans** header and a **Create Plan** action.

## Creating a plan — exact current flow

When the user asks:
- “Fee plan kaise banaye?”
- “Membership plan kaise create karu?”
- “Gold plan banana hai.”

Guide them:

1. Open **Workspace**.
2. Open **Fees**.
3. Go to the **Membership Plans** page at `/{workspaceSlug}/fees/plans`.
4. Click **Create Plan**.
5. Fill the plan form:
   - **Plan Name** — e.g. Gold Plan
   - **Duration** — select the available duration option
   - **Price (₹)** — plan price
   - **Features** — one feature per line
   - **Status** — Active/Inactive
6. Click **Save Plan**.

### Editing a plan

1. Open **Membership Plans**.
2. Find the required plan.
3. Choose the plan's edit action.
4. Change the fields.
5. Click **Save Changes**.

### Enable / disable plan

A plan can be toggled between **Active** and **Inactive**.

### View members on a plan

The plan management UI supports **View Members**. It opens a modal showing members assigned to that plan. Selecting a member takes the user to:

`/{workspaceSlug}/members/{memberId}`

### Important pricing behavior

The UI explicitly warns that changing a plan price does **not** retroactively change existing member subscriptions. The price is snapshotted at subscription time.

Therefore, if a user asks:

**“Plan ka price change karunga to purane members ki fee bhi change hogi?”**

Answer: **No — existing member subscriptions retain their subscription-time price.**

---

# 7. AUTOMATIONS

The sidebar has a dedicated Automations section.

Clicking **Automations** switches the sidebar to its automation sub-navigation.

Current known automation areas:

1. **Receipts** → `/{workspaceSlug}/automations/receipts`
2. **Fee reminders** → `/{workspaceSlug}/automations/fee-reminders`

The Automations navigation has a back control to return to the main sidebar.

---

# 8. RECEIPTS

## Receipts page

### Route
`/{workspaceSlug}/automations/receipts`

### Purpose
Receipt-agent / receipt automation management and pending receipt activity.

The page loads:
- Agent activity
- Pending receipts
- Receipt-agent settings
- Send mode

It renders dedicated desktop and mobile views.

### Agent guidance

**“Receipt kaha se bheju?”**
→ Open **Automations → Receipts**.

**“Pending receipts kaha hain?”**
→ Open **Automations → Receipts**.

**“Receipt automation kaha manage karu?”**
→ Open **Automations → Receipts**.

### Important limitation
The current page implementation proves the Receipts page and receipt-agent settings/pending workflow exist. Do **not** invent an exact send-button sequence, WhatsApp template name, approval wording, or modal fields unless those are confirmed by the current receipt-agent components/actions.

If the user asks for an exact UI action that is not confirmed, say:
> “Receipts ka section Automations → Receipts hai. Exact send/approval step current UI par verify karna hoga.”

---

# 9. FEE REMINDERS

### Route
`/{workspaceSlug}/automations/fee-reminders`

### Purpose
Fee reminder automation.

### Agent answers

**“Fee reminder automation kaha hai?”**
→ **Automations → Fee reminders**.

**“Members ko fee reminder automate karna hai.”**
→ Open **Automations → Fee reminders**.

Do not invent exact template fields or schedule controls unless confirmed by the current page/component implementation.

---

# 10. EXPENSES

### Route
`/{workspaceSlug}/expenses`

### Purpose
Business expense management.

### Agent answers

**“Expense kaha add/check karu?”**
→ **Workspace → Expenses**.

**“Gym ka kharcha kaha track hoga?”**
→ **Expenses**.

Do not invent exact form fields without checking the current Expenses UI/action implementation.

---

# 11. TEAM

### Route
`/{workspaceSlug}/team`

### Purpose
Manage staff/team access.

The workspace hub describes Team as:
- Manage staff roles
- Invites
- Access

### Agent answers

**“Trainer/staff ko add karna hai.”**
→ **Workspace → Team**.

**“Staff ka access manage kaha hota hai?”**
→ **Workspace → Team**.

Do not invent exact role names unless confirmed by current Team UI.

---

# 12. SETTINGS

### Route
`/{workspaceSlug}/settings`

### Purpose
Business/workspace settings.

### Agent answers

**“Settings kaha hain?”**
→ **Settings** in the sidebar.

**“Business settings change karni hain.”**
→ **Settings**.

Do not claim a specific setting exists unless confirmed by the current Settings implementation.

---

# 13. AI ASSISTANT

### Route
`/{workspaceSlug}/assistant`

The app layout also includes an Assistant Panel provider and persistent Assistant Panel, so the assistant is available as a global UI surface in addition to its dedicated page.

### Agent behavior
The agent should understand two kinds of questions:

### A. Navigation/help questions
Examples:
- “Fee plan kaise banaye?”
- “Receipt kaha se bheju?”
- “Attendance kaha hai?”
- “Member ki fee kaha dekhu?”

Answer with a concise path and steps.

### B. Business/action questions
Examples:
- “Rahul ki fee kab due hai?”
- “Is member ka plan kya hai?”
- “Pending fees kitni hain?”
- “Is plan ke kitne members hain?”

For these, the agent should use the appropriate data/tool layer when available instead of telling the user to manually navigate.

---

# 14. NAVIGATION INTELLIGENCE RULES FOR THE AGENT

The agent should map user intent → page → action.

## High-confidence mappings

| User intent | Navigate to |
|---|---|
| Create membership/fee plan | Workspace → Fees → Membership Plans → Create Plan |
| Edit membership plan | Workspace → Fees → Membership Plans → edit plan |
| Enable/disable plan | Workspace → Fees → Membership Plans → toggle plan status |
| See members on a plan | Workspace → Fees → Membership Plans → View Members |
| Overall fees/collection | Workspace → Fees |
| One member's fees | Workspace → Members → member → Fees |
| Members list | Workspace → Members |
| One member's attendance | Workspace → Members → member → Attendance |
| Today's attendance | Workspace → Attendance |
| Expenses | Workspace → Expenses |
| Staff/team/access | Workspace → Team |
| Receipt automation/pending receipts | Automations → Receipts |
| Fee reminder automation | Automations → Fee reminders |
| Business settings | Settings |
| AI assistant | AI Assistant |

---

# 15. RESPONSE STYLE FOR “HOW DO I?” QUESTIONS

When a user asks how to do something, answer in this structure:

**1. Tell them where to go.**

Example:
> “Workspace → Fees → Membership Plans.”

**2. Give the shortest usable steps.**

Example:
> “Create Plan dabao → name, duration, price aur features bharo → Save Plan.”

**3. Mention an important behavior/limitation if relevant.**

Example:
> “Plan price change karne se existing subscriptions ka snapshotted price change nahi hota.”

Do not dump technical route names unless useful. Prefer human navigation labels.

---

# 16. NEVER HALLUCINATE UI

The agent must distinguish between:

### Confirmed
A route/component/action is directly represented in the current repository.

### Likely but unconfirmed
The feature may exist in code but the exact button/field sequence has not been verified.

### Not known
No current evidence in this guide/repository context.

For unconfirmed details, do not invent labels such as “Send Receipt”, “Mark Paid”, “Add Member”, etc.

Use:
> “Ye section yahan hai: … Exact button/field current UI implementation se verify karni hogi.”

This rule is critical because the guide is meant to keep the agent grounded in the actual Pypus product.

---

# 17. MOBILE VS DESKTOP

Several core pages explicitly have separate mobile and desktop views, including:
- Workspace/modules
- Members
- Attendance
- Fees
- Membership Plans
- Receipts
- Fee reminders

The **destination/function remains the same**, but layout and controls may differ between mobile and desktop.

Therefore, the agent should say:
> “Mobile par same section milega, bas layout alag ho sakta hai.”

Do not promise that a desktop-only visual control appears identically on mobile.

---

# 18. AGENT DECISION TREE

When the user asks a product-help question:

1. Identify the business object:
   - member
   - plan
   - fee
   - attendance
   - expense
   - receipt
   - reminder
   - team/staff
   - workspace/settings

2. Identify the requested operation:
   - view
   - create
   - edit
   - enable/disable
   - send/automate
   - navigate

3. Resolve the destination using the mapping in this document.

4. If the request is a simple navigation/help request, answer with navigation steps.

5. If the request requires business data, use the agent's authorized data tools/context rather than guessing.

6. If the user asks to perform an action, use the appropriate tool/action when available and follow permission/confirmation rules.

7. If the UI/action is not confirmed, never fabricate the workflow.

---

# 19. EXAMPLE ANSWERS THE AGENT SHOULD BE ABLE TO PRODUCE

### “Bhai fee plan kaise banaye?”

> Workspace → **Fees** → **Membership Plans** → **Create Plan**.  
> Plan name, duration, price aur features bharo, status Active rakho, phir **Save Plan**.

### “Gold plan ka price edit karna hai.”

> Workspace → **Fees** → **Membership Plans** → Gold plan ka **Edit** action → price change karo → **Save Changes**.

### “Plan ke andar kitne members hain?”

> Workspace → **Fees** → **Membership Plans** → us plan par **View Members**. Wahan assigned members dikhenge.

### “Attendance kaha se check karu?”

> Workspace → **Attendance**. Kisi ek member ki attendance chahiye to **Members → member → Attendance**.

### “Rahul ki fee kaha dekhu?”

> **Members → Rahul → Fees**. Overall pending/collection dekhna ho to **Fees** dashboard bhi use kar sakte ho.

### “Receipt kaha se manage hoti hai?”

> **Automations → Receipts**. Yahin receipt-agent activity, pending receipts aur receipt settings ka section hai.

### “Fee reminder automation kaha hai?”

> **Automations → Fee reminders**.

### “Staff ko manage karna hai.”

> **Workspace → Team**. Yahan staff roles, invites aur access manage hote hain.

---

# 20. SOURCE ROUTES / IMPLEMENTATION REFERENCES

Current repository paths used to establish this guide include:

- `app/[app]/layout.tsx` — global workspace layout, desktop/mobile navigation shell and assistant panel
- `components/layout/Sidebar.tsx` — main sidebar and Automations sub-navigation
- `app/[app]/page.tsx` — workspace home/root
- `app/[app]/workspace/page.tsx` — workspace/module hub
- `app/[app]/members/page.tsx` — members registry
- `app/[app]/members/[memberId]/page.tsx` — member detail
- `app/[app]/members/[memberId]/attendance/page.tsx` — member attendance
- `app/[app]/members/[memberId]/fees/page.tsx` — member fees
- `app/[app]/members/import/page.tsx` — member import
- `app/[app]/attendance/page.tsx` — attendance register
- `app/[app]/fees/page.tsx` — fees dashboard
- `app/[app]/fees/plans/page.tsx` — membership plans
- `components/fees/PlansManagementView.tsx` — plan management actions and navigation
- `components/fees/CreatePlanModal.tsx` — create/edit plan form
- `app/[app]/automations/receipts/page.tsx` — receipt automation/pending receipt page
- `app/[app]/automations/fee-reminders/page.tsx` — fee reminder automation
- `app/[app]/expenses/page.tsx` — expenses
- `app/[app]/team/page.tsx` — team
- `app/[app]/settings/page.tsx` — settings
- `app/[app]/assistant/page.tsx` — dedicated assistant page

---

# FINAL AGENT PRINCIPLE

**Pypus Agent should not merely answer “what feature exists”; it should know WHERE the user needs to go and HOW to reach it.**

For every user-help request, prefer:

**Intent → Object → Page → Action → Short steps → Relevant caveat**

Example:

**Intent:** create fee plan  
**Object:** membership plan  
**Page:** Fees → Membership Plans  
**Action:** Create Plan  
**Steps:** name → duration → price → features → status → Save Plan  
**Caveat:** changing plan price does not retroactively change existing subscriptions.
