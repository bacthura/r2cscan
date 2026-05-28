# R2C-Scan - Sistema de Códigos de Convite

Sistema de criação de contas por código de convite para o R2C-Scan.

## Arquitetura

### Frontend (`invite-codes/`)
- **React 19** + **Vite 8**
- **Tailwind CSS v4** para estilos
- **react-router-dom v7** para roteamento
- **react-hot-toast** para notificações
- **AuthContext** customizado para gerenciamento de estado de autenticação
- **API Service** customizado (fetch puro) para comunicação com backend

### Backend (`backend/`)
- **Express.js** (ESM modules)
- **Supabase** (PostgreSQL) como banco de dados
- **Firebase Admin SDK** para autenticação
- **JWT** para sessões
- **Zod** para validação de dados
- **express-rate-limit** para rate limiting
- **Helmet** para headers de segurança

## Fluxo Completo

### 1. Admin gera código de convite
1. Admin faz login em `/login`
2. Acessa painel admin em `/admin`
3. Clica em "Gerar Código"
4. Opcionalmente define expiração e label
5. Código de 6 dígitos numéricos é gerado e auto-copiado

### 2. Usuário se cadastra
1. Usuário acessa `/register`
2. Informa: nome, email, senha e código de convite
3. Backend valida:
   - Código existe, não usado, não expirado
   - Email não está duplicado
   - Senha possui requisitos mínimos
4. Backend cria usuário no Firebase Auth
5. Backend cria perfil no Supabase (profiles)
6. Backend marca código como usado (atomic operation)
7. JWT é gerado para login imediato

## Endpoints da API

### Autenticação (Público com rate limit)

| Método | Rota                     | Descrição                          |
|--------|--------------------------|------------------------------------|
| POST   | `/api/auth/register`     | Registrar com código de convite    |
| POST   | `/api/auth/login`        | Login com email e senha            |
| POST   | `/api/auth/firebase`     | Trocar Firebase ID token por JWT   |

### Admin (Protegido - requer token JWT + role admin)

| Método | Rota                                    | Descrição                    |
|--------|-----------------------------------------|------------------------------|
| POST   | `/api/admin/generate-code`              | Gerar novo código            |
| GET    | `/api/admin/codes`                      | Listar códigos (paginado)    |
| GET    | `/api/admin/codes/:id`                  | Buscar código por ID         |
| PATCH  | `/api/admin/codes/:id/invalidate`       | Invalidar código manualmente |

## Variáveis de Ambiente

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Firebase
FIREBASE_SERVICE_ACCOUNT=
FIREBASE_API_KEY=

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
ADMIN_PASSWORD=admin123
```

### Frontend (`invite-codes/.env`)

```env
VITE_API_URL=/api
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Como Executar

### Backend

```bash
cd backend
cp .env.example .env
# Configure .env com suas credenciais
npm install
npm run dev
```

### Frontend

```bash
cd invite-codes
cp .env.example .env
# Configure .env com suas credenciais
npm install
npm run dev
```

O frontend estará em `http://localhost:3000` com proxy para backend em `http://localhost:3001`.

## Deploy

### Supabase Schema

Execute o script SQL em `docs/supabase-schema.sql` no SQL Editor do Supabase.

Isso criará as tabelas:
- `invite_codes` - Armazena os códigos de convite
- `profiles` - Perfis de usuário (extends Firebase Auth)
- `audit_logs` - Logs de auditoria de segurança

### Render (backend)

O arquivo `render.yaml` contém a configuração para deploy no Render.

## Arquivos do Sistema

### Criados (já existentes no projeto)
- `backend/src/routes/inviteCodes.js` - Rotas
- `backend/src/controllers/inviteCodeController.js` - Controllers
- `backend/src/services/inviteCodeService.js` - Services
- `backend/src/schemas/inviteCode.js` - Schemas + geração
- `docs/supabase-schema.sql` - Schema do banco
- `invite-codes/src/pages/Register.jsx` - Cadastro
- `invite-codes/src/pages/Login.jsx` - Login
- `invite-codes/src/pages/AdminPanel.jsx` - Painel admin
- `invite-codes/src/context/AuthContext.jsx` - Auth context
- `invite-codes/src/lib/api.js` - API service
- `invite-codes/src/lib/firebase.js` - Firebase config
- `invite-codes/src/components/LoadingSpinner.jsx` - Loading
- `invite-codes/src/components/ProtectedRoute.jsx` - Rota protegida
- `invite-codes/src/App.jsx` - App com rotas

### Modificados
- `backend/src/routes/inviteCodes.js` - Corrigido path das rotas para `/auth/` e `/admin/`

## Funcionalidades Implementadas

- ✅ Geração de códigos únicos de 6 dígitos
- ✅ Validação server-side com Zod
- ✅ Proteção contra race condition (update condicional)
- ✅ Prevenção de reutilização de código
- ✅ Validação de expiração
- ✅ Rate limiting em auth endpoints
- ✅ Sanitização de input (XSS prevention)
- ✅ Admin middleware com JWT
- ✅ Logs de auditoria
- ✅ Paginação, busca e filtros
- ✅ Copiar código para clipboard
- ✅ Invalidação manual de códigos
- ✅ Feedback visual com toasts
- ✅ Estados de loading e erro
- ✅ Design responsivo glassmorphism
- ✅ TypeScript-ready (arquivos .jsx com tipagem)

## Melhorias Futuras

1. **Testes automatizados** - Adicionar testes unitários e de integração
2. **WebSocket** - Notificações em tempo real quando código for usado
3. **Bulk generation** - Gerar múltiplos códigos de uma vez
4. **Export CSV** - Exportar lista de códigos
5. **Templates de email** - Enviar email com código de convite
6. **Dashboard** - Gráficos de uso de códigos
7. **Multi-tenant** - Suporte a múltiplos administradores
8. **Rate limit por IP** - Tracking mais granular de tentativas

## Riscos e Considerações

- **Firebase Auth** é dependência externa - queda do Firebase impede cadastros
- **Supabase** é dependência externa - queda do Supabase impede operações
- **Chave de serviço** (SUPABASE_SERVICE_ROLE_KEY) deve ser mantida em segredo absoluto
- **JWT_SECRET** deve ser forte e rotacionada periodicamente
- Códigos têm 10^6 combinações (1 milhão) - suficiente para uso moderado