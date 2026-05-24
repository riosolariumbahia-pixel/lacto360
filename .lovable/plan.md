## Diagnóstico
O erro `Duplicate declaration "hot"` ocorre em dev mode porque o Vite injeta código HMR (hot module replacement) duas vezes no mesmo arquivo de rota.

Causa identificada no `vite.config.ts`:
- `TanStackRouterVite()` está listado explicitamente
- `tanstackStart()` já inclui internamente o plugin de router (`tanStackStartRouter`)

Isso faz com que ambos processem `src/routes/app.producao.tsx` e injetem `import.meta.hot` duplicado.

## Correção
Remover `TanStackRouterVite()` do array de plugins em `vite.config.ts`, mantendo apenas:
- `tanstackStart({ server: { entry: "src/server.ts" } })`
- `react()`
- `tsconfigPaths()`
- `nitro({ preset: "vercel" })`

## Validação
- Build continua passando
- Dev server não mais gera erro de declaração duplicada
- Todas as rotas continuam funcionando (o router ainda é gerenciado pelo `tanstackStart`)