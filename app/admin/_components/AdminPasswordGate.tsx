"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyAdminPassword } from "@/app/actions/admin-auth";

export default function AdminPasswordGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyAdminPassword(password);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Wrong password");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4"
      >
        <h1 className="text-lg font-semibold text-slate-100">Admin access</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {isPending ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
