import { useCallback, useRef, useState } from "react";
import { Upload, FileAudio, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { transcribeAudioFn } from "@/lib/recruitment.functions";
import { fileToBase64 } from "@/lib/audio-utils";

interface Props {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

/** Reusable component: textarea + optional audio upload (auto-transcribes via Whisper). */
export function TranscriptInput({ value, onChange, disabled, placeholder, rows = 8 }: Props) {
  const transcribe = useServerFn(transcribeAudioFn);
  const inputRef = useRef<HTMLInputElement>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [audioName, setAudioName] = useState<string | null>(null);

  const onPickAudio = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Áudio grande demais (máx 25 MB).");
        return;
      }
      setAudioName(file.name);
      setTranscribing(true);
      try {
        const base64 = await fileToBase64(file);
        const res = await transcribe({
          data: {
            audioBase64: base64,
            filename: file.name,
            mimeType: file.type || "audio/webm",
          },
        });
        if (!res.ok) throw new Error(res.error);
        onChange(value ? value + "\n\n" + res.text : res.text);
        toast.success("Áudio transcrito.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha na transcrição");
      } finally {
        setTranscribing(false);
      }
    },
    [transcribe, value, onChange],
  );

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || transcribing}
        rows={rows}
        placeholder={placeholder ?? "Cole a transcrição aqui ou envie um áudio…"}
        className="w-full resize-y rounded-lg border border-[#cfd6e0] bg-white px-3 py-2.5 text-sm text-[#0B1F3A] placeholder:text-[#9aa3b2] focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20 disabled:opacity-60"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || transcribing}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-[#cfd6e0] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1F3A] hover:border-[#5A8FBF] hover:bg-[#5A8FBF]/5 disabled:opacity-50"
        >
          {transcribing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileAudio className="h-3.5 w-3.5" />
          )}
          {transcribing ? "Transcrevendo…" : "Enviar áudio"}
        </button>
        {audioName && !transcribing && (
          <span className="inline-flex items-center gap-1 text-xs text-[#6b7280]">
            <FileText className="h-3 w-3" /> {audioName}
            <button
              type="button"
              onClick={() => setAudioName(null)}
              className="ml-1 text-[#9aa3b2] hover:text-[#0B1F3A]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/webm,video/mp4"
          className="hidden"
          onChange={(e) => onPickAudio(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
