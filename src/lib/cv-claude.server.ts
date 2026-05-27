import Anthropic from "@anthropic-ai/sdk";
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
- Para datas use o formato curto local do idioma (ex.: "Nov 2025 – Atual" em PT, "Nov 2025 – Present" em EN, "Nov 2025 – Actual" em ES).
- Cargos dentro da mesma empresa devem ficar agrupados em "roles" (em ordem cronológica reversa: mais recente primeiro).
- Bullets de responsabilidades: frases curtas, começando com verbo no infinitivo ou gerúndio conforme idioma, sem pontuação final desnecessária além de ponto e vírgula ou ponto.
- Se uma informação não existir no CV nem nas notas, use string vazia "".
- Na seção de Análise de Entrevista, redija parágrafos coesos (não listas) integrando dados do CV com as notas do recrutador. Se as notas estiverem vazias ou insuficientes, redija uma análise preliminar baseada apenas no CV.
- Pacote de remuneração: preencha somente o que estiver explícito; caso contrário "".
- Não invente fatos. Não exagere. Tom executivo, profissional e direto.

SCHEMA JSON ESPERADO (use EXATAMENTE estas chaves):
{
  "name": string,
  "phone": string,
  "email": string,
  "linkedin": string,
  "education": string[],
  "qualifications": string[],
  "experience": [
    {
      "company": string,
      "period": string,
      "roles": [
        { "title": string, "period": string, "responsibilities": string[] }
      ]
    }
  ],
  "languages": string[],
  "compensationPackage": {
    "monthlySalary": string,
    "annualBonus": string,
    "privatePension": string,
    "stockOptions": string,
    "healthInsurance": string,
    "dentalInsurance": string,
    "mealVoucher": string,
    "foodVoucher": string,
    "transportVoucher": string,
    "other": string
  },
  "salaryExpectation": string,
  "interviewAnalysis": {
    "careerHistory": string,
    "currentExperienceAndCases": string,
    "peopleLeadership": string,
    "communicationAndPersonalImpression": string,
    "motivation": string,
    "whyWeAreRecommending": string
  }
}`;

export async function extractCVData(
  cvText: string,
  notes: string,
  language: CVLanguage,
): Promise<CVData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const userMessage = `IDIOMA DO CV: ${LANGUAGE_NAMES[language]}

=== CV BRUTO DO CANDIDATO ===
${cvText.trim() || "(vazio)"}

=== NOTAS DA ENTREVISTA ===
${notes.trim() || "(nenhuma — redija uma análise preliminar baseada no CV)"}

Devolva APENAS o JSON no schema especificado, no idioma ${LANGUAGE_NAMES[language]}.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response");
  }

  // Strip any accidental ```json fences
  let raw = textBlock.text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  try {
    return JSON.parse(raw) as CVData;
  } catch (err) {
    console.error("Failed to parse Claude JSON:", raw.slice(0, 500));
    throw new Error("Claude returned invalid JSON");
  }
}
