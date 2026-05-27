import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
} from "docx";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CVData, CVLanguage } from "./cv-types";
import { LABELS } from "./cv-labels";

// FIND brand colors (from reference template)
const NAVY = "0B1F3A"; // logo dark
const BLUE = "5A8FBF"; // logo accent / section headings
const BLACK = "000000";
const GREY = "555555";

const FONT = "Calibri";

let cachedLogo: Uint8Array | null = null;
let cachedLetterhead: Uint8Array | null = null;

async function loadAsset(filename: string): Promise<Uint8Array> {
  // Assets are bundled at build time; in dev/server they live in src/assets.
  const candidates = [
    path.resolve(process.cwd(), "src/assets", filename),
    path.resolve(process.cwd(), "../src/assets", filename),
  ];
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      return new Uint8Array(buf);
    } catch {
      // try next
    }
  }
  throw new Error(`Asset not found: ${filename}`);
}

async function loadLogo(): Promise<Uint8Array> {
  if (!cachedLogo) cachedLogo = await loadAsset("find-logo.png");
  return cachedLogo;
}
async function loadLetterhead(): Promise<Uint8Array> {
  if (!cachedLetterhead) cachedLetterhead = await loadAsset("find-letterhead.png");
  return cachedLetterhead;
}

function txt(text: string, opts: { bold?: boolean; color?: string; size?: number; underline?: boolean } = {}) {
  return new TextRun({
    text,
    font: FONT,
    bold: opts.bold,
    color: opts.color ?? BLACK,
    size: opts.size ?? 22, // 11pt
    underline: opts.underline ? {} : undefined,
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 140 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: FONT,
        bold: true,
        color: NAVY,
        size: 26, // 13pt
      }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "find-bullets", level: 0 },
    spacing: { after: 60 },
    children: [txt(text)],
  });
}

function labelValueRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 5400, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [txt(label + ":", { bold: true })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 3960, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [txt(value || "—")],
          }),
        ],
      }),
    ],
  });
}

function analysisBlock(label: string, body: string): Paragraph[] {
  if (!body.trim()) return [];
  return [
    new Paragraph({
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({ text: `${label}: `, font: FONT, bold: true, color: NAVY, size: 22 }),
        new TextRun({ text: body.trim(), font: FONT, size: 22 }),
      ],
      alignment: AlignmentType.JUSTIFIED,
    }),
  ];
}

export async function buildCVDocument(data: CVData, language: CVLanguage): Promise<Uint8Array> {
  const L = LABELS[language];
  const logo = await loadLogo();
  const letterhead = await loadLetterhead();

  // Full-page background letterhead (header + watermark in one image).
  // Page size US Letter: 12240 x 15840 DXA = 8.5" x 11" = 816 x 1056 pt = 2550 x 3300 px at 96dpi.
  // We use docx points: 612 x 792 (pt). ImageRun transformation is in pixels at 96dpi.
  const backgroundImage = new ImageRun({
    type: "png",
    data: letterhead,
    transformation: { width: 612, height: 792 },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.PAGE,
        align: HorizontalPositionAlign.LEFT,
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PAGE,
        align: VerticalPositionAlign.TOP,
      },
      behindDocument: true,
    },
  });

  const header = new Header({
    children: [
      new Paragraph({
        children: [backgroundImage],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "", font: FONT, size: 16, color: GREY }),
        ],
      }),
    ],
  });

  const children: Paragraph[] = [];

  // Spacer so content starts below the letterhead header (~1.4 inches).
  children.push(
    new Paragraph({ spacing: { before: 1800 }, children: [txt("")] }),
  );

  // Candidate name — centered, large, navy
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: data.name || "—",
          font: FONT,
          bold: true,
          color: NAVY,
          size: 36, // 18pt
        }),
      ],
    }),
  );

  // Contact lines
  const contactLine = (label: string, value: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: `${label}: `, font: FONT, bold: true, size: 22 }),
        new TextRun({ text: value || "—", font: FONT, size: 22 }),
      ],
    });
  children.push(contactLine(L.phone, data.phone));
  children.push(contactLine(L.email, data.email));
  children.push(contactLine(L.linkedin, data.linkedin));

  // Education
  children.push(sectionHeading(L.education));
  for (const item of data.education || []) {
    children.push(bullet(item));
  }

  // Qualifications
  children.push(sectionHeading(L.qualifications));
  for (const item of data.qualifications || []) {
    children.push(bullet(item));
  }

  // Experience
  children.push(sectionHeading(L.experience));
  for (const job of data.experience || []) {
    // Company header
    children.push(
      new Paragraph({
        spacing: { before: 220, after: 80 },
        children: [
          new TextRun({
            text: `${job.company}${job.period ? ` (${job.period})` : ""}`,
            font: FONT,
            bold: true,
            color: NAVY,
            size: 24, // 12pt
            underline: {},
          }),
        ],
      }),
    );
    for (const role of job.roles || []) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({ text: `${L.role}: `, font: FONT, bold: true, size: 22 }),
            new TextRun({
              text: `${role.title}${role.period ? ` (${role.period})` : ""}`,
              font: FONT,
              size: 22,
              bold: true,
            }),
          ],
        }),
      );
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({ text: `${L.responsibilities}:`, font: FONT, bold: true, size: 22 }),
          ],
        }),
      );
      for (const r of role.responsibilities || []) {
        children.push(bullet(r));
      }
    }
  }

  // Languages
  children.push(sectionHeading(L.languages));
  for (const item of data.languages || []) {
    children.push(bullet(item));
  }

  // Compensation table
  children.push(sectionHeading(L.compensation));
  const c = data.compensationPackage;
  const compTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [5400, 3960],
    rows: [
      labelValueRow(L.monthlySalary, c.monthlySalary),
      labelValueRow(L.annualBonus, c.annualBonus),
      labelValueRow(L.privatePension, c.privatePension),
      labelValueRow(L.stockOptions, c.stockOptions),
      labelValueRow(L.healthInsurance, c.healthInsurance),
      labelValueRow(L.dentalInsurance, c.dentalInsurance),
      labelValueRow(L.mealVoucher, c.mealVoucher),
      labelValueRow(L.foodVoucher, c.foodVoucher),
      labelValueRow(L.transportVoucher, c.transportVoucher),
      labelValueRow(L.other, c.other),
    ],
  });

  // Salary expectation
  const salaryExpectation = new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text: `${L.salaryExpectation}: `, font: FONT, bold: true, color: NAVY, size: 24 }),
      new TextRun({ text: data.salaryExpectation || "—", font: FONT, size: 22 }),
    ],
  });

  // Analysis
  const analysisChildren: Paragraph[] = [];
  analysisChildren.push(sectionHeading(L.analysis));
  const a = data.interviewAnalysis;
  analysisChildren.push(...analysisBlock(L.careerHistory, a.careerHistory));
  analysisChildren.push(
    ...analysisBlock(L.currentExperienceAndCases, a.currentExperienceAndCases),
  );
  analysisChildren.push(...analysisBlock(L.peopleLeadership, a.peopleLeadership));
  analysisChildren.push(
    ...analysisBlock(L.communication, a.communicationAndPersonalImpression),
  );
  analysisChildren.push(...analysisBlock(L.motivation, a.motivation));
  analysisChildren.push(...analysisBlock(L.whyRecommending, a.whyWeAreRecommending));

  // Suppress unused var warning for logo (kept for potential future inline usage).
  void logo;

  const doc = new Document({
    creator: "FIND HR Consulting",
    title: `FIND CV - ${data.name}`,
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
    },
    numbering: {
      config: [
        {
          reference: "find-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
                run: { font: FONT, color: BLUE },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240,
              height: 15840,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: 720, right: 1080, bottom: 720, left: 1080 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: [
          ...children,
          compTable,
          salaryExpectation,
          ...analysisChildren,
        ],
      },
    ],
  });

  // Suppress unused import warning for ShadingType (kept for future use).
  void ShadingType;
  void HeadingLevel;

  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
