# Corrigir erro "Promise.withResolvers is not a function"

## Causa
O `pdfjs-dist` (usado para extrair texto dos PDFs enviados) depende de `Promise.withResolvers`, uma API do ES2024 ausente em navegadores antigos (Safari < 17.4, Chrome < 119, etc.). O usuário que reportou está num browser que ainda não suporta isso, e o app quebra assim que ele envia o CV.

## Solução
Adicionar um **polyfill** leve de `Promise.withResolvers` no topo do `src/start.ts` (entry do client), antes que qualquer módulo seja carregado. Polyfill de ~5 linhas, sem dependência nova:

```ts
if (typeof (Promise as any).withResolvers !== "function") {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
```

## Arquivos alterados
- `src/start.ts` — adicionar o polyfill no topo do arquivo (preservando o restante: `errorMiddleware`, `attachSupabaseAuth`, etc.)

## Verificação
Após o build, navegadores antigos vão usar o polyfill e o fluxo de upload de PDF volta a funcionar normalmente. Browsers modernos ignoram (a função já existe).
