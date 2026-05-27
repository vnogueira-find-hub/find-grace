// Generates a FIND-formatted .docx by reusing the official FIND template
// as a binary base and replacing ONLY the body XML. Headers, footers,
// styles, fonts, numbering, watermark and section properties all come
// from the template untouched — that's how we get pixel-perfect output.

import JSZip from "jszip";
import { FIND_TEMPLATE_B64 } from "./find-template.b64";
import type { CVData, CVLanguage } from "./cv-types";
import { LABELS } from "./cv-labels";

// ----------------- XML helpers -----------------
const esc = (s: string): string =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const RPR_BODY = `<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/><w:sz w:val="22"/><w:szCs w:val="22"/>`;
const RPR_BODY_BOLD = `<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/>`;
const RPR_SECTION_TITLE = `<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/><w:b/><w:u w:val="single"/>`;
const RPR_COMPANY = `<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:u w:val="single"/>`;

// Run with optional leading/trailing whitespace preserved.
const run = (rPr: string, text: string): string => {
  const t = text ?? "";
  const preserve = /^\s|\s$/.test(t) ? ' xml:space="preserve"' : "";
  return `<w:r><w:rPr>${rPr}</w:rPr><w:t${preserve}>${esc(t)}</w:t></w:r>`;
};

// Section heading: bold + underline, default size (24 = 12pt from doc default).
const sectionHeading = (title: string): string =>
  `<w:p><w:pPr><w:jc w:val="both"/><w:rPr>${RPR_SECTION_TITLE}</w:rPr></w:pPr>${run(RPR_SECTION_TITLE, title)}</w:p>`;

// Breathing room between paragraphs/bullets (6pt after).
const SPACING_LOOSE = `<w:spacing w:after="120" w:line="276" w:lineRule="auto"/>`;
// No after-spacing — for tight groupings (e.g., role title above its bullets).
const SPACING_TIGHT = `<w:spacing w:after="0" w:line="276" w:lineRule="auto"/>`;

// Body paragraph: justified, 11pt, breathing room after.
const bodyPara = (...runs: string[]): string =>
  `<w:p><w:pPr>${SPACING_LOOSE}<w:jc w:val="both"/><w:rPr>${RPR_BODY}</w:rPr></w:pPr>${runs.join("")}</w:p>`;

// Same as bodyPara but tight (no after-spacing) — for headers that lead into bullets.
const bodyParaTight = (...runs: string[]): string =>
  `<w:p><w:pPr>${SPACING_TIGHT}<w:jc w:val="both"/><w:rPr>${RPR_BODY}</w:rPr></w:pPr>${runs.join("")}</w:p>`;

// Bullet item — uses numId=1 from the template's numbering.xml (•).
const bullet = (...runs: string[]): string =>
  `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>${SPACING_LOOSE}<w:ind w:left="360"/><w:jc w:val="both"/><w:rPr>${RPR_BODY}</w:rPr></w:pPr>${runs.join("")}</w:p>`;

const emptyPara = (): string =>
  `<w:p><w:pPr>${SPACING_TIGHT}<w:rPr>${RPR_BODY}</w:rPr></w:pPr></w:p>`;

// Compensation table — 2 cols (label | value), single-line borders, full width.
function compTable(rows: Array<[string, string]>): string {
  const border = `<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders>`;
  // keepNext/keepLines on every paragraph forces Word to keep the whole table
  // on a single page — if it doesn't fit, the entire table moves to the next.
  const cellPara = (rPr: string, text: string): string =>
    `<w:p><w:pPr>${SPACING_TIGHT}<w:keepNext/><w:keepLines/><w:rPr>${rPr}</w:rPr></w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  const row = (label: string, value: string): string =>
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>` +
    `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/>${border}</w:tcPr>${cellPara(RPR_BODY_BOLD, label)}</w:tc>` +
    `<w:tc><w:tcPr><w:tcW w:w="5077" w:type="dxa"/>${border}</w:tcPr>${cellPara(RPR_BODY, value)}</w:tc></w:tr>`;
  return (
    `<w:tbl>` +
    `<w:tblPr><w:tblW w:w="9577" w:type="dxa"/>` +
    `<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>` +
    `<w:tblLook w:val="04A0"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="5077"/></w:tblGrid>` +
    rows.map(([l, v]) => row(l, v)).join("") +
    `</w:tbl>`
  );
}

// Centered header table (name + contact) — mirrors the template structure.
function headerTable(cv: CVData, L: typeof LABELS["pt"]): string {
  const cell = (inner: string): string =>
    `<w:tr><w:trPr><w:jc w:val="center"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="9577" w:type="dxa"/></w:tcPr>${inner}</w:tc></w:tr>`;

  const namePara = `<w:p><w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi" w:cstheme="majorHAnsi"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:u w:val="single"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:u w:val="single"/></w:rPr><w:t>${esc(cv.name || "—")}</w:t></w:r></w:p>`;

  const contactRow = (label: string, value: string): string => {
    const v = value?.trim() || "—";
    const inner = `<w:p><w:pPr><w:rPr>${RPR_BODY}</w:rPr></w:pPr>${run(RPR_BODY_BOLD, `${label}: `)}${run(RPR_BODY, v)}</w:p>`;
    return cell(inner);
  };

  return (
    `<w:tbl>` +
    `<w:tblPr><w:tblW w:w="9577" w:type="dxa"/><w:jc w:val="center"/>` +
    `<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>` +
    `<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="9577"/></w:tblGrid>` +
    cell(namePara) +
    contactRow(L.phone, cv.phone) +
    contactRow(L.email, cv.email) +
    contactRow(L.linkedin, cv.linkedin) +
    `</w:tbl>`
  );
}

// Punctuation: bullets end with ";", last one with "." (matches FIND style).
function withTrailingPunct(items: string[]): string[] {
  const arr = items.filter((s) => s && s.trim());
  return arr.map((s, i) => {
    const trimmed = s.replace(/[.;,\s]+$/, "");
    return trimmed + (i === arr.length - 1 ? "." : ";");
  });
}

function buildBody(cv: CVData, language: CVLanguage): string {
  const L = LABELS[language];
  const parts: string[] = [];

  parts.push(headerTable(cv, L));
  parts.push(emptyPara());

  // Education
  if (cv.education?.length) {
    parts.push(sectionHeading(L.education));
    for (const e of withTrailingPunct(cv.education)) {
      parts.push(bullet(run(RPR_BODY, e)));
    }
    parts.push(emptyPara());
  }

  // Qualifications
  if (cv.qualifications?.length) {
    parts.push(sectionHeading(L.qualifications));
    for (const q of withTrailingPunct(cv.qualifications)) {
      parts.push(bullet(run(RPR_BODY, q)));
    }
    parts.push(emptyPara());
  }

  // Experience
  if (cv.experience?.length) {
    parts.push(sectionHeading(L.experience));
    for (const exp of cv.experience) {
      const headerText =
        exp.period ? `${exp.company} (${exp.period})` : exp.company;
      parts.push(
        `<w:p><w:pPr>${SPACING_TIGHT}<w:jc w:val="both"/><w:rPr>${RPR_COMPANY}</w:rPr></w:pPr>${run(RPR_COMPANY, headerText)}</w:p>`,
      );

      for (const role of exp.roles ?? []) {
        const titleText =
          role.period ? `${role.title} (${role.period})` : role.title;
        parts.push(
          bodyParaTight(run(RPR_BODY_BOLD, `${L.role}: `), run(RPR_BODY_BOLD, titleText)),
        );
        if (role.responsibilities?.length) {
          parts.push(bodyParaTight(run(RPR_BODY_BOLD, `${L.responsibilities}:`)));
          for (const r of withTrailingPunct(role.responsibilities)) {
            parts.push(bullet(run(RPR_BODY, r)));
          }
        }
        parts.push(emptyPara());
      }
    }
  }

  // Languages
  if (cv.languages?.length) {
    parts.push(sectionHeading(L.languages));
    for (const lang of withTrailingPunct(cv.languages)) {
      parts.push(bullet(run(RPR_BODY, lang)));
    }
    parts.push(emptyPara());
  }

  // Compensation package
  const comp = cv.compensationPackage ?? ({} as CVData["compensationPackage"]);
  const compEntries: Array<[string, string]> = [
    [L.monthlySalary, comp.monthlySalary],
    [L.annualBonus, comp.annualBonus],
    [L.privatePension, comp.privatePension],
    [L.stockOptions, comp.stockOptions],
    [L.healthInsurance, comp.healthInsurance],
    [L.dentalInsurance, comp.dentalInsurance],
    [L.mealVoucher, comp.mealVoucher],
    [L.foodVoucher, comp.foodVoucher],
    [L.transportVoucher, comp.transportVoucher],
    [L.other, comp.other],
  ].filter(([, v]) => v && v.trim()) as Array<[string, string]>;

  if (compEntries.length || cv.salaryExpectation?.trim()) {
    parts.push(sectionHeading(L.compensation));
    const rows = [...compEntries];
    if (cv.salaryExpectation?.trim()) {
      rows.push([L.salaryExpectation, cv.salaryExpectation.trim()]);
    }
    parts.push(compTable(rows));
    parts.push(emptyPara());
  }

  // Interview Analysis
  const a = cv.interviewAnalysis ?? ({} as CVData["interviewAnalysis"]);
  const analysisBlocks: Array<[string, string]> = [
    [L.careerHistory, a.careerHistory],
    [L.currentExperienceAndCases, a.currentExperienceAndCases],
    [L.peopleLeadership, a.peopleLeadership],
    [L.communication, a.communicationAndPersonalImpression],
    [L.motivation, a.motivation],
    [L.whyRecommending, a.whyWeAreRecommending],
  ];
  const anyAnalysis = analysisBlocks.some(([, v]) => v && v.trim());
  if (anyAnalysis) {
    parts.push(sectionHeading(L.analysis));
    for (const [label, text] of analysisBlocks) {
      if (!text?.trim()) continue;
      parts.push(
        bodyPara(
          run(RPR_BODY_BOLD, `${label}: `),
          run(RPR_BODY, text.trim()),
        ),
      );
    }
  }

  return parts.join("");
}

// ----------------- Template I/O -----------------

let cachedTemplate: ArrayBuffer | null = null;
async function loadTemplate(): Promise<ArrayBuffer> {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = Buffer.from(FIND_TEMPLATE_B64, "base64").buffer.slice(0) as ArrayBuffer;
  return cachedTemplate;
}

export async function buildCVDocument(
  cv: CVData,
  language: CVLanguage,
): Promise<Uint8Array> {
  const tplBuf = await loadTemplate();
  const zip = await JSZip.loadAsync(tplBuf);

  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Template missing word/document.xml");
  const docXml = await docFile.async("string");

  const bodyStart = docXml.indexOf("<w:body>");
  const bodyEnd = docXml.indexOf("</w:body>");
  if (bodyStart < 0 || bodyEnd < 0) {
    throw new Error("Template body markers not found");
  }
  const headerXml = docXml.slice(0, bodyStart + "<w:body>".length);
  const bodyInner = docXml.slice(bodyStart + "<w:body>".length, bodyEnd);

  // Preserve the original sectPr (page size, margins, header/footer refs).
  const sectMatch = bodyInner.match(/<w:sectPr[\s>][\s\S]*?<\/w:sectPr>/);
  const sectPr = sectMatch
    ? sectMatch[0]
    : `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2268" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`;

  const newBody = buildBody(cv, language);
  const finalXml = `${headerXml}${newBody}${sectPr}</w:body></w:document>`;

  zip.file("word/document.xml", finalXml);

  const out = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return out;
}
