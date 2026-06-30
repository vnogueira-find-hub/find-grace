// Server-only helper that calls Claude via the Anthropic SDK and returns parsed JSON.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
  return new Anthropic({ apiKey });
}

export async function claudeJSON<T = unknown>(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 8000,
): Promise<T> {
  const client = getClient();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA sem texto.");
  }
  let raw = textBlock.text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  const start = raw.search(/[{[]/);
  const openChar = start >= 0 ? raw[start] : "";
  const closeChar = openChar === "[" ? "]" : "}";
  const end = raw.lastIndexOf(closeChar);
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);

  try {
    return JSON.parse(raw) as T;
  } catch {
    const repaired = raw
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    return JSON.parse(repaired) as T;
  }
}
