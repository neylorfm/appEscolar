import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Horario, getHorarios, criarHorario, deletarHorario, TipoHorario } from '@/services/horarios'
import { useAuth } from '@/contexts/AuthContext'

const TIPOS_OPCOES: TipoHorario[] = ['Aula', 'Intervalo', 'Almoço', 'Janta']

export function HorariosTab() {
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Modals and Alerts
  const [errorDesc, setErrorDesc] = useState<string | null>(null)
  
  // Para novas linhas
  const [newRow, setNewRow] = useState<{ inicio: string; fim: string; tipo: TipoHorario } | null>(null)

  const { usuario } = useAuth()
  const podeEditar = usuario?.papel === 'Administrador'

  useEffect(() => {
    loadHorarios()
  }, [])

  async function loadHorarios() {
    try {
      setLoading(true)
      const data = await getHorarios()
      setHorarios(data)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao carregar horários.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMode = () => {
    if (isEditMode) {
      setNewRow(null)
    }
    setIsEditMode(!isEditMode)
  }

  // Utility to convert "HH:MM" to minutes for comparison
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const handleAddNewRow = () => {
    // Determine logical next start time based on last item
    let nextStart = '07:20'
    let nextEnd = '08:10'
    let nextType: TipoHorario = 'Aula'

    if (horarios.length > 0) {
      const lastHorario = horarios[horarios.length - 1]
      nextStart = lastHorario.fim
      // default to 50 min
      const startMin = timeToMinutes(nextStart)
      const endMin = startMin + 50
      const h = Math.floor(endMin / 60).toString().padStart(2, '0')
      const m = (endMin % 60).toString().padStart(2, '0')
      nextEnd = `${h}:${m}`
    }

    setNewRow({ inicio: nextStart, fim: nextEnd, tipo: nextType })
  }

  const validateNewSlot = () => {
    if (!newRow) return false
    
    // Check missing fields
    if (!newRow.inicio || !newRow.fim || !newRow.tipo) {
       setErrorDesc('Todos os campos são obrigatórios.')
       return false
    }

    const newStart = timeToMinutes(newRow.inicio)
    const newEnd = timeToMinutes(newRow.fim)

    // Check if End < Start
    if (newEnd <= newStart) {
       setErrorDesc('O horário de término não pode ser menor ou igual ao horário de início.')
       return false
    }

    // Check overlaps against existing
    if (horarios.length > 0) {
       const lastHorario = horarios[horarios.length - 1]
       const lastEnd = timeToMinutes(lastHorario.fim)
       
       if (newStart < lastEnd) {
          setErrorDesc('Não é possível inserir um horário que comece antes do término do último horário definido na grade.')
          return false
       }
    }

    return true
  }

  // Calculate what the label SHOULD be given the CURRENT list plus the new row
  const calculateLabel = (tipo: TipoHorario) => {
    if (tipo !== 'Aula') return tipo
    
    // Count how many 'Aula' we have so far
    const aulaCount = horarios.filter(h => h.tipo === 'Aula').length
    return `${aulaCount + 1}ª Aula`
  }

  const handleSaveNewRow = async () => {
    if (!validateNewSlot()) return
    if (!newRow) return

    try {
      const generatedLabel = calculateLabel(newRow.tipo)
      const novoHorario = await criarHorario({
        inicio: newRow.inicio,
        fim: newRow.fim,
        tipo: newRow.tipo,
        label: generatedLabel
      })
      
      setHorarios(prev => [...prev, novoHorario].sort((a,b) => timeToMinutes(a.inicio) - timeToMinutes(b.inicio)))
      setNewRow(null)
      
      // Auto trigger another row to facilitate sequential building
      // Comment this out if not desired
      // handleAddNewRow() 
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao salvar novo horário.')
    }
  }

  const handleDelete = async (id: string) => {
    // Optional: Warn user that deleting from the middle might mess up "Aula" numbering logic?
    // Since we generate them progressively, it's usually safest to just allow deleting the very last one.
    // For now, let's just allow deletion.
    if (!confirm('Deseja realmente excluir este horário?')) return

    try {
      await deletarHorario(id)
      setHorarios(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao excluir horário.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Grade de Horários</h2>
        <p className="text-sm text-muted-foreground">
          Crie e gerencie os períodos de aula, intervalos e refeições da escola.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Estrutura de Turnos</CardTitle>
          {podeEditar && (
            <Button 
               variant="outline" 
               size="sm" 
               onClick={handleToggleMode}
               className="h-8 gap-2"
            >
              {isEditMode ? (
                 <>
                   <Check className="h-4 w-4" />
                   Concluir Edição
                 </>
              ) : (
                 <>
                   <Edit2 className="h-4 w-4" />
                   Modo Edição
                 </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="w-full text-sm">
            {/* Header */}
            <div className={`grid ${isEditMode ? 'grid-cols-[80px_1fr_1fr_1fr_80px]' : 'grid-cols-[80px_1fr_1fr_1fr]'} gap-4 mb-2 pb-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider`}>
               <div>#</div>
               <div>Início</div>
               <div>Término</div>
               <div>Tipo</div>
               {isEditMode && <div className="text-right">Ação</div>}
            </div>

            {/* Body */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando grade...</div>
            ) : horarios.length === 0 && !newRow ? (
              <div className="py-8 text-center text-muted-foreground">Nenhuma grade definida. Clique em Modo Edição para começar a montar o horário sequencial.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {horarios.map((horario) => (
                  <div key={horario.id} className={`grid ${isEditMode ? 'grid-cols-[80px_1fr_1fr_1fr_80px]' : 'grid-cols-[80px_1fr_1fr_1fr]'} gap-4 py-3 items-center group`}>
                     <div className="font-medium text-slate-800">{horario.label}</div>
                     <div className="text-slate-600">{horario.inicio.slice(0, 5)}</div>
                     <div className="text-slate-600">{horario.fim.slice(0, 5)}</div>
                     <div className={`text-slate-600 font-medium ${horario.tipo === 'Intervalo' || horario.tipo === 'Almoço' ? 'text-orange-600' : 'text-blue-600'}`}>
                        {horario.tipo}
                     </div>
                     
                     {isEditMode && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(horario.id)}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                     )}
                  </div>
                ))}

                {/* Nova Linha para Inserção (Apenas Adicionar na Sequência) */}
                {isEditMode && newRow && (
                  <div className="grid grid-cols-[80px_1fr_1fr_1fr_80px] gap-4 py-3 items-center bg-muted/30 -mx-4 px-4 border-l-2 border-l-primary">
                    <div className="font-medium text-primary text-xs italic">Novo</div>
                    
                    <div>
                      <Input 
                        type="time"
                        value={newRow.inicio} 
                        onChange={(e) => setNewRow({ ...newRow, inicio: e.target.value })} 
                        className="h-9 w-24 bg-white"
                      />
                    </div>
                    <div>
                      <Input 
                        type="time"
                        value={newRow.fim} 
                        onChange={(e) => setNewRow({ ...newRow, fim: e.target.value })} 
                        className="h-9 w-24 bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewRow()
                        }}
                      />
                    </div>
                    <div>
                      <Select value={newRow.tipo} onValueChange={(val: TipoHorario) => setNewRow({ ...newRow, tipo: val })}>
                        <SelectTrigger className="h-9 w-[120px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_OPCOES.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => setNewRow(null)}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                       <Button variant="default" size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveNewRow}>
                          <Check className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isEditMode && !newRow && (
              <div className="pt-4 flex justify-center border-t mt-2">
                 <Button 
                   variant="outline" 
                   className="w-full max-w-[250px] border-dashed text-muted-foreground hover:text-primary hover:border-primary"
                   onClick={handleAddNewRow}
                 >
                   <Plus className="mr-2 h-4 w-4" />
                   Adicionar Novo Horário
                 </Button>
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Error Modal */}
      <Dialog open={!!errorDesc} onOpenChange={(open) => {
         if (!open) setErrorDesc(null)
      }}>
        <DialogContent className="sm:max-w-[425px] flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 text-red-600">
             <AlertCircle size={32} />
           </div>
           
           <DialogHeader>
             <DialogTitle className="text-xl text-center">Atenção</DialogTitle>
             <DialogDescription className="text-center pt-2 text-base text-slate-700">
               {errorDesc}
             </DialogDescription>
           </DialogHeader>
           
           <DialogFooter className="mt-4 w-full flex-col sm:flex-col items-center gap-2">
              <Button 
                variant="default" 
                onClick={() => setErrorDesc(null)} 
                className="w-full h-11"
              >
                 Entendi
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
