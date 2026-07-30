import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callLLM } from "@/lib/llm";

const SYSTEM_PROMPT =
  "You are Pypus, the AI assistant inside a gym management app called Management App. You are given real, live data for the user's workspace as JSON. Answer the user's question using ONLY this data — never invent numbers. Format your answer as short markdown: a one-line summary, then a bullet list of the relevant stats. Keep it under 80 words unless the user asks for detail.";

function startOfWeekISTDateString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));

  const istMidnight = Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
  const monday = new Date(istMidnight - ((weekdayIndex + 6) % 7) * 86_400_000);

  return monday.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let workspaceId: unknown;
  let message: unknown;
  try {
    ({ workspaceId, message } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof workspaceId !== "string" || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "workspaceId and message are required" }, { status: 400 });
  }

  const weekStart = startOfWeekISTDateString();

  let stats;
  try {
    const [membersRes, attendanceRes, feesRes, remindersRes] = await Promise.all([
      supabase.from("members").select("id, name").eq("workspace_id", workspaceId),
      supabase
        .from("attendance")
        .select("status")
        .eq("workspace_id", workspaceId)
        .gte("date", weekStart),
      supabase
        .from("fees")
        .select("status, amount_snapshot, paid_amount")
        .eq("workspace_id", workspaceId)
        .in("status", ["due", "overdue"]),
      supabase
        .from("reminders")
        .select("id, message, status, created_at")
        .eq("workspace_id", workspaceId)
        .neq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const firstError =
      membersRes.error || attendanceRes.error || feesRes.error || remindersRes.error;
    if (firstError) throw firstError;

    const members = membersRes.data ?? [];
    const attendance = attendanceRes.data ?? [];
    const fees = feesRes.data ?? [];
    const reminders = remindersRes.data ?? [];

    const outstanding = (f: { amount_snapshot: number | null; paid_amount: number | null }) =>
      (f.amount_snapshot ?? 0) - (f.paid_amount ?? 0);
    const overdueFees = fees.filter((f) => f.status === "overdue");

    stats = {
      currency: "INR",
      weekStartDate: weekStart,
      totalActiveMembers: members.length,
      attendanceThisWeek: {
        present: attendance.filter((a) => a.status === "present").length,
        absent: attendance.filter((a) => a.status === "absent").length,
      },
      pendingFees: {
        count: fees.length,
        totalOutstanding: fees.reduce((sum, f) => sum + outstanding(f), 0),
      },
      overdueFees: {
        count: overdueFees.length,
        totalOutstanding: overdueFees.reduce((sum, f) => sum + outstanding(f), 0),
      },
      pendingReminders: {
        count: reminders.length,
        items: reminders.map((r) => ({
          status: r.status,
          message: r.message,
          createdAt: r.created_at,
        })),
      },
    };
  } catch (err) {
    console.error("pypus/chat: workspace stats query failed", err);
    return NextResponse.json({
      reply: "I couldn't load your workspace data right now. Please try again in a moment.",
    });
  }

  const combinedMessage = `Workspace data (JSON):\n${JSON.stringify(stats, null, 2)}\n\nUser question: ${message}`;

  try {
    const reply = await callLLM(SYSTEM_PROMPT, combinedMessage);
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof Error && err.message === "LLM_API_KEY not set yet") {
      return NextResponse.json({
        reply: "AI provider not configured yet — add LLM_API_KEY and LLM_PROVIDER in .env.local",
      });
    }
    console.error("pypus/chat: LLM call failed", err);
    return NextResponse.json({
      reply: "I ran into a problem reaching the AI provider. Please try again shortly.",
    });
  }
}
