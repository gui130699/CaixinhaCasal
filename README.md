# 🐷 Caixinha Casal

Sistema PWA completo para gerenciamento de caixinha familiar e poupança coletiva.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Estado**: Zustand + TanStack Query v5
- **UI**: Headless UI + Lucide React + Recharts
- **PWA**: vite-plugin-pwa (offline-capable)

## Funcionalidades

- 👨‍👩‍👧 Gestão de famílias com código de convite
- 🎯 Metas de poupança com cronograma de parcelas
- 🏦 Múltiplas contas bancárias por família
- 💸 Registro de transações e rendimentos
- 📊 Relatórios e gráficos financeiros
- 🔐 3 níveis de acesso: Master Admin, Admin Familiar, Membro
- 📱 Interface responsiva com suporte a PWA (instalar no celular)
- 🌙 Tema claro/escuro

## Setup

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute os arquivos de migração em **SQL Editor** (na ordem):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_functions.sql`
3. Copie a **URL** e a **anon key** do projeto (Settings > API)

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com os dados do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Instalar e executar

```bash
npm install
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

### 4. Build para produção

```bash
npm run build
npm run preview
```

## Primeiro Acesso

1. Crie uma família diretamente no banco ou pelo painel admin
2. Para criar o primeiro usuário Master Admin, inserir manualmente:
   ```sql
   INSERT INTO admin_roles (user_id, role) VALUES ('<uuid-do-usuario>', 'master_admin');
   ```
3. Membro pode entrar usando o código de convite da família

## Estrutura do Projeto

```
src/
├── api/          # Camada de acesso ao Supabase
├── components/   # Componentes reutilizáveis (ui/ + layout/)
├── lib/          # Supabase client, utils, validators
├── pages/        # Páginas da aplicação
├── providers/    # AuthProvider
├── stores/       # Zustand stores (auth, ui)
└── types/        # TypeScript types
supabase/
└── migrations/   # SQL para setup do banco
```
