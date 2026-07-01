# Anexar PDF/PPT "Cronograma e Validação" no briefing

Hoje o modal "Novo Projeto de Recrutamento" só aceita transcrição em texto ou áudio. Vou adicionar um campo opcional para anexar um documento (PDF, PPT/PPTX, DOC/DOCX) com informações da área, cujo conteúdo será extraído no servidor e enviado à IA junto com a transcrição.

## Mudanças

**1. Nova server function `extractDocumentFn`** (`src/lib/recruitment.functions.ts`)
- Recebe arquivo em base64 + mimeType.
- No servidor, extrai texto:
  - PDF → `pdf-parse` (ou `pdfjs-dist` legacy build) 
  - DOCX → `mammoth`
  - PPTX → unzip + parse XML de slides (pptx é zip com XML)
- Retorna `{ ok, text }`. Limite ~10MB.

**2. Novo componente `DocumentAttach.tsx`**
- Botão "Anexar PDF/PPT/DOCX", input file oculto.
- Ao selecionar: converte para base64 (reusa `fileToBase64`), chama `extractDocumentFn`, mostra estado (nome do arquivo, "Extraindo…", "✓ X caracteres extraídos", botão remover).
- Devolve o texto extraído ao pai.

**3. `NewProjectModal.tsx`**
- Novo state `attachedDocText` + `attachedDocName`.
- Renderiza `<DocumentAttach>` abaixo da transcrição, com rótulo "Cronograma e Validação (opcional)".
- Ao submeter: envia `transcript` + `attachmentText` para `processBriefingFn`. A validação de "transcrição mínima" passa se **transcrição OU anexo** tiverem conteúdo suficiente.

**4. `processBriefingFn` + prompt**
- Schema aceita `attachmentText?: string` e `attachmentName?: string`.
- `briefingUserMessage` inclui uma seção adicional:
  ```
  DOCUMENTO ANEXO — {nome}:
  {texto extraído}
  ```
- Instrução ao Claude: tratar o documento como fonte primária de fatos estruturais (missões, dimensões, cronograma) e a transcrição como complemento com nuances da conversa.

**5. Dependências**
- `bun add mammoth pdf-parse` (PPTX é feito com `fflate` — já pode estar disponível; se não, `bun add fflate`).

## Escopo

- Só o modal de briefing recebe o anexo (não a aba de avaliação de candidato — pode ser um próximo passo).
- Extração roda no servidor; nada de parser no cliente.
- Sem persistir o PDF/PPT no Supabase — apenas o texto extraído entra no `briefing_transcript` concatenado (ou em coluna nova? ver abaixo).

## Pergunta antes de implementar

**Você quer que o texto extraído do documento seja salvo no projeto** (para consultar depois), ou basta usar durante a geração do briefing e descartar? Se quiser salvar, adiciono uma coluna `attachment_text` em `projects`.
