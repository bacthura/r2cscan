Firebase (Frontend) — Integração e uso
===================================

Este documento explica como integrar o Firebase no frontend (Vercel / Vite / Next).

1) Instale o SDK no seu projeto frontend:

```bash
npm install firebase
```

2) Variáveis de ambiente (Vercel): crie os segredos abaixo em Settings → Environment Variables (preferível):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (opcional)

3) Uso recomendado (React/Vite/Next): importe os helpers de `frontend/firebase/firebaseClient.js`.

Exemplo: obter o ID token e chamar a API do backend:

```js
import { getIdToken } from '../firebase/firebaseClient';

async function callProtectedApi() {
  const idToken = await getIdToken();
  const res = await fetch('/api/some-protected', {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  return res.json();
}
```

4) Fluxo recomendado de autenticação:
- Cliente usa Firebase Auth para login (email/senha, Google, etc.).
- Cliente envia ID token ao backend em `Authorization` header.
- Backend usa `backend/src/middleware/firebaseAuth.js` para verificar o token via Firebase Admin SDK e autorizar o usuário.
- Backend deve mapear/registro do usuário em Supabase (se necessário) e aplicar RLS.

5) Observações de segurança:
- O `apiKey` do Firebase é público por design — não é um segredo de servidor.
- Nunca coloque o JSON da service account no frontend.
- Coloque o `FIREBASE_SERVICE_ACCOUNT` apenas no Render (secret) para uso do Admin SDK.
