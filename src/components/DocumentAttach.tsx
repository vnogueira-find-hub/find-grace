import { useCallback, useRef, useState } from "react";
import { FileUp, FileText, Loader2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { extractDocumentFn } from "@/lib/recruitment.functions";
import { fileToBase64 } from "@/lib/audio-utils";

interface Props {
  fileName: string | null;
  extractedText: string;
  onChange: (name: string | null, text: string) => void;
  disabled?: boolean;
}

const ACCEPT = ".pdf,.docx,.pptx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain";

export function DocumentAttach({ fileName, extractedText, onChange, disabled }: Props) {
  const extract = useServerFn(extractDocumentFn);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) {
        toast.error("Arquivo grande demais (máx 15 MB).");
        return;
      }
      setBusy(true);
      try {
        const base64 = await fileToBase64(file);
        const res = await extract({
          data: {
            fileBase64: base64,
            filename: file.name,
            mimeType: file.type || "",
          },
        });
        if (!res.ok) throw new Error(res.error);
        onChange(file.name, res.text);
        toast.success(`Documento processado (${res.text.length.toLocaleString()} caracteres).`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao extrair documento");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [extract, onChange],
  );

  const remove = () => onChange(null, "");

  return (
    <div className="space-y-2">
      {!fileName && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-[#cfd6e0] bg-white px-3 py-2 text-xs font-medium text-[#0B1F3A] hover:border-[#5A8FBF] hover:bg-[#5A8FBF]/5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          {busy ? "Extraindo texto…" : "Anexar PDF / DOCX / PPTX"}
        </button>
      )}
      {fileName && (
        <div className="flex items-center gap-2 rounded-md border border-[#cfd6e0] bg-[#f7f9fc] px-3 py-2 text-xs">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5A8FBF]" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <FileText className="h-3.5 w-3.5 text-[#6b7280]" />
          <span className="flex-1 truncate text-[#0B1F3A]">{fileName}</span>
          <span className="text-[#6b7280]">{extractedText.length.toLocaleString()} caracteres</span>
          <button
            type="button"
            onClick={remove}
            disabled={disabled || busy}
            className="text-[#9aa3b2] hover:text-[#0B1F3A]"
            aria-label="Remover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
