# Bethel Events

Sistema de Acompanhamento de Vendas e Participação em Eventos

## Stack Tecnológica

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **IA**: Anthropic Claude API (análise DISC)
- **Deploy**: Vercel
- **PWA**: next-pwa

## Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.local` e configure as variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
ANTHROPIC_API_KEY=sua_api_key_da_anthropic
```

### 3. Configurar Banco de Dados

Execute o SQL do arquivo `supabase/schema.sql` no Supabase SQL Editor para criar as tabelas e configurar RLS.

### 4. Criar Usuário Admin

1. Crie um usuário no Supabase Auth (Authentication > Users > Add user)
2. Execute o seguinte SQL para torná-lo admin:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'seu_email@exemplo.com';
```

### 5. Executar o Projeto

```bash
npm run dev
```

Acesse `http://localhost:3000`

## Estrutura do Projeto

```
/app
  /api
    /webhooks/participants    # Webhook para receber dados de participantes
    /auth                     # APIs de autenticação
    /forms/analyze           # API de análise DISC com Claude
  /login                     # Página de login
  /admin                     # Rotas do admin
    /dashboard              # Dashboard admin
    /participantes          # Gestão de participantes
    /closers                # Gestão de closers
    /painel-admin          # Gerenciamento de usuários
  /closer                   # Rotas do closer
    /dashboard             # Dashboard pessoal
    /participantes         # Participantes atribuídos
    /meu-painel           # Painel pessoal
  /form/[id]               # Formulário DISC público
/components
  /ui                      # Componentes UI reutilizáveis
  /shared                  # Componentes compartilhados
/lib
  /supabase               # Configuração do Supabase
  /types                  # Tipos TypeScript
  /utils                  # Funções utilitárias
/public
  /icons                  # Ícones PWA
/supabase
  schema.sql             # Schema do banco de dados
```

## Funcionalidades

### Roles

- **Admin**: Acesso total ao sistema
- **Closer**: Acesso aos participantes atribuídos e métricas pessoais

### Módulos

1. **Dashboard** - Métricas gerais e Top 3 closers
2. **Participantes** - Gestão de participantes e vendas
3. **Closers** - Estatísticas por closer
4. **Painel Admin** - CRUD de usuários
5. **Formulário DISC** - Análise comportamental com IA

### Webhook

Endpoint: `POST /api/webhooks/participants`

Payload:
```json
{
  "name": "Nome do Participante",
  "photo_url": "https://...",
  "revenue": "R$ 100.000",
  "niche": "Marketing Digital",
  "instagram": "@usuario",
  "checked_in_day1": true,
  "checked_in_day2": false,
  "checked_in_day3": false
}
```

## Deploy

### Vercel

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push para main

## Notas para PWA

Para gerar os ícones PWA, você pode usar ferramentas como:
- [PWA Asset Generator](https://github.com/nicholasadamou/pwa-asset-generator)
- [Real Favicon Generator](https://realfavicongenerator.net/)

Substitua os arquivos em `/public/icons/` pelos ícones gerados.

## Licença

Proprietary - Todos os direitos reservados
