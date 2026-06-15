## Objetivo

Permitir que o usuário escolha entre dois formatos de saída antes de gerar o CV:
- **CV Padrão FIND** (atual, já existe)
- **CV Padrão Recrutaê** (novo, baseado no template enviado)

## Análise do template Recrutaê

O documento usa a mesma estrutura semântica do CV FIND (mesmas seções: dados de contato, formação, qualificações, experiência, idiomas, pacote de remuneração, pretensão salarial, análise de entrevista). Ou seja: **mesmo `CVData`, layout visual diferente**.

Diferenças visuais principais:
- Cabeçalho: logo "recrutaê" à esquerda + endereço/contato Recrutaê à direita (em vez do letterhead FIND).
- Sem triângulo decorativo no rodapé (formato FIND).
- Nome do candidato dentro de uma tabela de 1 coluna com contatos abaixo (em vez do bloco estilizado FIND).
- Títulos de seção sublinhados (estilo simples, sem barra/cor FIND).
- Bullets `•` simples para todas as listas.
- Tabela de remuneração mais simples (sem cores FIND).
- Marca d'água "ê" no canto inferior direito.
- Tipografia padrão (sem identidade FIND).

## Passos de implementação

**1. Adicionar tipo de template em `src/lib/cv-types.ts`**
```ts
export type CVTemplate = "find" | "recrutae";
```

**2. Subir logo Recrutaê como asset**
Extrair o logo do template (`img_p1_1.jpg` da imagem parseada) e subir via `lovable-assets`, gerando `src/assets/recrutae-logo.png.asset.json`.

**3. Criar `src/lib/cv-docx-recrutae.server.ts`**
Novo builder DOCX espelhando a estrutura de `cv-docx.server.ts` mas seguindo o layout Recrutaê:
- Header com logo Recrutaê + endereço (Rua Castilho, 392 | Conj 91 | Brooklin Paulista | 04568 010 | (11) 4081 1944 | www.recrutae.com.br).
- Tabela de identificação (Nome / Telefone / E-mail / LinkedIn).
- Seções com títulos sublinhados em negrito.
- Mantém todas as regras já estabelecidas (espaçamento 1.0, anos finais na educação, "Qualificações" só resumo do "sobre", enter entre empresa/cargo/responsabilidades, tabela de remuneração com todas as linhas mesmo vazias, espaço para pretensão salarial, resumo conciso).
- Sem o triângulo decorativo (não faz parte do padrão Recrutaê).

**4. Atualizar `src/lib/cv-formatter.functions.ts`**
- Adicionar `template: z.enum(["find", "recrutae"]).default("find")` no schema.
- Rotear para `buildCVDocument` (FIND) ou `buildCVDocumentRecrutae` conforme o template.
- Ajustar `safeFilename` para prefixo `RECRUTAE_CV_-_` quando aplicável.

**5. Atualizar UI em `src/routes/index.tsx`**
- Adicionar estado `template` e seletor (toggle de 2 botões) acima do seletor de idioma, com label "Modelo do CV".
- Opções: "CV Padrão FIND" / "CV Padrão Recrutaê".
- Passar `template` no payload do `formatCVFn`.

## Pontos a confirmar

1. **Idiomas**: o template Recrutaê está só em PT. Devo manter os 3 idiomas (PT/EN/ES) traduzindo os títulos das seções, ou travar Recrutaê apenas em PT?
2. **Logo Recrutaê**: posso usar o logo extraído do próprio .docx que você enviou, ou você tem um PNG/SVG de melhor qualidade pra me mandar?
3. **Análise de Entrevista**: no template Recrutaê tem um campo a mais — **"Por que Estamos Indicando"**. Devo adicionar esse campo no `CVData` (também aparecerá no FIND) ou tratá-lo só no template Recrutaê?