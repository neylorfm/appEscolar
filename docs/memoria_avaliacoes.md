# Memória Arquitetural do Sistema: Avaliações

## Visão Geral
O módulo de Avaliações foi desenhado para gerenciar provas (com ou sem divisão de disciplinas, pesos varíaveis e etapas) focado no Free Tier do Supabase, utilizando **JSONB** em massa para reduzir cardinalidade e requisições repetidas ao banco.

## Controle de Permissões (Roles)
- **Leitura**: Professores, Coordenadores, Administradores.
- **Criação/Atualização/Deleção**: Apenas Administradores e Coordenadores. O Professor *nunca* gerencia/cria avaliações, apenas visualiza os dashboards (RLS configurado via Role Checker Function).

---

## 1. Banco de Dados: Tabelas e Relacionamentos

### `avaliacoes` (A Entidade Mãe)
Essa tabela abriga os meta-dados e agrupamentos.
- `id`: (UUID) 
- `ano_letivo`: (SmallInt, ex: 2026)
- `etapa`: (VARCHAR, enum abstrato: '1º BIMESTRE', 'RECUPERAÇÃO FINAL')
- `nome`: (VARCHAR, Nome amigável)
- `quantidade_questoes`: (SmallInt, teto máximo da prova)
- `disciplinas`: Array JSONB. Armazena: `[{ nome: "Inglês", inicio: 1, valor: 1.0 }]`. Assim evitamos a tabela isolada `avaliacoes_disciplinas`.
- `gabarito`: Array JSONB. Armazena: `['A', 'C', 'D', 'E', ...]`. Inserido posteriormente.
- `questoes_anuladas`: Array numérico JSONB `[3, 14, 21]`. 

### `avaliacoes_turmas` (Pivô N:M)
Ligação M:N clássica. Permite saber quais turmas farão essa prova.
- `avaliacao_id` -> references `avaliacoes(id)` ON DELETE CASCADE
- `turma_id` -> references `turmas(id)` ON DELETE CASCADE

### `resultados_alunos` (Armazenamento das Respostas)
Possui constraint `UNIQUE(avaliacao_id, aluno_id)` para impedir duplicação.
- `avaliacao_id` -> references `avaliacoes(id)` ON DELETE CASCADE
- `aluno_id` -> references `alunos(matricula)` ON DELETE CASCADE **[ATENÇÃO! A chave é a matrícula (Text) não o ID UUID]**
- `respostas`: Array JSONB (Marcadas pelo aluno: `['A', 'C', '', 'E']`).
- `pontuacoes`: Objeto JSONB processado em tempo real pelo Frontend durante o `SAVE` e guardado em cache. Contém a chave `_total_geral` com o valor somado da prova, e se houver disciplinas, contém a nota fracionada. (ex: `{"_total_geral": 8.5, "Matemática": 4.0}`).

---

## 2. Padrões de Interface e Regras de Negócio (Frontend)
Todas as operações de cálculo de nota rodam no cliente e enviam os dados processados para o banco para alívio de CPU no Postgres (Motor em `src/services/avaliacoes.ts`).

1. **Cálculo de Pontuação (Logic)**:
   - Uma questão vale o `valor` da disciplina que a engloba. (Ex: se Geografia `inicio: 11` e `valor: 2`, as questões 11 adiante valem 2, até o início da próxima disciplina).
   - Se a questão estiver em `questoes_anuladas`, o aluno automaticamente ganha o peso dela APENAS SE tiver assinalado qualquer alternativa diferente de vazio `''`. Se estiver em branco, recebe 0 (regra pedida).
   - Somatório gera a chave secreta `_total_geral` no objeto `pontuacoes`.

2. **Fluxo (Coordenador)**:
   1. Cria Avaliação (Define matérias e valores).
   2. Vai em "Editar Gabarito" (Assinala as alternativas certas e anula questões que deram polêmica).
   3. Vai em "Notas e Resultados". Clica em "Importar CSV", sobe um form dos alunos ou edita à mão via teclado. (Fallback manual).
   4. Salva, disparando os `upserts` na tabela.

3. **Restrições CSV**:
   O Parser no JS tenta dar match no identificador (coluna zero). Nós checamos por `aluno.matricula === cols[0]` ou `.toLowerCase()`. O Parser expande grudes `(ex: ABCD)` ou `A,B,C,D`.

## 3. Lembretes para os LLMs Agentes Póstumos
- Não confunda a PK de Alunos (**matricula**) com uuid padrão. É por isso que os relatórios de provas fazem links de `aluno_id = string textual`. 
- Ao recriar a pontuação local não utilize Node backend, puxe os dados `resultados` brutos e atualize a property via upsert do browser usando `supabase-js`.
- Sempre use o layout unificado com os arquivos da skill `ui_ux_guidelines` para não destoar dos components do shadcn.
