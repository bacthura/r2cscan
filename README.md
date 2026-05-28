# R2C-Scan v2.0

**Gestão Inteligente de Produtos com QR Code, IA Visual e Backend Escalável**

[![Vercel](https://img.shields.io/badge/deploy-Vercel-000?logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/deploy-Render-46E3B7?logo=render)](https://render.com)
[![Supabase](https://img.shields.io/badge/database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)

---

## 📋 Índice

- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Setup Local](#setup-local)
- [Supabase Setup](#supabase-setup)
- [Deploy Render (Backend)](#deploy-render-backend)
- [Deploy Vercel (Frontend)](#deploy-vercel-frontend)
- [API Endpoints](#api-endpoints)
- [Segurança](#segurança)
- [Funcionalidades](#funcionalidades)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│                 │     │                 │     │              │
│   Frontend      │────▶│   Backend API   │────▶│   Supabase   │
│   (Vercel)      │     │   (Render)      │     │  PostgreSQL  │
│   index.html    │     │   Express/Node  │     │  + RLS       │
│   + PWA         │     │   + JWT Auth    │     │              │
└─────────────────┘     └─────────────────┘     └──────────────┘
        │                       │
        │    Local Fallback      │
        ▼                       ▼
   IndexedDB            Service Role Key
   (offline/first)     (backend only, secure)
```

**Princípios:**
- 🌐 **Offline-first**: App funciona 100% local com IndexedDB
- 🔒 **Security-first**: Chaves sensíveis apenas no backend (SERVICE_ROLE_KEY)
- 🚀 **Scalable**: Backend stateless pronto para múltiplas instâncias
- 📱 **PWA**: Instalável como app nativo

---

## 🛠️ Tecnologias

### Frontend
- HTML5 + CSS3 (Vanilla, dark/light theme)
- jsQR (QR Code scanning)
- QRCode.js (QR Code generation)
- Chart.js (Dashboard charts)
- Service Worker (PWA offline)

### Backend
- **Node.js** + **Express** (API server)
- **Supabase** (PostgreSQL + Auth)
- **JWT** (JSON Web Tokens)
- **Helmet** (Security headers)
- **Rate Limiting** (DDoS protection)
- **Zod** (Input validation)

### DevOps
- Vercel (Frontend hosting)
- Render (Backend hosting)
- Supabase (Database + Auth)

---

## 📦 Pré-requisitos

- Node.js 18+
- npm 9+
- Conta gratuita [Supabase](https://supabase.com)
- Conta gratuita [Render](https://render.com)
- Conta gratuita [Vercel](https://vercel.com) (opcional)

---

## 📁 Estrutura do Projeto

```
r2c-scan/
├── index.html           # → SPA Frontend Principal
├── sw.js                # → Service Worker (PWA offline)
├── manifest.json        # → PWA Manifest
├── vercel.json          # → Vercel deploy config
├── render.yaml          # → Render Blueprint config
├── .gitignore
│
├── backend/             # → API REST (Express + Supabase)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js        # → Entry point
│       ├── config/
│       │   ├── env.js        # → Environment variables
│       │   └── supabase.js   # → Supabase client setup
│       ├── middleware/
│       │   ├── auth.js       # → JWT verification
│       │   ├── security.js   # → Helmet + Rate Limiting
│       │   └── errorHandler.js
│       ├── routes/
│       │   ├── auth.js       # → Login, verify token
│       │   ├── products.js   # → CRUD products
│       │   ├── maintenance.js# → CRUD maintenance
│       │   ├── stock.js      # → CRUD stock + movements
│       │   ├── suppliers.js  # → CRUD suppliers
│       │   └── dashboard.js  # → Stats + health
│       ├── services/
│       │   └── supabaseService.js  # → DB operations
│       └── utils/
│           └── logger.js     # → Logging utility
│
├── docs/
│   ├── supabase-schema.sql  # → Database schema
│   └── api.md               # → API documentation
│
└── assets/               # → Icons, images
```

---

## 🚀 Setup Local

### 1. Clone e configure

```bash
git clone https://github.com/seu-usuario/r2c-scan.git
cd r2c-scan
```

### 2. Frontend (serve estático)

```bash
# Opção 1: Python
python -m http.server 3000

# Opção 2: Node.js
npx serve .
```

Acesse: `http://localhost:3000`

### 3. Backend (API + Banco)

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais Supabase
npm install
npm run dev
```

O backend iniciará em `http://localhost:3001`

### 4. Variáveis de Ambiente (.env)

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJ...  # Pública, segura para frontend
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NUNCA expor no frontend!

# JWT
JWT_SECRET=senha-secreta-mude-em-producao
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
```

---

## 🗄️ Supabase Setup
  
### 1. Criar Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Create new project
3. Copie as credenciais em **Settings → API**

### 2. Executar Schema
1. Vá para **SQL Editor**
2. Cole o conteúdo de `docs/supabase-schema.sql`
3. Execute

### 3. Configurar Storage (opcional)
```sql
-- Cria bucket para fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true);
```

### 4. Configurar Auth
- Vá para **Authentication → Settings**
- Desabilite "Confirm email" para testes
- Configure redirect URLs

### 5. Verificar RLS
Todas as tabelas têm RLS configurado:
- **SELECT**: público (qualquer um pode ler)
- **INSERT/UPDATE**: autenticado (requer token JWT)
- **DELETE**: apenas service_role (backend)

---

## ☁️ Deploy Render (Backend)

### Opção 1: Blueprint (automático)

1. Faça fork do repositório
2. Conecte ao Render
3. O `render.yaml` configurará automaticamente

### Opção 2: Manual

1. **New Web Service** no Render
2. Conecte ao GitHub
3. Configurações:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node src/server.js`
   - **Health Check Path**: `/api/health`
4. Adicione variáveis de ambiente
5. Deploy

---

## ▲ Deploy Vercel (Frontend)

1. **New Project** no Vercel
2. Conecte ao repositório
3. **Framework**: Other
4. **Build**: Nenhum (arquivo estático)
5. Deploy

---

## 🌐 API Endpoints

### Autenticação
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/login` | Login admin | Não |
| POST | `/api/auth/verify` | Verificar token | Sim |
| GET | `/api/auth/status` | Status auth | Sim |

### Produtos
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/products` | Listar produtos | Opcional |
| GET | `/api/products/:id` | Buscar produto | Opcional |
| POST | `/api/products` | Criar produto | Sim |
| PUT | `/api/products/:id` | Atualizar | Sim |
| DELETE | `/api/products/:id` | Excluir | Admin |

### Manutenção
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/maintenance` | Listar | Não |
| POST | `/api/maintenance` | Criar | Sim |
| PUT | `/api/maintenance/:id` | Atualizar | Sim |
| DELETE | `/api/maintenance/:id` | Excluir | Admin |

### Estoque
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/stock` | Listar | Não |
| POST | `/api/stock` | Criar | Sim |
| GET | `/api/stock/movements/list` | Movimentações | Não |
| POST | `/api/stock/movements` | Registrar mov. | Sim |

### Fornecedores
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/suppliers` | Listar | Não |
| POST | `/api/suppliers` | Criar | Sim |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/stats` | Estatísticas |
| GET | `/api/dashboard/health` | Health check |
| GET | `/api/health` | Status do servidor |

---

## 🔒 Segurança

### Implementado
- ✅ **JWT authentication** para operações sensíveis
- ✅ **Helmet** headers de segurança
- ✅ **Rate limiting** (100 req/min geral, 5 req/15min no login)
- ✅ **Input sanitization** contra XSS
- ✅ **CORS** configurado por whitelist
- ✅ **SERVICE_ROLE_KEY** apenas no backend
- ✅ **RLS policies** no Supabase
- ✅ **SQL injection** prevenido via Supabase client
- ✅ **Brute force** proteção via rate limiting

### NÃO FAÇA
- ❌ NUNCA exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend
- ❌ NUNCA coloque secrets em arquivos estáticos
- ❌ NUNCA desabilite RLS em produção
- ❌ NUNCA use `service_role` no client-side

---

## ✨ Funcionalidades

### ✅ Produtos
- CRUD completo com fotos
- Especificações técnicas dinâmicas
- QR Code único por produto
- Favoritos, busca por voz, filtros

### ✅ Scanner QR Code
- Leitura em tempo real via câmera
- Detecção de QR Code no catálogo
- Vibração ao identificar

### ✅ IA Visual
- Captura de imagem pela câmera
- Análise local (privacy-first, sem API key)
- Sugestão de cadastro automático

### ✅ Manutenção
- Agendamento com checklist
- Calendário mensal
- Recorrência automática
- Status: pendente, em andamento, concluída

### ✅ Estoque
- Controle de quantidade
- Alertas de estoque mínimo
- Histórico de movimentações

### ✅ Fornecedores
- Cadastro completo (CNPJ, contato, endereço)
- Categorias de produtos

### ✅ Relatórios
- Gráficos por categoria
- Estatísticas de manutenção
- Alertas de estoque
- Exportação JSON/CSV
- Importação JSON

### ✅ PWA
- Instalável como app
- Funciona offline (Service Worker)
- Splash screen personalizada

---

## 🔧 Troubleshooting

### "Câmera não disponível"
- Use HTTPS ou localhost
- Permita acesso à câmera no navegador

### Backend não conecta
- Verifique se o servidor está rodando: `curl http://localhost:3001/api/health`
- Verifique as variáveis de ambiente
- Confirme que o Supabase está acessível

### Erro 401 nas requisições
- Faça login admin para obter token
- O token expira em 7 dias (configurável)

### Dados não sincronizam
- O app usa IndexedDB como fallback offline
- Quando backend estiver disponível, os dados podem ser migrados manualmente via export/import

---

## 📄 Licença

MIT

---

## 👨‍💻 Autor

Sistema desenvolvido para gestão industrial. R2C-Scan v2.0