---
name: ui_ux_guidelines
description: Padrões e diretrizes visuais estritas para manter o layout, paleta de cores, tipografia e comportamento de interface uniformes em toda a aplicação.
---

# UI/UX & Design System Guidelines

Esta Skill define o comportamento visual e interativo padrão para o desenvolvimento de novas telas e componentes no projeto. O objetivo é manter um visual de **"Painel Administrativo Moderno e Clean"** estruturado sob o ecossistema Radix/Shadcn, garantindo consistência térmica (Light/Dark Mode).

## 1. Stack Visual Obrigatório
- **Tailwind CSS (v4+)**: Base principal de padronização, layouts fluidos e espaçamentos. Evite CSS customizado avulso. Se extremamente necessário, as variáveis devem pertencer à raíz do projeto (`@layer base`).
- **Shadcn UI & Radix Primitives**: Todos os componentes de interface devem derivar das peças criadas via CLI do Shadcn CLI. Isso garante acessibilidade nativa (ex: navegação por teclado em modais/dropdowns).
- **Ícones**: Utilize exclusivamente a biblioteca `lucide-react`. Tamanho padrão `w-5 h-5` para ícones formadores de ações principais, e `w-4 h-4` para detalhes anexos a textos.
- **Fontes**: Utilize famílias sem serifa limpas, por padrão alinhadas às variáveis nativas estendidas (preferencialmente `Geist Sans` para o grosso da interface e `Geist Mono` para trechos de dados técnicos).

## 2. Paleta de Cores Semântica (Design System)
As cores obrigatoriamente seguem o formato semântico integrado ao Tailwind, e não cores absolutas (como `bg-blue-500` e etc.). Dessa forma o tema escuro se adapta sem intervenção extra:
- **Cor de Fundo Principal**: Base da área útil será sempre delineada por `bg-background` e `text-foreground`.
- **Primary (Ações Principais)**: Todo CTA e ação que destaca o fluxo principal da tela leva `bg-primary` e `text-primary-foreground`. Aplicar opacidade de hover onde for apropriado esteticamente (`hover:bg-primary/90`).
- **Secundárias e Muted (Painéis Menores)**: `bg-secondary` e `bg-muted` para blocos cinzas discretos ou realçar detalhes de rodapés de tela.
- **Cards e Molduras Centrais**: Conteúdos principais encapsulados dentro de `bg-card` e texto em `text-card-foreground`, além da presença constante da borda `border-border`.
- **Semântica de Ações/Feedback**:
  - Alerta/Destrutivo: `bg-destructive text-destructive-foreground`.
  - Focus Ring: `focus-visible:ring-ring` ou global com `outline-ring/50`.

## 3. Layout Estrutural Padrão (Dashboard Concept)
O layout global sempre assume a semântica em árvore:
1. **Navegação Periférica (Sidebar/Header)**: Em Desktop uma barra lateral com as variáveis nativas aplicadas a ela; no menu de Topo (header/navbar), ações como Menu de Usuário ou Tema de Cor. Em Mobile, a barra lateral deve recolher e virar uma _Gaveta_ invisível disparada por gatilho tipo (Sheet ou Mobile Menu).
2. **Wrapper de Aplicação**: Todo o conteúdo rolável é um `main` independente com espaçamento de borda fixo.
3. **Página ou Contêiner de Visualização**: Toda página filha possui um padding respirável (`p-4`, `p-6` ou `p-8` em telas grandes) protegendo o conteúdo bruto do fim da tela.

## 4. Padrões de Componentes Comuns
- **Arredondamento (Radius)**: Base fixa (por padrão `--radius: 0.625rem`) traduzido pelo Tailwind nas escalas de `rounded`, `rounded-md`, `rounded-lg` dependendo da massa do objeto. (ex: Modais usam arredondamentos maiores, botões menores).
- **Cartões (`<Card/>`)**: Componentes centrais utilizam o triolé clássico `<Card>`, `<CardHeader>`, `<CardContent>`.
- **Botões (`<Button/>`)**: Rejeitar classes Tailwind soltas. Utilize o componente isolado com Props Semânticas:
  - `variant="default"` (Ações construtivas)
  - `variant="destructive"` (Remoções e perigos)
  - `variant="outline"` e `variant="secondary"` (Ações secundárias, cancelamentos, botões de ação reversa).
  - `variant="ghost"` (Navegação neutra em que a caixa só aparece no hover).
- **Inputs**: Controles como `<Input>`, `<Select>` são sempre ancorados às bordas declaradas por variáveis (`border-input`).

## 5. Responsividade (Mobile-First)
- As construções de grelhas `grid` e colunas `flex` devem sempre começar únicas ocupando área total no Mobile. Escale para multi-colunas a partir de `sm:`, `md:` e `lg:`.
- Complexidades horizontais (Tabelas e Quadros de Datagrid) recebem _wrapping_ de proteção (`overflow-x-auto`) para que o eixo `x` escorregue num scroll sem quebrar a espinha do Layout pai.

## 6. Feedback Tátil e UX
- **Notificação Expressa**: Ações diretas de inserção, modificação ou exclusão geram respostas na tela flutuantes (`toast()` da sub-lib _Sonner_ ou similar configurado).
- **Estado de Carregamento**: Botões reativos ganham feedback num spinner e perdem estado interativo (`disabled`) enquanto o processamento perdura, inibindo duplicação de fluxos assíncronos.
- **Proteção a Riscos**: Destruição de dados devem exigir janelas obstrutivas (AlertDialog / Dialog) de confirmação explícita ao usuário.

## 7. Margens e WhiteSpace
Evite sobreposição opressiva visual:
- Em grids ou lista de cards, aplique recuos consistentes como `gap-4` a `gap-6` usando escala de múltiplos de 4 (Tailwind padrão).
- Mantenha `mb-6` e `mb-8` como espaçamentos padrões para áreas de cabeçalhos de tela e transições de títulos centrais. Utilizar componente visual traçado (`Separator`) se as extremidades demandarem barreiras visíveis.

