import type { CVData, CVLanguage } from "./cv-types";

const LANGUAGE_NAMES: Record<CVLanguage, string> = {
  pt: "Português (Brasil)",
  en: "English",
  es: "Español",
};

const SYSTEM_PROMPT = `Você é um especialista da FIND HR Consulting que formata CVs de candidatos no padrão oficial da empresa.

Sua tarefa: extrair informações estruturadas de um CV bruto + notas de entrevista, e devolver um JSON estritamente no formato pedido. Você também redige a seção "Análise de Entrevista" em tom profissional, executivo e factual, integrando as notas fornecidas pelo recrutador.

REGRAS:
- Devolva APENAS JSON válido — sem markdown, sem comentários, sem texto extra.
- Todo o conteúdo (títulos, descrições, análise) deve estar no idioma solicitado pelo usuário.
- EDUCAÇÃO: para cada item, mostre apenas o ANO DE CONCLUSÃO (não inclua o ano inicial). Use sempre ":" depois do tipo de formação seguido do nome do curso. Exemplos: "MBA: Marketing Digital – FGV (2020)", "Bacharelado: Administração de Empresas – USP (2015)", "Mestrado: Engenharia – Unicamp (2018)". Para cursos em andamento, use o idioma de saída ("em andamento"/"in progress"/"en curso").
- TRADUZA TUDO para o idioma de saída, inclusive títulos acadêmicos e cargos que estejam em outro idioma no CV bruto (ex.: "Licenciado" → "Bachelor's degree" em EN / "Licenciatura" em ES; "Engenheiro" → "Engineer"; "Mestre" → "Master's degree"). Nunca deixe palavras soltas no idioma original. Mantenha apenas nomes próprios (pessoas, empresas, instituições, cidades) inalterados.
- Para datas use o formato curto local do idioma (ex.: "Nov 2025 – Atual" em PT, "Nov 2025 – Present" em EN, "Nov 2025 – Actual" em ES).
- Cargos dentro da mesma empresa devem ficar agrupados em "roles" (em ordem cronológica reversa: mais recente primeiro).
- Bullets de responsabilidades: frases curtas, começando com verbo no infinitivo ou gerúndio conforme idioma.
- QUALIFICAÇÕES: deve ser APENAS um resumo curto do tipo "sobre o candidato" — 2 a 4 bullets no máximo, sintetizando perfil profissional, principais competências e diferenciais. NÃO listar certificações, cursos ou ferramentas técnicas aqui.
- Se uma informação não existir no CV nem nas notas, use string vazia "".
- Na Análise de Entrevista, redija parágrafos CONCISOS — no MÁXIMO 4 a 5 linhas por bloco. Se as notas estiverem vazias, redija análise preliminar baseada apenas no CV.
- TOM DA ANÁLISE DE ENTREVISTA: estritamente factual, descritivo e neutro — registro de fatos, NUNCA elogios ou linguagem de venda.
- PROIBIDO usar adjetivos qualificadores/avaliativos como: excelente, sólido, robusto, forte, fortíssimo, destacado, extensa, vasta, ampla, comprovada, expressiva, diferenciado, notável, relevante (como elogio), estratégico (como elogio), profundo, rico, completo, bem-sucedido, marcante, impressionante, e quaisquer superlativos ou intensificadores ("muito", "altamente", "extremamente").
- PROIBIDO linguagem promocional/comercial do tipo "candidato ideal", "agrega valor", "traz grande contribuição", "perfil de destaque", "se sobressai", "ponto forte".
- Descreva apenas O QUE o candidato fez, ONDE, QUANDO e com QUE ESCOPO (cargos, empresas, setores, números, anos, tamanho de equipe, escopo geográfico). Sem qualificar.
- Adjetivos só são permitidos quando puramente descritivos e neutros (ex.: "internacional", "regulatório", "industrial", "público", "matricial"). Nunca avaliativos.
- Em "whyWeAreRecommending", descreva o fit de forma objetiva (experiência em X, atuação em Y, conhecimento de Z, anos no setor W) — não elogie o candidato.
- Pacote de remuneração: preencha somente o que estiver explícito; caso contrário "".
- Não invente fatos. Tom executivo, profissional e direto.

SCHEMA JSON ESPERADO (use EXATAMENTE estas chaves):
{
  "name": string, "phone": string, "email": string, "linkedin": string,
  "education": string[], "qualifications": string[],
  "experience": [{ "company": string, "period": string, "roles": [{ "title": string, "period": string, "responsibilities": string[] }] }],
  "languages": string[],
  "compensationPackage": { "monthlySalary": string, "annualBonus": string, "privatePension": string, "stockOptions": string, "healthInsurance": string, "dentalInsurance": string, "mealVoucher": string, "foodVoucher": string, "transportVoucher": string, "other": string },
  "salaryExpectation": string,
  "interviewAnalysis": { "careerHistory": string, "currentExperienceAndCases": string, "peopleLeadership": string, "communicationAndPersonalImpression": string, "motivation": string, "whyWeAreRecommending": string }
}`;

export async function extractCVData(
  cvText: string,
  notes: string,
  language: CVLanguage,
): Promise<CVData> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const userMessage = `IDIOMA DE SAÍDA: ${LANGUAGE_NAMES[language]}

=== CV BRUTO DO CANDIDATO ===
${cvText.trim() || "(vazio)"}

=== NOTAS DA ENTREVISTA ===
${notes.trim() || "(nenhuma — redija uma análise preliminar baseada no CV)"}

Devolva APENAS o JSON no schema especificado, no idioma ${LANGUAGE_NAMES[language]}.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos da Lovable AI esgotados. Adicione créditos no workspace.");
    throw new Error(`AI gateway error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  let raw: string = json?.choices?.[0]?.message?.content ?? "";
  raw = raw.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  // Extract the JSON object boundaries (in case the model added prose around it).
  const start = raw.search(/[{[]/);
  const openChar = start >= 0 ? raw[start] : "";
  const closeChar = openChar === "[" ? "]" : "}";
  const end = raw.lastIndexOf(closeChar);
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);

  const tryParse = (s: string) => JSON.parse(s) as CVData;

  try {
    return tryParse(raw);
  } catch {
    // Repair common issues: trailing commas + stray control chars.
    const repaired = raw
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    try {
      return tryParse(repaired);
    } catch (e) {
      console.error("Failed to parse AI JSON:", raw.slice(0, 1000));
      throw new Error(
        `AI retornou JSON inválido: ${(e as Error).message.slice(0, 120)}`,
      );
    }
  }
}
