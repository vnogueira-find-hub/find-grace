import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import { formatCV } from "@/lib/cv-formatter.functions";
import { extractText } from "@/lib/extract-text";
import type { CVLanguage, CVTemplate } from "@/lib/cv-types";
import findLogo from "@/assets/find-logo.png";
import findLetterhead from "@/assets/find-letterhead.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FIND CV Formatter" },
      {
        name: "description",
        content:
          "Formate currículos de candidatos no padrão visual da FIND HR Consulting em segundos.",
      },
    ],
  }),
  component: Index,
});

type Stage = "idle" | "extracting" | "calling" | "building";

const LANGUAGES: { value: CVLanguage; label: string; short: string }[] = [
  { value: "pt", label: "Português", short: "PT" },
  { value: "en", label: "English", short: "EN" },
  { value: "es", label: "Español", short: "ES" },
];

const TEMPLATES: { value: CVTemplate; label: string }[] = [
  { value: "find", label: "CV Padrão FIND" },
  { value: "recrutae", label: "CV Padrão Recrutaê" },
];

const stageCopy: Record<Exclude<Stage, "idle">, string> = {
  extracting: "Extraindo texto do CV…",
  calling: "Analisando com IA…",
  building: "Montando documento…",
};

function Index() {
  const formatCVFn = useServerFn(formatCV);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState<CVLanguage>("pt");
  const [template, setTemplate] = useState<CVTemplate>("find");
  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = stage !== "idle";

  const onPickFile = useCallback((f: File | null) => {
    if (!f) return setFile(null);
    const name = f.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      toast.error("Formato inválido. Envie .pdf ou .docx.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("Arquivo grande demais (máx 15 MB).");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onPickFile(f);
    },
    [onPickFile],
  );

  const onSubmit = useCallback(async () => {
    if (!file) {
      toast.error("Selecione um CV primeiro.");
      return;
    }
    try {
      setStage("extracting");
      const cvText = await extractText(file);
      if (cvText.length < 50) {
        throw new Error(
          "Não foi possível extrair texto suficiente do CV. Confirme se o arquivo não é um PDF apenas com imagens.",
        );
      }

      setStage("calling");
      const result = await formatCVFn({
        data: { cvText, notes, language, template },
      });

      if (!result.ok) {
        throw new Error(result.error || "Falha desconhecida");
      }

      setStage("building");
      // Decode base64 → Blob → trigger download.
      const bin = atob(result.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CV formatado e baixado!", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao formatar CV";
      toast.error(msg);
    } finally {
      setStage("idle");
    }
  }, [file, notes, language, template, formatCVFn]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafbfc]">
      {/* Decorative watermark — bottom-left */}
      <img
        src={findLetterhead}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 w-[640px] opacity-[0.08] select-none"
      />

      {/* Header */}
      <header className="relative z-10 border-b border-[#e5e9ef] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <img src={findLogo} alt="FIND Human Resources" className="h-10" />
          <div className="text-xs text-[#5A8FBF] font-medium tracking-wide hidden sm:block">
            Digital Transformation by People
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#5A8FBF]/10 px-3 py-1 text-xs font-medium text-[#0B1F3A]">
            <Sparkles className="h-3.5 w-3.5 text-[#5A8FBF]" />
            CV Formatter — uso interno
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            Formate um CV no padrão FIND
          </h1>
          <p className="mt-3 text-sm text-[#4a5568] sm:text-base">
            Envie o currículo do candidato, cole as notas da entrevista e baixe o
            documento pronto para enviar ao cliente.
          </p>
        </div>

        <section className="rounded-2xl border border-[#e5e9ef] bg-white p-6 shadow-[0_2px_24px_-12px_rgba(11,31,58,0.18)] sm:p-8">
          {/* File upload */}
          <label className="block text-sm font-medium text-[#0B1F3A]">
            CV do candidato
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition",
              dragging
                ? "border-[#5A8FBF] bg-[#5A8FBF]/5"
                : "border-[#cfd6e0] hover:border-[#5A8FBF] hover:bg-[#5A8FBF]/[0.03]",
              busy && "pointer-events-none opacity-60",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-[#5A8FBF]" />
                <div className="text-left">
                  <div className="text-sm font-medium text-[#0B1F3A]">
                    {file.name}
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {(file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="ml-2 rounded-full p-1 text-[#6b7280] hover:bg-[#f1f4f8] hover:text-[#0B1F3A]"
                  aria-label="Remover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-7 w-7 text-[#5A8FBF]" />
                <div className="mt-3 text-sm font-medium text-[#0B1F3A]">
                  Clique ou arraste o arquivo
                </div>
                <div className="mt-1 text-xs text-[#6b7280]">
                  PDF ou DOCX · até 15 MB
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <label className="mt-6 block text-sm font-medium text-[#0B1F3A]">
            Notas da entrevista{" "}
            <span className="text-[#6b7280] font-normal">(opcional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
            rows={6}
            placeholder="Cole aqui suas anotações da entrevista. Se vazio, a IA redige uma análise preliminar com base apenas no CV."
            className="mt-2 w-full resize-y rounded-lg border border-[#cfd6e0] bg-white px-3 py-2.5 text-sm text-[#0B1F3A] placeholder:text-[#9aa3b2] focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20 disabled:opacity-60"
          />

          {/* Language */}
          <label className="mt-6 block text-sm font-medium text-[#0B1F3A]">
            Idioma do CV
          </label>
          <div className="mt-2 inline-flex rounded-lg border border-[#cfd6e0] bg-[#f7f9fc] p-1">
            {LANGUAGES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                disabled={busy}
                className={[
                  "rounded-md px-4 py-1.5 text-sm font-medium transition",
                  language === opt.value
                    ? "bg-white text-[#0B1F3A] shadow-sm"
                    : "text-[#6b7280] hover:text-[#0B1F3A]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !file}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15315c] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {stageCopy[stage as Exclude<Stage, "idle">]}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Formatar CV
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-[#6b7280]">
            Powered by Claude · O processamento pode levar até 60 segundos.
          </p>
        </section>
      </main>

      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
