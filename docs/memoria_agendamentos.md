# Memória Arquitetural do Sistema: Agendamentos

## Visão Geral
O módulo garante a transição digital para a gestão de recursos da escola (Livros itinerantes, Salas Maker, Laboratórios de Ciências, Datashows, Quadras). Com foco na restrição de colisão de horários.

---

## 1. Banco de Dados: Agendamentos
### `agendamentos`
Responsável por salvar TODAS as marcações da instituição:
- `id`: (UUID) PK
- `recurso_id` -> references `recursos(id)` (Qual sala/objeto está sendo pego).
- `horario_id` -> references `horarios(id)` (Ex: "3ª Aula", "Intervalo").
- `usuario_id` -> references `usuarios(id)` (Proprietário ou Alvo do Agendamento) -> Em casos de Enturmação, pode ser o Professor usando para a Turma.
- `agendado_por` -> references `usuarios(id)` (Quem efetivamente fez o click/criação, muito útil p/ coordenação agendando pelos professores).
- `data_agendamento`: (Date) a data concreta da colisão (Ex: `2027-02-14`).
- `tipo`: Enum restrito a: `'Confirmado'`, `'Pre-Reserva'`, `'Fixo'`.
   - `Confirmado`: Ocorre esporadicamente, mas está validado.
   - `Pre-Reserva`: Não trava oficialmente caso regras de aprovação demandem gerência. (Sistema atual confima automático, mas foi herdado esse state).
   - `Fixo`: Utilizado para repetições infinitas (Ex: professor Zé sempre usa as Segundas na 3ª Aula).
- `status`: `'Ativo'` ou `'Cancelado'` (Soft delete preferido).
- `data_inicio_fixo` e `data_fim_fixo`, `dia_semana_fixo`: Campos extras se tipo = `Fixo`. O `dia_semana_fixo` (0=Dom, 1=Seg) espelha o dia global da semana a ser travado (Date logic).

---

## 2. Regras de Negócio e Agendamentos Fixos
1. **Colisões**: Quando se tenta agendar em uma Célula (Recurso + Horário + Data), o sistema vai à API. O parser intercepta para saber se é `Confirmado` ou `Fixo`. 
2. **Transformações do Fixo (O Desafio)**: 
   - A tabela permite que um `Fixo` seja salvo como um contrato genérico. A Query do front-end gera colisão projetando o `Fixo` repetidamente no Grid baseado no `dia_semana_fixo`. 
   - **Exclusão/Parada de Fixo**: Se um Coordenador exclui uma instância de um agendamento Fixo, o Frontend inteligentemente não apaga o passsado: ele altera a tabela definindo `data_fim_fixo` = um dia antes do click. Assim o histórico do recurso fica congelado até ali, mas o futuro daquele slot é liberado para que outro professor possa locar nas próximas semanas.
   - Importante: Se o Agendamento Fixo é alterado (Ex: Professor Zé perdeu a segunda feira), o sistema chama a função de "Parar" (Set data_fim_fixo para o dia anterior do escolhido) e em seguida é possível criar uma nova reserva livre no slot sem bugar os dados históricos que o Professor Zé tinha antes. 

3. **Restrições de Visualização (Limite Local x Global)**:
   - Global (instituição: "4 Semanas à Frente"): O sistema pega a data base e avança 4 semanas. 
   - Se for Professor: os botões de navegação lateral somem se ele ultrapassar esse teto via verificação de Timestamp. 
   - Se for Admin/Coord: o calendário permite avançar infinitamente se o Toggle Local dele estiver desligado. A UI `Agendamentos.tsx` tem lógica pesada de "Limite de Visão: On/Off" para a gerência planejar eventos muito à frente sem ser bloqueada.

## 3. UI
- Células da grade (`<Table>` render no `.tsx`) utilizam o cruzamento Data + Horário.
- Modal de Edição lida com datas "reais" repassadas da célula específica clicada, garantindo que "cancelar a partir dessa data" mire exatamente para aquele instante. (Vide bug resolvido em passos anteriores).
