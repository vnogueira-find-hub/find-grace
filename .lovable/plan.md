## Problema

Hoje gero o `.docx` do zero com a lib `docx`, recriando manualmente headers/letterhead/fontes. Isso nunca vai bater pixel-a-pixel com o template da FIND — daí os bugs de fonte e o letterhead colidindo com o conteúdo nas páginas seguintes.

## Solução

Mesma abordagem da sua skill do Claude: usar o **`.docx` oficial da FIND como template binário** e só reescrever o corpo do documento (`word/document.xml`), preservando intactos:
- `word/header*.xml` (logo + timbrado + endereço)
- `word/footer*.xml`
- `word/styles.xml` (fontes Calibri/Aptos, cores, tamanhos)
- `word/numbering.xml` (bullets azuis)
- `word/media/*` (watermark, logo)
- `word/theme/*`
- `sectPr` (margens, refs de header/footer, page size)

Assim o output sai idêntico ao template, com a fonte certa, margens certas, header não-colidindo, watermark no lugar.

## Passos de implementação

### 1. Subir o template oficial
Vou pedir pra você fazer upload de **um `.docx` final da FIND já formatado e limpo** (ex: o `FIND_CV_-_André_Henrique.docx` que a skill referencia). Coloco em `src/assets/find-template.docx` e importo como binário no servidor.

### 2. Trocar a engine de geração
- Remover lógica atual de `src/lib/cv-docx.server.ts` que monta com `Document`/`Paragraph`/`Table`.
- Adicionar `jszip` (já vem com docx mas vou usar direto pra controle total).
- Nova engine:
  1. Carrega o `.docx` template como `ArrayBuffer` (importado via `?arraybuffer`).
  2. Abre com JSZip.
  3. Lê `word/document.xml`, isola o `<w:sectPr>` final (preserva refs de header/footer/margens).
  4. Gera um novo `<w:body>` em XML cru: parágrafos com `w:pStyle` referenciando os estilos que **já existem** no `styles.xml` do template (ex: `Heading2` pra títulos de seção FIND).
  5. Reanexa o `sectPr` original ao final.
  6. Substitui só `word/document.xml` no zip, mantém todo o resto.
  7. Empacota e devolve base64.

### 3. Geração do body XML
Função pura `buildDocumentXml(cvData, language)` que monta:
- Bloco nome + Phone/Email/LinkedIn (centralizado, bold).
- Sessões: `EDUCATION`, `QUALIFICATIONS AND CERTIFICATIONS`, `LANGUAGES`, `PROFESSIONAL EXPERIENCE`, `COMPENSATION PACKAGE`, `INTERVIEW ANALYSIS` — com nomes traduzidos PT/EN/ES (já tenho em `cv-labels.ts`).
- Para cada experiência: empresa+período em bold underline → cada cargo com período → "Principais responsabilidades:" → bullets terminando com `;` exceto o último com `.`.
- Análise: 6 parágrafos com label em bold + texto corrido.

Tudo via XML cru (template literals) referenciando estilos do template — não recrio definição de fonte/cor.

### 4. Limpar
- Apagar imports de logo/letterhead PNG que eu tinha extraído (`src/assets/find-logo.png`, `find-letterhead.png`) — agora vêm do template.
- Manter `cv-claude.server.ts` (Gemini via Lovable AI) e `cv-formatter.functions.ts` como estão.

## Detalhes técnicos

- Import do template: `import templateUrl from "@/assets/find-template.docx?url"` + `fetch` no server, OU `?arraybuffer` se Vite/Cloudflare suportar (testo qual funciona no worker).
- JSZip funciona no runtime Cloudflare Workers (puro JS, sem Node-native).
- XML escaping: helper `esc(str)` pra `&` `<` `>` `"`.
- Mantém estrutura `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` e namespaces `w:`, `r:` etc. exatos do template.

## O que preciso de você

**Faça upload do `.docx` modelo oficial da FIND** (preferência: um CV final já formatado, como o `FIND_CV_-_André_Henrique.docx`). Sem isso não consigo executar o plano — gerar o zero de novo me leva pro mesmo problema.