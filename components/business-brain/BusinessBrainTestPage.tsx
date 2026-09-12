"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  Bot,
  User,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  Database,
  Loader2,
} from "lucide-react";
import type { BusinessBrainDraft, BusinessBrainSaveResult } from "@/lib/business-brain/types";
import { emptyDraft } from "@/lib/business-brain/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INTRO: ChatMessage = {
  id: "intro",
  role: "assistant",
  content:
    "Bataiye aapka business kaise chalta hai — jitna khul ke bataenge, utna accha samjhunga. (e.g. \"Main wedding decoration ka business chalata hoon...\")",
};

function newId() {
  return Math.random().toString(36).slice(2);
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-3 py-2 min-w-[76px]">
      <span className="text-lg font-semibold text-gray-900">{value}</span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}

function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <span className="text-sm font-medium text-gray-900">
          {title} <span className="text-gray-400">({count})</span>
        </span>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-3 py-2.5">{children}</div>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-gray-400">{text}</p>;
}

export function BusinessBrainTestPage({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string;
  workspaceSlug: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessBrainDraft>(emptyDraft());
  const [readyToSave, setReadyToSave] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<BusinessBrainSaveResult | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const resetTest = () => {
    setMessages([INTRO]);
    setInput("");
    setChatError(null);
    setDraft(emptyDraft());
    setReadyToSave(false);
    setSaveResult(null);
    setShowRawJson(false);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);
    setChatError(null);

    try {
      const history = messages
        .filter((m) => m.id !== "intro")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/pypus/business-brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, message: trimmed, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        setChatError(data?.error || `Request failed (${res.status})`);
        setIsSending(false);
        return;
      }

      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: data.reply ?? "..." }]);
      if (data.draft) setDraft(data.draft as BusinessBrainDraft);
      setReadyToSave(Boolean(data.readyToSave));
      if (data.error) setChatError(data.error);
    } catch {
      setChatError("Could not reach the server. Check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  };

  const confirmAndSave = async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/pypus/business-brain/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, draft }),
      });
      const data = (await res.json()) as BusinessBrainSaveResult;
      setSaveResult(data);
    } catch {
      setSaveResult({ success: false, error: "Could not reach the server while saving." });
    } finally {
      setIsSaving(false);
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — no-op, this is a dev tool
    }
  };

  const fieldCount = draft.entities.reduce((n, e) => n + e.fields.length, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Business Brain — Test Console</h1>
          <p className="text-xs text-gray-500">
            Internal lab page for <span className="font-mono">{workspaceSlug}</span> — not the final onboarding UX.
          </p>
        </div>
        <button
          type="button"
          onClick={resetTest}
          className="flex h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <RotateCcw size={15} />
          New Test
        </button>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-3">
        {/* LEFT — Conversation */}
        <div className="flex min-h-[480px] flex-col rounded-2xl border border-gray-200 bg-white lg:min-h-0">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${
                    m.role === "assistant" ? "bg-gray-900" : "bg-emerald-600"
                  }`}
                  aria-hidden="true"
                >
                  {m.role === "assistant" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-tr-none border-gray-900 bg-gray-900 text-white"
                      : "rounded-tl-none border-gray-200 bg-gray-50 text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Soch raha hoon...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {chatError && (
            <p role="alert" className="flex items-center gap-1.5 border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              <AlertTriangle size={13} className="shrink-0" />
              {chatError}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="shrink-0 border-t border-gray-100 p-3"
          >
            <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Apna business explain karo..."
                aria-label="Message"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* MIDDLE — What Pypus Understands */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            <Counter label="Entities" value={draft.entities.length} />
            <Counter label="Fields" value={fieldCount} />
            <Counter label="Relations" value={draft.relationships.length} />
            <Counter label="Rules" value={draft.rules.length} />
            <Counter label="Workflows" value={draft.workflows.length} />
            <Counter label="Terms" value={draft.terms.length} />
            <Counter label="Knowledge" value={draft.knowledge.length} />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="rounded-xl border border-gray-200 bg-white p-3.5">
              <h2 className="mb-2 text-sm font-medium text-gray-900">Business</h2>
              {draft.business.name || draft.business.type || draft.business.description ? (
                <dl className="space-y-1 text-xs text-gray-600">
                  <div><dt className="inline font-medium text-gray-800">Name: </dt><dd className="inline">{draft.business.name || "—"}</dd></div>
                  <div><dt className="inline font-medium text-gray-800">Type: </dt><dd className="inline">{draft.business.type || "—"}</dd></div>
                  <div><dt className="inline font-medium text-gray-800">Description: </dt><dd className="inline">{draft.business.description || "—"}</dd></div>
                </dl>
              ) : (
                <Empty text="Still gathering information." />
              )}
            </div>

            <Section title="Entities" count={draft.entities.length}>
              {draft.entities.length === 0 ? (
                <Empty text="None yet." />
              ) : (
                <ul className="space-y-2.5">
                  {draft.entities.map((e) => (
                    <li key={e.key} className="text-xs">
                      <p className="font-medium text-gray-900">{e.display_name || e.name} <span className="font-mono text-gray-400">({e.key})</span></p>
                      {e.description && <p className="text-gray-500">{e.description}</p>}
                      {e.fields.length > 0 && (
                        <p className="mt-0.5 text-gray-500">Fields: {e.fields.map((f) => f.label).join(", ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Relationships" count={draft.relationships.length} defaultOpen={false}>
              {draft.relationships.length === 0 ? (
                <Empty text="None yet." />
              ) : (
                <ul className="space-y-1.5 text-xs text-gray-700">
                  {draft.relationships.map((r, i) => (
                    <li key={i}>
                      {r.source_key} <span className="text-gray-400">→ {r.relationship_type} →</span> {r.target_key}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Rules" count={draft.rules.length} defaultOpen={false}>
              {draft.rules.length === 0 ? (
                <Empty text="None yet." />
              ) : (
                <ul className="space-y-2 text-xs">
                  {draft.rules.map((r, i) => (
                    <li key={i}>
                      <p className="font-medium text-gray-900">{r.name}</p>
                      {r.trigger && <p className="text-gray-500">Trigger: {r.trigger}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Workflows" count={draft.workflows.length} defaultOpen={false}>
              {draft.workflows.length === 0 ? (
                <Empty text="None yet." />
              ) : (
                <ul className="space-y-1.5 text-xs text-gray-700">
                  {draft.workflows.map((w, i) => (
                    <li key={i}>{w.name}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Terms" count={draft.terms.length} defaultOpen={false}>
              {draft.terms.length === 0 ? (
                <Empty text="None yet." />
              ) : (
                <ul className="space-y-1 text-xs text-gray-700">
                  {draft.terms.map((t, i) => (
                    <li key={i}>{t.system_term} → {t.business_term}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Knowledge" count={draft.knowledge.length} defaultOpen={false}>
              {draft.knowledge.length === 0 ? (
                <Empty text="None yet." />
              ) : (
                <ul className="space-y-1.5 text-xs text-gray-700">
                  {draft.knowledge.map((k, i) => (
                    <li key={i}><span className="font-medium">{k.title}</span> — {k.content}</li>
                  ))}
                </ul>
              )}
            </Section>

            <div className="rounded-xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setShowRawJson((o) => !o)}
                aria-expanded={showRawJson}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <span className="text-sm font-medium text-gray-900">Raw Business Brain JSON</span>
                {showRawJson ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </button>
              {showRawJson && (
                <div className="border-t border-gray-100 p-3">
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={copyJson}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
                    {JSON.stringify(draft, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Supabase Preview */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3.5">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-900">
              <Database size={15} className="text-gray-400" />
              Supabase Preview
            </h2>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
              <li>Business Model: {draft.business.name ? 1 : 0}</li>
              <li>Entities: {draft.entities.length}</li>
              <li>Fields: {fieldCount}</li>
              <li>Relationships: {draft.relationships.length}</li>
              <li>Rules: {draft.rules.length}</li>
              <li>Workflows: {draft.workflows.length}</li>
              <li>Terms: {draft.terms.length}</li>
              <li>Knowledge: {draft.knowledge.length}</li>
            </ul>

            <p
              className={`mt-3 inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                readyToSave ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {readyToSave ? "Ready to save" : "Still gathering information"}
            </p>

            <button
              type="button"
              onClick={confirmAndSave}
              disabled={!readyToSave || isSaving || !draft.business.name}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              Confirm &amp; Save
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3.5">
            {!saveResult && <Empty text="Save result will appear here." />}

            {saveResult?.success && (
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                  <Check size={14} />
                  Saved successfully
                </p>
                <p className="font-mono text-gray-500 break-all">business_model_id: {saveResult.businessModelId}</p>
                {saveResult.counts && (
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-600">
                    {Object.entries(saveResult.counts).map(([table, count]) => (
                      <li key={table}>
                        {table}: {count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {saveResult && !saveResult.success && (
              <div className="space-y-1.5 text-xs" role="alert">
                <p className="flex items-center gap-1.5 font-medium text-red-700">
                  <AlertTriangle size={14} />
                  Save failed
                </p>
                {saveResult.failedStep && <p className="text-gray-600">Failed at: {saveResult.failedStep}</p>}
                {saveResult.error && <p className="text-gray-600">{saveResult.error}</p>}
                {saveResult.counts && (
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-500">
                    {Object.entries(saveResult.counts).map(([table, count]) => (
                      <li key={table}>
                        {table}: {count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
