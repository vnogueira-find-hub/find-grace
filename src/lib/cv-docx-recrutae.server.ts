// Generates a Recrutaê-formatted .docx from scratch using docx-js.
// Layout mirrors the official Recrutaê CV template: logo + address header,
// 1-column contact table, underlined section titles, simple bullets,
// 2-column compensation table (all rows preserved even when blank),
// dedicated space for "Pretensão Salarial", and full Análise de Entrevista.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Header,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  WidthType,
  ShadingType,
  HeightRule,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
} from "docx";
import type { CVData, CVLanguage } from "./cv-types";
import { LABELS } from "./cv-labels";
import { RECRUTAE_LOGO_B64 } from "./recrutae-logo.b64";
import { RECRUTAE_WATERMARK_B64 } from "./recrutae-watermark.b64";

// US Letter-ish, but template uses A4. A4 dims in DXA: 11906 × 16838.
// 1 inch margin = 1440 DXA. Content width = 11906 - 2*1440 = 9026.
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9026

const FONT = "Calibri";
const BODY_SIZE = 22; // 11pt (half-points)
const TITLE_SIZE = 24; // 12pt

// ---------- Run builders ----------
const body = (text: string, opts: { bold?: boolean; underline?: boolean } = {}) =>
  new TextRun({
    text,
    font: FONT,
    size: BODY_SIZE,
    bold: opts.bold,
    underline: opts.underline ? { type: "single" } : undefined,
  });

const sectionTitle = (text: string) =>
  new Paragraph({
    spacing: { before: 240, after: 120, line: 240 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: TITLE_SIZE,
        bold: true,
        underline: { type: "single" },
      }),
    ],
  });

const bullet = (text: string) =>
  new Paragraph({
    numbering: { reference: "rec-bullets", level: 0 },
    spacing: { after: 60, line: 240 },
    children: [body(text)],
  });

const emptyP = () =>
  new Paragraph({ spacing: { after: 0, line: 240 }, children: [body("")] });

// Trailing punctuation: ";" for all but last (".").
function withPunct(items: string[]): string[] {
  const arr = (items ?? []).filter((s) => s && s.trim());
  return arr.map((s, i) => {
    const trimmed = s.replace(/[.;,\s]+$/, "");
    return trimmed + (i === arr.length - 1 ? "." : ";");
  });
}

// ---------- Header (logo + address) ----------
function buildHeader(): Header {
  const logoBytes = Buffer.from(RECRUTAE_LOGO_B64, "base64");
  // Logo natural size 2882×609 → keep ratio. Target ~180px wide (≈1.875in).
  const logoWidth = 180;
  const logoHeight = Math.round((logoWidth * 609) / 2882); // ≈ 38

  const addrLine = (text: string) =>
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0, line: 240 },
      children: [
        new TextRun({ text, font: FONT, size: 18 /* 9pt */ }),
      ],
    });

  const logoCell = new TableCell({
    width: { size: 4513, type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new ImageRun({
            type: "png",
            data: logoBytes,
            transformation: { width: logoWidth, height: logoHeight },
            altText: {
              title: "Recrutaê",
              description: "Recrutaê logo",
              name: "recrutae-logo",
            },
          }),
        ],
      }),
    ],
  });

  const addrCell = new TableCell({
    width: { size: 4513, type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: "center",
    children: [
      addrLine("Rua Castilho, 392 | Conj 91    Brooklin Paulista | 04568 010"),
      addrLine("(11) 4081 1944 | www.recrutae.com.br"),
    ],
  });

  // Full-page watermark ("ê" mark) — floats behind body text on every page.
  const watermarkBytes = Buffer.from(RECRUTAE_WATERMARK_B64, "base64");
  const watermarkPara = new Paragraph({
    spacing: { after: 0 },
    children: [
      new ImageRun({
        type: "png",
        data: watermarkBytes,
        // Full A4 page size in pixels (8.27in × 11.69in @ 96dpi).
        transformation: { width: 794, height: 1123 },
        floating: {
          horizontalPosition: {
            relative: HorizontalPositionRelativeFrom.PAGE,
            offset: 0,
          },
          verticalPosition: {
            relative: VerticalPositionRelativeFrom.PAGE,
            offset: 0,
          },
          behindDocument: true,
          wrap: { type: TextWrappingType.NONE },
        },
        altText: {
          title: "Marca Recrutaê",
          description: "Marca d'água Recrutaê",
          name: "recrutae-watermark",
        },
      }),
    ],
  });

  return new Header({
    children: [
      watermarkPara,
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [4513, 4513],
        borders: tableNoBorders(),
        rows: [
          new TableRow({
            children: [logoCell, addrCell],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 0 }, children: [body("")] }),
    ],
  });
}

function noBorders() {
  const n = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: n, bottom: n, left: n, right: n };
}
function tableNoBorders() {
  const n = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return {
    top: n,
    bottom: n,
    left: n,
    right: n,
    insideHorizontal: n,
    insideVertical: n,
  };
}

// ---------- Identification table (Nome / contatos) ----------
function identificationTable(cv: CVData, L: (typeof LABELS)["pt"]): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const cellBorders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
  };

  const padding = { top: 60, bottom: 60, left: 120, right: 120 };

  const nameCell = new TableCell({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    borders: cellBorders,
    margins: padding,
    children: [
      new Paragraph({
        spacing: { after: 0, line: 240 },
        children: [
          new TextRun({
            text: cv.name?.trim() || "—",
            font: FONT,
            size: 26,
            bold: true,
            underline: { type: "single" },
          }),
        ],
      }),
    ],
  });

  const contactCell = (label: string, value: string) =>
    new TableCell({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      borders: cellBorders,
      margins: padding,
      children: [
        new Paragraph({
          spacing: { after: 0, line: 240 },
          children: [
            body(`${label}: `, { bold: true }),
            body(value?.trim() || "—"),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({ children: [nameCell] }),
      new TableRow({ children: [contactCell(L.phone, cv.phone)] }),
      new TableRow({ children: [contactCell(L.email, cv.email)] }),
      new TableRow({ children: [contactCell(L.linkedin, cv.linkedin)] }),
    ],
  });
}

// ---------- Compensation table (2 cols, all rows preserved) ----------
function compensationTable(rows: Array<[string, string]>): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const cellBorders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
  };
  const padding = { top: 60, bottom: 60, left: 120, right: 120 };

  const labelW = 5500;
  const valueW = CONTENT_WIDTH - labelW; // 3526

  const makeRow = ([label, value]: [string, string]) =>
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: labelW, type: WidthType.DXA },
          borders: cellBorders,
          margins: padding,
          children: [
            new Paragraph({
              spacing: { after: 0, line: 240 },
              children: [body(label)],
            }),
          ],
        }),
        new TableCell({
          width: { size: valueW, type: WidthType.DXA },
          borders: cellBorders,
          margins: padding,
          children: [
            new Paragraph({
              spacing: { after: 0, line: 240 },
              children: [body(value?.trim() || "-")],
            }),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    rows: rows.map(makeRow),
  });
}

// ---------- Body ----------
function buildChildren(cv: CVData, language: CVLanguage) {
  const L = LABELS[language];
  const out: (Paragraph | Table)[] = [];

  // Spacer above identification table (header is in the page header).
  out.push(new Paragraph({ spacing: { after: 0 }, children: [body("")] }));
  out.push(identificationTable(cv, L));
  out.push(emptyP());

  // Education
  if (cv.education?.length) {
    out.push(sectionTitle(L.education));
    for (const e of withPunct(cv.education)) out.push(bullet(e));
  }

  // Qualifications
  if (cv.qualifications?.length) {
    out.push(sectionTitle(L.qualifications));
    for (const q of withPunct(cv.qualifications)) out.push(bullet(q));
  }

  // Experience
  if (cv.experience?.length) {
    out.push(sectionTitle(L.experience));
    for (const exp of cv.experience) {
      const headerText = exp.period
        ? `${exp.company} (${exp.period})`
        : exp.company;
      // Company header (bold + underline)
      out.push(
        new Paragraph({
          spacing: { before: 120, after: 120, line: 240 },
          children: [body(headerText, { bold: true, underline: true })],
        }),
      );
      for (const role of exp.roles ?? []) {
        const roleText = role.period
          ? `${role.title} (${role.period})`
          : role.title;
        // "Cargo: …" — bold, with empty line below before "Principais"
        out.push(
          new Paragraph({
            spacing: { after: 120, line: 240 },
            children: [
              body(`${L.role}: `, { bold: true }),
              body(roleText, { bold: true }),
            ],
          }),
        );
        if (role.responsibilities?.length) {
          // Label TIGHT → sticks to bullets directly below
          out.push(
            new Paragraph({
              spacing: { after: 0, line: 240 },
              children: [body(`${L.responsibilities}:`, { bold: true })],
            }),
          );
          for (const r of withPunct(role.responsibilities)) out.push(bullet(r));
        }
        out.push(emptyP());
      }
    }
  }

  // Languages
  if (cv.languages?.length) {
    out.push(sectionTitle(L.languages));
    for (const l of withPunct(cv.languages)) out.push(bullet(l));
  }

  // Compensation — always render full table
  const c = cv.compensationPackage ?? ({} as CVData["compensationPackage"]);
  out.push(sectionTitle(L.compensation));
  out.push(
    compensationTable([
      [L.monthlySalary, c.monthlySalary ?? ""],
      [L.annualBonus, c.annualBonus ?? ""],
      [L.privatePension, c.privatePension ?? ""],
      [L.stockOptions, c.stockOptions ?? ""],
      [L.healthInsurance, c.healthInsurance ?? ""],
      [L.dentalInsurance, c.dentalInsurance ?? ""],
      [L.mealVoucher, c.mealVoucher ?? ""],
      [L.foodVoucher, c.foodVoucher ?? ""],
      [L.transportVoucher, c.transportVoucher ?? ""],
      [L.other, c.other ?? ""],
    ]),
  );
  out.push(emptyP());

  // Salary expectation (own line, with breathing space)
  out.push(
    new Paragraph({
      spacing: { before: 120, after: 120, line: 240 },
      children: [
        body(`${L.salaryExpectation}: `, { bold: true, underline: true }),
        body(cv.salaryExpectation?.trim() || ""),
      ],
    }),
  );
  out.push(emptyP());

  // Interview analysis
  const a = cv.interviewAnalysis ?? ({} as CVData["interviewAnalysis"]);
  const blocks: Array<[string, string]> = [
    [L.careerHistory, a.careerHistory],
    [L.currentExperienceAndCases, a.currentExperienceAndCases],
    [L.peopleLeadership, a.peopleLeadership],
    [L.communication, a.communicationAndPersonalImpression],
    [L.motivation, a.motivation],
    [L.whyRecommending, a.whyWeAreRecommending],
  ];
  if (blocks.some(([, v]) => v && v.trim())) {
    out.push(sectionTitle(L.analysis));
    for (const [label, text] of blocks) {
      if (!text?.trim()) continue;
      out.push(
        new Paragraph({
          spacing: { after: 120, line: 240 },
          children: [body(`${label}: `, { bold: true }), body(text.trim())],
        }),
      );
    }
  }

  return out;
}

// ---------- Entry ----------
export async function buildCVDocumentRecrutae(
  cv: CVData,
  language: CVLanguage,
): Promise<Uint8Array> {
  const doc = new Document({
    creator: "Recrutaê CV Formatter",
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY_SIZE } },
      },
    },
    numbering: {
      config: [
        {
          reference: "rec-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: {
              top: 2200, // extra room for the logo header
              bottom: MARGIN,
              left: MARGIN,
              right: MARGIN,
              header: 720,
              footer: 720,
            },
          },
        },
        headers: { default: buildHeader() },
        children: buildChildren(cv, language),
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

// Silence unused import warning if HeightRule isn't used in some configurations.
void HeightRule;
