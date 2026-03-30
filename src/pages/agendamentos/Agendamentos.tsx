import { useState, useEffect } from 'react';
import { useInstituicao } from '../../contexts/InstituicaoContext';
import { Card, CardContent } from '../../components/ui/card';

import { Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import { toast } from "sonner";
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { criarAgendamento, getAgendamentosPorPeriodo, AgendamentoComDetalhes, cancelarOuExcluirAgendamento, atualizarDataFimFixo, getFilaPreReserva, FilaPreReserva, verificarConflitoProfessor, processarFilaSemanal } from '../../services/agendamentos';
import { getRecursos, Recurso } from '../../services/recursos';
import { getHorarios, Horario } from '../../services/horarios';
import { getUsuarios } from '../../services/usuarios';

const getBaseMonday = () => {
  const d = new Date();
  const day = d.getDay();
  // Se for sábado (6) ou domingo (0), avança para a próxima segunda-feira.
  if (day === 0) {
    d.setDate(d.getDate() + 1);
  } else if (day === 6) {
    d.setDate(d.getDate() + 2);
  } else {
    // Dias normais: volta para a segunda atual.
    d.setDate(d.getDate() - day + 1);
  }
  return d;
};

const toLocalYYYYMMDD = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const renderIcon = (iconName: string, size = 20, className = "") => {
  // @ts-ignore
  const IconComponent = LucideIcons[iconName] || LucideIcons['Box'];
  return <IconComponent size={size} className={className} />;
};

export default function Agendamentos() {
  const { configuracoes } = useInstituicao();
  const { usuario } = useAuth();
  const [semanaOffset, setSemanaOffset] = useState(0); 
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoComDetalhes[]>([]);
  const [selectedRecurso, setSelectedRecurso] = useState<string>('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'queue' | 'edit'>('create');
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoComDetalhes | null>(null);
  
  const [isEditingDataFim, setIsEditingDataFim] = useState(false);
  
  const [filaPreReserva, setFilaPreReserva] = useState<FilaPreReserva[]>([]);
  const [isLoadingFila, setIsLoadingFila] = useState(false);
  const [rankCache, setRankCache] = useState<{ [key: string]: number }>({});
  
  const [selectedHorarioId, setSelectedHorarioId] = useState<string>('');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [hasGlobalPreReservas, setHasGlobalPreReservas] = useState(false);
  
  
  // Form state
  const [agendarPara, setAgendarPara] = useState<string>(''); // Vazio = professor logado
  const [agendarEscola, setAgendarEscola] = useState(false);
  const [agendamentoFixo, setAgendamentoFixo] = useState(false);
  const [dataFimFixo, setDataFimFixo] = useState<string>('');
  // Para fins de simplificacao visual na criação inicial
  const diasSemanas = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  useEffect(() => {
    async function loadFiltros() {
      try {
        const [recs, hrs, usuariosList] = await Promise.all([
          getRecursos(),
          getHorarios(),
          getUsuarios()
        ]);
        setRecursos(recs.filter(r => r.ativo));
        if (recs.length > 0) setSelectedRecurso(recs[0].id);
        
        // Ordenar os horarios
        const sortedHrs = hrs.sort((a, b) => a.inicio.localeCompare(b.inicio));
        setHorarios(sortedHrs);

        // Filtrar professores
        setProfessores(usuariosList.filter(u => u.papel === 'Professor').map(u => ({ id: u.id, nome: u.nome_completo || u.email })));
      } catch (e) {
        console.error("Erro ao carregar filtros", e);
      }
    }
    loadFiltros();
  }, []);

  // Fetch agendamentos quando mudar o período ou recurso
  useEffect(() => {
    if (!selectedRecurso) return;

    async function loadAgendamentos() {
      // Cálculo das datas da semana atual + offset
      const segundaFeira = getBaseMonday();
      segundaFeira.setDate(segundaFeira.getDate() + (semanaOffset * 7));
      
      const sextaFeira = new Date(segundaFeira);
      sextaFeira.setDate(segundaFeira.getDate() + 4); // +4 dias para chegar na sexta

      const inicioStr = toLocalYYYYMMDD(segundaFeira);
      const fimStr = toLocalYYYYMMDD(sextaFeira);

      try {
        const ags = await getAgendamentosPorPeriodo(inicioStr, fimStr, selectedRecurso);
        setAgendamentos(ags);

        if (usuario) {
          const dict: { [key: string]: number } = {};
          const myPreReservas = ags.filter(a => a.tipo === 'Pre-Reserva' && a.usuario_id === usuario.id);
          const uniqueCells = Array.from(new Set(myPreReservas.map(a => `${a.horario_id}_${a.data_agendamento}`)));
          
          await Promise.all(uniqueCells.map(async (key) => {
             const [horId, dt] = key.split('_');
             try {
                const fila = await getFilaPreReserva(selectedRecurso, horId, dt);
                const myRankIndex = fila.findIndex(f => f.usuario_id === usuario.id);
                if (myRankIndex >= 0) {
                   dict[key] = myRankIndex + 1;
                }
             } catch(err) {
                console.error("Erro ao buscar fila para rank cache", err);
             }
          }));
          
          setRankCache(dict);
        }

      } catch (e) {
        console.error("Erro ao puxar agendamentos", e);
      }
    }
    
        // Initial load
        loadAgendamentos();

        // Check se a aba atual tem pré-reservas para habilitar/desabilitar o botão manual
        const checkGlobalPreReservas = async () => {
             const baseSegundaTab = getBaseMonday();
             baseSegundaTab.setDate(baseSegundaTab.getDate() + (semanaOffset * 7));
             const baseSextaTab = new Date(baseSegundaTab);
             baseSextaTab.setDate(baseSegundaTab.getDate() + 4);
             
             const req1 = await supabase.from('agendamentos')
                .select('*', { count: 'exact', head: true })
                .eq('tipo', 'Pre-Reserva')
                .gte('data_agendamento', toLocalYYYYMMDD(baseSegundaTab))
                .lte('data_agendamento', toLocalYYYYMMDD(baseSextaTab));
                
             setHasGlobalPreReservas((req1.count || 0) > 0);
        };
        checkGlobalPreReservas();

    // Setup Realtime Subscription
    const channel = supabase
      .channel('agendamentos_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos' },
        () => {
          // Quando qualquer alteração acontecer na base, recarrega a visualização atual
          loadAgendamentos();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or deps change
    return () => {
      supabase.removeChannel(channel);
    };
  }, [semanaOffset, selectedRecurso, usuario]);

  const getWeekText = () => {
    if (semanaOffset === 0) return 'Semana Atual';
    if (semanaOffset === 1) return 'Próxima Semana';
    if (semanaOffset === -1) return 'Semana Passada';
    if (semanaOffset > 1) return `${semanaOffset} Semanas à frente`;
    return `${Math.abs(semanaOffset)} Semanas atrás`;
  };



  const getAgendamentosPorCelula = (horarioId: string, indiceDiaSemana: number) => {
    // indiceDiaSemana: 0 (Segunda) a 4 (Sexta)
    const targetDate = getBaseMonday();
    targetDate.setDate(targetDate.getDate() + (semanaOffset * 7) + indiceDiaSemana);
    const targetDateStr = toLocalYYYYMMDD(targetDate);

    return agendamentos.filter(a => {
      // Agendamento comum
      if (a.tipo !== 'Fixo') {
        return a.horario_id === horarioId && a.data_agendamento === targetDateStr && a.status === 'Ativo';
      }
      
      // Agendamento Fixo
      // idx 0 (Seg) a 4 (Sex) corresponde a dia_semana_fixo 1 a 5
      if (a.dia_semana_fixo !== (indiceDiaSemana + 1)) return false;
      if (a.horario_id !== horarioId) return false;
      if (a.data_inicio_fixo && a.data_inicio_fixo > targetDateStr) return false;
      if (a.data_fim_fixo && a.data_fim_fixo < targetDateStr) return false;

      return true;
    });
  };

  const isCoordenadorOuAdmin = usuario?.papel === 'Coordenador' || usuario?.papel === 'Administrador';

  const carregarFila = async (recursoId: string, horarioId: string, dataStr: string) => {
    setIsLoadingFila(true);
    try {
      const fila = await getFilaPreReserva(recursoId, horarioId, dataStr);
      setFilaPreReserva(fila);
    } catch (e) {
      console.error("Erro ao carregar fila:", e);
    } finally {
      setIsLoadingFila(false);
    }
  };

  const handleCellClick = async (horarioId: string, indiceDiaSemana: number) => {
    const targetDate = getBaseMonday();
    targetDate.setDate(targetDate.getDate() + (semanaOffset * 7) + indiceDiaSemana);
    
    // Validacao basica de passado 
    if (targetDate < new Date() && targetDate.toDateString() !== new Date().toDateString()) {
       toast.error("Atenção", { description: "Não é possível agendar ou entrar na fila de datas passadas." });
       return;
    }

    const dateStr = toLocalYYYYMMDD(targetDate);
    setSelectedDateStr(dateStr);
    setSelectedHorarioId(horarioId);
    setAgendamentoFixo(false);
    setDataFimFixo('');
    setIsEditingDataFim(false);
    setAgendarEscola(false);
    setAgendarPara('');
    setSelectedAgendamento(null);

    let isPreReservaCell = false;
    if (semanaOffset === 1 && new Date().getDay() !== 5) isPreReservaCell = true;
    if (semanaOffset > 1) isPreReservaCell = true;

    const cellAgs = getAgendamentosPorCelula(horarioId, indiceDiaSemana);
    const hasFixo = cellAgs.some(a => a.tipo === 'Fixo');
    const isConfirmado = cellAgs.some(a => a.tipo === 'Confirmado');
    const hasPreReserva = cellAgs.some(a => a.tipo === 'Pre-Reserva');

    if ((isPreReservaCell || hasPreReserva) && !hasFixo && !isConfirmado) {
       setModalMode('queue');
       setIsModalOpen(true);
       setAgendarPara('');
       await carregarFila(selectedRecurso, horarioId, dateStr);
    } else {
       setModalMode('create');
       setIsModalOpen(true);
    }
  };

  const handleEditClick = async (agendamento: AgendamentoComDetalhes, clickedDate: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (agendamento.tipo === 'Pre-Reserva') {
       setSelectedDateStr(clickedDate);
       setSelectedHorarioId(agendamento.horario_id);
       setSelectedAgendamento(null);
       setModalMode('queue');
       setIsModalOpen(true);
       setAgendarPara('');
       await carregarFila(agendamento.recurso_id, agendamento.horario_id, clickedDate);
    } else {
       setSelectedAgendamento(agendamento);
       setSelectedDateStr(clickedDate);
       setSelectedHorarioId(agendamento.horario_id);
       setModalMode('edit');
       setDataFimFixo(agendamento.data_fim_fixo || '');
       setIsEditingDataFim(false);
       setIsModalOpen(true);
    }
  };

  const handleAdicionarAFila = async () => {
    if (!usuario) return;
    setIsSubmitting(true);
    try {
       const userId = isCoordenadorOuAdmin ? agendarPara : usuario.id;
       if (!userId) {
           toast.warning("Selecione um professor.");
           return;
       }
       
       const conflitos = await verificarConflitoProfessor(userId, selectedDateStr, selectedHorarioId);
       if (conflitos.length > 0) {
           const recursoNome = Array.isArray(conflitos[0].recursos) ? conflitos[0].recursos[0]?.nome : (conflitos[0].recursos as any)?.nome;
           toast.error("Conflito de Horário", { description: `Professor já possui registro (${conflitos[0].tipo}) neste mesmo horário no recurso: ${recursoNome}.`});
           return;
       }

       await criarAgendamento({
           recurso_id: selectedRecurso,
           horario_id: selectedHorarioId,
           data_agendamento: selectedDateStr,
           tipo: 'Pre-Reserva',
           usuario_id: userId,
           agendado_por: usuario.id
       });
       await carregarFila(selectedRecurso, selectedHorarioId, selectedDateStr);
       setSemanaOffset(prev => prev);
       if (isCoordenadorOuAdmin) setAgendarPara('');
       toast.success("Sucesso", { description: "Registro adicionado à fila!" });
    } catch(e: any) {
        toast.error("Erro", { description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoverDaFila = async (agendamentoId: string) => {
    setIsSubmitting(true);
    try {
       await cancelarOuExcluirAgendamento(agendamentoId, 'Pre-Reserva');
       await carregarFila(selectedRecurso, selectedHorarioId, selectedDateStr);
       setSemanaOffset(prev => prev);
       toast.success("Removido", { description: "O registro foi removido com sucesso." });
    } catch(e: any) {
        toast.error("Erro ao remover", { description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const determinarTipoAgendamento = () => {
    if (agendamentoFixo && isCoordenadorOuAdmin) return 'Fixo';
    
    // Regra: Semana Atual sempre 'Confirmado'
    if (semanaOffset === 0) return 'Confirmado';
    
    // Regra: Próxima semana
    if (semanaOffset === 1) {
      // Sexta-feira da semana atual -> Confirmado
      if (new Date().getDay() === 5) return 'Confirmado';
      // Outros dias -> Pre-Reserva
      return 'Pre-Reserva';
    }

    // Semanas Seguintes -> Pre-Reserva
    return 'Pre-Reserva';
  };

  const getSextaDeAnaliseStr = () => {
    if (!selectedDateStr) return '';
    const target = new Date(selectedDateStr + 'T12:00:00');
    const d = target.getDay();
    const diffToMonday = d === 0 ? -6 : 1 - d;
    const monday = new Date(target);
    monday.setDate(target.getDate() + diffToMonday);
    
    const previousFriday = new Date(monday);
    previousFriday.setDate(monday.getDate() - 3);
    
    return previousFriday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };



  const handleConfirmarAgendamento = async () => {
    if (!usuario) return;
    
    setIsSubmitting(true);
    try {
      const dataObj = new Date(selectedDateStr + 'T12:00:00');
      const indiceDiaSemana = dataObj.getDay() - 1; 

      const celulasAgs = getAgendamentosPorCelula(selectedHorarioId, indiceDiaSemana);
      const hasPreReserva = celulasAgs.some(a => a.tipo === 'Pre-Reserva');
      
      if (hasPreReserva) {
          toast.error("Conflito com Fila", { description: "Não é possível realizar registros (Confirmado/Fixo) em horários que possuem Pré-reserva na fila de espera." });
          setIsSubmitting(false);
          return;
      }

      const tipo = determinarTipoAgendamento();
      const finalUserId = agendarEscola ? null : (agendarPara || usuario.id);
      
      if (finalUserId) {
         const conflitos = await verificarConflitoProfessor(finalUserId, selectedDateStr, selectedHorarioId);
         if (conflitos.length > 0) {
             const recursoNome = Array.isArray(conflitos[0].recursos) ? conflitos[0].recursos[0]?.nome : (conflitos[0].recursos as any)?.nome;
             toast.error("Conflito de Horário", { description: `Professor já possui registro (${conflitos[0].tipo}) neste mesmo horário no recurso: ${recursoNome}.` });
             return;
         }
      }
      
      const payload: any = {
        recurso_id: selectedRecurso,
        horario_id: selectedHorarioId,
        data_agendamento: selectedDateStr,
        tipo: tipo,
        usuario_id: finalUserId,
        agendado_por: usuario.id,
      };

      if (tipo === 'Fixo') {
        const diaDaSemana = new Date(selectedDateStr + 'T12:00:00').getDay() || 7;
        payload.dia_semana_fixo = diaDaSemana;
        payload.data_inicio_fixo = selectedDateStr; 
        if (dataFimFixo) {
          payload.data_fim_fixo = dataFimFixo;
        }
      }

      await criarAgendamento(payload);
      
      setIsModalOpen(false);
      toast.success("Sucesso", { description: "Agendamento confirmado." });
      
      setTimeout(() => {
        setSemanaOffset(prev => prev); 
        window.location.reload(); 
      }, 500);

    } catch (e: any) {
      toast.error("Erro ao agendar", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAtualizarFixo = async () => {
    if (!selectedAgendamento) return;
    setIsSubmitting(true);
    try {
      await atualizarDataFimFixo(selectedAgendamento.id, dataFimFixo || null as any);
      setIsModalOpen(false);
      toast.success("Atualizado", { description: "Data atualizada com sucesso." });
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast.error("Erro ao atualizar data", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcluirAgendamento = async () => {
    if (!selectedAgendamento) return;
    const isFixo = selectedAgendamento.tipo === 'Fixo';

    setIsSubmitting(true);
    try {
      if (isFixo) {
        const dateLimit = new Date(selectedDateStr + 'T12:00:00');
        dateLimit.setDate(dateLimit.getDate() - 1);
        await atualizarDataFimFixo(selectedAgendamento.id, toLocalYYYYMMDD(dateLimit));
      } else {
        await cancelarOuExcluirAgendamento(selectedAgendamento.id, selectedAgendamento.tipo);
      }
      setIsModalOpen(false);
      toast.success("Sucesso", { description: "Registro excluído/cancelado." });
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast.error("Erro ao excluir", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const podeExcluir = (ag: AgendamentoComDetalhes | null) => {
    if (!ag) return false;
    if (isCoordenadorOuAdmin) return true;
    if ((ag.tipo === 'Pre-Reserva' || ag.tipo === 'Confirmado') && ag.usuario_id === usuario?.id) return true;
    return false;
  };

  const handleProcessarFilaSemanas = async () => {
     if (!confirm("Esta ação irá processar todas as pré-reservas da PRÓXIMA SEMANA convertendo o 1º da fila em Confirmado e removendo os demais. Deseja continuar?")) return;
     setIsProcessingQueue(true);
     try {
       const segundaFeira = getBaseMonday();
       segundaFeira.setDate(segundaFeira.getDate() + 7);
       
       const sextaFeira = new Date(segundaFeira);
       sextaFeira.setDate(segundaFeira.getDate() + 4); 
       
       const inicioStr = toLocalYYYYMMDD(segundaFeira);
       const fimStr = toLocalYYYYMMDD(sextaFeira);

       await processarFilaSemanal(inicioStr, fimStr);
       setSemanaOffset(1); // Mudar a view para a proxima semana para ver o resultado
       toast.success("Fila Processada", { description: "As pré-reservas da próxima semana foram analisadas e convertidas." });
       setTimeout(() => window.location.reload(), 1000);
     } catch (e: any) {
       toast.error("Erro ao processar", { description: e.message });
     } finally {
       setIsProcessingQueue(false);
     }
  };

  const podeAvancar = (() => {
    // Aplicação estrita da trava Institucional para todos
    if (configuracoes?.data_limite_agendamento) {
      const proximaSegunda = getBaseMonday();
      proximaSegunda.setDate(proximaSegunda.getDate() + ((semanaOffset + 1) * 7));
      const limite = new Date(configuracoes.data_limite_agendamento + 'T23:59:59');
      if (proximaSegunda > limite) return false;
    } else if (configuracoes?.semanas_limite_agendamento) {
      if (semanaOffset >= configuracoes.semanas_limite_agendamento) return false;
    }
    
    return true;
  })();

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
            <p className="text-muted-foreground mt-1 text-base">
              Gerencie reservas de salas e laboratórios da instituição.
            </p>
          </div>
          
          {isCoordenadorOuAdmin && (
             <div className="flex flex-col items-start gap-1 mt-2">
                 <Button 
                    variant="outline" 
                    onClick={handleProcessarFilaSemanas} 
                    disabled={isProcessingQueue || (!hasGlobalPreReservas && semanaOffset === 1)}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                 >
                    {isProcessingQueue ? "Processando..." : (!hasGlobalPreReservas && semanaOffset === 1) ? "Fila já processada ✔️" : "Processar Fila da Próxima Semana"}
                 </Button>
                 <span className="text-xs text-muted-foreground">
                    Utilize esta rotina para converter manualmente as pré-reservas em agendamentos confirmados para a próxima semana.
                 </span>
             </div>
          )}
        </div>
        
        <div className="flex flex-col sm:items-end gap-3 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2 bg-background p-1 rounded-lg border shadow-sm relative overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSemanaOffset(semanaOffset - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center font-medium text-sm flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {getWeekText()}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSemanaOffset(semanaOffset + 1)}
              disabled={!podeAvancar}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="w-full border-border/50 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <label className="text-sm font-medium leading-none whitespace-nowrap">
            Selecione o Recurso:
          </label>
          <div className="w-full sm:w-72">
            <Select value={selectedRecurso} onValueChange={setSelectedRecurso}>
              <SelectTrigger className="w-full text-base">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {recursos.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-base">{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden border-border/50 shadow-sm">
        <div className="w-full overflow-auto max-h-[600px] touch-pan-x touch-pan-y">
          <div className="min-w-[800px] p-0">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr className="bg-slate-50">
                    <th className="border p-3 w-32 font-semibold text-center text-muted-foreground bg-slate-50 sticky left-0 z-30">
                      <div className="flex flex-col items-center justify-center whitespace-normal break-words leading-tight gap-1">
                        {recursos.find(r => r.id === selectedRecurso)?.icone && (
                            <div className="text-muted-foreground flex items-center justify-center">
                               {renderIcon(recursos.find(r => r.id === selectedRecurso)!.icone, 18)}
                            </div>
                        )}
                        <span className="font-semibold text-sm text-foreground text-center">
                          {recursos.find(r => r.id === selectedRecurso)?.nome || 'Recurso'}
                        </span>
                      </div>
                    </th>
                    {diasSemanas.map((dia, idx) => {
                      const headerDate = getBaseMonday();
                      headerDate.setDate(headerDate.getDate() + (semanaOffset * 7) + idx);
                      const formattedDate = headerDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                      return (
                        <th key={dia} className="border p-3 font-semibold text-center text-foreground bg-slate-100">
                          <div className="flex flex-col items-center justify-center">
                            <span>{dia}</span>
                            <span className="text-xs font-normal text-muted-foreground mt-0.5">{formattedDate}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {horarios.filter(h => h.tipo === 'Aula').map((horario) => (
                    <tr key={horario.id} className="hover:bg-muted/10 transition-colors">
                      <td className="border p-3 text-center bg-slate-50 align-middle sticky left-0 z-10">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-semibold text-sm text-foreground">{horario.label}</span>
                          <span className="text-xs font-medium text-muted-foreground mt-0.5">
                            {horario.inicio.substring(0,5)} - {horario.fim.substring(0,5)}
                          </span>
                        </div>
                      </td>
                      {diasSemanas.map((_, idx) => {
                        const cellAgendamentos = getAgendamentosPorCelula(horario.id, idx);
                        const hasFixo = cellAgendamentos.some(a => a.tipo === 'Fixo');
                        const isPreReserva = cellAgendamentos.some(a => a.tipo === 'Pre-Reserva');
                        const isConfirmado = cellAgendamentos.some(a => a.tipo === 'Confirmado');
                        
                        // Determinar a cor base do fundo
                        let cellBg = '';
                        if (hasFixo) cellBg = 'bg-blue-100 hover:bg-blue-200 border-blue-200';
                        else if (isConfirmado) cellBg = 'bg-emerald-100 hover:bg-emerald-200 border-emerald-200';
                        else if (isPreReserva) cellBg = 'bg-amber-100/50 hover:bg-amber-100 border-amber-200';

                                        const isPreReservaCell = (!hasFixo && !isConfirmado && isPreReserva);
                                        const dateOfCell = getBaseMonday();
                                        dateOfCell.setDate(dateOfCell.getDate() + (semanaOffset * 7) + idx);
                                        const cellDateStr = toLocalYYYYMMDD(dateOfCell);
                                        const cacheKey = `${horario.id}_${cellDateStr}`;
                                        const myRank = rankCache[cacheKey];

                                        return (
                                          <td 
                                            key={`${horario.id}-${idx}`} 
                                            className={`group border p-2 text-center relative cursor-pointer hover:bg-muted/30 min-h-[80px] align-top transition-colors ${cellBg}`}
                                            onClick={() => handleCellClick(horario.id, idx)}
                                          >
                                            <div className="flex flex-col gap-1 min-h-[60px] w-full items-center justify-center">
                                              {cellAgendamentos.length === 0 ? (
                                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-background/50 transition-opacity">
                                                    <span className="text-sm font-medium text-primary bg-background px-2 py-1 rounded shadow">+ Agendar</span>
                                                  </div>
                                                ) : (
                                                  <>
                                                    {isPreReservaCell ? (
                                                      <div className="text-xs bg-white/80 rounded px-1.5 py-2 w-full flex flex-col items-center justify-center text-center shadow-sm border border-amber-300 cursor-pointer hover:bg-white transition-colors relative z-10 gap-1 min-h-[48px]">
                                                        <div className="font-bold text-slate-800 text-[11px] leading-tight uppercase tracking-wide">
                                                          Pré-reserva
                                                        </div>
                                                        {cellAgendamentos.some(ag => ag.usuario_id === usuario?.id) && (
                                                          <div className="text-[10px] text-emerald-800 font-bold leading-tight bg-emerald-100 rounded px-1.5 py-0.5 shadow-sm border border-emerald-200">
                                                            {myRank ? `Registrado (${myRank}º)` : 'Registrado'}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : (
                                      cellAgendamentos.map(ag => (
                                        <div key={ag.id} onClick={(e) => handleEditClick(ag, cellDateStr, e)} className="text-xs bg-white/70 rounded px-1.5 py-1 w-full text-center shadow-sm border border-black/10 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:bg-white transition-colors relative z-10">
                                          <div className="font-semibold text-slate-800 text-[11px]">
                                            {ag.usuario_id === null ? "ESCOLA" : (ag.usuarios?.apelido || ag.usuarios?.nome_completo?.split(' ')[0] || "Prof")}
                                          </div>
                                          {ag.tipo === 'Pre-Reserva' && (
                                            <div className="text-[10px] text-amber-700 font-bold leading-tight mt-0.5">Pré-reserva</div>
                                          )}
                                          {ag.tipo === 'Fixo' && (
                                            <div className="text-[10px] text-blue-700 font-bold leading-tight mt-0.5">Fixo</div>
                                          )}
                                          {ag.tipo === 'Confirmado' && (
                                            <div className="text-[10px] text-emerald-700 font-bold leading-tight mt-0.5">Confirmado</div>
                                          )}
                                          {ag.agendado_por && ag.agendado_por !== ag.usuario_id && (
                                            <div className="text-[9px] text-muted-foreground leading-tight italic truncate mt-0.5">
                                              por {ag.agendado_por_usuario?.nome_completo?.split(' ')[0]}
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </>
                                )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Novo Agendamento' : modalMode === 'queue' ? 'Fila de Pré-Reserva' : 'Detalhes do Agendamento'}
            </DialogTitle>
            <DialogDescription>
              {selectedDateStr && new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR')} - {horarios.find(h => h.id === selectedHorarioId)?.inicio.substring(0,5)} às {horarios.find(h => h.id === selectedHorarioId)?.fim.substring(0,5)}
            </DialogDescription>
          </DialogHeader>
          
          {modalMode === 'queue' ? (
             <div className="flex flex-col gap-4 py-2">
                 <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 shadow-sm leading-relaxed">
                   <strong>Fila Dinâmica de Pré-Reserva:</strong><br/>
                   Agendamentos (A) e Cancelamentos (C) são calculados no histórico dos últimos 21 dias a partir desta data. 
                   O Score S determina a prioridade de confirmação. A fórmula é <strong>S = A + C + O</strong> (onde O = Ordem de registro). Quanto menor o Score, maior a preferência no desempate de sexta-feira.
                 </div>

                 <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider">
                       <tr>
                         <th className="p-2 border-b font-medium">Professor(a)</th>
                         <th className="p-2 border-b font-bold text-center" title="Score Final (A + C + O)">S</th>
                         <th className="p-2 border-b font-medium text-center text-muted-foreground w-10" title="Quantidade Agendamentos">A</th>
                         <th className="p-2 border-b font-medium text-center text-muted-foreground w-10" title="Quantidade Cancelamentos">C</th>
                         <th className="p-2 border-b font-medium text-center text-muted-foreground w-10" title="Ordem Registrada">O</th>
                         <th className="p-2 border-b text-right min-w-[50px]">Ações</th>
                       </tr>
                     </thead>
                     <tbody>
                       {isLoadingFila ? (
                         <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm border-b">Carregando métricas da fila...</td></tr>
                       ) : filaPreReserva.length === 0 ? (
                         <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm border-b">Ninguém nesta fila de espera ainda. Pode entrar!</td></tr>
                       ) : (
                         filaPreReserva.map((item, idx) => (
                           <tr key={item.agendamento_id} className="hover:bg-slate-50 border-b last:border-0 group/row">
                             <td className="p-2 py-3 flex items-center gap-2">
                               {idx === 0 ? <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px] border border-emerald-200 shadow-sm leading-none shrink-0" title="Primeiro da Fila!">#1</span> : null}
                               <span className="truncate max-w-[120px] font-medium text-slate-700" title={item.nome_professor}>{item.nome_professor}</span>
                             </td>
                             <td className="p-2 text-center font-extrabold text-slate-900 bg-slate-50/50">{item.score}</td>
                             <td className="p-2 text-center text-xs text-muted-foreground">{item.quantidade_agendamentos}</td>
                             <td className="p-2 text-center text-xs text-muted-foreground">{item.quantidade_cancelamentos}</td>
                             <td className="p-2 text-center text-xs font-medium text-muted-foreground">{item.ordem}</td>
                             <td className="p-2 text-right">
                                {(isCoordenadorOuAdmin || usuario?.id === item.usuario_id) && (
                                   <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-700 hover:bg-red-50 ml-auto opacity-80 hover:opacity-100" title="Remover da Fila">
                                         <Trash2 className="h-4 w-4" />
                                       </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>Remover da Fila</AlertDialogTitle>
                                         <AlertDialogDescription>
                                            Tem certeza que deseja retirar {item.nome_professor} da fila de espera deste horário?
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                         <AlertDialogAction onClick={() => handleRemoverDaFila(item.agendamento_id)} className="bg-red-600 focus:ring-red-600 hover:bg-red-700">Confirmar Remoção</AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                                )}
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>

                 <div className="pt-3">
                   {isCoordenadorOuAdmin ? (
                     <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-md border border-slate-100">
                       <div className="flex-1 space-y-1.5">
                         <Label className="text-xs font-semibold text-slate-700">Gestão: Inserir em nome do Professor</Label>
                         <Select value={agendarPara} onValueChange={setAgendarPara} disabled={new Date().getDay() === 5 && semanaOffset === 1}>
                           <SelectTrigger className="h-8 text-sm w-full bg-white">
                             <SelectValue placeholder="Selecione..." />
                           </SelectTrigger>
                           <SelectContent>
                             {professores.map(p => (
                               <SelectItem key={p.id} value={p.id} className="text-sm">{p.nome}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <Button size="sm" className="h-8 shadow-sm px-4" disabled={!agendarPara || isSubmitting || (new Date().getDay() === 5 && semanaOffset === 1)} onClick={handleAdicionarAFila}>Inserir</Button>
                     </div>
                   ) : (
                     <Button 
                       className="w-full shadow-sm py-5 text-sm font-semibold tracking-wide" 
                       disabled={isSubmitting || filaPreReserva.some(f => f.usuario_id === usuario?.id) || (new Date().getDay() === 5 && semanaOffset === 1)} 
                       onClick={() => handleAdicionarAFila()}
                     >
                       {new Date().getDay() === 5 && semanaOffset === 1 ? 'Fila bloqueada para novos registros na Sexta-feira' : filaPreReserva.some(f => f.usuario_id === usuario?.id) ? 'Você já está na fila de espera' : 'Entrar na Fila de Reserva'}
                     </Button>
                   )}
                 </div>
             </div>
          ) : modalMode === 'create' ? (
            <div className="grid gap-4 py-4">
               {/* Componente de Form aqui nas proximas iteracoes */}
               
               <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-md border">
                 <span className="text-sm font-medium">Tipo Previsto:</span>
                 <Badge
                   variant={determinarTipoAgendamento() === 'Confirmado' ? 'default' : determinarTipoAgendamento() === 'Fixo' ? 'default' : 'secondary'}
                   className="w-fit"
                 >
                   {determinarTipoAgendamento()}
                 </Badge>
                 {determinarTipoAgendamento() === 'Pre-Reserva' && (
                   <p className="text-xs text-muted-foreground mt-1">
                     O sistema gerará uma fila por Score. Na sexta-feira ({getSextaDeAnaliseStr()}), o professor com menor Score terá a reserva confirmada.
                   </p>
                 )}
               </div>

               {isCoordenadorOuAdmin && (
                 <div className="space-y-4 pt-4 border-t">
                   <h4 className="text-sm font-semibold">Opções de Gestão</h4>
                   
                   <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="agendarEscola" 
                        checked={agendarEscola} 
                        onChange={(e) => {
                          setAgendarEscola(e.target.checked);
                          if (e.target.checked) setAgendarPara('');
                        }} 
                        className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      />
                      <Label htmlFor="agendarEscola" className="text-sm">Agendar para a Escola (Bloqueio Geral)</Label>
                   </div>

                   {!agendarEscola && (
                     <div className="space-y-2">
                       <Label className="text-sm">Agendar em nome de outro Professor:</Label>
                       <p className="text-xs text-muted-foreground">Deixe vazio para agendar para si mesmo.</p>
                       <Select value={agendarPara || "vazio"} onValueChange={(val) => setAgendarPara(val === "vazio" ? "" : val)}>
                         <SelectTrigger className="w-full">
                           <SelectValue placeholder="Selecione um Professor..." />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="vazio" className="text-muted-foreground italic">
                             -- Agendar para mim mesmo --
                           </SelectItem>
                           {professores.map(p => (
                             <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>

                       {agendarPara && agendarPara !== "vazio" && (
                         <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 leading-relaxed shadow-sm">
                           <strong>Atenção:</strong> Você está registrando este agendamento em nome do professor selecionado. 
                           O registro principal ficará no nome do professor, mas o sistema possui formato de auditoria que registrará 
                           explicitamente que foi você (<strong>{usuario?.nome_completo?.split(' ')[0] || 'Administrador'}</strong>) quem realizou esta operação em nome dele.
                         </div>
                       )}
                     </div>
                   )}

                   <div className="flex flex-col gap-2 mt-4">
                     <div className="flex items-center space-x-2">
                       <input 
                         type="checkbox" 
                         id="agendamentoFixo" 
                         checked={agendamentoFixo} 
                         onChange={(e) => setAgendamentoFixo(e.target.checked)} 
                         className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                       />
                       <Label htmlFor="agendamentoFixo" className="text-sm">Tornar este agendamento Fixo (Semanal)</Label>
                     </div>
                     {agendamentoFixo && (
                       <div className="space-y-2 mt-2 pl-6">
                         <Label className="text-sm">Data Final (Opcional):</Label>
                         <Input 
                           type="date" 
                           value={dataFimFixo} 
                           onChange={(e) => setDataFimFixo(e.target.value)}
                           min={selectedDateStr}
                         />
                         <p className="text-[10px] text-muted-foreground">Deixe em branco para um agendamento contínuo.</p>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          ) : (
            <div className="grid gap-4 py-4">
               <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-md border">
                 <span className="text-sm font-medium">Status Atual:</span>
                 <Badge variant={selectedAgendamento?.tipo === 'Confirmado' || selectedAgendamento?.tipo === 'Fixo' ? 'default' : 'secondary'} className="w-fit">
                   {selectedAgendamento?.tipo}
                 </Badge>
                 <div className="mt-2 text-sm text-muted-foreground">
                    <p><strong>Agendado para:</strong> {selectedAgendamento?.usuario_id ? selectedAgendamento.usuarios?.nome_completo : 'ESCOLA'}</p>
                    {selectedAgendamento?.agendado_por && selectedAgendamento.agendado_por !== selectedAgendamento.usuario_id && (
                      <div className="mt-2 p-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700">
                        <strong>Log de Auditoria:</strong> O registro foi efetuado no nome do professor, porém o procedimento foi realizado de forma sistêmica por <strong>{selectedAgendamento.agendado_por_usuario?.nome_completo}</strong>.
                      </div>
                    )}
                    {selectedAgendamento?.tipo === 'Fixo' && (
                      <>
                        <p><strong>Início:</strong> {selectedAgendamento.data_inicio_fixo ? new Date(selectedAgendamento.data_inicio_fixo + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                        <p><strong>Fim:</strong> {selectedAgendamento.data_fim_fixo ? new Date(selectedAgendamento.data_fim_fixo + 'T12:00:00').toLocaleDateString('pt-BR') : 'Contínuo'}</p>
                      </>
                    )}
                 </div>
               </div>
               
               {selectedAgendamento?.tipo === 'Fixo' && isCoordenadorOuAdmin && (
                 <div className="space-y-4 pt-4 border-t">
                   <h4 className="text-sm font-semibold">Editar Agendamento Fixo</h4>
                   <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <Label className="text-sm">Data Final (Opcional):</Label>
                        {!isEditingDataFim && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingDataFim(true)}>Modificar Data Final</Button>
                        )}
                     </div>
                     
                     {isEditingDataFim ? (
                       <div className="flex gap-2 items-center">
                         <div className="flex-1">
                           <Input 
                             type="date" 
                             value={dataFimFixo} 
                             onChange={(e) => setDataFimFixo(e.target.value)}
                             min={selectedAgendamento.data_inicio_fixo || selectedDateStr}
                           />
                         </div>
                         <Button type="button" onClick={handleAtualizarFixo} disabled={isSubmitting}>Salvar Mudança</Button>
                       </div>
                     ) : (
                       <p className="text-sm bg-slate-50 border p-2 rounded-md text-slate-700">
                         {selectedAgendamento.data_fim_fixo 
                            ? new Date(selectedAgendamento.data_fim_fixo + 'T12:00:00').toLocaleDateString('pt-BR') 
                            : 'Contínuo (Sem data final definida)'}
                       </p>
                     )}
                   </div>
                 </div>
               )}
            </div>
          )}
          
          <DialogFooter className="mt-4 pt-4 border-t flex sm:justify-between w-full">
            {modalMode === 'queue' ? (
              <div className="flex w-full justify-between items-center gap-2 flex-wrap">
                {isCoordenadorOuAdmin ? (
                  <Button type="button" variant="outline" onClick={() => setModalMode('create')} className="text-xs bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900">
                    ✚ Opções de Gestão (Forçar Fixo)
                  </Button>
                ) : <span />}
                <Button onClick={() => setIsModalOpen(false)}>Fechar Janela</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            )}

            {modalMode === 'create' ? (
              <Button type="button" onClick={handleConfirmarAgendamento} disabled={isSubmitting}>Confirmar Agendamento</Button>
            ) : modalMode === 'edit' ? (
              <div className="flex gap-2 justify-end items-center flex-row-reverse w-full sm:w-auto mt-2 sm:mt-0">
                {podeExcluir(selectedAgendamento) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" disabled={isSubmitting}>
                        {selectedAgendamento?.tipo === 'Fixo' ? 'Parar' : 'Cancelar / Excluir'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmação</AlertDialogTitle>
                        <AlertDialogDescription>
                           {selectedAgendamento?.tipo === 'Fixo' 
                             ? `Atenção: Você está interrompendo este agendamento fixo a partir de ${new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR')}. Todas as reservas a partir desta data serão apagadas. Deseja confirmar?`
                             : 'Tem certeza que deseja cancelar e excluir permanentemente este agendamento?'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleExcluirAgendamento} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                          {selectedAgendamento?.tipo === 'Fixo' ? 'Confirmar Interrupção' : 'Compreendo, Excluir'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
