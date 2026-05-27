import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractCVData } from "./cv-claude.server";
import { buildCVDocument } from "./cv-docx.server";

const InputSchema = z.object({
  cvText: z.string().min(20, "CV content is too short").max(120_000),
  notes: z.string().max(40_000).default(""),
  language: z.enum(["pt", "en", "es"]),
});

function toBase64(bytes: Uint8Array): string {
  // Node Buffer is available in the Worker runtime via nodejs_compat.
  return Buffer.from(bytes).toString("base64");
}

function safeFilename(name: string, language: "pt" | "en" | "es"): string {
  const cleaned = (name || "Candidate")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const prefix = language === "en" ? "FIND_CV" : "FIND_CV";
  return `${prefix}_-_${cleaned || "Candidate"}.docx`;
}

export const formatCV = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const cvData = await extractCVData(data.cvText, data.notes, data.language);
      const bytes = await buildCVDocument(cvData, data.language);
      return {
        ok: true as const,
        filename: safeFilename(cvData.name, data.language),
        base64: toBase64(bytes),
      };
    } catch (err) {
      console.error("formatCV failed:", err);
      const message =
        err instanceof Error ? err.message : "Unknown error formatting CV";
      return { ok: false as const, error: message };
    }
  });
