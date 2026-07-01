// Plain prompt builders used by the server functions. No server-only imports here.
import type {
  BriefingOutput,
  CandidateEvaluationOutput,
  Dimension,
  Mission,
} from "./recruitment-types";

export function briefingSystemPrompt(language: string): string {
  return `Você é um consultor sênior de executive search. Você recebeu a transcrição de uma reunião de briefing sobre uma nova posição. Sua tarefa é estruturar essa conversa em um formato que será usado para avaliar candidatos e montar a validação de perfil.

Extraia e retorne APENAS JSON válido (sem markdown, sem comentários) com este schema:

{
  "client_name": "string",
  "position_title": "string — nome final acordado para a posição",
  "company_context": "parágrafo descrevendo a empresa, porte e momento",
  "vacancy_reason": "por que a posição existe agora",
  "missions": [{ "number": 1, "description": "descrição da missão central" }],
  "not_expected": ["perfil a evitar 1"],
  "dimensions": [
    { "number": 1, "name": "nome da dimensão", "weight": 20, "criteria": ["critério 1","critério 2"] }
  ],
  "disqualifying_signals": ["sinal 1"],
  "behavioral_profile": "parágrafo sobre perfil comportamental esperado",
  "stakeholders": ["área/pessoa 1"],
  "selection_process": "descrição das etapas e estimativa de prazo",
  "compensation": "faixa discutida ou null",
  "work_model": "remoto/híbrido/presencial + detalhes",
  "next_steps": "compromissos e timeline acordados na reunião"
}

Regras:
- Pesos em "dimensions" devem somar 100
- Use entre 5 e 8 dimensões
- "criteria" deve ter entre 2 e 4 itens por dimensão, escritos como evidências observáveis
- Se um campo não foi discutido, retorne null — não invente
- Idioma de saída: ${language}`;
}

export function briefingUserMessage(
  clientName: string,
  positionHint: string | undefined,
  sources: string,
): string {
  return `CLIENT_NAME: ${clientName}
POSITION_TITLE_HINT: ${positionHint || "(não informado)"}

FONTES (transcrição da reunião e/ou documento anexo de "Cronograma e Validação"). Trate o documento anexo como fonte primária de fatos estruturais (missões, dimensões, cronograma, stakeholders) e a transcrição como complemento com nuances da conversa. Se as duas fontes divergirem, prefira o documento.

${sources}`;
}

export function candidateEvaluatorSystemPrompt(args: {
  clientName: string;
  positionTitle: string;
  companyContext: string;
  missions: Mission[];
  dimensions: Dimension[];
  disqualifyingSignals: string[];
  language: string;
  candidateName: string;
}): string {
  const missionsBlock = args.missions
    .map((m) => `${m.number}. ${m.description}`)
    .join("\n");
  const dimensionsBlock = args.dimensions
    .map(
      (d) =>
        `${d.number}. ${d.name} (peso ${d.weight}%)\n${d.criteria
          .map((c) => `   - ${c}`)
          .join("\n")}`,
    )
    .join("\n");
  const dqBlock = args.disqualifyingSignals.map((s) => `- ${s}`).join("\n") || "(nenhum)";

  return `Você é um consultor sênior de executive search especializado em avaliação de candidatos para posições de liderança e especialistas.

Sua tarefa é avaliar um candidato para a posição de ${args.positionTitle} na ${args.clientName} com base na transcrição da entrevista fornecida pelo usuário.

---
CONTEXTO DA POSIÇÃO

${args.companyContext}

A posição tem as seguintes missões centrais:
${missionsBlock}

---
DIMENSÕES DE AVALIAÇÃO

Avalie o candidato nas seguintes dimensões, atribuindo nota de 1 a 5 com evidências extraídas da transcrição:

${dimensionsBlock}

---
SINAIS DE DESQUALIFICAÇÃO

${dqBlock}

---
FORMATO DE SAÍDA — retorne APENAS JSON válido neste schema (sem markdown):

{
  "candidate_name": "${args.candidateName}",
  "executive_summary": "3-5 linhas",
  "dimension_scores": [
    { "dimension": "nome", "score": 1-5 ou null, "justification": "evidência", "has_evidence": true/false }
  ],
  "strengths": ["..."],
  "attention_points": ["..."],
  "disqualifying_signals_found": [] ou ["sinal"],
  "recommendation": "priority" | "caveats" | "not_recommended",
  "recommendation_detail": "justificativa objetiva",
  "overall_score": número 1-5 (média ponderada, excluindo dimensões sem evidência e redistribuindo pesos)
}

REGRAS:
- Avalie EXCLUSIVAMENTE com base na transcrição
- Sem evidência → score null, has_evidence false, justification "Sem evidência suficiente"
- overall_score: exclua dimensões sem evidência e redistribua pesos proporcionalmente
- Idioma de saída: ${args.language}
- Seja direto e objetivo`;
}

export function shortlistSystemPrompt(args: {
  clientName: string;
  positionTitle: string;
  dimensions: Dimension[];
  language: string;
}): string {
  const dimsBlock = args.dimensions
    .map((d) => `- ${d.name} → peso ${d.weight}%`)
    .join("\n");

  return `Você é um consultor sênior de executive search. Recebeu as avaliações individuais de todos os candidatos entrevistados para a posição de ${args.positionTitle} na ${args.clientName}. Consolide em um mapa comparativo estruturado.

DIMENSÕES E PESOS:
${dimsBlock}

Nota ponderada = soma de (nota × peso/100). Escala: 1 a 5.

Retorne APENAS JSON válido neste schema (sem markdown):

{
  "comparison_table": [
    { "candidate_name": "string", "dimension_scores": { "Nome Dimensão": 1-5 ou "S/E" }, "weighted_score": número, "recommendation": "priority"|"caveats"|"not_recommended" }
  ],
  "heat_map": [{ "candidate_name": "string", "narrative": "parágrafo 3-4 linhas: diferenciação, principal risco, recomendação" }],
  "shortlist": {
    "priority": ["nome"],
    "caveats": [{ "candidate_name": "string", "caveat": "ressalva" }],
    "not_recommended": [{ "candidate_name": "string", "reason": "motivo" }]
  },
  "market_gaps": {
    "recurring_gaps": ["dimensão"],
    "is_market_gap_or_mapping_limitation": "análise",
    "calibration_suggestion": "string ou null"
  },
  "shortlist_risks": [
    { "candidate_name": "string", "main_risk": "risco", "points_to_deepen": "...", "cultural_fit_concern": "string ou null" }
  ]
}

INSTRUÇÕES:
- Baseie-se EXCLUSIVAMENTE nas avaliações fornecidas
- Ordene comparison_table do maior para o menor weighted_score
- Empate < 0.2: use pontos fortes e sinais de desqualificação para desempatar, registre o critério no heat_map
- Dimensão "S/E" para um candidato: exclua do cálculo dele e redistribua os pesos proporcionalmente
- Idioma de saída: ${args.language}`;
}

export function shortlistUserMessage(
  evaluations: CandidateEvaluationOutput[] | string,
): string {
  const body =
    typeof evaluations === "string"
      ? evaluations
      : JSON.stringify(evaluations, null, 2);
  return `AVALIAÇÕES INDIVIDUAIS DOS CANDIDATOS:\n\n${body}`;
}
