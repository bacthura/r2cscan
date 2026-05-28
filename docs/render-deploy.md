# Deploy no Render — Guia Rápido

Este documento descreve passos para garantir que o backend Node (`/backend`) seja implantado corretamente no Render, evitando que o serviço seja detectado como Python.

1. Opção recomendada: criar serviço a partir do `render.yaml` (Blueprint)
   - No painel do Render escolha **New → Web Service → From GitHub repository** e selecione **Deploy from Blueprint** se disponível.
   - Confirme o blueprint `render.yaml` presente na raiz do repositório.

2. Criar/ajustar serviço manualmente (se não usar Blueprint)
   - **Environment / Runtime:** Node
   - **Root Directory:** `backend`  ← *muito importante*
   - **Build Command:** `npm ci`  (ou `npm install`)
   - **Start Command:** `npm start`  (ou `node src/server.js`)
   - **Health Check Path:** `/api/health`
   - **Environment Variables:** configure as em `.env.example` / `render.yaml` (SUPABASE_*, JWT_SECRET, PORT=3001, CORS_ORIGIN, etc.)

3. Se o Render tentou usar Python (logs com `poetry` / `pip`):
   - Isso significa que o serviço foi criado como Python ou o root não apontou para `backend`.
   - Solução: edite as configurações do serviço no painel Render e ajuste `Root Directory` para `backend` e `Runtime` para Node.
   - Se necessário, delete o serviço e recrie a partir do Blueprint `render.yaml` para forçar as configurações.

4. Forçar redeploy
   - Depois de ajustar as configurações no painel, clique em **Manual Deploy** → **Deploy latest commit**.

5. Teste pós-deploy
   - Logs: verifique se o build usa `npm` e não `pip`.
   - Health check: `curl -sS https://<seu-servico>.onrender.com/api/health` deve retornar `{ "status": "ok" }`.

6. Observações
   - O `render.yaml` na raiz do repositório (este arquivo) define um serviço com `root: backend` e comandos de build/start. Se você alterar estrutura de pastas, atualize esse arquivo.
   - Se preferir, eu posso tentar commitar e dar push dessas alterações para o repositório remoto — autorize se quiser que eu faça esse passo.

---
Arquivo gerado automaticamente para ajudar no deploy no Render.
