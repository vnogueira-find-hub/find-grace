// Client-side text extraction from PDF / DOCX uploads.

import mammoth from "mammoth/mammoth.browser";

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    return extractDocxText(file);
  }
  if (name.endsWith(".pdf")) {
    return extractPdfText(file);
  }
  throw new Error("Formato não suportado. Envie um arquivo .pdf ou .docx.");
}

async function extractDocxText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value.trim();
}

async function extractPdfText(file: File): Promise<string> {
  // Lazy-load pdfjs only when a PDF is uploaded.
  const pdfjs = await import("pdfjs-dist");
  // Vite bundles the worker via ?url import.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    parts.push(pageText);
  }
  return parts.join("\n\n").trim();
}
