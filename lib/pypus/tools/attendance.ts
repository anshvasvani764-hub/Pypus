import { formatISTTime } from "@/lib/utils/date";
import {
  type PypusTool,
  loadMembers,
  resolveMember,
  weekdayOf,
  weekStart,
  monthRange,
  shiftDate,
  today,
  daysBetween,
  pad,
  needsConfirmation,
} from "./shared";

const attendanceToday: PypusTool = {
  name: "get_attendance_today",
  riskLevel: "low",
  description:
    "Today's attendance: who is present with their check-in time, who is marked absent, and who has no record yet.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const now = today();
    const [members, attRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("attendance")
        .select("member_id, status, check_in, check_out")
        .eq("workspace_id", ctx.workspaceId)
        .eq("date", now),
    ]);
    if (attRes.error) throw attRes.error;

    const nameById = new Map(members.map((m) => [m.id, m.name]));
    const rows = attRes.data ?? [];
    const marked = new Set(rows.map((r) => r.member_id));

    return {
      date: now,
      weekday: weekdayOf(now),
      totalActiveMembers: members.length,
      present: rows
        .filter((r) => r.status === "present")
        .map((r) => ({
          member: nameById.get(r.member_id) ?? "Unknown member",
          checkIn: r.check_in ? formatISTTime(r.check_in) : null,
          checkOut: r.check_out ? formatISTTime(r.check_out) : null,
        })),
      absent: rows.filter((r) => r.status === "absent").map((r) => nameById.get(r.member_id) ?? "Unknown member"),
      noRecordYet: members.filter((m) => !marked.has(m.id)).map((m) => m.name),
    };
  },
};

const attendanceStats: PypusTool = {
  name: "get_attendance_stats",
  riskLevel: "low",
  description:
    "Gym-wide attendance analytics over a period: total check-ins, present vs absent ratio, per-member present/absent counts (to find most absent or most consistent), longest present streak per member, busiest check-in hour slots, per-weekday averages, and weekend vs weekday averages. Use period 'week' (current week), 'month' (current IST month), or 'last_30_days'.",
  parameters: {
    type: "object",
    properties: {
      period: { type: "string", enum: ["week", "month", "last_30_days"], description: "Defaults to month" },
    },
  },
  async run(ctx, args) {
    const period = String(args.period ?? "month");
    const now = today();
    const start =
      period === "week" ? weekStart() : period === "last_30_days" ? shiftDate(now, -29) : monthRange(0).start;

    const [members, attRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("attendance")
        .select("member_id, date, status, check_in")
        .eq("workspace_id", ctx.workspaceId)
        .gte("date", start)
        .lte("date", now)
        .order("date", { ascending: true }),
    ]);
    if (attRes.error) throw attRes.error;

    const nameById = new Map(members.map((m) => [m.id, m.name]));
    const rows = attRes.data ?? [];
    const present = rows.filter((r) => r.status === "present");
    const absent = rows.filter((r) => r.status === "absent");

    const perMember = new Map<string, { present: number; absent: number; dates: string[] }>();
    for (const r of rows) {
      const e = perMember.get(r.member_id) ?? { present: 0, absent: 0, dates: [] };
      if (r.status === "present") {
        e.present++;
        e.dates.push(r.date);
      } else if (r.status === "absent") e.absent++;
      perMember.set(r.member_id, e);
    }

    const longestStreak = (dates: string[]) => {
      const sorted = [...new Set(dates)].sort();
      let best = 0;
      let run = 0;
      let prev: string | null = null;
      for (const d of sorted) {
        run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
        prev = d;
        best = Math.max(best, run);
      }
      return best;
    };

    const hourBuckets: Record<string, number> = {};
    for (const r of present) {
      if (!r.check_in) continue;
      const hour = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
      }).format(new Date(r.check_in));
      const slot = `${hour}:00-${pad((Number(hour) + 1) % 24)}:00`;
      hourBuckets[slot] = (hourBuckets[slot] ?? 0) + 1;
    }

    const perWeekday = new Map<string, { checkIns: number; days: Set<string> }>();
    for (const r of present) {
      const wd = weekdayOf(r.date);
      const e = perWeekday.get(wd) ?? { checkIns: 0, days: new Set<string>() };
      e.checkIns++;
      e.days.add(r.date);
      perWeekday.set(wd, e);
    }
    const weekdayAvg = Object.fromEntries(
      [...perWeekday].map(([wd, v]) => [wd, { totalCheckIns: v.checkIns, avgPerDay: +(v.checkIns / v.days.size).toFixed(1) }])
    );

    const isWeekend = (d: string) => ["Saturday", "Sunday"].includes(weekdayOf(d));
    const weekendDays = new Set(present.filter((r) => isWeekend(r.date)).map((r) => r.date));
    const weekdayDays = new Set(present.filter((r) => !isWeekend(r.date)).map((r) => r.date));
    const weekendCheckIns = present.filter((r) => isWeekend(r.date)).length;
    const weekdayCheckIns = present.length - weekendCheckIns;

    const memberStats = [...perMember].map(([id, v]) => ({
      member: nameById.get(id) ?? "Unknown member",
      present: v.present,
      absent: v.absent,
      attendancePercent: v.present + v.absent ? Math.round((v.present / (v.present + v.absent)) * 100) : 0,
      longestPresentStreak: longestStreak(v.dates),
    }));

    return {
      period,
      from: start,
      to: now,
      totalCheckIns: present.length,
      presentRecords: present.length,
      absentRecords: absent.length,
      presentToAbsentRatio: absent.length ? +(present.length / absent.length).toFixed(2) : null,
      memberStats: memberStats.sort((a, b) => b.present - a.present),
      mostAbsent: [...memberStats].sort((a, b) => b.absent - a.absent).filter((m) => m.absent > 0).slice(0, 3),
      mostConsistent: [...memberStats].sort(
        (a, b) => b.longestPresentStreak - a.longestPresentStreak || b.present - a.present
      )[0] ?? null,
      checkInSlots: Object.fromEntries(Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])),
      perWeekday: weekdayAvg,
      weekendVsWeekday: {
        weekendAvgCheckIns: weekendDays.size ? +(weekendCheckIns / weekendDays.size).toFixed(1) : 0,
        weekdayAvgCheckIns: weekdayDays.size ? +(weekdayCheckIns / weekdayDays.size).toFixed(1) : 0,
      },
    };
  },
};

const memberAttendance: PypusTool = {
  name: "get_member_attendance",
  riskLevel: "low",
  description:
    "One member's attendance detail: day-by-day records with check-in/check-out times, attendance percentage, present/absent counts and longest streak. Use for a single member's history, their attendance %, a specific day's timings, or (by calling twice) to compare two members.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      period: { type: "string", enum: ["month", "last_30_days", "week"], description: "Defaults to month" },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const period = String(args.period ?? "month");
    const now = today();
    const start =
      period === "week" ? weekStart() : period === "last_30_days" ? shiftDate(now, -29) : monthRange(0).start;

    const { data, error } = await ctx.supabase
      .from("attendance")
      .select("date, status, check_in, check_out")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .gte("date", start)
      .lte("date", now)
      .order("date", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const presentDates = rows.filter((r) => r.status === "present").map((r) => r.date).sort();
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of presentDates) {
      run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
      prev = d;
      best = Math.max(best, run);
    }

    return {
      member: found.member.name,
      period,
      from: start,
      to: now,
      presentDays: presentDates.length,
      absentDays: rows.filter((r) => r.status === "absent").length,
      attendancePercent: rows.length ? Math.round((presentDates.length / rows.length) * 100) : 0,
      longestPresentStreak: best,
      records: rows.map((r) => ({
        date: r.date,
        weekday: weekdayOf(r.date),
        status: r.status,
        checkIn: r.check_in ? formatISTTime(r.check_in) : null,
        checkOut: r.check_out ? formatISTTime(r.check_out) : null,
      })),
    };
  },
};

const inactiveMembers: PypusTool = {
  name: "get_inactive_members",
  riskLevel: "low",
  description:
    "Members with no present check-in in the last N days (default 14), with the date they were last seen. Use for 'inactive members' or 'kaun nahi aa raha' questions.",
  parameters: {
    type: "object",
    properties: { days: { type: "integer", description: "Look-back window in days, default 14" } },
  },
  async run(ctx, args) {
    const days = Number.isFinite(Number(args.days)) && Number(args.days) > 0 ? Number(args.days) : 14;
    const now = today();
    const cutoff = shiftDate(now, -(days - 1));

    const [members, attRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("attendance")
        .select("member_id, date, status")
        .eq("workspace_id", ctx.workspaceId)
        .eq("status", "present"),
    ]);
    if (attRes.error) throw attRes.error;

    const lastSeen = new Map<string, string>();
    for (const r of attRes.data ?? []) {
      const cur = lastSeen.get(r.member_id);
      if (!cur || r.date > cur) lastSeen.set(r.member_id, r.date);
    }

    return {
      windowDays: days,
      since: cutoff,
      inactive: members
        .filter((m) => {
          const seen = lastSeen.get(m.id);
          return !seen || seen < cutoff;
        })
        .map((m) => ({
          member: m.name,
          lastSeen: lastSeen.get(m.id) ?? "never",
          daysSinceLastVisit: lastSeen.get(m.id) ? daysBetween(lastSeen.get(m.id)!, now) : null,
        }))
        .sort((a, b) => (b.daysSinceLastVisit ?? 9999) - (a.daysSinceLastVisit ?? 9999)),
    };
  },
};

// ── WRITE ───────────────────────────────────────────────────────────

const markAttendanceAction: PypusTool = {
  name: "mark_attendance",
  riskLevel: "low",
  description:
    "Marks one member present or absent for a given date (defaults to today). Use for 'Rahul ko present maar do' / 'mark X absent' type requests. Overwrites any existing record for that member+date.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      status: { type: "string", enum: ["present", "absent"] },
      date: { type: "string", description: "YYYY-MM-DD, defaults to today (IST)" },
    },
    required: ["member_name", "status"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const status = String(args.status ?? "");
    if (status !== "present" && status !== "absent") {
      return { error: "status must be 'present' or 'absent'" };
    }
    const date = typeof args.date === "string" && args.date.trim() ? args.date.trim() : today();

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("attendance")
      .select("id")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .eq("date", date)
      .maybeSingle();
    if (existingErr) return { error: `Could not check existing attendance: ${existingErr.message}` };

    const checkIn = status === "present" ? new Date().toISOString() : null;
    const checkOut = null;

    const { error } = existing
      ? await ctx.supabase
          .from("attendance")
          .update({ status, check_in: checkIn, check_out: checkOut })
          .eq("id", existing.id)
      : await ctx.supabase.from("attendance").insert({
          workspace_id: ctx.workspaceId,
          member_id: found.member.id,
          date,
          status,
          check_in: checkIn,
          check_out: checkOut,
        });

    if (error) return { error: `Could not save attendance: ${error.message}` };
    return { success: true, member: found.member.name, date, status };
  },
};

const markBulkAttendance: PypusTool = {
  name: "mark_bulk_attendance",
  riskLevel: "low",
  description:
    "Marks the same present/absent status for several members at once on a given date (defaults to today). Use for 'in sabko present maar do' / batch check-in type requests. Overwrites any existing record for each member+date.",
  parameters: {
    type: "object",
    properties: {
      member_names: { type: "array", items: { type: "string" }, description: "List of member names to mark" },
      status: { type: "string", enum: ["present", "absent"] },
      date: { type: "string", description: "YYYY-MM-DD, defaults to today (IST)" },
    },
    required: ["member_names", "status"],
  },
  async run(ctx, args) {
    const names = Array.isArray(args.member_names) ? args.member_names.map(String) : [];
    if (names.length === 0) return { error: "member_names must be a non-empty list" };

    const status = String(args.status ?? "");
    if (status !== "present" && status !== "absent") return { error: "status must be 'present' or 'absent'" };
    const date = typeof args.date === "string" && args.date.trim() ? args.date.trim() : today();

    const results: { member: string; success: boolean; error?: string }[] = [];
    for (const rawName of names) {
      const found = await resolveMember(ctx, rawName);
      if ("error" in found) {
        results.push({ member: rawName, success: false, error: found.error });
        continue;
      }

      const { data: existing, error: existingErr } = await ctx.supabase
        .from("attendance")
        .select("id")
        .eq("workspace_id", ctx.workspaceId)
        .eq("member_id", found.member.id)
        .eq("date", date)
        .maybeSingle();
      if (existingErr) {
        results.push({ member: found.member.name, success: false, error: existingErr.message });
        continue;
      }

      const checkIn = status === "present" ? new Date().toISOString() : null;
      const { error } = existing
        ? await ctx.supabase
            .from("attendance")
            .update({ status, check_in: checkIn, check_out: null })
            .eq("id", existing.id)
        : await ctx.supabase.from("attendance").insert({
            workspace_id: ctx.workspaceId,
            member_id: found.member.id,
            date,
            status,
            check_in: checkIn,
            check_out: null,
          });

      results.push(error ? { member: found.member.name, success: false, error: error.message } : { member: found.member.name, success: true });
    }

    return {
      date,
      status,
      markedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  },
};

const updateAttendance: PypusTool = {
  name: "update_attendance",
  riskLevel: "low",
  description:
    "Corrects an existing attendance record for a member on a specific date — use when a mark was wrong (e.g. marked absent by mistake). Requires an existing record for that member+date; use mark_attendance instead if none exists yet.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD of the record to correct" },
      status: { type: "string", enum: ["present", "absent"] },
    },
    required: ["member_name", "date", "status"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const date = typeof args.date === "string" && args.date.trim() ? args.date.trim() : "";
    if (!date) return { error: "date is required" };
    const status = String(args.status ?? "");
    if (status !== "present" && status !== "absent") return { error: "status must be 'present' or 'absent'" };

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("attendance")
      .select("id, status")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .eq("date", date)
      .maybeSingle();
    if (existingErr) return { error: `Could not load attendance record: ${existingErr.message}` };
    if (!existing) return { error: "no_attendance_record" as const, member: found.member.name, date };

    const checkIn = status === "present" ? new Date().toISOString() : null;
    const { error } = await ctx.supabase
      .from("attendance")
      .update({ status, check_in: checkIn, check_out: null })
      .eq("id", existing.id);
    if (error) return { error: `Could not update attendance: ${error.message}` };

    return { success: true, member: found.member.name, date, previousStatus: existing.status, newStatus: status };
  },
};

const deleteAttendance: PypusTool = {
  name: "delete_attendance",
  riskLevel: "high",
  description:
    "Permanently removes a member's attendance record for a specific date — the day goes back to having no record at all. Use only to undo a mistaken mark, not to change present↔absent (use update_attendance for that). This cannot be undone, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD of the record to delete" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed this deletion." },
    },
    required: ["member_name", "date"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const date = typeof args.date === "string" && args.date.trim() ? args.date.trim() : "";
    if (!date) return { error: "date is required" };

    const { data: existing, error: existingErr } = await ctx.supabase
      .from("attendance")
      .select("id, status")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .eq("date", date)
      .maybeSingle();
    if (existingErr) return { error: `Could not load attendance record: ${existingErr.message}` };
    if (!existing) return { error: "no_attendance_record" as const, member: found.member.name, date };

    const preview = {
      member: found.member.name,
      date,
      currentStatus: existing.status,
      warning: "This permanently deletes the attendance record and cannot be undone.",
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const { error } = await ctx.supabase.from("attendance").delete().eq("id", existing.id);
    if (error) return { error: `Could not delete attendance record: ${error.message}` };

    return { success: true, deleted: preview };
  },
};

export const ATTENDANCE_TOOLS: PypusTool[] = [
  attendanceToday,
  attendanceStats,
  memberAttendance,
  inactiveMembers,
  markAttendanceAction,
  markBulkAttendance,
  updateAttendance,
  deleteAttendance,
];
