import { NextRequest, NextResponse } from "next/server";
import { getMonthlyRevenue } from "@/lib/supabase/queries";
import { getExpensesForMonth } from "@/lib/expenses/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");

  if (!workspaceId || !monthStr || !yearStr) {
    return NextResponse.json(
      { error: "workspaceId, month and year are required" },
      { status: 400 }
    );
  }

  const month = Number(monthStr);
  const year = Number(yearStr);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    return NextResponse.json(
      { error: "Invalid month or year" },
      { status: 400 }
    );
  }

  const [revenue, expenses] = await Promise.all([
    getMonthlyRevenue(workspaceId, month, year),
    getExpensesForMonth(workspaceId, month, year),
  ]);

  return NextResponse.json({
    revenue,
    expenses,
    profit: revenue - expenses,
    month,
    year,
  });
}