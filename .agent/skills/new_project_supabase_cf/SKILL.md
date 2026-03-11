---
name: init_project_supabase_cf
description: Instruções de arquitetura e inicialização de projetos web com foco em Next.js/Vite, Supabase Free Tier e Cloudflare Pages Free Tier.
---

# Projeto Frontend + Supabase: Regras de Arquitetura e Limites Gratuitos

Ao iniciar um novo projeto web usando Supabase (Plano Gratuito) e Cloudflare Pages (Plano Gratuito), você **DEVE, obrigatoriamente**, seguir as diretrizes abaixo para evitar problemas de deploy, custo e performance.

## 1. Stack Tecnológico (Obrigatório)
- **Frontend Framework**: Utilize **Vite + React (TypeScript) + React Router DOM**.
- **Proibição de Next.js**: Não use Next.js. O deploy será no plano gratuito do **Cloudflare Pages**, e queremos evitar dores de cabeça com Server-Side Rendering (SSR) e Server Actions. O objetivo é que o projeto seja um Single Page Application (SPA) 100% estático após o build.
- **Estilização**: Tailwind CSS.
- **Ícones**: `lucide-react`.

## 2. Banco de Dados e Backend (Supabase Free)
- Todo o armazenamento deve estar em **PostgreSQL no Supabase**.
- **Regras de Negócio**: Devem ficar primariamente no banco de dados usando **Triggers e Functions (RPCs)** do Postgres sempre que possível.
- **Edge Functions**: Caso haja necessidade extrema de backend (ex: integração com gateways de pagamento, envio de e-mails), utilize **Supabase Edge Functions** em Deno. Nunca crie um servidor Node.js/Express separado.
- **Autenticação**: Use o Supabase Auth integrado com a Context API do React.

## 3. Segurança (RLS - Row Level Security)
- O Supabase expõe a API do banco via cliente React. Portanto, você deve **SEMPRE** habilitar o `Row Level Security (RLS)` em **todas** as tabelas.
- Jamais deixe tabelas críticas como públicas (`public`) sem regras de políticas de select/insert/update/delete.

## 4. Realtime Websockets (CUIDADO - Limite Crítico)
- O projeto pode e deve utilizar a funcionalidade **Realtime** (postgres_changes) para telas colaborativas.
- **Limite do Plano Gratuito do Supabase:**
  - Máximo de **200 conexões simultâneas**.
  - 2 milhões de mensagens por mês.
- **Regra de Ouro no React:** 
  Ao usar `supabase.channel()` dentro de um componente React, você **DEVE OBRIGATORIAMENTE** retornar uma função de limpeza (cleanup function) no `useEffect` contendo `supabase.removeChannel(channel)`. 
  - *Exemplo:* Se o usuário mudar de tela e o componente desmontar sem remover o canal, haverá vazamento de conexões abertas, derrubando sua cota rapidamente.
- **Otimização de Mensagens**: Assine e escute apenas os eventos das tabelas estritamente necessárias, preferencialmente usando filtros no schema (`filter: field=eq.value`).

## 5. Gerenciamento de Estado Global
- Para estados vitais (Autenticação, Preferências do Usuário logado, Permissões de Perfis), utilize **React Context API** (`AuthContext`, etc).
- Para obtenção de dados de formulários ou tabelas, faça as requisições RPC ou select diretas via camada Supabase JS em `useEffect` ou hooks customizados.

## 6. Arquitetura Modular e Escalonamento incremental (MUITO IMPORTANTE)
Sempre que for solicitado criar a aplicação completa, atue de **forma estritamente modular e incremental**. Construa cada parte como um "módulo de negócio" plugável.
O fluxo de construção de aplicações a partir desta Skill deve obrigatoriamente seguir a seguinte ordem (salvo solicitação expressa do usuário em contrário):

1. **Setup Core**: Layout dinâmico responsivo (`Sidebar`, `Header`, `Main Content Area`). Componentização pura de layout UI.
2. **Setup DB Model & Tipagem**: Criação inicial das tabelas núcleo no Supabase e tipos (Interfaces no frontend).
3. **Módulo Auth (Usuários)**: Telas de login/registro e definição da `AuthContext` ligada à segurança com RLS.
4. **Módulo de Cadastros Base**: Telas de configuração e CRUDS auxiliares (Ex: Recursos, Áreas, Disciplinas). Cada configuração deve ser uma aba ou submódulo distinto, construído **um de cada vez**, validando o fluxo antes do próximo. 
5. **Módulos Fim (Ex: Agendamentos)**: Apenas inicie e desenvolva recursos ricos e em tempo real (como o Agendamento) *depois* da tela inicial, navegação, segurança e dependências básicas estarem cimentadas e conectadas perfeitamente.
6. **Integração Constante**: Ao longo de cada nova etapa as `Sidebar/Headers` ou tabelas Supabase novas devem ser unificadas às antigas testando as limitações e relações, evitando código "ilhado".

