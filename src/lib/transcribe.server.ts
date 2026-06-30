// Server-only audio transcription via Lovable AI Gateway (OpenAI-compatible STT).
export async function transcribeAudio(file: File): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const upstream = new FormData();
  upstream.append("model", "openai/gpt-4o-mini-transcribe");
  upstream.append("file", file, file.name || "audio.webm");

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de requisições atingido na transcrição.");
    if (res.status === 402) throw new Error("Créditos da Lovable AI esgotados.");
    throw new Error(`Falha na transcrição (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.text ?? "";
  if (!text || typeof text !== "string") {
    throw new Error("Transcrição vazia.");
  }
  return text;
}
