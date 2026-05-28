# R2C-Scan — Sistema de Convites

Sistema completo de criação de contas com código único de convite/admin.

## Stack

- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **Banco:** Supabase (PostgreSQL)
- **Autenticação:** Firebase Auth + JWT customizado
- **Deploy Frontend:** Vercel
- **Deploy Backend:** Render

## Estrutura do Projeto

```
invite-codes/
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   ├── LoadingSpinner.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/           # Contextos React
│   │   └── AuthContext.jsx
│   ├── lib/               # Utilitários e serviços
│   │   ├── api.js         # Cliente HTTP (auth + admin)
│   │   └── firebase.js    # Inicialização Firebase Client
│   ├── pages/             # Páginas da aplicação
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── AdminPanel.jsx
│   ├── App.jsx            # Rotas e configuração
│   ├── main.jsx           # Entry point
│   └── index.css          # Estilos globais Tailwind
├── .env.example           # Variáveis de ambiente (frontend)
├── index.html
├── package.json
├── vite.config.js
└── README.md

backend/
├── src/
│   ├── auth/
│   │   └── firebaseAdmin.js     # Firebase Admin SDK
│   ├── config/
│   │   ├── env.js               # Variáveis de ambiente
│   │   └── supabase.js          # Cliente Supabase
│   ├── controllers/
│   │   ├── inviteCodeController.js  # Handlers HTTP
│   ├── middleware/
│   │   ├── auth.js              # JWT + Admin middleware
│   │   ├── errorHandler.js      # Tratamento de erros
│   │   └── security.js          # Helmet + Rate Limiting
│   ├── routes/
│   │   ├── inviteCodes.js       # Rotas do sistema
│   ├── schemas/
│   │   ├── inviteCode.js        # Validação Zod
│   ├── services/
│   │   ├── inviteCodeService.js  # Lógica de negócio
│   └── utils/
│       └── logger.js            # Logs estruturados
├── .env.example
├── package.json
└── server.js
```

## Funcionamento

### 1. Admin
- Autenticado via Firebase Auth + JWT
- Pode **gerar** códigos únicos de 6 dígitos
- Visualiza: códigos ativos, usados, data de criação, quem utilizou
- Pode **invalidar** códigos manualmente

### 2. Código de Convite
- 6 dígitos numéricos aleatórios
- Único (colisão extremamente rara com retry automático)
- Expiração opcional (configurável em horas)
- Utilizado apenas **UMA vez** (transação atômica)

### 3. Regras de Segurança
- ✅ Impede reutilização do código
- ✅ Impede criação de conta sem código válido
- ✅ Valida se o código já foi usado
- ✅ Valida se o código existe
- ✅ Valida se expirou
- ✅ Transação atômica (race condition prevention)
- ✅ Verificação 100% server-side
- ✅ Rate limiting em endpoints de auth
- ✅ Validação com Zod
- ✅ Logs de segurança

### Fluxo de Cadastro
1. Usuário acessa `/register`
2. Digita: nome, email, senha, código de convite
3. Backend verifica: existe? usado? expirado?
4. Se válido: cria no Firebase Auth → salva perfil no Supabase → marca código como usado
5. Retorna JWT para login automático

## Rotas da API

### Auth (Público)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro com código |
| POST | `/api/auth/login` | Login email/senha |
| POST | `/api/auth/firebase` | Trocar Firebase ID token por JWT |

### Admin (Protegido)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/admin/generate-code` | Gerar código |
| GET | `/api/admin/codes` | Listar códigos |
| GET | `/api/admin/codes/:id` | Detalhes do código |
| PATCH | `/api/admin/codes/:id/invalidate` | Invalidar código |

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Conta [Supabase](https://supabase.com)
- Projeto [Firebase](https://console.firebase.google.com)
- Conta [Render](https://render.com) (opcional, para deploy)
- Conta [Vercel](https://vercel.com) (opcional, para deploy)

### 1. Configurar Supabase

1. Crie um projeto no [Supabase](https://app.supabase.com)
2. Vá em **SQL Editor** e execute o conteúdo de `docs/supabase-schema.sql`
3. Anote a URL e as chaves (Project Settings → API)

### 2. Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative **Authentication** → Sign-in method → Email/Password
3. Vá em **Project Settings** → **Service accounts** → Gerar chave privada
4. Salve o JSON como variável `FIREBASE_SERVICE_ACCOUNT`
5. Em **Project Settings** → **General**, copie:
   - API Key → `VITE_FIREBASE_API_KEY` e `FIREBASE_API_KEY`
   - Auth Domain → `VITE_FIREBASE_AUTH_DOMAIN`
   - Project ID → `VITE_FIREBASE_PROJECT_ID`

### 3. Configurar Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais
npm install
npm run dev
```

#### Variáveis de Ambiente (Backend)

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Firebase
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_API_KEY=AIzaSy...

# JWT
JWT_SECRET=seu-secret-aqui
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### 4. Configurar Frontend

```bash
cd invite-codes
cp .env.example .env
# Edite .env com suas credenciais Firebase
npm install
npm run dev
```

#### Variáveis de Ambiente (Frontend)

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_API_URL=/api
```

### 5. Criar Primeiro Admin

1. Pelo Firebase Console, crie um usuário manualmente
2. Execute no Supabase SQL Editor:
```sql
INSERT INTO profiles (id, name, email, role)
VALUES ('<FIREBASE_UID>', 'Admin', 'admin@email.com', 'admin');
```
3. Faça login em `/login` e acesse `/admin`

## Deploy

### Backend no Render

1. Crie um **Web Service** no Render
2. Conecte ao repositório
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
4. Adicione todas as variáveis de ambiente
5. Deploy automático ativado

### Frontend na Vercel

1. Instale Vercel CLI: `npm i -g vercel`
2. Faça deploy:
```bash
cd invite-codes
vercel --prod
```

3. Configure variáveis de ambiente no dashboard da Vercel
4. Em produção, mude `VITE_API_URL` para a URL do Render

## Segurança

- 🔐 Service Account do Firebase apenas no backend
- 🔐 Chaves sensíveis nunca expostas no frontend
- 🔐 Rate limiting nos endpoints de auth (5 tentativas / 15 min)
- 🔐 Rate limiting global (100 req / 15 min)
- 🔐 Validação Zod em todas as entradas
- 🔐 Sanitização contra XSS
- 🔐 Headers de segurança (Helmet)
- 🔐 CORS configurado
- 🔐 Race condition prevention (update condicional)
- 🔐 Logs de auditoria

## Scripts Disponíveis

### Backend
```bash
npm run dev     # Desenvolvimento com watch
npm start       # Produção
npm run lint    # ESLint
```

### Frontend
```bash
npm run dev     # Dev server (porta 3000)
npm run build   # Build produção
npm run preview # Preview do build
```

## Funcionalidades Extras

- ✅ Botão copiar código
- ✅ Indicador visual de código usado/ativo/expirado
- ✅ Busca de códigos
- ✅ Paginação
- ✅ Filtros (todos/ativos/utilizados)
- ✅ Stats dashboard
- ✅ Dark mode com glassmorphism
- ✅ Animações suaves
- ✅ Toast notifications
- ✅ Loading states
- ✅ Responsivo