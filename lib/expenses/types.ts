export type ExpenseStatus = "paid" | "pending" | "overdue";
export type ExpenseType = "one_time" | "fixed" | "monthly_variable";

export interface ExpenseCategory {
  id: string;
  workspace_id: string;
  name: string;
  color?: string | null;
  created_at?: string;
}

export interface ExpenseTemplate {
  id: string;
  workspace_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  frequency?: string | null;
  due_day?: number | null;
  status?: "active" | "inactive";
  created_at?: string;
}

export interface Expense {
  id: string;
  workspace_id: string;
  category_id: string;
  template_id?: string | null;
  title: string;
  amount: number;
  type: ExpenseType;
  status: ExpenseStatus;
  due_date: string;
  paid_date: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
}