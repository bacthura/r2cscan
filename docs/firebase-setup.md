Firebase Authentication (setup guide)
===================================

1) Crie um projeto no Firebase Console -> Settings -> Service accounts -> Generate new private key.

2) Pegue o JSON gerado e **NUNCA** o commit no repositório.

3) No Render (Backend service) adicione o secret `FIREBASE_SERVICE_ACCOUNT`:
   - Opcional 1: cole o JSON inteiro (não recomendado para UI que corta texto)
   - Recomendado: encode em base64 e cole o valor (ex.: `cat key.json | base64`)

4) No backend, `env.js` lê `FIREBASE_SERVICE_ACCOUNT` e a inicialização do Firebase Admin aceita JSON cru ou base64.

5) Use o middleware `backend/src/middleware/firebaseAuth.js` para proteger rotas que exigem autenticação Firebase.

Exemplo (Express):

```js
import { verifyFirebaseToken } from './middleware/firebaseAuth.js';
app.use('/api/protected', verifyFirebaseToken, protectedRouter);
```

Notas de segurança
- Não exponha a chave de serviço no frontend.
- Use RLS no Supabase para controlar acesso a dados sensíveis; o backend deve usar a `SUPABASE_SERVICE_ROLE_KEY` somente em operações seguras.
