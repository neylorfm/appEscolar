import { useState, useEffect } from 'react';
import { useInstituicao } from '../../contexts/InstituicaoContext';
import { Card, CardContent } from '../../components/ui/card';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { criarAgendamento, getAgendamentosPorPeriodo, AgendamentoComDetalhes } from '../../services/agendamentos';
import { getRecursos } from '../../services/recursos';
import { getHorarios, Horario } from '../../services/horarios';

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

export default function Agendamentos() {
  const { configuracoes } = useInstituicao();
  const { usuario } = useAuth();
  const [semanaOffset, setSemanaOffset] = useState(0); 
  const [recursos, setRecursos] = useState<{ id: string; nome: string }[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoComDetalhes[]>([]);
  const [selectedRecurso, setSelectedRecurso] = useState<string>('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHorarioId, setSelectedHorarioId] = useState<string>('');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [agendarPara, setAgendarPara] = useState<string>(''); // Vazio = professor logado
  const [agendarEscola, setAgendarEscola] = useState(false);
  const [agendamentoFixo, setAgendamentoFixo] = useState(false);
  // Para fins de simplificacao visual na criação inicial
  const diasSemanas = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  useEffect(() => {
    async function loadFiltros() {
      try {
        const [recs, hrs] = await Promise.all([
          getRecursos(),
          getHorarios()
        ]);
        setRecursos(recs.filter(r => r.ativo));
        if (recs.length > 0) setSelectedRecurso(recs[0].id);
        
        // Ordenar os horarios
        const sortedHrs = hrs.sort((a, b) => a.inicio.localeCompare(b.inicio));
        setHorarios(sortedHrs);
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
        const ags = await getAgendamentosPorPeriodo(inicioStr, fimStr);
        setAgendamentos(ags);
      } catch (e) {
        console.error("Erro ao puxar agendamentos", e);
      }
    }
    
    // Initial load
    loadAgendamentos();

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
  }, [semanaOffset, selectedRecurso]);

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

  const openModal = (horarioId: string, indiceDiaSemana: number) => {
    // Calcular a data exata
    const targetDate = getBaseMonday();
    targetDate.setDate(targetDate.getDate() + (semanaOffset * 7) + indiceDiaSemana);
    
    // Validacao basica de passado 
    // (a API tbm vai bloquear no backend mas é bom no front tbm)
    if (targetDate < new Date() && targetDate.toDateString() !== new Date().toDateString()) {
       // Não deixa agendar dia que passou
       alert("Não é possível agendar em datas passadas.");
       return;
    }

    setSelectedDateStr(toLocalYYYYMMDD(targetDate));
    setSelectedHorarioId(horarioId);
    setIsModalOpen(true);
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

  const isCoordenadorOuAdmin = usuario?.papel === 'Coordenador' || usuario?.papel === 'Administrador';

  const handleConfirmarAgendamento = async () => {
    if (!usuario) return;
    
    setIsSubmitting(true);
    try {
      const tipo = determinarTipoAgendamento();
      
      const payload: any = {
        recurso_id: selectedRecurso,
        horario_id: selectedHorarioId,
        data_agendamento: selectedDateStr,
        tipo: tipo,
        // Se agendado por outro (só admin/coord pode fazer isso) ou se for pra escola (null)
        usuario_id: agendarEscola ? null : (agendarPara || usuario.id),
        agendado_por: usuario.id,
      };

      if (tipo === 'Fixo') {
        const diaDaSemana = new Date(selectedDateStr + 'T12:00:00').getDay() || 7;
        payload.dia_semana_fixo = diaDaSemana;
        payload.data_inicio_fixo = selectedDateStr; // Opcionalmente uma tela de Fixo faria o Fim também
      }

      await criarAgendamento(payload);
      
      // Recarregar agendamentos (simplificado chamando um reload forçado da state ou disparando um evento)
      // Como estamos usando useEffect para carregar, podemos dar trigger mudando um state dummy ou fechando modal + timeout
      setIsModalOpen(false);
      
      // Refresh quick
      setTimeout(() => {
        setSemanaOffset(prev => prev); // Isso infelizmente não vai disparar o useEffect a menos que mude, então ideal seria um signal state.
        window.location.reload(); // Simplificação rústica pro MVP. O melhor seria abstrair o fetchAgs
      }, 500);

    } catch (e: any) {
      alert("Erro ao criar agendamento: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const podeAvancar = isCoordenadorOuAdmin || (configuracoes?.semanas_limite_agendamento && semanaOffset < configuracoes.semanas_limite_agendamento);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Gerencie reservas de salas e laboratórios da instituição.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 bg-background p-1 rounded-lg border shadow-sm">
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
        <ScrollArea className="w-full h-[600px]">
          <div className="min-w-[800px] p-0">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr className="bg-slate-50">
                    <th className="border p-3 w-32 font-semibold text-center text-muted-foreground bg-slate-50"><Clock className="h-4 w-4 mx-auto" /></th>
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
                      <td className="border p-3 text-center text-sm font-medium bg-muted/20">
                        {horario.inicio.substring(0,5)} - {horario.fim.substring(0,5)}
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

                        return (
                          <td 
                            key={`${horario.id}-${idx}`} 
                            className={`border p-2 text-center relative cursor-pointer hover:bg-muted/30 min-h-[80px] align-top transition-colors ${cellBg}`}
                            onClick={() => openModal(horario.id, idx)}
                          >
                            <div className="flex flex-col gap-1 min-h-[60px] w-full items-center justify-center">
                              {cellAgendamentos.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-background/50 transition-opacity">
                                  <span className="text-sm font-medium text-primary bg-background px-2 py-1 rounded shadow">+ Agendar</span>
                                </div>
                              ) : (
                                cellAgendamentos.map(ag => (
                                  <div key={ag.id} className="text-xs bg-white/70 rounded px-1.5 py-1 w-full text-center shadow-sm border border-black/10 whitespace-nowrap overflow-hidden text-ellipsis">
                                    <div className="font-semibold text-slate-800 text-[11px]">
                                      {ag.usuario_id === null ? "ESCOLA" : (ag.usuarios?.nome_completo?.split(' ')[0] || "Prof")}
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
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              {selectedDateStr && new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR')} - {horarios.find(h => h.id === selectedHorarioId)?.inicio.substring(0,5)} às {horarios.find(h => h.id === selectedHorarioId)?.fim.substring(0,5)}
            </DialogDescription>
          </DialogHeader>
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
                   O sistema gerará uma fila por Score. Na sexta-feira, o professor com menor Score terá a reserva confirmada.
                 </p>
               )}
             </div>

             {isCoordenadorOuAdmin && (
               <div className="space-y-4 pt-4 border-t">
                 <h4 className="text-sm font-semibold">Opções de Administrador</h4>
                 
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
                     <Input 
                       placeholder="ID do Professor (temp)" 
                       value={agendarPara} 
                       onChange={(e) => setAgendarPara(e.target.value)}
                     />
                   </div>
                 )}

                 <div className="flex items-center space-x-2 mt-4">
                    <input 
                      type="checkbox" 
                      id="agendamentoFixo" 
                      checked={agendamentoFixo} 
                      onChange={(e) => setAgendamentoFixo(e.target.checked)} 
                      className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    />
                    <Label htmlFor="agendamentoFixo" className="text-sm">Tornar este agendamento Fixo (Semanal)</Label>
                 </div>
               </div>
             )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleConfirmarAgendamento} disabled={isSubmitting}>Confirmar Agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
