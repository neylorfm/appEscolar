import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar, Settings, Download, Search, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { CalendarioEvento, getEventosPorAno, getAnoLetivo, CalendarioAnoLetivo } from "@/services/calendario"
import GerenciarAnoModal from "./GerenciarAnoModal"
import ImportarCSVModal from "./ImportarCSVModal"
import { toast } from "sonner"
import AddEventoModal from "./AddEventoModal"

export const DEFAULT_EVENT_TYPES = [
  { nome: 'Geral', cor: '#9ca3af' },
  { nome: 'Prova Parcial', cor: '#3b82f6' },
  { nome: 'Prova Bimestral', cor: '#8b5cf6' },
  { nome: 'Feriado', cor: '#ef4444' },
  { nome: 'Sábado Letivo', cor: '#f97316' },
  { nome: 'Evento', cor: '#d946ef' },
  { nome: 'Limite Provas', cor: '#eab308' },
  { nome: 'Fim Bimestre', cor: '#1f2937' },
];

export default function CalendarioView() {
    const { usuario } = useAuth()
    const isCoordAdm = usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador'
    const [searchParams, setSearchParams] = useSearchParams()
    
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState("month")
    const [selectedBimesterIdx, setSelectedBimesterIdx] = useState<string>("0")
    const [isViewSelectOpen, setIsViewSelectOpen] = useState(false)
    
    const [isGerenciarOpen, setIsGerenciarOpen] = useState(searchParams.get("manage") === "true")
    const [isImportarOpen, setIsImportarOpen] = useState(false)
    const [isAddEventoOpen, setIsAddEventoOpen] = useState(false)
    const [selectedDateToAdd, setSelectedDateToAdd] = useState<Date | null>(null)
    const [selectedEventoParaModal, setSelectedEventoParaModal] = useState<CalendarioEvento | undefined>(undefined)
    
    const [eventos, setEventos] = useState<CalendarioEvento[]>([])
    const [anoLetivoData, setAnoLetivoData] = useState<CalendarioAnoLetivo | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchCalendario = async () => {
        setLoading(true)
        try {
           const ano = currentDate.getFullYear()
           const [dataAno, listaEventos] = await Promise.all([
               getAnoLetivo(ano),
               getEventosPorAno(ano)
           ])
           setAnoLetivoData(dataAno)
           setEventos(listaEventos || [])
        } catch (error) {
           console.error("Erro ao carregar calendário:", error)
        } finally {
           setLoading(false)
        }
    }

    useEffect(() => {
        fetchCalendario()
        // limpa search param se der reload com ele
        if (searchParams.get("manage")) {
            setSearchParams({})
        }
    }, [currentDate.getFullYear()])

    const tipos = anoLetivoData && anoLetivoData.tipos_evento_customizados.length > 0 
        ? [...DEFAULT_EVENT_TYPES, ...anoLetivoData.tipos_evento_customizados]
        : DEFAULT_EVENT_TYPES

    const handlePrevious = () => setCurrentDate(v => subMonths(v, 1))
    const handleNext = () => setCurrentDate(v => addMonths(v, 1))
    const handleToday = () => setCurrentDate(new Date())

    const handleSelectMonth = (value: string) => {
        const novoD = new Date(currentDate)
        novoD.setMonth(parseInt(value))
        setCurrentDate(novoD)
    }

    // Cálculos do grid
    // Função de renderização de um mês isolado (usada em ambas as views)
    const renderMonthGrid = (baseDate: Date, highlightStart?: string, highlightEnd?: string) => {
        const mStart = startOfMonth(baseDate)
        const mEnd = endOfMonth(mStart)
        const sDate = startOfWeek(mStart, { weekStartsOn: 0 })
        const eDate = endOfWeek(mEnd, { weekStartsOn: 0 })
        const days = eachDayOfInterval({ start: sDate, end: eDate })

        return (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                <div className="min-w-[760px]">
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                        {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
                            <div key={day} className="py-3 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-widest border-r border-slate-200 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-fr">
                        {loading ? (
                        <div className="col-span-7 py-20 text-center text-slate-400 font-medium">Carregando calendário...</div>
                    ) : (
                        days.map((day, idx) => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const diaEventos = eventos.filter(e => e.data_evento === dateStr)
                            const bimestresIntersect = anoLetivoData?.periodos.filter(p => p.inicio === dateStr || p.fim === dateStr) || []
                            
                            const isCurrentMonth = isSameMonth(day, baseDate)
                            const isHoje = isToday(day)

                            // Highlight out of bounds visual when inside bimester view
                            let isOutBimester = false
                            if (highlightStart && highlightEnd) {
                                isOutBimester = day < new Date(highlightStart + 'T00:00:00') || day > new Date(highlightEnd + 'T23:59:59')
                            }

                            return (
                                <div 
                                    key={day.toISOString()} 
                                    className={`min-h-[120px] p-2 border-b border-r border-slate-100 last:border-r-0 relative group transition-colors 
                                        ${!isCurrentMonth ? 'bg-slate-50/50 opacity-40' : (isOutBimester ? 'bg-slate-50 opacity-60' : 'bg-white hover:bg-slate-50')} 
                                        ${idx % 7 === 6 ? 'border-r-0' : ''}`}
                                    onClick={() => {
                                        if (isCoordAdm && isCurrentMonth) {
                                            setSelectedDateToAdd(day)
                                            setSelectedEventoParaModal(undefined)
                                            setIsAddEventoOpen(true)
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isHoje ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {isCoordAdm && isCurrentMonth && (
                                            <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5 mt-2">
                                        {diaEventos.map(ev => {
                                            const isDark = ev.tipo === 'Fim Bimestre' || ev.cor === '#1f2937' || ev.cor === '#000000'
                                            return (
                                                <div 
                                                    key={ev.id} 
                                                    className="text-[10px] sm:text-[11px] font-semibold px-2 py-1.5 rounded shadow-sm transition-all hover:brightness-95 cursor-pointer border border-transparent hover:border-black/10 flex flex-col gap-[2px]"
                                                    style={{ 
                                                        backgroundColor: isDark ? ev.cor : `${ev.cor}1A`,
                                                        color: isDark ? '#ffffff' : ev.cor,
                                                    }}
                                                    title={ev.descricao || ev.nome}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedDateToAdd(day)
                                                        setSelectedEventoParaModal(ev)
                                                        setIsAddEventoOpen(true)
                                                    }}
                                                >
                                                    <span className="leading-tight break-words whitespace-normal">{ev.nome}</span>
                                                    <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-70 font-extrabold">{ev.tipo}</span>
                                                </div>
                                            )
                                        })}

                                        {bimestresIntersect.map(bim => {
                                            const isStart = bim.inicio === dateStr
                                            return (
                                                <div key={bim.nome} className="text-[10px] font-bold px-2 py-1 rounded truncate bg-slate-100 text-slate-600 border border-slate-200">
                                                    {isStart ? 'Início ' : 'Fim '}{bim.nome}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    </div>
                </div>

                {/* Headers da semana (Rodapé) */}
                <div className="min-w-[760px]">
                    <div className="grid grid-cols-7 bg-slate-50/80 border-t border-slate-200">
                        {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(day => (
                            <div key={`footer-${day}`} className="py-2 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-r border-slate-200 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 pb-20 w-full max-w-[1400px] mx-auto">
            {/* Cabecalho Principal */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-4 gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Calendário Escolar</h1>
                    </div>
                </div>
            </div>

            {/* Tolsbar */}
            <div className="flex flex-col md:flex-row items-center justify-between py-2 gap-4">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                    
                    <Button 
                        variant="outline" 
                        onClick={() => setIsViewSelectOpen(true)}
                        className="font-extrabold text-indigo-700 bg-indigo-50/50 shadow-sm border-indigo-200 hover:bg-indigo-100/50 hover:border-indigo-300 transition-all rounded-xl relative pr-8"
                    >
                        <Search className="w-4 h-4 mr-2 opacity-50" />
                        {viewMode === 'month' ? 'Visão Mensal' : (anoLetivoData?.periodos[parseInt(selectedBimesterIdx)]?.nome || 'Bimestre')}
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50">▼</span>
                    </Button>
                    
                    <Button variant="outline" onClick={handleToday} className="font-semibold text-slate-600 bg-white shadow-sm border-slate-200 hover:bg-slate-50">
                        HOJE
                    </Button>

                    {isCoordAdm && (
                        <>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold tracking-wide shadow-sm" onClick={() => setIsImportarOpen(true)}>
                                IMPORTAR CSV
                            </Button>
                            
                            <Button variant="secondary" className="bg-slate-800 text-white hover:bg-slate-900 font-bold shadow-sm" onClick={() => setIsGerenciarOpen(true)}>
                                <Settings className="h-4 w-4 mr-2" />
                                GERENCIAR PERÍODOS
                            </Button>
                        </>
                    )}
                </div>

                {viewMode === 'month' && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={handlePrevious}>
                            &lt;
                        </Button>
                        <div className="relative group flex items-center justify-center">
                            <input 
                                type="month" 
                                value={format(currentDate, "yyyy-MM")} 
                                onChange={(e) => {
                                    if(e.target.value) {
                                        const [y, m] = e.target.value.split('-')
                                        const novoD = new Date(currentDate)
                                        novoD.setFullYear(parseInt(y))
                                        novoD.setMonth(parseInt(m) - 1)
                                        setCurrentDate(novoD)
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                title="Escolher Mês/Ano"
                            />
                            <span className="font-extrabold uppercase min-w-[140px] text-center text-slate-700 tracking-wider group-hover:text-blue-600 transition-colors pointer-events-none">
                                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={handleNext}>
                            &gt;
                        </Button>
                    </div>
                )}
            </div>

            {/* Rendering */}
            <div className="flex flex-col gap-8">
                {viewMode === "month" && (
                    renderMonthGrid(currentDate)
                )}

                {viewMode === "bimester" && (() => {
                    if (!anoLetivoData?.periodos || anoLetivoData.periodos.length === 0) {
                        return <div className="py-20 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">Nenhum período cadastrado neste ano.</div>
                    }
                    const periodo = anoLetivoData.periodos[parseInt(selectedBimesterIdx)]
                    if (!periodo || !periodo.inicio || !periodo.fim) {
                        return <div className="py-20 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">Datas não configuradas para {periodo?.nome || "o bimestre"}.</div>
                    }
                    
                    const [yStart, mStart, dStart] = periodo.inicio.split('-').map(Number)
                    const [yEnd, mEnd, dEnd] = periodo.fim.split('-').map(Number)
                    const dInicio = new Date(yStart, mStart - 1, dStart)
                    
                    const monthsDiff = (yEnd - yStart) * 12 + (mEnd - mStart)
                    
                    return (
                        <div className="flex flex-col gap-6 w-full">
                            {Array.from({ length: Math.max(1, monthsDiff + 1) }).map((_, i) => {
                                const mesAtual = addMonths(dInicio, i)
                                return (
                                    <div key={i} className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-2">{format(mesAtual, "MMMM yyyy", { locale: ptBR })}</h3>
                                        {renderMonthGrid(mesAtual, periodo.inicio, periodo.fim)}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })()}
            </div>

            {/* View Selector Modal */}
            <Dialog open={isViewSelectOpen} onOpenChange={setIsViewSelectOpen}>
                <DialogContent className="sm:max-w-md w-[90vw] md:w-full rounded-3xl p-0 overflow-hidden border-0 shadow-2xl gap-0">
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-6 md:p-8 text-center text-white relative">
                        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Qual visualização deseja?</h2>
                        <p className="text-indigo-100/90 text-sm mt-1 font-medium">Escolha a melhor lupa para o seu calendário</p>
                    </div>
                    <div className="p-4 md:p-6 bg-slate-50/50 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                        <button 
                           onClick={() => { setViewMode('month'); setIsViewSelectOpen(false) }}
                           className={`group flex items-center p-4 rounded-2xl border-2 transition-all ${viewMode === 'month' ? 'border-indigo-500 bg-indigo-50/80 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg'}`}
                        >
                           <span className="text-3xl mr-4 group-hover:scale-110 transition-transform origin-center">📅</span>
                           <div className="text-left flex-1">
                              <h3 className={`text-base font-bold ${viewMode === 'month' ? 'text-indigo-900' : 'text-slate-800'}`}>Visão Mensal Clássica</h3>
                              <p className="text-xs text-slate-500 font-medium">Fluxo tradicional mês a mês</p>
                           </div>
                           {viewMode === 'month' && <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-sm" />}
                        </button>

                        {anoLetivoData?.periodos.map((p, idx) => {
                            const isSelected = viewMode === 'bimester' && selectedBimesterIdx === idx.toString();
                            return (
                                <button 
                                   key={idx}
                                   onClick={() => { setViewMode('bimester'); setSelectedBimesterIdx(idx.toString()); setIsViewSelectOpen(false) }}
                                   className={`group flex items-center p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-violet-500 bg-violet-50/80 shadow-md ring-4 ring-violet-500/10' : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-lg'}`}
                                >
                                   <span className="text-3xl mr-4 group-hover:scale-110 transition-transform origin-center">📚</span>
                                   <div className="text-left flex-1">
                                      <h3 className={`text-base font-bold ${isSelected ? 'text-violet-900' : 'text-slate-800'}`}>{p.nome}</h3>
                                      <p className="text-xs text-slate-500 font-medium">Grade contínua de todos os meses do período</p>
                                   </div>
                                   {isSelected && <div className="w-4 h-4 rounded-full bg-violet-500 shadow-sm" />}
                                </button>
                            )
                        })}
                        {(!anoLetivoData?.periodos || anoLetivoData.periodos.length === 0) && (
                            <p className="text-center text-sm text-slate-400 py-4 font-medium">Bimestres não configurados para o ano.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modals placeholders */}
            {isGerenciarOpen && anoLetivoData && (
                <GerenciarAnoModal 
                    currentAnoLetivo={anoLetivoData}
                    isOpen={isGerenciarOpen} 
                    onClose={() => {
                        setIsGerenciarOpen(false)
                        fetchCalendario()
                    }} 
                />
            )}
            
            {/* If there's no year data yet, and they click gerenciar, we should pass an empty skeleton */}
            {isGerenciarOpen && !anoLetivoData && !loading && (
                 <GerenciarAnoModal 
                    currentAnoLetivo={{
                        ano_letivo: currentDate.getFullYear(),
                        inicio_ano: `${currentDate.getFullYear()}-02-01`,
                        fim_ano: `${currentDate.getFullYear()}-12-15`,
                        previsao_proximo_ano: `${currentDate.getFullYear()+1}-02-01`,
                        periodos: [
                            {nome: '1º Bimestre', inicio: '', fim: ''},
                            {nome: '2º Bimestre', inicio: '', fim: ''},
                            {nome: '3º Bimestre', inicio: '', fim: ''},
                            {nome: '4º Bimestre', inicio: '', fim: ''},
                            {nome: 'Recuperação Final', inicio: '', fim: ''},
                        ],
                        tipos_evento_customizados: []
                    }}
                    isOpen={isGerenciarOpen} 
                    onClose={() => {
                        setIsGerenciarOpen(false)
                        fetchCalendario()
                    }} 
                />
            )}

            {isAddEventoOpen && selectedDateToAdd && (
                <AddEventoModal
                   isOpen={isAddEventoOpen}
                   onClose={() => {
                       setIsAddEventoOpen(false)
                       setSelectedDateToAdd(null)
                       setSelectedEventoParaModal(undefined)
                       fetchCalendario()
                   }}
                   data={selectedDateToAdd}
                   anoLetivoId={currentDate.getFullYear()}
                   tiposDisponiveis={tipos}
                   eventoExistente={selectedEventoParaModal}
                   somenteLeitura={!isCoordAdm}
                />
            )}

            {isImportarOpen && (
                <ImportarCSVModal
                    isOpen={isImportarOpen}
                    onClose={() => {
                        setIsImportarOpen(false)
                        fetchCalendario()
                    }}
                    tipos={tipos}
                    anoContexto={currentDate.getFullYear()}
                />
            )}
        </div>
    )
}
