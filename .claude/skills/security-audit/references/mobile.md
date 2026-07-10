# Mobile — React Native / Expo (e princípios para nativo)

Premissa central: **o app instalado está em território hostil**. Qualquer coisa dentro do binário (chaves, lógica, endpoints) pode ser extraída por descompilação. Segurança de verdade fica no backend.

## Armazenamento de tokens e dados sensíveis

```ts
// ERRADO — AsyncStorage é texto puro, legível em device comprometido/backup
import AsyncStorage from "@react-native-async-storage/async-storage";
await AsyncStorage.setItem("token", jwt);

// CERTO — SecureStore (Keychain no iOS, Keystore no Android)
import * as SecureStore from "expo-secure-store";
await SecureStore.setItemAsync("token", jwt);
const token = await SecureStore.getItemAsync("token");
```

Detecção:
```bash
grep -rn "AsyncStorage" --include="*.ts" --include="*.tsx" src/ app/ 2>/dev/null | grep -iE "token|senha|password|secret|session"
```

- Dados sensíveis grandes (cache de exames, documentos): criptografar antes de gravar em arquivo (expo-crypto / MMKV com encryption key no SecureStore).
- Ao fazer logout: limpar SecureStore E caches.

## Chaves e segredos no app

- **Nenhuma chave secreta no bundle.** `EXPO_PUBLIC_*` e qualquer constante no código são públicos (basta descompactar o APK/IPA).
- Chaves de terceiros (OpenAI, Stripe secret, service role) ficam no backend; o app chama SEU backend autenticado, que chama o terceiro.
- Chaves "publicáveis" ok no app: Stripe publishable key, Supabase anon key (com RLS), chaves de analytics.
- API do seu backend: não confie em "só meu app conhece a URL" — trate a API como pública e proteja com auth por usuário + rate limit. App attestation (Play Integrity / App Attest) é camada extra para casos sensíveis.

## Rede

- Só HTTPS; nunca desabilitar validação de certificado "para testar" e esquecer em prod (buscar `NSAllowsArbitraryLoads`, `usesCleartextTraffic`).
- Certificate pinning para apps com dados muito sensíveis (saúde, financeiro) — com plano de rotação do pin (senão o app quebra quando o certificado mudar).
- Tokens em header `Authorization`, nunca em query string (vaza em logs de proxy).

## Deep links e navegação

```ts
// Deep link para tela privada deve revalidar sessão
// ERRADO: meuapp://pedido/123 abre a tela direto
// CERTO: interceptar, checar sessão; sem sessão → login → redirect
```

- Validar parâmetros do deep link como input externo (schema).
- Universal Links/App Links verificados (associação de domínio) em vez de scheme puro quando possível — scheme customizado pode ser registrado por app malicioso.

## Logs e telas

- `console.log` vai para logcat (Android) / Console (iOS) — acessível em device plugado. Remover logs com token/dados pessoais em produção (babel-plugin-transform-remove-console).
- Apps com dados sensíveis na tela (resultados de exame): ocultar conteúdo no app switcher (`expo-screen-capture` / flag FLAG_SECURE no Android) quando o requisito justificar.
- Inputs de senha com `secureTextEntry` e `autoComplete` adequado; desabilitar autocorreção/clipboard em campos ultra-sensíveis.

## Atualizações e build

- Expo Updates (OTA): garante integridade por assinatura, mas o canal de update é superfície — proteger a conta Expo/EAS com MFA.
- `eas.json` / secrets de build no EAS Secrets, não no repositório.
- Verificar permissões pedidas no app.json: pedir só o necessário (câmera, localização) — excesso reprova em review e amplia superfície.

## Checklist de saída

- [ ] Tokens só em SecureStore/Keychain/Keystore
- [ ] Zero segredo no bundle (auditar `EXPO_PUBLIC_*` e constantes)
- [ ] Backend trata o app como cliente não confiável (auth + validação server-side de tudo)
- [ ] Deep links revalidam sessão e validam parâmetros
- [ ] Logs de produção sem dados sensíveis
- [ ] HTTPS estrito, sem exceções de certificado em prod
