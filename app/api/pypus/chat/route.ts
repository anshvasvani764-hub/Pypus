import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callLLMWithTools } from "@/lib/llm";
import { PYPUS_TOOLS, runPypusTool } from "@/lib/pypus/tools";
import { PYPUS_SYSTEM_PROMPT } from "@/lib/pypus/prompt";
import { getISTDateString } from "@/lib/utils/date";

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

  const userMessage = `Today is ${getISTDateString()} (Asia/Kolkata).\n\nQuestion: ${message}`;

  try {
    const reply = await callLLMWithTools(
      PYPUS_SYSTEM_PROMPT,
      userMessage,
      PYPUS_TOOLS.map(({ name, description, parameters }) => ({ name, description, parameters })),
      (name, args) => runPypusTool(name, args, { supabase, workspaceId })
    );
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
