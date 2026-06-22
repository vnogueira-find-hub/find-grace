## Objetivo
Ajustar o prompt do gerador para que a seção **Análise de Entrevista** saia em tom factual e neutro, sem adjetivos qualificadores nem linguagem "vendedora".

## Arquivo
`src/lib/cv-claude.server.ts` — atualizar o `SYSTEM_PROMPT` (regras da Análise de Entrevista, linha ~23).

## Mudanças no prompt

Substituir a regra atual da Análise de Entrevista por instruções explícitas:

- Tom **factual, descritivo e neutro** — registro de fatos, não de elogios.
- **Proibido usar adjetivos qualificadores/avaliativos** (ex.: "excelente", "sólido", "robusto", "forte", "destacado", "extensa", "vasta", "comprovada", "expressiva", "diferenciado", "estratégico" como elogio, "notável", "relevante" como elogio, superlativos em geral).
- **Proibido linguagem promocional/comercial** ("é o candidato ideal", "agrega muito valor", "traz grande contribuição", "perfil de destaque no mercado").
- Descrever o que o candidato **fez, onde, quando e com que escopo** (números, escopo, anos, setores) — sem qualificar.
- Adjetivos só são permitidos quando **descritivos e neutros** (ex.: "internacional", "regulatório", "industrial", "público") — nunca avaliativos.
- Inclusive na seção `whyWeAreRecommending`: descrever **fit objetivo** (experiência X, atuou em Y, conhece Z) em vez de elogiar o candidato.
- Manter o limite de 4–5 linhas por bloco e o tom executivo já existente.

Nada mais é alterado (schema, demais regras, idiomas, formatação do DOCX permanecem iguais).
