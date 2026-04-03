# Memória Arquitetural do Sistema: Configurações & Base Institucional

## Visão Geral
Este documento cobre a organização relacional base estrutural do AppEscola (pessoas, ambientes e o núcleo duro estrutural da instituição). Aqui que cadastramos o "chão de fábrica".

---

## 1. Organização do Submenu
O Módulo de `"Configurações"` agrupa sub-páginas exclusivas para **Administradores**. O Sidebar mapeia isso renderizando links descendentes.

1. `Instituição` -> Painel mestre (Configura timeout, logo, theam colors via tabela).
2. `Usuários` -> Gestão de Logins (Auth Link) e metadados na tabela users (profiles).
3. `Áreas (Matriz)` -> Áreas do conhecimento.
4. `Disciplinas` -> As tags de aula ligadas à Matriz.
5. `Turmas` -> Aglomerados de Anos.
6. `Alunos (Enturmação)` -> Processo de cadastros pesados e amarração Aluno -> Turma.
7. `Horários` -> Grade de sinetas diárias (usado fortemente pelo módulo de agendamento).
8. `Recursos` -> Salas logisiticas/materiais (Datashow, Quadra, Lab Bio).

---

## 2. Dicionário de Dados e Relacionamentos Base

### `configuracoes_instituicao`
Há apenas uma (*1 row*) linha de controle que guia o frontend. 
- Cores dinâmicas (`cor_principal`, `cor_secundaria_1`, ...).
- Configurações de timeout/inatividade.
- `tipo_limite_agendamento` e `semanas_limite_agendamento`, controlam quão longe um professor pode avançar o calendário. O Hook usa uma row mestre p/ todos.

### `usuarios` (O Supabase chama isso usualmente de profiles)
A tabela Auth está linkada à tabela Public com `id` (FOREIGN KEY a `auth.users.id`).
- `papel` (Enum type `papel_usuario` que pode ser `'Professor', 'Coordenador', 'Administrador'`). O Backend e RLS Policies verificam isso para travar inserts destrutivos de professores (ex: deletar turmas).
- Relacionamentos:
  - N:N cruzando `professor_disciplinas` para amarrar quem dá quais aulas na tabela mãe.

### `areas`
As matrizes primárias (Ex: "Linguagens e Códigos", "Ciências da Natureza").
- Campo exótico: `pcas` (Array de UUID). Guarda IDs de possíveis sub-responsáveis/líderes.

### `disciplinas`
- `nome`
- `area_id` -> FK para `areas(id)`.

### `turmas` e `alunos` ("Enturmação")
- `turmas`: Meta da grade. (Ex: "1º Ano B").
- `alunos`: Representa o civil na escola. 
  - **Atenção aos Lembretes Cruciais**: 
    - `matricula`: String Textual que atua como **PRIMARY KEY** (PK). Não existe campo `id` uuid aqui.
    - `nome`: String normal da table (Não confunda com `nome_completo` de outras tabelas como fallback mental).
    - `turma_id`: Ligação direta. A página de *"Enturmação"* funciona fazendo Batch Update na FK `turma_id` cruzando os arrays de seleção.

### `horarios`
- `inicio`, `fim`: Times puros (`time without timezone`).
- `tipo`: Enum (`'Aula', 'Intervalo', 'Almoço', 'Janta'`).
- Utilizado como Eixo Y do Módulo de Agendamentos. Se um intervalo for deletado o cascading ferra o agendamento logado se não for devidamente migrado.

### `recursos`
- Meta dos Eixos. "Laboratório XYZ". Pode sofrer soft-delete ou ser marcado inativo para desaparecer dos selects de agendamento mas presenrvando histórico (se status de "ativo" entrar no payload).

---

## 3. Considerações e Lembretes à Inteligência Artificial (AI Helper)
1. **Ao consultar Alunos**: Quando o usuário pedir relatórios, use sempre `JOIN alunos ON public.alunos.matricula = resultados_alunos.aluno_id`. Não chame os ids aleatórios padrão.
2. **Ao modificar UI em `configurações`**: Lembre-se que as páginas dessa raiz possuem wrapper de proteção `<AdminRoute>`, então em caso de debug de "não aparece na tela", confirme se o test-login não sofreu rebaixamento de Rule.
3. **Padrões de Cor Login**: O login injeta variáveis root CSS baseado nessa tabela. Se falhar o request, ele tomba para dark mode fixo do Tailwind fallback.
