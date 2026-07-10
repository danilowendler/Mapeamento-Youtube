# Segredos e Variáveis de Ambiente

## Detecção

```bash
# Segredos hardcoded no código
grep -rnE "(sk-[a-zA-Z0-9]{20,}|pk_live_|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|eyJ[a-zA-Z0-9_-]{20,})" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Padrões genéricos
grep -rniE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{8,}" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "process.env"

# Segredos no histórico do git (se gitleaks disponível)
npx gitleaks detect --source . -v 2>/dev/null || git log -p --all | grep -iE "api[_-]?key|secret[^s]|password" | head -50

# .env está versionado?
git ls-files | grep -E "^\.env($|\.)" 
```

## Regras do NEXT_PUBLIC_

- Qualquer variável com prefixo `NEXT_PUBLIC_` é **inlinada no bundle JavaScript do cliente** em build time. Qualquer pessoa vê com "view source".
- Uso legítimo: URLs públicas, chaves publicáveis (Stripe publishable key, Supabase anon key **com RLS ativo**), IDs de analytics.
- NUNCA: chaves secretas de API, connection strings, JWT secrets, service role keys.

Detecção:
```bash
grep -rn "NEXT_PUBLIC_" .env* 2>/dev/null
# Revisar manualmente cada uma: essa informação pode ser pública?
```

## Correções

### 1. Segredo commitado no git
O segredo está comprometido para sempre (forks, clones, caches). Ordem de ação:
1. **Rotacionar a chave no provedor imediatamente** (gerar nova, revogar antiga).
2. Só depois limpar o histórico se necessário: `git filter-repo --invert-paths --path .env` (ou BFG Repo-Cleaner).
3. Adicionar ao `.gitignore` e criar `.env.example`.

### 2. Chave secreta usada no cliente
Mover a chamada para o servidor:

```ts
// ERRADO — Client Component
const res = await fetch("https://api.externa.com/dados", {
  headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}` }
});

// CERTO — app/api/dados/route.ts (Route Handler)
import "server-only";
export async function GET() {
  const res = await fetch("https://api.externa.com/dados", {
    headers: { Authorization: `Bearer ${process.env.API_KEY}` } // sem NEXT_PUBLIC
  });
  return Response.json(await res.json());
}
```

### 3. Garantir que módulos de servidor nunca vazem pro cliente

```bash
npm i server-only
```
```ts
// lib/db.ts — primeira linha
import "server-only";
```
Se alguém importar esse módulo num Client Component, o build falha. Aplicar em todo arquivo que toca segredos ou banco.

### 4. .gitignore mínimo
```
.env
.env.local
.env.*.local
.env.production
```
E manter um `.env.example` com as chaves vazias documentadas.

## Checklist de saída da fase
- [ ] Nenhum segredo no código, no bundle ou no histórico do git
- [ ] Chaves comprometidas rotacionadas
- [ ] `server-only` em módulos sensíveis
- [ ] `.env.example` atualizado
