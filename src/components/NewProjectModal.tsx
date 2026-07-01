import { useState } from "react";
import { Loader2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { processBriefingFn } from "@/lib/recruitment.functions";
import { TranscriptInput } from "./TranscriptInput";
import { DocumentAttach } from "./DocumentAttach";
import type { ProjectRow, RecruitmentLanguage } from "@/lib/recruitment-types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectRow) => void;
}

const LANGUAGES: RecruitmentLanguage[] = ["Português", "English", "Español"];

export function NewProjectModal({ open, onClose, onCreated }: Props) {
  const process = useServerFn(processBriefingFn);
  const [clientName, setClientName] = useState("");
  const [positionHint, setPositionHint] = useState("");
  const [transcript, setTranscript] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentText, setAttachmentText] = useState("");
  const [language, setLanguage] = useState<RecruitmentLanguage>("Português");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!clientName.trim()) return toast.error("Informe o nome do cliente.");
    if (transcript.trim().length < 50 && attachmentText.trim().length < 50)
      return toast.error("Cole a transcrição ou anexe um documento com o briefing.");
    setBusy(true);
    try {
      const res = await process({
        data: {
          clientName: clientName.trim(),
          positionTitleHint: positionHint.trim() || undefined,
          transcript: transcript.trim(),
          attachmentText: attachmentText.trim() || undefined,
          attachmentName: attachmentName || undefined,
          language,
        },
      });
      if (!res.ok) throw new Error(res.error);
      toast.success("Projeto criado!");
      onCreated(res.project);
      setClientName("");
      setPositionHint("");
      setTranscript("");
      setAttachmentName(null);
      setAttachmentText("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar projeto");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1F3A]/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e9ef] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0B1F3A]">Novo Projeto de Recrutamento</h2>
          <button onClick={onClose} disabled={busy} className="rounded-full p-1 text-[#6b7280] hover:bg-[#f1f4f8]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-[#6b7280]">
            A IA vai estruturar o briefing em contexto, missões, dimensões com pesos e sinais de
            desqualificação. Esses critérios serão reutilizados em todas as avaliações deste projeto.
          </p>

          <div>
            <label className="block text-sm font-medium text-[#0B1F3A]">Nome do cliente</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={busy}
              placeholder="Ex: Acme S.A."
              className="mt-1 w-full rounded-lg border border-[#cfd6e0] px-3 py-2 text-sm focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0B1F3A]">
              Posição <span className="text-[#6b7280] font-normal">(opcional — IA tenta extrair)</span>
            </label>
            <input
              value={positionHint}
              onChange={(e) => setPositionHint(e.target.value)}
              disabled={busy}
              placeholder="Ex: Diretor Comercial"
              className="mt-1 w-full rounded-lg border border-[#cfd6e0] px-3 py-2 text-sm focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0B1F3A]">Idioma</label>
            <div className="mt-1 inline-flex rounded-lg border border-[#cfd6e0] bg-[#f7f9fc] p-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  disabled={busy}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${language === l ? "bg-white text-[#0B1F3A] shadow-sm" : "text-[#6b7280]"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0B1F3A]">
              Transcrição do briefing (áudio ou texto)
            </label>
            <div className="mt-1">
              <TranscriptInput
                value={transcript}
                onChange={setTranscript}
                disabled={busy}
                placeholder="Cole a transcrição da reunião de briefing, ou envie o áudio para transcrever automaticamente…"
                rows={10}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0B1F3A]">
              Cronograma e Validação <span className="text-[#6b7280] font-normal">(opcional — PDF, DOCX ou PPTX)</span>
            </label>
            <p className="mt-1 text-xs text-[#6b7280]">
              Anexe o documento da área com missões, dimensões, cronograma e stakeholders. A IA lerá o conteúdo junto com a transcrição.
            </p>
            <div className="mt-2">
              <DocumentAttach
                fileName={attachmentName}
                extractedText={attachmentText}
                onChange={(n, t) => {
                  setAttachmentName(n);
                  setAttachmentText(t);
                }}
                disabled={busy}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e5e9ef] px-6 py-4">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-[#cfd6e0] bg-white px-4 py-2 text-sm font-medium text-[#0B1F3A] hover:bg-[#f7f9fc] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15315c] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Processando briefing…" : "Criar projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}
