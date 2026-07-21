## Problema

Ao anexar um PDF na aba "Candidate Evaluation" (ou em qualquer fluxo que use `DocumentAttach` → `extractDocumentFn`), o servidor lança **`DOMMatrix is not defined`**.

Causa: `src/lib/extract-document.server.ts` usa `pdf-parse`, que por baixo carrega o `pdfjs-dist` legacy. O `pdfjs-dist` depende de APIs de DOM (`DOMMatrix`, `Path2D`, etc.) que **não existem no runtime Cloudflare Worker** onde as server functions rodam. Em dev pode passar por acaso; em preview/produção quebra.

Curiosamente o CV Formatter não sofre disso porque a extração de PDF dele acontece **no browser** (via `src/lib/extract-text.ts`), onde DOMMatrix existe nativamente.

## Correção

Trocar `pdf-parse` por **`unpdf`** — biblioteca pure-JS mantida para ambientes serverless/edge (Cloudflare Workers, Deno, etc.), sem dependências de DOM. É o substituto padrão recomendado para `pdf-parse` em Workers.

### Mudanças

1. `bun add unpdf` (remover `pdf-parse` e `@types/pdf-parse` se estiverem no package.json).
2. `src/lib/extract-document.server.ts` — reescrever `extractPdf`:
   ```ts
   async function extractPdf(bytes: Uint8Array): Promise<string> {
     const { extractText, getDocumentProxy } = await import("unpdf");
     const pdf = await getDocumentProxy(bytes);
     const { text } = await extractText(pdf, { mergePages: true });
     return (text || "").trim();
   }
   ```
3. Nenhuma mudança de UI, prompt, esquema de dados ou fluxo. Docx/pptx/txt continuam iguais.

### Verificação

- Anexar PDF real no modal de novo projeto e no fluxo de avaliação de candidato — confirmar que o texto extraído chega ao Claude sem erro.
- Testar também DOCX/PPTX pra garantir que não regrediram.
