# Guia Arquitetural & Roadmap Modular: Grade de Horários

Este documento serve como diretriz oficial para a evolução modular do módulo de **Quadro e Gestão de Horários Escolares**.

---

## 🔒 1. Princípio Fundamental de Preservação

Todas as implementações futuras devem **obrigatoriamente preservar e respeitar as funcionalidades existentes**, sem quebra de comportamento:

- ✅ **Estrutura da Matriz Visual**: Separação clara por Dias da Semana (com *rowspan* lateral), Números de Aulas e Colunas de Turmas.
- ✅ **Sistema de Instâncias**: Segregação rígida entre **Grade em Vigor (`PUBLICADA`)** e **Modo Rascunho (`RASCUNHO`)**, com cópia da visualização para edição e publicação com vigência customizável.
- ✅ **Identidade Visual por Professor**: Paleta de 50 cores pasteis harmoniosas, cálculo determinístico de cor por nome e persistência de cores personalizadas globais.
- ✅ **Detecção de Choques/Conflitos**: Identificação instantânea de sobreposição do mesmo professor em duas turmas no mesmo horário com alerta pulsante e aviso explicativo.
- ✅ **Controles de Ergonomia**: Seleção de Tipografia (Inter, IBM Plex, Roboto, etc.), Zoom Dinâmico de Célula (100% a 180%), Painel Sanfona (contração de controles) e Modo Tela Cheia.
- ✅ **Busca Inteligente com Alvo**: Localizador de professor com anel de destaque vermelho, ícone de mira (*Target*) e esmaecimento das demais aulas.
- ✅ **Impressão e Exportação**: Relatórios para impressão da grade geral e fichas individuais por professor.

---

## 🏆 2. Cronograma de Fases e Prioridades (Atualizado)

> [!IMPORTANT]
> **Prioridade Máxima Definida pelo Operador**: O isolamento visual de colunas (turmas/séries) e linhas (dias da semana) foi promovido para a **Fase 1 (Prioridade 1)** para resolver o cansaço visual e permitir trabalho focado.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🥇 FASE 1: PRIORIDADE MÁXIMA (Foco Visual & Agilidade Operacional)                    │
│ 1. Filtro Flexível de Colunas (Por Séries ou Multi-Turmas Customizadas)               │
│ 2. Filtro de Linhas por Dias da Semana (Modo Foco em Dias Específicos)                 │
│ 3. Inversão Inteligente ao Arrastar (Smart Swap)                                       │
│ 4. Desfazer / Refazer (Ctrl+Z / Ctrl+Y)                                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🥈 FASE 2: ASSISTÊNCIA VISUAL & PRODUTIVIDADE                                         │
│ 1. Raio-X de Disponibilidade ao Arrastar (Ghost Highlighting Verde/Vermelho)           │
│ 2. Atalhos de Teclado Power-User (Enter, Del, Setas, Ctrl+C / Ctrl+V)                 │
│ 3. Comparador de Alterações (Diff Preview antes de publicar)                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🥉 FASE 3: EXPANSÕES GERENCIAIS & APOIO CURRICULAR                                    │
│ 1. Pontos de Restauração Locais (Snapshots com 1 clique)                               │
│ 2. Gaveta Lateral de Carga Horária Pendente (Metas Curriculares por Turma)             │
│ 3. Radar de Janelas Vagas Docentes                                                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 3. Por que Visualizar Apenas Algumas Colunas ou Linhas?

Visualizar recortes da grade (apenas determinadas turmas ou determinados dias) traz vantagens práticas comprovadas no dia a dia da coordenação:

### Vantagens de Visualizar Apenas Algumas Colunas (Turmas / Séries)
1. **Redução Drástica da Fadiga Visual**: A grade integral com 10 turmas possui 450 células na tela. Filtrar para ver apenas o **"1º Ano (1º A, 1º B, 1º C, 1º D)"** remove 60% das distrações e foca a atenção no problema específico.
2. **Resolução de Itinerários e Segmentos**: Frequentemente o coordenador precisa equilibrar apenas as turmas de uma mesma série (ex: ajustar os itinerários formativos do 3º Ano sem precisar olhar para o 1º Ano).
3. **Conforto em Telas Menores (Notebooks de 13" a 15")**: Em telas compactas, 10 colunas forçam o uso de letras minúsculas ou barra de rolagem horizontal constante. Visualizar 3 a 4 turmas permite usar fontes grandes e confortáveis.

### Vantagens de Visualizar Apenas Algumas Linhas (Dias da Semana)
1. **Planejamento por Dias de Escala Docente**: Muitos professores trabalham na escola apenas em dias fixos (ex: *"Prof. Kelvin só leciona na Terça e Quinta"*). Isolar apenas as linhas de Terça e Quinta permite preencher a grade desse professor de ponta a ponta sem perder tempo rolando a tela.
2. **Eventos e Dias Especiais**: Facilita ajustar dias atípicos (ex: Quarta-feira com projetos vespertinos) de todas as turmas simultaneamente.

---

## 📦 4. Especificação dos Módulos Técnicos Independentes

---

### 🧩 MÓDULO 1 (PRIORIDADE 1): Foco Visual (Colunas & Linhas)

#### 1.1. Filtro Flexível de Colunas (Séries e Multi-Seleção)
- **Objetivo**: Permitir que o operador escolha ver:
  - Todas as Turmas (padrão atual).
  - Agrupamento por Série: `1ºs ANOS (1º A, B, C, D)`, `2ºs ANOS (2º A, B, C)`, `3ºs ANOS (3º A, B, C)`.
  - Uma única turma (comportamento atual).
  - Seletor com *Checkboxes* para escolher qualquer combinação livre (ex: apenas `1º A` e `3º A`).
- **Implementação**:
  - Em `QuadroHorariosPage.tsx`, enriquecer o controle de filtro de turmas.
  - Em `GradeMatrizTurno.tsx`, a lista `turmasFiltradas` recebe e renderiza apenas as colunas ativas.
  - A largura das colunas se adapta automaticamente ao espaço disponível (ficando mais largas e confortáveis quando há menos turmas).

#### 1.2. Filtro de Linhas por Dias da Semana (Isolamento de Dias)
- **Objetivo**: Permitir isolar um ou mais dias da semana (ex: exibir apenas `TER` e `QUI`, ou focar apenas na `SEG`).
- **Design na Interface**:
  - Pílulas compactas no topo ou na barra de ferramentas: `[Todos] [Seg] [Ter] [Qua] [Qui] [Sex]`.
  - Permite clique único (mostra só aquele dia) ou multi-seleção.
- **Implementação**:
  - Estado `diasVisiveis: DiaSemana[]` em `QuadroHorariosPage.tsx`.
  - Em `GradeMatrizTurno.tsx`, filtrar o `DIAS_SEMANA.filter(d => diasVisiveis.includes(d))` antes de renderizar as linhas.
  - Preserva integralmente o *rowspan* do cabeçalho do dia e a numeração das aulas.

---

### 🧩 MÓDULO 2 (PRIORIDADE 1): Manipulação Rápida & Segurança

#### 2.1. Inversão Inteligente (*Smart Swap*)
- **Objetivo**: Ao arrastar uma aula (Origem) e soltar sobre outra célula já preenchida (Destino), o sistema inverte os dados das duas células em uma transação atômica.
- **Implementação**:
  - Em `GradeMatrizTurno.tsx` no evento `onDrop`, verificar se a célula de destino já possui um `itemDestino`.
  - Se possuir, salvar a Origem no Destino e salvar o Destino na Origem.
  - Se for arrasto com `Ctrl` (cópia), manter o comportamento de sobrescrita.
- **Impacto Visual**: Zero botões adicionais na tela (fluidez 100% natural).

#### 2.2. Histórico de Ações (*Desfazer / Refazer - Undo/Redo*)
- **Objetivo**: Permitir reverter qualquer movimentação ou preenchimento acidental com `Ctrl+Z` e refazer com `Ctrl+Y`.
- **Implementação**:
  - Criar um hook customizado `useGradeHistory(itensGrade)` em `src/hooks/useGradeHistory.ts`.
  - Manter uma pilha de estados (`past: GradeHorarioItem[][]`, `future: GradeHorarioItem[][]`).
  - Adicionar atalho global de teclado e dois botões discretos no topo (`Undo` / `Redo`).

---

### 🧩 MÓDULO 3: Assistência Visual de Disponibilidade (Raio-X Docente)

#### 3.1. Destaque de Vagas Livres ao Arrastar (*Ghost Highlighting*)
- **Objetivo**: Ao segurar uma aula do "Prof. KELVIN" para arrastar, as células disponíveis para ele se iluminam em verde suave, e as células onde ele já dá aula em outra turma ficam bloqueadas em vermelho/cinza.
- **Implementação**:
  - No `onDragStart`, registrar o nome do professor em um estado global `draggedTeacher`.
  - Cada célula calcula instantaneamente se o professor possui aula no mesmo dia/número_aula em outra turma:
    - Se tem aula em outra turma: `ring-1 ring-red-500/40 opacity-40 cursor-not-allowed`.
    - Se está livre: `ring-2 ring-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/30`.
  - No `onDragEnd`, limpar `draggedTeacher`.

---

### 🧩 MÓDULO 4: Produtividade por Teclado (Power-User)

#### 4.1. Navegação Grid & Clipboard
- **Objetivo**: Permitir preenchimento contínuo sem tirar as mãos do teclado.
- **Implementação**:
  - Armazenar `focusedCell: { dia, aula, turma }`.
  - Mapear listeners de teclado:
    - `ArrowUp / ArrowDown`: Muda a aula.
    - `ArrowLeft / ArrowRight`: Muda a turma.
    - `Enter` ou `Space`: Dispara o `CelulaEditorPopover`.
    - `Delete / Backspace`: Executa `onLimparCelula`.
    - `Ctrl+C`: Copia `{ disciplina, professor, cor }` para a memória.
    - `Ctrl+V`: Cola na célula focada.

---

### 🧩 MÓDULO 5: Segurança de Versão & Publicação

#### 5.1. Pontos de Restauração Locais (*Snapshots*)
- **Objetivo**: Criar cópias de segurança do rascunho antes de grandes reestruturações (salvas em `localStorage` ou tabela de rascunhos).
- **Implementação**:
  - Salvar snapshots com timestamp e rótulo no `localStorage` sob a chave `grade_snapshots_{escolaId}`.
  - Modal leve de "Histórico de Versões do Rascunho" para restaurar com 1 clique.

#### 5.2. Comparador de Diferenças (*Diff Preview*)
- **Objetivo**: Antes de publicar o rascunho oficialmente, exibir um modal comparativo listando todas as alterações (Aulas adicionadas, removidas, trocadas de professor ou de horário).
- **Implementação**:
  - Função utilitária `calcularDiferencasGrades(gradePublicada, gradeRascunho)`.
  - Renderizar no `PublicarHorariosModal.tsx` uma lista visual categorizada.

---

## 🛠️ 6. Diretrizes Técnicas para Execução

Ao implementar qualquer um dos módulos acima:

1. **Nunca altere a assinatura principal de `GradeHorarioItem`** sem migração de banco correspondente.
2. **Mantenha os estilos semânticos do Tailwind e Shadcn UI** conforme definidos em `.agent/skills/ui_ux_guidelines/SKILL.md`.
3. **Não altere os nomes de turmas e normalizações existentes** (`normalizarNomeTurma`, `formatarNomeCurtoTurma`).
4. **Sempre teste em ambas as instâncias**: Verifique o funcionamento tanto na grade `PUBLICADA` (apenas leitura) quanto no `RASCUNHO` (modo de edição).
