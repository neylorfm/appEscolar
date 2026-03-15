import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Edit2, Check, AlertCircle } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Turma, getTurmas, criarTurma, atualizarTurma, deletarTurma } from '@/services/turmas'
import { useAuth } from '@/contexts/AuthContext'

const SERIES_OPCOES = [
  '1º ANO',
  '2º ANO',
  '3º ANO'
]

export function TurmasTab() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  
  // Para novas linhas
  const [newRow, setNewRow] = useState<{ serie: string; nome: string } | null>(null)
  
  // Para edição em linha
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editSerie, setEditSerie] = useState('')
  const [editNome, setEditNome] = useState('')

  const { usuario } = useAuth()
  const podeEditar = usuario?.papel === 'Administrador'

  useEffect(() => {
    loadTurmas()
  }, [])

  async function loadTurmas() {
    try {
      setLoading(true)
      const data = await getTurmas()
      setTurmas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar turmas.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMode = () => {
    if (isEditMode) {
      // Cancelando edição
      setNewRow(null)
      setEditingRowId(null)
    }
    setIsEditMode(!isEditMode)
  }

  const handleAddNewRow = () => {
    setNewRow({ serie: SERIES_OPCOES[1], nome: '' })
  }

  const handleSaveNewRow = async () => {
    if (!newRow?.serie || !newRow?.nome.trim()) {
      setError('Preencha a série e o nome da turma.')
      return
    }

    try {
      setError(null)
      const novaTurma = await criarTurma({
        serie: newRow.serie,
        nome: newRow.nome.trim().toUpperCase()
      })
      
      setTurmas(prev => [...prev, novaTurma].sort((a,b) => {
         if (a.serie !== b.serie) return a.serie.localeCompare(b.serie)
         return a.nome.localeCompare(b.nome)
      }))
      setNewRow(null)
    } catch (err) {
      if (err instanceof Error && err.message.includes('já existe')) {
        setDuplicateError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao criar turma.')
      }
    }
  }

  const handleStartEdit = (turma: Turma) => {
    setEditingRowId(turma.id)
    setEditSerie(turma.serie)
    setEditNome(turma.nome)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editSerie || !editNome.trim()) {
      setError('Preencha a série e o nome da turma.')
      return
    }

    try {
      setError(null)
      const turmaAtualizada = await atualizarTurma(id, {
        serie: editSerie,
        nome: editNome.trim().toUpperCase()
      })
      
      setTurmas(prev => prev.map(t => t.id === id ? turmaAtualizada : t).sort((a,b) => {
         if (a.serie !== b.serie) return a.serie.localeCompare(b.serie)
         return a.nome.localeCompare(b.nome)
      }))
      setEditingRowId(null)
    } catch (err) {
      if (err instanceof Error && err.message.includes('já existe')) {
        setDuplicateError(err.message)
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar turma.')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta turma?')) return

    try {
      setError(null)
      await deletarTurma(id)
      setTurmas(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir turma.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Turmas</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie as séries e as turmas
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Estrutura de Turmas</CardTitle>
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
          {error && (
            <div className="mb-4 bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="w-full text-sm">
            {/* Header */}
            <div className={`grid ${isEditMode ? 'grid-cols-[1fr_2fr_100px]' : 'grid-cols-[1fr_2fr]'} gap-4 mb-2 pb-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider`}>
               <div>Série</div>
               <div>Turma</div>
               {isEditMode && <div className="text-right">Ação</div>}
            </div>

            {/* Body */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando turmas...</div>
            ) : turmas.length === 0 && !newRow ? (
              <div className="py-8 text-center text-muted-foreground">Nenhuma turma cadastrada.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {turmas.map(turma => (
                  <div key={turma.id} className={`grid ${isEditMode ? 'grid-cols-[1fr_2fr_100px]' : 'grid-cols-[1fr_2fr]'} gap-4 py-3 items-center group`}>
                    
                    {/* Linha em modo de edição e foco neste ID */}
                    {isEditMode && editingRowId === turma.id ? (
                      <>
                        <div>
                          <Select value={editSerie} onValueChange={setEditSerie}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SERIES_OPCOES.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Input 
                            value={editNome} 
                            onChange={(e) => setEditNome(e.target.value)} 
                            className="h-9 uppercase"
                            placeholder="Ex: A, B, C..."
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleSaveEdit(turma.id)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setEditingRowId(null); setEditSerie(''); setEditNome(''); }}>
                             <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Linha normal (View mode ou Edit mode em outra linha) */}
                        <div className="font-medium text-slate-800">{turma.serie}</div>
                        <div className="text-slate-600">{turma.nome}</div>
                        {isEditMode && (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(turma.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStartEdit(turma)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* Nova Linha para Inserção */}
                {isEditMode && newRow && (
                  <div className="grid grid-cols-[1fr_2fr_100px] gap-4 py-3 items-center bg-muted/30 -mx-4 px-4 border-l-2 border-l-primary">
                    <div>
                      <Select value={newRow.serie} onValueChange={(val) => setNewRow({ ...newRow, serie: val })}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERIES_OPCOES.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Input 
                        value={newRow.nome} 
                        onChange={(e) => setNewRow({ ...newRow, nome: e.target.value })} 
                        className="h-9 truncate uppercase bg-white"
                        placeholder="Nome da Turma (Ex: A)"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewRow()
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setNewRow(null)}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                       <Button variant="default" size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveNewRow}>
                          <Save className="h-4 w-4" />
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
                   Adicionar Nova Turma
                 </Button>
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Duplicate Error Modal */}
      <Dialog open={!!duplicateError} onOpenChange={(open) => {
         if (!open) setDuplicateError(null)
      }}>
        <DialogContent className="sm:max-w-[425px] flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2 text-amber-600">
             <AlertCircle size={32} />
           </div>
           
           <DialogHeader>
             <DialogTitle className="text-xl text-center">Atenção</DialogTitle>
             <DialogDescription className="text-center pt-2 text-base text-slate-700">
               {duplicateError}
               <br/><br/>
               Por favor, verifique a lista ou informe um nome diferente.
             </DialogDescription>
           </DialogHeader>
           
           <DialogFooter className="mt-4 w-full flex-col sm:flex-col items-center gap-2">
              <Button 
                variant="default" 
                onClick={() => setDuplicateError(null)} 
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
