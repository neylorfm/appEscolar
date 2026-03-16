import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Area, getAreas, criarArea, atualizarArea, deletarArea } from '@/services/areas'
import { Usuario, getUsuarios } from '@/services/usuarios'
import { useAuth } from '@/contexts/AuthContext'

export function AreasTab() {
  const [areas, setAreas] = useState<Area[]>([])
  const [professores, setProfessores] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals and Alerts
  const [errorDesc, setErrorDesc] = useState<string | null>(null)
  
  // Inline Editing
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPcas, setEditPcas] = useState<string[]>([])
  
  // Para novas linhas
  const [newRowNome, setNewRowNome] = useState<string | null>(null)
  const [newRowPcas, setNewRowPcas] = useState<string[]>([])

  const { usuario } = useAuth()
  const podeEditar = usuario?.papel === 'Administrador'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [areasData, usuariosData] = await Promise.all([
        getAreas(),
        getUsuarios()
      ])
      
      setAreas(areasData)
      // Only professors can be PCAs
      setProfessores(usuariosData.filter(u => u.papel === 'Professor'))
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMode = () => {
    if (isEditMode) {
      setNewRowNome(null)
      setEditingRowId(null)
    }
    setIsEditMode(!isEditMode)
  }

  const handleStartEdit = (area: Area) => {
    setEditingRowId(area.id)
    setEditNome(area.nome)
    setEditPcas(area.pcas || [])
    setNewRowNome(null)
  }

  const handleAddNewRow = () => {
    setNewRowNome('')
    setNewRowPcas([])
    setEditingRowId(null)
  }

  const togglePcaSelection = (pcaId: string, isNewRow: boolean) => {
    if (isNewRow) {
      setNewRowPcas(prev => 
        prev.includes(pcaId) ? prev.filter(id => id !== pcaId) : [...prev, pcaId]
      )
    } else {
      setEditPcas(prev => 
        prev.includes(pcaId) ? prev.filter(id => id !== pcaId) : [...prev, pcaId]
      )
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editNome.trim()) {
      setErrorDesc('O nome da área não pode ficar vazio.')
      return
    }

    try {
      const atualizada = await atualizarArea(id, editNome, editPcas)
      setAreas(prev => prev.map(a => a.id === id ? atualizada : a).sort((a,b) => a.nome.localeCompare(b.nome)))
      setEditingRowId(null)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao atualizar área.')
    }
  }

  const handleSaveNewRow = async () => {
    if (!newRowNome?.trim()) {
      setErrorDesc('O nome da área não pode ficar vazio.')
      return
    }

    try {
      const nova = await criarArea(newRowNome, newRowPcas)
      setAreas(prev => [...prev, nova].sort((a,b) => a.nome.localeCompare(b.nome)))
      setNewRowNome(null)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao salvar área.')
    }
  }

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!confirm('Deseja realmente excluir esta área? As disciplinas associadas a ela também serão excluídas.')) return

    try {
      await deletarArea(id)
      setAreas(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao excluir área.')
    }
  }

  const getPcaNames = (pcaIds: string[]) => {
    if (!pcaIds || pcaIds.length === 0) return 'Sem PCA definido'
    
    return pcaIds.map(id => {
      const prof = professores.find(p => p.id === id)
      return prof ? prof.nome_completo : 'Desconhecido'
    }).join(', ')
  }

  // Componente de Seleção Múltipla Simplificado para os PCAs
  const PcaSelector = ({ selectedIds, isNewRow }: { selectedIds: string[], isNewRow: boolean }) => (
    <div className="flex flex-wrap gap-1 mt-1">
       {professores.map(prof => {
          const isSelected = selectedIds.includes(prof.id)
          return (
             <span
                key={prof.id}
                onClick={(e) => { e.stopPropagation(); togglePcaSelection(prof.id, isNewRow); }}
                className={`text-[10px] px-2 py-1 rounded-full border cursor-pointer select-none transition-colors ${
                  isSelected 
                     ? 'bg-blue-100 border-blue-300 text-blue-800' 
                     : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
             >
                {prof.nome_completo}
             </span>
          )
       })}
       {professores.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhum professor cadastrado</span>}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Áreas (Matrizes)</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as áreas do conhecimento (ex: Linguagens, Matemática) e defina seus coordenadores (PCAs).
        </p>
      </div>

      <Card className="max-w-[900px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Tabela de Áreas</CardTitle>
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
            <div className={`grid ${isEditMode ? 'grid-cols-[1fr_2fr_80px]' : 'grid-cols-[1fr_2fr]'} gap-4 mb-2 pb-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider`}>
               <div>Nome da Área</div>
               <div>PCAs (Prof. Coordenador)</div>
               {isEditMode && <div className="text-right">Ação</div>}
            </div>

            {/* Body */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando áreas...</div>
            ) : areas.length === 0 && newRowNome === null ? (
              <div className="py-8 text-center text-muted-foreground">Nenhuma área cadastrada.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {areas.map((area) => (
                  <div key={area.id} className={`grid ${isEditMode ? 'grid-cols-[1fr_2fr_80px]' : 'grid-cols-[1fr_2fr]'} gap-4 py-3 items-start group ${isEditMode && editingRowId !== area.id ? 'hover:bg-slate-50 cursor-pointer' : ''}`} onClick={() => { if (isEditMode && editingRowId !== area.id) handleStartEdit(area) }}>
                     
                     {/* Existing Row -> Viewing or Editing */}
                     {editingRowId === area.id ? (
                        <>
                           <div>
                              <Input 
                                value={editNome} 
                                onChange={(e) => setEditNome(e.target.value)} 
                                className="h-9 bg-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(area.id)
                                  if (e.key === 'Escape') setEditingRowId(null)
                                }}
                              />
                           </div>
                           <div>
                              <div className="text-xs mb-1 text-slate-500">Selecione os PCAs:</div>
                              <PcaSelector selectedIds={editPcas} isNewRow={false} />
                           </div>
                           <div className="flex items-center justify-end gap-1 mt-0.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={(e) => { e.stopPropagation(); setEditingRowId(null) }}>
                                 <X className="h-4 w-4" />
                              </Button>
                              <Button variant="default" size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={(e) => { e.stopPropagation(); handleSaveEdit(area.id) }}>
                                 <Check className="h-4 w-4" />
                              </Button>
                           </div>
                        </>
                     ) : (
                        <>
                           <div className="font-medium text-slate-800 pt-1.5">{area.nome}</div>
                           <div className="text-slate-600 pt-1.5">{getPcaNames(area.pcas)}</div>
                           
                           {isEditMode && (
                              <div className="flex items-center justify-end gap-2 bg-transparent">
                                 <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-800 hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); handleStartEdit(area) }}>
                                   <Edit2 className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(area.id, e)}>
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                           )}
                        </>
                     )}
                  </div>
                ))}

                {/* Nova Linha para Inserção */}
                {isEditMode && newRowNome !== null && (
                  <div className="grid grid-cols-[1fr_2fr_80px] gap-4 py-3 items-start bg-muted/30 -mx-4 px-4 border-l-2 border-l-primary">
                    <div>
                      <Input 
                        value={newRowNome} 
                        onChange={(e) => setNewRowNome(e.target.value)} 
                        placeholder="Nome da área"
                        className="h-9 bg-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewRow()
                          if (e.key === 'Escape') setNewRowNome(null)
                        }}
                      />
                    </div>
                    <div>
                        <div className="text-xs mb-1 text-slate-500">Selecione os PCAs:</div>
                        <PcaSelector selectedIds={newRowPcas} isNewRow={true} />
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-0.5">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => setNewRowNome(null)}>
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

            {isEditMode && newRowNome === null && (
              <div className="pt-4 flex justify-center border-t mt-2">
                 <Button 
                   variant="outline" 
                   className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary"
                   onClick={handleAddNewRow}
                 >
                   <Plus className="mr-2 h-4 w-4" />
                   Adicionar Nova Área
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
