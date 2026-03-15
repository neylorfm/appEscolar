import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, Check, AlertCircle, X, Upload } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Disciplina, getDisciplinas, criarDisciplina, atualizarDisciplina, deletarDisciplina, criarDisciplinasLote } from '@/services/disciplinas'
import { Area, getAreas } from '@/services/areas'
import { useAuth } from '@/contexts/AuthContext'

export function DisciplinasTab() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modals and Alerts
  const [errorDesc, setErrorDesc] = useState<string | null>(null)
  
  // Inline Editing
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Editing a Row
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editAreaId, setEditAreaId] = useState<string>('')
  
  // New Row state
  const [newRowNome, setNewRowNome] = useState<string | null>(null)
  const [newRowAreaId, setNewRowAreaId] = useState<string>('')
  
  // CSV Import state
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { usuario } = useAuth()
  const podeEditar = usuario?.papel === 'Administrador'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [ds, as] = await Promise.all([
         getDisciplinas(),
         getAreas()
      ])
      setDisciplinas(ds)
      setAreas(as)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao carregar os dados.')
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

  const handleStartEdit = (disciplina: Disciplina) => {
    setEditingRowId(disciplina.id)
    setEditNome(disciplina.nome)
    setEditAreaId(disciplina.area_id)
    setNewRowNome(null)
  }

  const handleAddNewRow = () => {
    if (areas.length === 0) {
      setErrorDesc('Você precisa cadastrar pelo menos uma Área antes de criar disciplinas.')
      return
    }
    setNewRowNome('')
    setNewRowAreaId(areas[0]?.id || '') // defaults to first area
    setEditingRowId(null)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editNome.trim()) {
      setErrorDesc('O nome da disciplina não pode ficar vazio.')
      return
    }
    if (!editAreaId) {
      setErrorDesc('Selecione uma área.')
      return
    }

    try {
      const atualizada = await atualizarDisciplina(id, editNome, editAreaId)
      setDisciplinas(prev => prev.map(d => d.id === id ? atualizada : d).sort((a,b) => a.nome.localeCompare(b.nome)))
      setEditingRowId(null)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao atualizar disciplina.')
    }
  }

  const handleSaveNewRow = async () => {
    if (!newRowNome?.trim()) {
      setErrorDesc('O nome da disciplina não pode ficar vazio.')
      return
    }
    if (!newRowAreaId) {
      setErrorDesc('Selecione uma área.')
      return
    }

    try {
      const nova = await criarDisciplina(newRowNome, newRowAreaId)
      setDisciplinas(prev => [...prev, nova].sort((a,b) => a.nome.localeCompare(b.nome)))
      setNewRowNome(null)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao salvar disciplina.')
    }
  }

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!confirm('Deseja realmente excluir esta disciplina?')) return

    try {
      await deletarDisciplina(id)
      setDisciplinas(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao excluir disciplina.')
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        if (!text) return

        const lines = text.split('\n')
        let parsedData: { nome: string, area_id: string }[] = []

        for (const line of lines) {
          if (!line.trim()) continue
          const cells = line.split(',')
          if (cells.length >= 2) {
             const disciplinaName = cells[0].trim().replace(/^"|"$/g, '')
             const areaName = cells[1].trim().replace(/^"|"$/g, '')
             
             // Look up the area by name
             const areaMatch = areas.find(a => a.nome.toLowerCase() === areaName.toLowerCase())
             if (disciplinaName && areaMatch) {
               parsedData.push({ nome: disciplinaName, area_id: areaMatch.id })
             }
          }
        }

        if (parsedData.length === 0) {
           setErrorDesc('O arquivo CSV parece estar vazio, fora do formato correto (disciplina,área) ou as áreas contidas nele não estão cadastradas no sistema.')
           return
        }

        const existingNames = new Set(disciplinas.map(d => d.nome.toLowerCase()))
        const newItemsToInsert = parsedData.filter(item => !existingNames.has(item.nome.toLowerCase()))
        
        const uniqueItemsMap = new Map<string, { nome: string, area_id: string }>()
        for (const item of newItemsToInsert) {
           uniqueItemsMap.set(item.nome.toLowerCase(), item)
        }
        const uniqueNewItems = Array.from(uniqueItemsMap.values())

        if (uniqueNewItems.length === 0) {
           setErrorDesc('Todas as disciplinas válidas do arquivo já existem no sistema.')
           return
        }

        setLoading(true)
        const criadas = await criarDisciplinasLote(uniqueNewItems)
        setDisciplinas(prev => [...prev, ...criadas].sort((a,b) => a.nome.localeCompare(b.nome)))
        
      } catch (err) {
         setErrorDesc(err instanceof Error ? err.message : 'Falha ao processar o arquivo CSV.')
      } finally {
         setLoading(false)
         if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Disciplinas e Matrizes</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie o catálogo de disciplinas da escola, atrelando-as as suas respectivas matrizes de conhecimento.
        </p>
      </div>

      <Card className="max-w-[800px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Tabela de Disciplinas</CardTitle>
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
               <div>Disciplina</div>
               <div>Área</div>
               {isEditMode && <div className="text-right">Ação</div>}
            </div>

            {/* Body */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando dados...</div>
            ) : disciplinas.length === 0 && newRowNome === null ? (
              <div className="py-8 text-center text-muted-foreground">Nenhuma disciplina cadastrada.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {disciplinas.map((disciplina) => (
                  <div key={disciplina.id} className={`grid ${isEditMode ? 'grid-cols-[1fr_2fr_80px]' : 'grid-cols-[1fr_2fr]'} gap-4 py-3 items-center group ${isEditMode && editingRowId !== disciplina.id ? 'hover:bg-slate-50 cursor-pointer' : ''}`} onClick={() => { if (isEditMode && editingRowId !== disciplina.id) handleStartEdit(disciplina) }}>
                     
                     {/* Existing Row -> Viewing or Editing */}
                     {editingRowId === disciplina.id ? (
                        <>
                           <div>
                              <Input 
                                value={editNome} 
                                onChange={(e) => setEditNome(e.target.value)} 
                                className="h-9 bg-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(disciplina.id)
                                  if (e.key === 'Escape') setEditingRowId(null)
                                }}
                              />
                           </div>
                           <div>
                              <Select value={editAreaId} onValueChange={setEditAreaId}>
                                <SelectTrigger className="h-9 w-full bg-white">
                                  <SelectValue placeholder="Área" />
                                </SelectTrigger>
                                <SelectContent>
                                  {areas.map(area => (
                                    <SelectItem key={area.id} value={area.id}>{area.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                           </div>
                           <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={(e) => { e.stopPropagation(); setEditingRowId(null) }}>
                                 <X className="h-4 w-4" />
                              </Button>
                              <Button variant="default" size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={(e) => { e.stopPropagation(); handleSaveEdit(disciplina.id) }}>
                                 <Check className="h-4 w-4" />
                              </Button>
                           </div>
                        </>
                     ) : (
                        <>
                           <div className="font-medium text-slate-800">{disciplina.nome}</div>
                           <div className="text-slate-600">
                              <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-700/10">
                                {disciplina.area?.nome || 'Área Desconhecida'}
                              </span>
                           </div>
                           
                           {isEditMode && (
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); handleStartEdit(disciplina) }}>
                                   <Edit2 className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => handleDelete(disciplina.id, e)}>
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
                  <div className="grid grid-cols-[1fr_2fr_80px] gap-4 py-3 items-center bg-muted/30 -mx-4 px-4 border-l-2 border-l-primary">
                    <div>
                      <Input 
                        value={newRowNome} 
                        onChange={(e) => setNewRowNome(e.target.value)} 
                        placeholder="Ex: Biologia"
                        className="h-9 bg-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewRow()
                          if (e.key === 'Escape') setNewRowNome(null)
                        }}
                      />
                    </div>
                    <div>
                      <Select value={newRowAreaId} onValueChange={setNewRowAreaId}>
                        <SelectTrigger className="h-9 w-full bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map(area => (
                            <SelectItem key={area.id} value={area.id}>{area.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-end gap-1">
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
              <div className="pt-4 flex flex-col sm:flex-row justify-between gap-4 border-t mt-2">
                 <Button 
                   variant="outline" 
                   className="w-full sm:w-auto border-dashed text-muted-foreground hover:text-primary hover:border-primary"
                   onClick={handleAddNewRow}
                 >
                   <Plus className="mr-2 h-4 w-4" />
                   Nova Disciplina Unitária
                 </Button>
                 
                 <div className="flex flex-col sm:flex-row items-center gap-2 border rounded-md p-2 bg-slate-50">
                    <span className="text-xs text-slate-500 mr-2">Formato CSV: <strong>disciplina, área</strong></span>
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImportCSV} 
                    />
                    <Button 
                      variant="outline" 
                      className="h-9 w-full sm:w-auto border-dashed text-slate-500 hover:text-emerald-600 hover:border-emerald-600"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Importar Disciplinas (.csv)
                    </Button>
                 </div>
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
