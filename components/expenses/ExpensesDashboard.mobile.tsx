'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wallet, Clock, TrendingUp, FolderPlus, Trash2, Edit3 } from 'lucide-react'
import type { Expense, ExpenseCategory } from '@/lib/expenses/types'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { AddExpenseModalMobile } from './AddExpenseModal.mobile'
import { AddCategoryModalMobile } from './AddCategoryModal.mobile'
import { EditCategoryModalMobile } from './EditCategoryModal.mobile'
import { EditExpenseModal } from './EditExpenseModal'
import { createExpense, updateExpense, deleteExpense, markExpensePaid } from '@/app/actions/expense-admin'

interface Props {
  workspaceId: string
  workspaceSlug: string
  expenses: Expense[]
  categories: ExpenseCategory[]
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

export function ExpensesDashboardMobile({ workspaceId, workspaceSlug, expenses: initialExpenses, categories }: Props) {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const filteredExpenses = useMemo(() => {
    if (!filterCategory) return expenses
    return expenses.filter((e) => e.category_id === filterCategory)
  }, [expenses, filterCategory])

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const key = e.category_id ?? 'uncategorized'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [expenses])

  const totalPaid = expenses.filter((e) => e.status === 'paid').reduce((s, e) => s + (e.amount ?? 0), 0)
  const totalPending = expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + (e.amount ?? 0), 0)
  const totalOverdue = expenses.filter((e) => e.status === 'overdue').reduce((s, e) => s + (e.amount ?? 0), 0)

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'

  const handleAddExpense = useCallback(
    async (data: {
      title: string
      amount: number
      categoryId: string
      type: 'one_time' | 'fixed' | 'monthly_variable'
      status: 'paid' | 'pending' | 'overdue'
      dueDate: string
      notes: string | null
    }) => {
      const result = await createExpense(workspaceId, data)
      if (result.success && result.expense) {
        setExpenses((prev) => [result.expense!, ...prev])
        setShowAddModal(false)
        router.refresh()
      }
      return result
    },
    [workspaceId, router]
  )

  const handleUpdateExpense = useCallback(
    async (data: {
      title: string
      amount: number
      categoryId: string
      type: 'one_time' | 'fixed' | 'monthly_variable'
      status: 'paid' | 'pending' | 'overdue'
      dueDate: string
      notes: string | null
    }) => {
      if (!editingExpense) return { success: false, error: 'No expense selected' }
      const result = await updateExpense(workspaceId, editingExpense.id, data)
      if (result.success && result.expense) {
        setExpenses((prev) => prev.map((e) => (e.id === editingExpense.id ? result.expense! : e)))
        setEditingExpense(null)
        router.refresh()
      }
      return result
    },
    [workspaceId, editingExpense, router]
  )

  const handleMarkPaid = useCallback(
    async (expenseId: string) => {
      if (busy) return
      setBusy(true)
      const result = await markExpensePaid(workspaceId, expenseId)
      setBusy(false)
      if (result.success && result.expense) {
        setExpenses((prev) => prev.map((e) => (e.id === expenseId ? result.expense! : e)))
        router.refresh()
      }
    },
    [workspaceId, busy, router]
  )

  const handleDelete = useCallback(
    async (expenseId: string) => {
      if (busy) return
      if (!confirm('Delete this expense?')) return
      setBusy(true)
      const result = await deleteExpense(workspaceId, expenseId)
      setBusy(false)
      if (result.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
        router.refresh()
      }
    },
    [workspaceId, busy, router]
  )

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      <MobileTopBar
        title="Expenses"
        label="Pypus"
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
        action={
          <div className="-mr-1.5 flex shrink-0 items-center">
            <button
              onClick={() => setShowCategoryModal(true)}
              aria-label="Add category"
              className="flex size-8 items-center justify-center rounded-full text-ve-on-surface active:bg-ve-surface-container-high active:scale-95"
            >
              <FolderPlus size={17} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              aria-label="Add expense"
              className="flex size-8 items-center justify-center rounded-full text-ve-on-surface active:bg-ve-surface-container-high active:scale-95"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

      <main className="px-4 pt-4">
        {/* Snapshot Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl bg-white border border-ve-outline-variant/25 p-2.5 flex flex-col items-center text-center">
            <Wallet size={15} className="text-emerald-600 mb-1" />
            <p className="text-[8.5px] font-bold text-ve-on-surface-variant uppercase tracking-wide">Paid</p>
            <p className="text-[13px] font-black text-ve-on-surface mt-0.5">{fmt(totalPaid)}</p>
          </div>
          <div className="rounded-2xl bg-white border border-ve-outline-variant/25 p-2.5 flex flex-col items-center text-center">
            <Clock size={15} className="text-amber-600 mb-1" />
            <p className="text-[8.5px] font-bold text-ve-on-surface-variant uppercase tracking-wide">Pending</p>
            <p className="text-[13px] font-black text-ve-on-surface mt-0.5">{fmt(totalPending)}</p>
          </div>
          <div className="rounded-2xl bg-white border border-ve-outline-variant/25 p-2.5 flex flex-col items-center text-center">
            <TrendingUp size={15} className="text-red-600 mb-1" />
            <p className="text-[8.5px] font-bold text-ve-on-surface-variant uppercase tracking-wide">Overdue</p>
            <p className="text-[13px] font-black text-ve-on-surface mt-0.5">{fmt(totalOverdue)}</p>
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
          <button
            onClick={() => setFilterCategory('')}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
              !filterCategory ? 'bg-ve-primary text-white shadow-sm' : 'bg-ve-surface-container-high text-ve-on-surface-variant'
            }`}
          >
            All ({expenses.length})
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="flex shrink-0 items-center">
              <button
                onClick={() => setFilterCategory(cat.id)}
                className={`whitespace-nowrap rounded-l-full py-1.5 pl-3.5 pr-2 text-[11px] font-bold transition-all active:scale-95 ${
                  filterCategory === cat.id ? 'bg-ve-primary text-white shadow-sm' : 'bg-ve-surface-container-high text-ve-on-surface-variant'
                }`}
              >
                {cat.name} ({categoryTotals.get(cat.id) ?? 0})
              </button>
              <button
                onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}
                aria-label={`Edit ${cat.name}`}
                className={`flex items-center rounded-r-full py-1.5 pl-1 pr-2.5 active:scale-95 ${
                  filterCategory === cat.id ? 'bg-ve-primary text-white shadow-sm' : 'bg-ve-surface-container-high text-ve-on-surface-variant'
                }`}
              >
                <Edit3 size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[14.5px] font-bold text-ve-on-surface">
            {filterCategory ? categoryName(filterCategory) : 'All Expenses'} ({filteredExpenses.length})
          </h2>
        </div>

        {/* Expense list */}
        <div className="flex flex-col gap-2 pb-4">
          {filteredExpenses.length === 0 ? (
            <div className="rounded-2xl bg-ve-surface-container p-6 text-center text-[13px] text-ve-on-surface-variant">
              {categories.length === 0
                ? 'Add a category first, then log an expense.'
                : filterCategory
                ? 'No expenses in this category.'
                : 'No expenses yet. Tap + to add one.'}
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className={`flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm border ${
                  expense.status === 'overdue' ? 'border-ve-error/20' : 'border-ve-outline-variant/25'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ve-on-surface truncate">{expense.title}</p>
                  <p className="text-[10px] text-ve-outline truncate">
                    {categoryName(expense.category_id)} • {expense.due_date ?? '—'}
                  </p>
                  <p className="text-[12px] font-bold text-ve-on-surface mt-0.5">{fmt(expense.amount)}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                      expense.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-600'
                        : expense.status === 'overdue'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {expense.status}
                  </span>
                  {expense.status !== 'paid' && (
                    <button
                      onClick={() => handleMarkPaid(expense.id)}
                      disabled={busy}
                      className="bg-emerald-600 text-white font-bold text-[9px] px-2 py-1 rounded-full active:scale-95 disabled:opacity-40"
                    >
                      Paid
                    </button>
                  )}
                  <button
                    onClick={() => setEditingExpense(expense)}
                    disabled={busy}
                    className="h-6 w-6 flex items-center justify-center rounded-full text-ve-outline active:bg-ve-surface-container-high disabled:opacity-40"
                    aria-label="Edit expense"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    disabled={busy}
                    className="h-6 w-6 flex items-center justify-center rounded-full text-ve-outline active:bg-red-50 active:text-red-600 disabled:opacity-40"
                    aria-label="Delete expense"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <AddExpenseModalMobile
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddExpense}
        categories={categories}
        onRequestNewCategory={() => {
          setShowAddModal(false)
          setShowCategoryModal(true)
        }}
      />

      <AddCategoryModalMobile
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        workspaceId={workspaceId}
        onCategoryAdded={() => router.refresh()}
      />

      <EditCategoryModalMobile
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        workspaceId={workspaceId}
        category={editingCategory}
        onUpdated={() => {
          if (editingCategory && filterCategory === editingCategory.id) {
            setFilterCategory('')
          }
          router.refresh()
        }}
      />

      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleUpdateExpense}
        expense={editingExpense}
        categories={categories}
      />
    </div>
  )
}