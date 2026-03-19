# Analise de Otimizacao de Performance - Bethel Events

## Resumo Executivo

Este documento apresenta uma analise detalhada de performance do sistema Bethel Events (closer-intensivo), identificando problemas criticos e recomendacoes de otimizacao.

**Stack Analisada:**
- Next.js 14.2.28 (App Router)
- React 18.3.1
- Supabase (PostgreSQL)
- Recharts para graficos
- PWA com next-pwa

---

## 1. Problemas Criticos Identificados

### 1.1 Criacao de Cliente Supabase Redundante

**Arquivo:** `lib/supabase/client.ts`

```typescript
// PROBLEMA: Nao ha singleton - cria nova instancia a cada chamada
export function createClient() {
  return createBrowserClient(...)
}
```

**Arquivos afetados:**
- `app/closer/dashboard/TopClosersRealtime.tsx` - linha 9: `const supabase = createClient()`
- `app/admin/eventos/page.tsx` - linha 12: `const supabase = createClient()`
- `lib/hooks/use-event.tsx` - linha 24: `const supabase = createClient()`

**Impacto:** Multiplas instancias do cliente Supabase sendo criadas, desperdicando memoria e potencialmente causando conexoes duplicadas.

**Solucao:**
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
```

---

### 1.2 Realtime Subscription sem Filtragem de Evento

**Arquivo:** `app/closer/dashboard/TopClosersRealtime.tsx`

```typescript
// PROBLEMA: Escuta TODAS as mudancas na tabela sales
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'sales',
}, ...)
```

**Impacto:** Recebe notificacoes de vendas de TODOS os eventos, causando re-fetches desnecessarios.

**Solucao:**
```typescript
// Filtrar por evento ativo
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'sales',
  filter: activeEvent?.id ? `event_id=eq.${activeEvent.id}` : undefined
}, ...)
```

---

### 1.3 N+1 Query Problem na API de Rankings

**Arquivo:** `app/api/rankings/route.ts`

```typescript
// PROBLEMA: Multiplas queries separadas
let salesQuery = supabaseAdmin.from('sales').select(...)
// + Query para user_events
// + Query para users
// + Filtragem em memoria com .filter()
```

**Impacto:** 3+ queries por requisicao + processamento em memoria.

**Solucao:** Usar uma unica query com JOIN ou criar uma VIEW no Supabase:

```sql
-- View otimizada para rankings
CREATE VIEW closer_rankings AS
SELECT
  u.id,
  u.name,
  u.photo_url,
  s.event_id,
  COUNT(s.id) as sales_count,
  COALESCE(SUM(s.total_value), 0) as total_value,
  COALESCE(SUM(s.entry_value), 0) as entry_value
FROM users u
LEFT JOIN sales s ON s.closer_id = u.id AND s.deleted_at IS NULL
WHERE u.role = 'closer'
GROUP BY u.id, u.name, u.photo_url, s.event_id;
```

---

### 1.4 useCallback com Dependencias Desnecessarias

**Arquivo:** `lib/hooks/use-event.tsx`

```typescript
// PROBLEMA: Supabase como dependencia causa re-renders
const refreshEvents = useCallback(async () => {
  // ...
}, [supabase]) // supabase muda a cada render se nao for singleton
```

**Impacto:** Re-renders excessivos e re-execucao de efeitos.

---

### 1.5 Recharts sem Lazy Loading

**Arquivo:** `components/shared/dashboard-charts.tsx`

```typescript
// PROBLEMA: Importacao sincrona de biblioteca pesada
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
```

**Impacto:** Recharts (~200KB) carregado mesmo quando nao visualizado.

**Solucao:**
```typescript
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />
})
```

---

### 1.6 Fontes Carregadas via CSS External

**Arquivo:** `app/layout.tsx`

```typescript
// PROBLEMA: Fontes externas bloqueiam renderizacao
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
/>
```

**Solucao:** Usar next/font para otimizacao automatica:
```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})
```

---

## 2. Otimizacoes de Media Prioridade

### 2.1 Ausencia de React.memo em Listas

**Arquivos:**
- `components/shared/closer-ranking-table.tsx`
- `components/shared/top-closers.tsx`

Os componentes de lista renderizam todos os itens mesmo quando apenas um muda.

**Solucao:**
```typescript
const CloserRow = React.memo(function CloserRow({ closer, index }: Props) {
  // ...
})
```

### 2.2 Formato de Moeda Recalculado

**Arquivo:** `components/shared/closer-ranking-table.tsx`

```typescript
// formatCurrency chamado a cada render
{formatCurrency(closer.totalValue)}
```

**Solucao:** Usar useMemo para valores calculados:
```typescript
const formattedValue = useMemo(() => formatCurrency(closer.totalValue), [closer.totalValue])
```

### 2.3 Imagens sem Dimensoes Explicitas

**Arquivo:** `app/login/page.tsx`

```typescript
<Image
  src="/images/logo.png"
  alt="Bethel Events"
  fill  // PROBLEMA: fill sem sizes causa layout shift
  className="object-contain"
/>
```

**Solucao:**
```typescript
<Image
  src="/images/logo.png"
  alt="Bethel Events"
  width={80}
  height={80}
  priority // Logo deve carregar prioritariamente
/>
```

---

## 3. Configuracoes de Build Recomendadas

### 3.1 next.config.js Otimizado

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,

  // Adicionar:
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },

  // Headers de cache
  async headers() {
    return [
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ],
      },
    ]
  },
}
```

### 3.2 Package.json - Atualizar Dependencias

```json
{
  "dependencies": {
    "next": "14.2.28",  // OK
    // Considerar remover next-pwa em favor de @ducanh2912/next-pwa (mais mantido)
  }
}
```

---

## 4. Metricas de Performance Esperadas

### Antes das Otimizacoes (Estimado)
| Metrica | Valor |
|---------|-------|
| LCP | 2.5-3.5s |
| FID | 150-300ms |
| CLS | 0.1-0.25 |
| Bundle JS | ~400KB |

### Apos Otimizacoes (Esperado)
| Metrica | Valor |
|---------|-------|
| LCP | < 2.0s |
| FID | < 100ms |
| CLS | < 0.1 |
| Bundle JS | ~280KB |

---

## 5. Plano de Implementacao

### Fase 1 - Critico (Impacto Imediato)
1. [x] Singleton do cliente Supabase
2. [x] Filtro de evento no realtime subscription
3. [x] Otimizacao da API de rankings

### Fase 2 - Alto Impacto
4. [ ] next/font para fontes
5. [ ] Lazy loading de Recharts
6. [ ] React.memo em componentes de lista

### Fase 3 - Refinamentos
7. [ ] Headers de cache
8. [ ] Otimizacao de imagens
9. [ ] Bundle analysis e tree-shaking

---

## 6. Comandos Uteis

```bash
# Analisar bundle
npx @next/bundle-analyzer

# Verificar build
npm run build

# Lighthouse CI
npx lighthouse http://localhost:3000 --view
```

---

*Documento gerado em: 2026-03-19*
*Branch: claude/analyze-performance-optimization-4tlU3*
