// Server-only text extraction from PDF / DOCX / PPTX / TXT.
import { unzipSync, strFromU8 } from "fflate";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

export async function extractDocumentText(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<string> {
  const name = (filename || "").toLowerCase();
  const mt = (mimeType || "").toLowerCase();

  if (mt === PDF_MIME || name.endsWith(".pdf")) {
    return extractPdf(bytes);
  }
  if (mt === DOCX_MIME || name.endsWith(".docx")) {
    return extractDocx(bytes);
  }
  if (mt === PPTX_MIME || name.endsWith(".pptx") || name.endsWith(".ppt")) {
    return extractPptx(bytes);
  }
  if (mt.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    return new TextDecoder().decode(bytes);
  }
  throw new Error(
    `Formato não suportado (${mimeType || name}). Envie PDF, DOCX, PPTX ou TXT.`,
  );
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = (mod.default ?? mod) as (
    data: Buffer | Uint8Array,
  ) => Promise<{ text: string }>;
  const res = await pdfParse(Buffer.from(bytes));
  return (res.text || "").trim();
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = (await import("mammoth")).default ?? (await import("mammoth"));
  const res = await (mammoth as { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> })
    .extractRawText({ buffer: Buffer.from(bytes) });
  return (res.value || "").trim();
}

function extractPptx(bytes: Uint8Array): string {
  const files = unzipSync(bytes, {
    filter: (f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name),
  });
  const slideNames = Object.keys(files).sort((a, b) => {
    const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
    const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
    return na - nb;
  });
  const parts: string[] = [];
  for (const key of slideNames) {
    const xml = strFromU8(files[key]);
    // Extract text between <a:t>...</a:t> tags
    const texts: string[] = [];
    const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      texts.push(decodeXmlEntities(m[1]));
    }
    if (texts.length) {
      const slideNum = key.match(/slide(\d+)\.xml$/)?.[1] ?? "?";
      parts.push(`--- Slide ${slideNum} ---\n${texts.join("\n")}`);
    }
  }
  return parts.join("\n\n").trim();
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}
