import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  BriefingOutput,
  CandidateEvaluationOutput,
  EvaluationRow,
  ProjectRow,
  ShortlistOutput,
} from "./recruitment-types";

const LanguageSchema = z.enum(["Português", "English", "Español"]);

// ---------- Transcribe ----------
const TranscribeSchema = z.object({
  audioBase64: z.string().min(1),
  filename: z.string().default("audio.webm"),
  mimeType: z.string().default("audio/webm"),
});

export const transcribeAudioFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => TranscribeSchema.parse(i))
  .handler(async ({ data }) => {
    const { transcribeAudio } = await import("./transcribe.server");
    const bytes = Buffer.from(data.audioBase64, "base64");
    const file = new File([bytes], data.filename, { type: data.mimeType });
    try {
      const text = await transcribeAudio(file);
      return { ok: true as const, text };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erro na transcrição" };
    }
  });

// ---------- Process briefing ----------
const BriefingSchema = z.object({
  clientName: z.string().min(1),
  positionTitleHint: z.string().optional(),
  transcript: z.string().min(20),
  language: LanguageSchema,
});

export const processBriefingFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => BriefingSchema.parse(i))
  .handler(async ({ data }) => {
    try {
      const { claudeJSON } = await import("./anthropic.server");
      const { briefingSystemPrompt, briefingUserMessage } = await import("./recruitment-prompts");
      const briefing = await claudeJSON<BriefingOutput>(
        briefingSystemPrompt(data.language),
        briefingUserMessage(data.clientName, data.positionTitleHint, data.transcript),
      );

      // Persist
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const insertPayload = {
        client_name: briefing.client_name || data.clientName,
        position_title: briefing.position_title || data.positionTitleHint || "Posição",
        language: data.language,
        company_context: briefing.company_context,
        vacancy_reason: briefing.vacancy_reason,
        missions: (briefing.missions ?? []) as unknown,
        not_expected: (briefing.not_expected ?? []) as unknown,
        dimensions: (briefing.dimensions ?? []) as unknown,
        disqualifying_signals: (briefing.disqualifying_signals ?? []) as unknown,
        behavioral_profile: briefing.behavioral_profile,
        stakeholders: (briefing.stakeholders ?? []) as unknown,
        selection_process: briefing.selection_process,
        compensation: briefing.compensation,
        work_model: briefing.work_model,
        next_steps: briefing.next_steps,
        briefing_transcript: data.transcript,
      };
      const { data: row, error } = await supabaseAdmin
        .from("projects")
        .insert(insertPayload as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true as const, project: row as unknown as ProjectRow };
    } catch (e) {
      console.error("processBriefing failed:", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "Erro no briefing" };
    }
  });

// ---------- List / Get projects ----------
export const listProjectsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, client_name, position_title, created_at, language")
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, projects: data ?? [] };
});

const IdSchema = z.object({ id: z.string().uuid() });

export const getProjectFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, project: row as unknown as ProjectRow };
  });

// ---------- Evaluate candidate ----------
const EvaluateSchema = z.object({
  projectId: z.string().uuid(),
  candidateName: z.string().min(1),
  transcript: z.string().min(20),
});

export const evaluateCandidateFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => EvaluateSchema.parse(i))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: project, error: pErr } = await supabaseAdmin
        .from("projects")
        .select("*")
        .eq("id", data.projectId)
        .single();
      if (pErr || !project) throw new Error(pErr?.message || "Projeto não encontrado");
      const p = project as unknown as ProjectRow;

      const { claudeJSON } = await import("./anthropic.server");
      const { candidateEvaluatorSystemPrompt } = await import("./recruitment-prompts");
      const evaluation = await claudeJSON<CandidateEvaluationOutput>(
        candidateEvaluatorSystemPrompt({
          clientName: p.client_name,
          positionTitle: p.position_title,
          companyContext: p.company_context ?? "",
          missions: p.missions ?? [],
          dimensions: p.dimensions ?? [],
          disqualifyingSignals: p.disqualifying_signals ?? [],
          language: p.language,
          candidateName: data.candidateName,
        }),
        `TRANSCRIÇÃO DA ENTREVISTA:\n\n${data.transcript}`,
      );
      return { ok: true as const, evaluation };
    } catch (e) {
      console.error("evaluateCandidate failed:", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "Erro na avaliação" };
    }
  });

// ---------- Save evaluation ----------
const SaveEvalSchema = z.object({
  projectId: z.string().uuid(),
  candidateName: z.string().min(1),
  evaluation: z.any(),
  transcript: z.string().optional(),
});

export const saveEvaluationFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SaveEvalSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("candidate_evaluations")
      .insert({
        project_id: data.projectId,
        candidate_name: data.candidateName,
        raw_response: data.evaluation,
        interview_transcript: data.transcript ?? null,
      })
      .select("*")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, row };
  });

// ---------- List evaluations ----------
export const listEvaluationsFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("candidate_evaluations")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, evaluations: (rows ?? []) as unknown as EvaluationRow[] };
  });

// ---------- Delete evaluation ----------
export const deleteEvaluationFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("candidate_evaluations").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ---------- Generate shortlist ----------
const ShortlistSchema = z.object({
  projectId: z.string().uuid(),
  manualText: z.string().optional(),
});

export const generateShortlistFn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ShortlistSchema.parse(i))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: project, error: pErr } = await supabaseAdmin
        .from("projects")
        .select("*")
        .eq("id", data.projectId)
        .single();
      if (pErr || !project) throw new Error(pErr?.message || "Projeto não encontrado");
      const p = project as unknown as ProjectRow;

      let evaluationsPayload: CandidateEvaluationOutput[] | string;
      if (data.manualText && data.manualText.trim().length > 20) {
        evaluationsPayload = data.manualText.trim();
      } else {
        const { data: rows, error } = await supabaseAdmin
          .from("candidate_evaluations")
          .select("raw_response")
          .eq("project_id", data.projectId);
        if (error) throw new Error(error.message);
        evaluationsPayload = (rows ?? []).map((r) => r.raw_response as CandidateEvaluationOutput);
        if (evaluationsPayload.length < 2) {
          throw new Error("São necessárias pelo menos 2 avaliações salvas para gerar a shortlist.");
        }
      }

      const { claudeJSON } = await import("./anthropic.server");
      const { shortlistSystemPrompt, shortlistUserMessage } = await import("./recruitment-prompts");
      const shortlist = await claudeJSON<ShortlistOutput>(
        shortlistSystemPrompt({
          clientName: p.client_name,
          positionTitle: p.position_title,
          dimensions: p.dimensions ?? [],
          language: p.language,
        }),
        shortlistUserMessage(evaluationsPayload),
      );
      return { ok: true as const, shortlist };
    } catch (e) {
      console.error("generateShortlist failed:", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "Erro na shortlist" };
    }
  });
