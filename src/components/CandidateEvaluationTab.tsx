import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Sparkles, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  evaluateCandidateFn,
  getProjectFn,
  listProjectsFn,
  saveEvaluationFn,
} from "@/lib/recruitment.functions";
import type {
  CandidateEvaluationOutput,
  ProjectRow,
} from "@/lib/recruitment-types";
import { TranscriptInput } from "./TranscriptInput";
import { NewProjectModal } from "./NewProjectModal";

interface ProjectSummary {
  id: string;
  client_name: string;
  position_title: string;
  created_at: string;
  language: string;
}

const RECOMMENDATION_LABEL: Record<CandidateEvaluationOutput["recommendation"], string> = {
  priority: "Avançar com prioridade",
  caveats: "Avançar com ressalvas",
  not_recommended: "Não avançar",
};

const RECOMMENDATION_COLOR: Record<CandidateEvaluationOutput["recommendation"], string> = {
  priority: "bg-emerald-100 text-emerald-800 border-emerald-200",
  caveats: "bg-amber-100 text-amber-800 border-amber-200",
  not_recommended: "bg-rose-100 text-rose-800 border-rose-200",
};

function scoreColor(score: number | null) {
  if (score === null) return "bg-gray-100 text-gray-600 border-gray-200";
  if (score >= 4) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 3) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

export function CandidateEvaluationTab() {
  const listProjects = useServerFn(listProjectsFn);
  const getProject = useServerFn(getProjectFn);
  const evaluate = useServerFn(evaluateCandidateFn);
  const saveEval = useServerFn(saveEvaluationFn);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [candidateName, setCandidateName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CandidateEvaluationOutput | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const refreshProjects = useCallback(async () => {
    const res = await listProjects({});
    if (res.ok) setProjects(res.projects);
  }, [listProjects]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      return;
    }
    (async () => {
      const res = await getProject({ data: { id: selectedProjectId } });
      if (res.ok) setProject(res.project);
    })();
  }, [selectedProjectId, getProject]);

  const runEvaluate = async () => {
    if (!project) return toast.error("Selecione um projeto.");
    if (!candidateName.trim()) return toast.error("Informe o nome do candidato.");
    if (transcript.trim().length < 50) return toast.error("Transcrição muito curta.");
    setEvaluating(true);
    setResult(null);
    setSavedOk(false);
    try {
      const res = await evaluate({
        data: {
          projectId: project.id,
          candidateName: candidateName.trim(),
          transcript: transcript.trim(),
        },
      });
      if (!res.ok) throw new Error(res.error);
      setResult(res.evaluation);
      toast.success("Avaliação gerada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na avaliação");
    } finally {
      setEvaluating(false);
    }
  };

  const persist = async () => {
    if (!project || !result) return;
    setSaving(true);
    try {
      const res = await saveEval({
        data: {
          projectId: project.id,
          candidateName: result.candidate_name,
          evaluation: result,
          transcript,
        },
      });
      if (!res.ok) throw new Error(res.error);
      setSavedOk(true);
      toast.success("Avaliação salva no projeto.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project selector */}
      <section className="rounded-2xl border border-[#e5e9ef] bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-[#0B1F3A]">Projeto</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-medium text-[#6b7280]">Selecione um projeto existente</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#cfd6e0] bg-white px-3 py-2 text-sm focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20"
            >
              <option value="">— escolha —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_name} · {p.position_title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15315c]"
          >
            <Plus className="h-4 w-4" /> Criar novo projeto
          </button>
        </div>

        {project && (
          <div className="mt-4 rounded-lg border border-[#e5e9ef] bg-[#f7f9fc] p-4 text-sm">
            <div className="font-semibold text-[#0B1F3A]">
              {project.client_name} · {project.position_title}
            </div>
            <div className="mt-2 text-xs text-[#6b7280]">
              Dimensões fixas deste projeto ({project.dimensions?.length ?? 0}):
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {project.dimensions?.map((d) => (
                <span
                  key={d.name}
                  className="rounded-full bg-white border border-[#cfd6e0] px-2 py-0.5 text-xs text-[#0B1F3A]"
                >
                  {d.name} · {d.weight}%
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Candidate form */}
      {project && (
        <section className="rounded-2xl border border-[#e5e9ef] bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[#0B1F3A]">Avaliar candidato</h3>
          <div className="mt-3">
            <label className="block text-sm font-medium text-[#0B1F3A]">Nome do candidato</label>
            <input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              disabled={evaluating}
              className="mt-1 w-full rounded-lg border border-[#cfd6e0] px-3 py-2 text-sm focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#0B1F3A]">
              Transcrição da entrevista (áudio ou texto)
            </label>
            <div className="mt-1">
              <TranscriptInput
                value={transcript}
                onChange={setTranscript}
                disabled={evaluating}
                rows={10}
              />
            </div>
          </div>
          <button
            onClick={runEvaluate}
            disabled={evaluating}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#15315c] disabled:opacity-50"
          >
            {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {evaluating ? "Avaliando…" : "Gerar avaliação"}
          </button>
        </section>
      )}

      {/* Result */}
      {result && (
        <section className="rounded-2xl border border-[#e5e9ef] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-[#6b7280]">Avaliação</div>
              <h3 className="text-xl font-semibold text-[#0B1F3A]">{result.candidate_name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreColor(result.overall_score)}`}
              >
                Nota geral: {result.overall_score?.toFixed?.(2) ?? result.overall_score}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${RECOMMENDATION_COLOR[result.recommendation]}`}
              >
                {RECOMMENDATION_LABEL[result.recommendation]}
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm text-[#0B1F3A] leading-relaxed">{result.executive_summary}</p>

          {result.disqualifying_signals_found?.length > 0 && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Sinais de desqualificação identificados
              </div>
              <ul className="mt-1 list-disc pl-6">
                {result.disqualifying_signals_found.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <h4 className="text-sm font-semibold text-[#0B1F3A]">Dimensões</h4>
            <div className="mt-2 space-y-2">
              {result.dimension_scores.map((d, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${d.has_evidence ? "bg-white border-[#e5e9ef]" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-[#0B1F3A]">{d.dimension}</div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColor(d.score)}`}
                    >
                      {d.has_evidence ? d.score : "S/E"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed">{d.justification}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-emerald-700">Pontos fortes</h4>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#0B1F3A] space-y-1">
                {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-700">Pontos de atenção</h4>
              <ul className="mt-1 list-disc pl-5 text-sm text-[#0B1F3A] space-y-1">
                {result.attention_points.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-[#f7f9fc] p-3 text-sm text-[#0B1F3A]">
            <span className="font-semibold">Justificativa: </span>
            {result.recommendation_detail}
          </div>

          <button
            onClick={persist}
            disabled={saving || savedOk}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15315c] disabled:opacity-50"
          >
            {savedOk ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savedOk ? "Salvo" : saving ? "Salvando…" : "Salvar no projeto"}
          </button>
        </section>
      )}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={async (p) => {
          await refreshProjects();
          setSelectedProjectId(p.id);
        }}
      />
    </div>
  );
}
