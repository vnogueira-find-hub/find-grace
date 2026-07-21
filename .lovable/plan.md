## Contexto

Hoje, quando você salva uma avaliação, ela vai pro banco (`candidate_evaluations`) mas **não aparece em lugar nenhum na interface**. Só dá pra "reencontrar" indo pra aba **Consolidação de Shortlist**, que lê as avaliações salvas mas mostra só de forma agregada. A função `listEvaluationsFn` já existe no backend — só falta expor.

## O que fazer

Adicionar, na aba **Avaliação de Candidato**, uma seção **"Avaliações salvas neste projeto"** que aparece assim que um projeto é selecionado.

### Comportamento

- Lista carrega automaticamente ao escolher o projeto e recarrega após cada "Salvar no projeto".
- Cada linha mostra: nome do candidato, data, nota geral (badge colorido) e recomendação (prioridade / ressalvas / não avançar).
- Clicar numa linha **abre a avaliação completa** no mesmo painel de resultado que já existe hoje (reutiliza o bloco `result`), sem precisar rodar de novo.
- Botão "Excluir" por linha (com confirmação) usando `deleteEvaluationFn` que já existe.
- Estado vazio: "Nenhuma avaliação salva ainda neste projeto."

### Arquivos afetados

- `src/components/CandidateEvaluationTab.tsx` — nova seção de lista + handler de clique que popula `result` e `candidateName` a partir do `raw_response` da linha; refetch de `listEvaluationsFn` após salvar/excluir.

Nenhuma mudança de backend nem de schema — as funções `listEvaluationsFn` e `deleteEvaluationFn` já estão prontas em `src/lib/recruitment.functions.ts`.
