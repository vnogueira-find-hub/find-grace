import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Download, Copy, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  deleteEvaluationFn,
  generateShortlistFn,
  listEvaluationsFn,
  listProjectsFn,
  getProjectFn,
} from "@/lib/recruitment.functions";
import type {
  EvaluationRow,
  ProjectRow,
  ShortlistOutput,
} from "@/lib/recruitment-types";

interface ProjectSummary {
  id: string;
  client_name: string;
  position_title: string;
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  priority: "Prioridade",
  caveats: "Ressalvas",
  not_recommended: "Não recomendado",
};

function shortlistAsText(s: ShortlistOutput, project: ProjectRow): string {
  const lines: string[] = [];
  lines.push(`Shortlist — ${project.client_name} · ${project.position_title}`);
  lines.push("");
  lines.push("=== Tabela Comparativa ===");
  s.comparison_table.forEach((c) => {
    lines.push(`- ${c.candidate_name} · ${c.weighted_score.toFixed(2)} · ${RECOMMENDATION_LABEL[c.recommendation] ?? c.recommendation}`);
    Object.entries(c.dimension_scores).forEach(([k, v]) => lines.push(`    ${k}: ${v}`));
  });
  lines.push("");
  lines.push("=== Mapa de Calor ===");
  s.heat_map.forEach((h) => {
    lines.push(`• ${h.candidate_name}`);
    lines.push(`  ${h.narrative}`);
  });
  lines.push("");
  lines.push("=== Shortlist Recomendada ===");
  lines.push(`Prioridade: ${s.shortlist.priority.join(", ") || "—"}`);
  lines.push("Com ressalvas:");
  s.shortlist.caveats.forEach((c) => lines.push(`  - ${c.candidate_name}: ${c.caveat}`));
  lines.push("Não recomendados:");
  s.shortlist.not_recommended.forEach((c) => lines.push(`  - ${c.candidate_name}: ${c.reason}`));
  lines.push("");
  lines.push("=== Gaps de Mercado ===");
  lines.push(`Recorrentes: ${s.market_gaps.recurring_gaps.join(", ") || "—"}`);
  lines.push(s.market_gaps.is_market_gap_or_mapping_limitation);
  if (s.market_gaps.calibration_suggestion) lines.push(`Sugestão: ${s.market_gaps.calibration_suggestion}`);
  lines.push("");
  lines.push("=== Riscos da Shortlist ===");
  s.shortlist_risks.forEach((r) => {
    lines.push(`• ${r.candidate_name}`);
    lines.push(`  Risco: ${r.main_risk}`);
    lines.push(`  Aprofundar: ${r.points_to_deepen}`);
    if (r.cultural_fit_concern) lines.push(`  Fit cultural: ${r.cultural_fit_concern}`);
  });
  return lines.join("\n");
}

export function ShortlistConsolidationTab() {
  const listProjects = useServerFn(listProjectsFn);
  const getProject = useServerFn(getProjectFn);
  const listEvals = useServerFn(listEvaluationsFn);
  const generate = useServerFn(generateShortlistFn);
  const delEval = useServerFn(deleteEvaluationFn);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [manualText, setManualText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShortlistOutput | null>(null);

  useEffect(() => {
    listProjects({}).then((r) => r.ok && setProjects(r.projects));
  }, [listProjects]);

  const loadEvals = useCallback(async () => {
    if (!projectId) return;
    const [pRes, eRes] = await Promise.all([
      getProject({ data: { id: projectId } }),
      listEvals({ data: { projectId } }),
    ]);
    if (pRes.ok) setProject(pRes.project);
    if (eRes.ok) {
      setEvaluations(eRes.evaluations);
      toast.success(`${eRes.evaluations.length} avaliações carregadas.`);
    }
    setResult(null);
  }, [projectId, getProject, listEvals]);

  useEffect(() => {
    setEvaluations([]);
    setProject(null);
    setResult(null);
  }, [projectId]);

  const removeEval = async (id: string) => {
    if (!confirm("Remover esta avaliação?")) return;
    const res = await delEval({ data: { id } });
    if (res.ok) {
      setEvaluations((prev) => prev.filter((e) => e.id !== id));
      toast.success("Removida.");
    }
  };

  const runShortlist = async () => {
    if (!projectId) return toast.error("Selecione um projeto.");
    setBusy(true);
    setResult(null);
    try {
      const res = await generate({
        data: {
          projectId,
          manualText: manualText.trim() || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error);
      setResult(res.shortlist);
      toast.success("Shortlist gerada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar shortlist");
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    if (!result || !project) return;
    await navigator.clipboard.writeText(shortlistAsText(result, project));
    toast.success("Copiado.");
  };

  const printPdf = () => window.print();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e5e9ef] bg-white p-6 shadow-sm print:hidden">
        <h3 className="text-base font-semibold text-[#0B1F3A]">Projeto</h3>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[#cfd6e0] bg-white px-3 py-2 text-sm focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20"
        >
          <option value="">— escolha —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.client_name} · {p.position_title}
            </option>
          ))}
        </select>

        {projectId && (
          <div className="mt-4">
            <button
              onClick={loadEvals}
              className="inline-flex items-center gap-2 rounded-lg border border-[#cfd6e0] bg-white px-3 py-2 text-sm font-medium text-[#0B1F3A] hover:border-[#5A8FBF] hover:bg-[#5A8FBF]/5"
            >
              <RefreshCw className="h-4 w-4" /> Carregar avaliações salvas
            </button>
            {evaluations.length > 0 && (
              <div className="mt-3 space-y-1">
                {evaluations.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-md border border-[#e5e9ef] bg-[#f7f9fc] px-3 py-2 text-sm"
                  >
                    <span className="text-[#0B1F3A]">
                      {e.candidate_name}
                      <span className="ml-2 text-xs text-[#6b7280]">
                        nota {e.raw_response.overall_score?.toFixed?.(2)} · {RECOMMENDATION_LABEL[e.raw_response.recommendation]}
                      </span>
                    </span>
                    <button
                      onClick={() => removeEval(e.id)}
                      className="rounded p-1 text-[#9aa3b2] hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-[#5A8FBF]">
            Alternativa: colar avaliações em texto livre (avaliações feitas fora do sistema)
          </summary>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={6}
            placeholder="Cole aqui as avaliações em texto livre. Se preenchido, este texto é usado em vez das avaliações salvas."
            className="mt-2 w-full rounded-lg border border-[#cfd6e0] bg-white px-3 py-2 text-sm focus:border-[#5A8FBF] focus:outline-none focus:ring-2 focus:ring-[#5A8FBF]/20"
          />
        </details>

        <button
          onClick={runShortlist}
          disabled={busy || !projectId}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#15315c] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Consolidando…" : "Gerar análise de shortlist"}
        </button>
      </section>

      {result && project && (
        <section className="rounded-2xl border border-[#e5e9ef] bg-white p-6 shadow-sm print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <h3 className="text-xl font-semibold text-[#0B1F3A]">
              Shortlist — {project.client_name} · {project.position_title}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={copyText}
                className="inline-flex items-center gap-2 rounded-lg border border-[#cfd6e0] bg-white px-3 py-1.5 text-xs font-medium text-[#0B1F3A] hover:border-[#5A8FBF]"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar como texto
              </button>
              <button
                onClick={printPdf}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15315c]"
              >
                <Download className="h-3.5 w-3.5" /> Exportar como PDF
              </button>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-5">
            <h4 className="text-sm font-semibold text-[#0B1F3A]">Tabela Comparativa</h4>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#f7f9fc]">
                  <tr>
                    <th className="border border-[#e5e9ef] px-3 py-2 text-left font-semibold text-[#0B1F3A]">Candidato</th>
                    {project.dimensions.map((d) => (
                      <th key={d.name} className="border border-[#e5e9ef] px-2 py-2 text-center font-semibold text-[#0B1F3A]">
                        {d.name}<div className="text-[10px] font-normal text-[#6b7280]">{d.weight}%</div>
                      </th>
                    ))}
                    <th className="border border-[#e5e9ef] px-3 py-2 text-center font-semibold text-[#0B1F3A]">Nota ponderada</th>
                    <th className="border border-[#e5e9ef] px-3 py-2 text-center font-semibold text-[#0B1F3A]">Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparison_table.map((row) => (
                    <tr key={row.candidate_name}>
                      <td className="border border-[#e5e9ef] px-3 py-2 font-medium text-[#0B1F3A]">{row.candidate_name}</td>
                      {project.dimensions.map((d) => (
                        <td key={d.name} className="border border-[#e5e9ef] px-2 py-2 text-center text-[#0B1F3A]">
                          {row.dimension_scores?.[d.name] ?? "—"}
                        </td>
                      ))}
                      <td className="border border-[#e5e9ef] px-3 py-2 text-center font-semibold text-[#0B1F3A]">
                        {typeof row.weighted_score === "number" ? row.weighted_score.toFixed(2) : row.weighted_score}
                      </td>
                      <td className="border border-[#e5e9ef] px-3 py-2 text-center text-xs">
                        {RECOMMENDATION_LABEL[row.recommendation] ?? row.recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Heat map */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-[#0B1F3A]">Mapa de Calor Narrativo</h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {result.heat_map.map((h) => (
                <div key={h.candidate_name} className="rounded-lg border border-[#e5e9ef] bg-white p-3 text-sm">
                  <div className="font-semibold text-[#0B1F3A]">{h.candidate_name}</div>
                  <p className="mt-1 text-[#0B1F3A] leading-relaxed">{h.narrative}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shortlist blocks */}
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div className="font-semibold text-emerald-800">Prioridade</div>
              <ul className="mt-1 list-disc pl-5 text-emerald-900 space-y-1">
                {result.shortlist.priority.map((n, i) => <li key={i}>{n}</li>)}
                {result.shortlist.priority.length === 0 && <li className="list-none text-emerald-700/70">—</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="font-semibold text-amber-800">Com ressalvas</div>
              <ul className="mt-1 space-y-1 text-amber-900">
                {result.shortlist.caveats.map((c, i) => (
                  <li key={i}><span className="font-medium">{c.candidate_name}:</span> {c.caveat}</li>
                ))}
                {result.shortlist.caveats.length === 0 && <li className="text-amber-700/70">—</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
              <div className="font-semibold text-rose-800">Não recomendados</div>
              <ul className="mt-1 space-y-1 text-rose-900">
                {result.shortlist.not_recommended.map((c, i) => (
                  <li key={i}><span className="font-medium">{c.candidate_name}:</span> {c.reason}</li>
                ))}
                {result.shortlist.not_recommended.length === 0 && <li className="text-rose-700/70">—</li>}
              </ul>
            </div>
          </div>

          {/* Market gaps */}
          <div className="mt-6 rounded-lg border border-[#e5e9ef] bg-[#f7f9fc] p-4 text-sm">
            <h4 className="font-semibold text-[#0B1F3A]">Gaps de Mercado</h4>
            {result.market_gaps.recurring_gaps?.length > 0 && (
              <div className="mt-1 text-xs text-[#6b7280]">
                Recorrentes: {result.market_gaps.recurring_gaps.join(", ")}
              </div>
            )}
            <p className="mt-2 text-[#0B1F3A] leading-relaxed">{result.market_gaps.is_market_gap_or_mapping_limitation}</p>
            {result.market_gaps.calibration_suggestion && (
              <p className="mt-2 text-[#0B1F3A]"><span className="font-medium">Sugestão de calibração: </span>{result.market_gaps.calibration_suggestion}</p>
            )}
          </div>

          {/* Risks */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-[#0B1F3A]">Riscos da Shortlist</h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {result.shortlist_risks.map((r) => (
                <div key={r.candidate_name} className="rounded-lg border border-[#e5e9ef] bg-white p-3 text-sm">
                  <div className="font-semibold text-[#0B1F3A]">{r.candidate_name}</div>
                  <div className="mt-1 text-[#0B1F3A]"><span className="font-medium">Risco: </span>{r.main_risk}</div>
                  <div className="mt-1 text-[#0B1F3A]"><span className="font-medium">Aprofundar: </span>{r.points_to_deepen}</div>
                  {r.cultural_fit_concern && (
                    <div className="mt-1 text-[#0B1F3A]"><span className="font-medium">Fit cultural: </span>{r.cultural_fit_concern}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
