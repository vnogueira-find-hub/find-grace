## Objetivo

Cada candidato deve aparecer em **um único** bloco da consolidação: Prioridade, Com ressalvas ou Não recomendados.

Hoje o modelo repete nomes (Marcelo e Cleber aparecem em Prioridade e em Com ressalvas), o que confunde a leitura do cliente.

## Semântica final

- **Prioridade**: recomendado para avançar, sem restrição relevante.
- **Com ressalvas**: recomendado para avançar, mas existe um ponto a validar/negociar antes (relocação, disponibilidade, gap técnico).
- **Não recomendados**: não segue no processo, com motivo.

## Mudanças

**1. Prompt de consolidação (`src/lib/recruitment-prompts.ts`)**

Adicionar regras explícitas ao `shortlistSystemPrompt`:
- Os três baldes são mutuamente exclusivos; um nome nunca pode se repetir entre eles.
- Se o candidato tem qualquer ressalva material, ele vai para `caveats` e **não** para `priority`.
- A união dos três baldes deve conter exatamente todos os candidatos da `comparison_table`, sem faltas nem duplicatas.
- Alinhar o balde ao campo `recommendation` de cada linha da tabela comparativa.

**2. Rede de segurança na renderização (`src/components/ShortlistConsolidationTab.tsx`)**

Mesmo com o prompt ajustado, deduplicar antes de exibir:
- Remover de `priority` qualquer nome presente em `caveats` ou `not_recommended`.
- Remover de `caveats` qualquer nome presente em `not_recommended`.
- Comparação por nome normalizado (trim + minúsculas + sem acento).

Isso garante que resultados já salvos no banco também sejam exibidos corretamente, sem reprocessar.

## Detalhes técnicos

A normalização de nomes usa `String.normalize("NFD")` + remoção de diacríticos, mesma abordagem já usada em `safeFilename`. Nenhuma alteração de schema, banco ou tipos é necessária — apenas prompt e camada de apresentação.
