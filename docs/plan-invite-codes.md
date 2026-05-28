# PLANO DE IMPLEMENTAÇÃO - Sistema de Códigos de Convite

## ANÁLISE COMPLETA DO PROJETO

### Estrutura Atual

**Backend** (`backend/`):
- Express.js (ESM modules)
- Supabase (PostgreSQL) via `@supabase/supabase-js`
- Firebase Admin SDK para autenticação
- JWT para sessões
- Zod para validação
- express-rate-limit para rate limiting
- Helmet para headers de segurança

**Frontend** (`invite-codes/`):
- React 19 + Vite 8
- react-router-dom v7
- AuthContext customizado
- API service customizado (fetch puro)
- Tailwind CSS v4
- react-hot-toast

## ARQUIVOS JÁ EXISTENTES (que já formam o sistema)

### Backend
1. `backend/src/routes/inviteCodes.js` - Rotas do sistema
2. `backend/src/controllers/inviteCodeController.js` - Controllers
3. `backend/src/services/inviteCodeService.js` - Service layer
4. `backend/src/schemas/inviteCode.js` - Schemas Zod + geração de código
5. `backend/src/config/supabase.js` - Cliente Supabase
6. `backend/src/middleware/auth.js` - JWT + requireAdmin
7. `backend/src/middleware/errorHandler.js` - Error handling (já trata ValidationError)
8. `backend/src/middleware/security.js` - Rate limiting + sanitização
9. `backend/src/server.js` - Server (já importa inviteCodeRoutes)
10. `backend/src/utils/logger.js` - Logger
11. `docs/supabase-schema.sql` - Schema SQL

### Frontend
12. `invite-codes/src/pages/Register.jsx` - Página de cadastro
13. `invite-codes/src/pages/Login.jsx` - Página de login
14. `invite-codes/src/pages/AdminPanel.jsx` - Painel admin
15. `invite-codes/src/context/AuthContext.jsx` - Auth context
16. `invite-codes/src/lib/api.js` - API service
17. `invite-codes/src/lib/firebase.js` - Firebase config
18. `invite-codes/src/components/LoadingSpinner.jsx` - Loading
19. `invite-codes/src/components/ProtectedRoute.jsx` - Rota protegida
20. `invite-codes/src/App.jsx` - App com rotas

## PROBLEMAS IDENTIFICADOS

### CRÍTICO - Route path mismatch
Backend monta `inviteCodeRoutes` em `/api`, mas as rotas no router NÃO têm prefixo `/auth/` e `/admin/`.

**Backend (rota real vs comentário):**
| Comentário       | Rota real           | Frontend chama       | Resultado |
|-----------------|---------------------|----------------------|-----------|
| POST /auth/register | POST /api/register | POST /api/auth/register | ❌ 404 |
| POST /auth/login | POST /api/login | POST /api/auth/login | ❌ 404 |
| POST /admin/generate-code | POST /api/generate-code | POST /api/admin/generate-code | ❌ 404 |
| GET /admin/codes | GET /api/codes | GET /api/admin/codes | ❌ 404 |

### MUDANÇAS NECESSÁRIAS

1. **Fix route paths** em `inviteCodes.js` - adicionar `/auth` e `/admin` prefixes
2. **Nenhuma outra mudança necessária** - o sistema já está completo

## ARQUIVOS MODIFICADOS
1. `backend/src/routes/inviteCodes.js` - Corrigir paths das rotas

## ARQUIVOS CRIADOS
Nenhum - sistema já está completo

## RISCOS
- Nenhum risco de quebra de funcionalidades existentes
- Apenas corrige paths de rota para match com frontend