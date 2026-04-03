import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Save, Edit2, Check, Upload } from 'lucide-react'
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
import { Aluno, getAlunos, criarAluno, atualizarAluno, deletarAluno, criarAlunosEmMassa } from '@/services/alunos'
import { Turma, getTurmas } from '@/services/turmas'
import { useAuth } from '@/contexts/AuthContext'

export function AlunosTab() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // State de Filtro
  const [filtroTurmaId, setFiltroTurmaId] = useState('all')

  // States para nova linha manual
  const [newRow, setNewRow] = useState<{ matricula: string; nome: string; turma_id: string } | null>(null)
  
  // States para edição em linha
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTurmaId, setEditTurmaId] = useState('')

  // State para Importação CSV
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { usuario } = useAuth()
  const podeEditar = usuario?.papel === 'Administrador'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [alunosData, turmasData] = await Promise.all([getAlunos(), getTurmas()])
      setAlunos(alunosData)
      setTurmas(turmasData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMode = () => {
    if (isEditMode) {
      setNewRow(null)
      setEditingRowId(null)
    }
    setIsEditMode(!isEditMode)
  }

  const handleAddNewRow = () => {
    setNewRow({ matricula: '', nome: '', turma_id: 'none' })
  }

  const handleSaveNewRow = async () => {
    if (!newRow?.matricula.trim() || !newRow?.nome.trim()) {
      setError('Preencha a matrícula e o nome do aluno.')
      return
    }

    try {
      setError(null)
      const novoAluno = await criarAluno({
        matricula: newRow.matricula.trim(),
        nome: newRow.nome.trim().toUpperCase(),
        turma_id: newRow.turma_id === 'none' ? null : newRow.turma_id
      })
      
      setAlunos(prev => [...prev, novoAluno].sort((a,b) => a.nome.localeCompare(b.nome)))
      setNewRow(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar aluno.')
    }
  }

  const handleStartEdit = (aluno: any) => {
    setEditingRowId(aluno.matricula)
    setEditNome(aluno.nome)
    setEditTurmaId(aluno.turma_id || 'none')
  }

  const handleSaveEdit = async (matriculaOriginal: string) => {
    if (!editNome.trim()) {
      setError('Preencha o nome do aluno.')
      return
    }

    try {
      setError(null)
      const alunoAtualizado = await atualizarAluno(matriculaOriginal, {
        nome: editNome.trim().toUpperCase(),
        turma_id: editTurmaId === 'none' ? null : editTurmaId
      })
      
      setAlunos(prev => prev.map(a => a.matricula === matriculaOriginal ? alunoAtualizado : a).sort((a,b) => a.nome.localeCompare(b.nome)))
      setEditingRowId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar aluno.')
    }
  }

  const handleDelete = async (matricula: string) => {
    if (!confirm('Deseja realmente excluir este aluno?')) return

    try {
      setError(null)
      await deletarAluno(matricula)
      setAlunos(prev => prev.filter(a => a.matricula !== matricula))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir aluno.')
    }
  }

  const handleImportCSV = async () => {
    if (!csvFile) {
      setError('Selecione um arquivo CSV.')
      return
    }

    try {
      setCsvLoading(true)
      const processCSV = () => {
        return new Promise<Omit<Aluno, 'created_at' | 'updated_at'>[]>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const text = e.target?.result as string
            const lines = text.split('\\n')
            const result: Omit<Aluno, 'created_at' | 'updated_at'>[] = []
            
            // Assume the first line might be header, checking for expected headers
            const startIdx = lines[0].toLowerCase().includes('matricula') ? 1 : 0
            
            for (let i = startIdx; i < lines.length; i++) {
              const line = lines[i].trim()
              if (!line) continue
              // simple split by comma
              const parts = line.split(',')
              if (parts.length >= 2) {
                 const matricula = parts[0].trim()
                 const nome = parts[1].trim()
                 
                 let turma_id = null
                 const turmaStr = parts.length > 2 ? parts[2].trim() : ''
                 if (turmaStr && turmaStr.toLowerCase() !== 'none') {
                    // Tenta achar por UUID primeiro
                    const turmaById = turmas.find(t => t.id === turmaStr)
                    if (turmaById) {
                      turma_id = turmaById.id
                    } else {
                      // Tenta achar pelo texto combinado de forma estrita (sem espaços)
                      const normalizar = (s: string) => s.toUpperCase().replace(/\s+/g, '')
                      const inputNorm = normalizar(turmaStr)
                      const match = turmas.find(t => {
                         const serieNorm = normalizar(t.serie)
                         const nomeNorm = normalizar(t.nome)
                         return inputNorm === `${serieNorm}${nomeNorm}`
                      })
                      
                      if (match) {
                        turma_id = match.id
                      } else {
                        reject(new Error(`A turma "${turmaStr}" para o aluno "${nome}" não foi encontrada. A operação foi cancelada. O texto deve formar a série e nome EX: 1ºANOA.`))
                        return
                      }
                    }
                 }

                 if (matricula && nome) {
                     result.push({
                        matricula,
                        nome: nome.toUpperCase(),
                        turma_id
                     })
                 }
              }
            }
            resolve(result)
          }
          reader.onerror = () => reject(new Error('Erro ao ler arquivo.'))
          reader.readAsText(csvFile)
        })
      }

      const alunosToInsert = await processCSV()
      if (alunosToInsert.length === 0) {
         setError('Nenhum dado válido encontrado no CSV.')
         setCsvLoading(false)
         return
      }
      
      await criarAlunosEmMassa(alunosToInsert)
      await loadData() // reload to get the relationships
      setShowCsvModal(false)
      setCsvFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      alert(`${alunosToInsert.length} alunos importados com sucesso.`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar CSV.')
    } finally {
      setCsvLoading(false)
    }
  }

  const alunosFiltrados = alunos.filter(a => {
    if (filtroTurmaId === 'all') return true
    if (filtroTurmaId === 'none') return !a.turma_id
    return a.turma_id === filtroTurmaId
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Alunos</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie o cadastro de alunos da instituição
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Estrutura de Alunos</CardTitle>
          {podeEditar && (
            <div className="flex gap-2">
              <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setShowCsvModal(true)}
                 className="h-8 gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar CSV
              </Button>
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
            </div>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex items-center mb-6 max-w-sm">
            <span className="text-sm text-muted-foreground mr-3 font-medium whitespace-nowrap">Filtrar por Turma:</span>
            <Select value={filtroTurmaId} onValueChange={setFiltroTurmaId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas as Turmas" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px]">
                <SelectItem value="all">Todas as Turmas</SelectItem>
                <SelectItem value="none">Sem Turma</SelectItem>
                {turmas.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.serie} - {t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full text-sm">
            {/* Header */}
            <div className={`grid ${isEditMode ? 'grid-cols-[1fr_2fr_2fr_100px]' : 'grid-cols-[1fr_2fr_2fr]'} gap-4 mb-2 pb-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider`}>
               <div>Matrícula</div>
               <div>Nome</div>
               <div>Turma</div>
               {isEditMode && <div className="text-right">Ação</div>}
            </div>

            {/* Body */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando alunos...</div>
            ) : alunosFiltrados.length === 0 && !newRow ? (
              <div className="py-8 text-center text-muted-foreground">
                {alunos.length === 0 ? "Nenhum aluno cadastrado." : "Nenhum aluno encontrado para a turma selecionada."}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {alunosFiltrados.map(aluno => (
                  <div key={aluno.matricula} className={`grid ${isEditMode ? 'grid-cols-[1fr_2fr_2fr_100px]' : 'grid-cols-[1fr_2fr_2fr]'} gap-4 py-3 items-center group`}>
                    
                    {isEditMode && editingRowId === aluno.matricula ? (
                      <>
                        <div className="font-medium text-slate-800">{aluno.matricula}</div>
                        <div>
                          <Input 
                            value={editNome} 
                            onChange={(e) => setEditNome(e.target.value)} 
                            className="h-9 uppercase"
                            placeholder="Nome Completo"
                          />
                        </div>
                        <div>
                           <Select value={editTurmaId} onValueChange={setEditTurmaId}>
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue placeholder="Selecione uma turma" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[250px]">
                              <SelectItem value="none">Sem Turma</SelectItem>
                              {turmas.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.serie} - {t.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleSaveEdit(aluno.matricula)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setEditingRowId(null); setEditNome(''); setEditTurmaId('none'); }}>
                             <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium text-slate-800">{aluno.matricula}</div>
                        <div className="text-slate-600 truncate">{aluno.nome}</div>
                        <div className="text-slate-500 text-xs">
                          {aluno.turmas ? `${aluno.turmas.serie} - ${aluno.turmas.nome}` : '—'}
                        </div>
                        {isEditMode && (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(aluno.matricula)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStartEdit(aluno)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* Nova Linha */}
                {isEditMode && newRow && (
                  <div className="grid grid-cols-[1fr_2fr_2fr_100px] gap-4 py-3 items-center bg-muted/30 -mx-4 px-4 border-l-2 border-l-primary">
                    <div>
                      <Input 
                        value={newRow.matricula} 
                        onChange={(e) => setNewRow({ ...newRow, matricula: e.target.value })} 
                        className="h-9 truncate bg-white"
                        placeholder="Matrícula"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Input 
                        value={newRow.nome} 
                        onChange={(e) => setNewRow({ ...newRow, nome: e.target.value })} 
                        className="h-9 truncate uppercase bg-white"
                        placeholder="Nome Completo"
                      />
                    </div>
                    <div>
                       <Select value={newRow.turma_id} onValueChange={(val) => setNewRow({ ...newRow, turma_id: val })}>
                        <SelectTrigger className="h-9 w-full bg-white">
                          <SelectValue placeholder="Selecione uma turma" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          <SelectItem value="none">Sem Turma</SelectItem>
                          {turmas.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.serie} - {t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                   Adicionar Novo Aluno
                 </Button>
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Modal de Importação CSV */}
      <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Alunos (CSV)</DialogTitle>
            <DialogDescription>
              Faça o upload de um arquivo CSV para a carga em massa de alunos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="bg-muted p-4 rounded-md text-sm border space-y-2">
               <h4 className="font-semibold text-foreground">Como estruturar o arquivo CSV:</h4>
               <p>O arquivo precisa conter até 3 colunas, separadas por vírgula (,):</p>
               <ol className="list-decimal pl-5 space-y-1">
                 <li><span className="font-semibold">matricula</span> (Obrigatório, único)</li>
                 <li><span className="font-semibold">nome</span> (Obrigatório)</li>
                 <li><span className="font-semibold">turma</span> (Opcional. Informe a Série e a Turma, ex: 1º ANO A)</li>
               </ol>
               <div className="mt-2 text-xs border-t pt-2 text-muted-foreground">
                 Exemplo com turma combinada sem espaço:<br/>
                 <code className="bg-background px-1 py-0.5 rounded">2026001,João Silva,1ºANOA</code><br/><br/>
                 Exemplo sem turma:<br/>
                 <code className="bg-background px-1 py-0.5 rounded">2026002,Maria Oliveira,</code>
               </div>
             </div>

             <div className="grid gap-2">
               <Input 
                 id="csv-file"
                 type="file" 
                 accept=".csv"
                 ref={fileInputRef}
                 onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
               />
               {csvFile && (
                 <p className="text-xs text-muted-foreground">Arquivo selecionado: {csvFile.name}</p>
               )}
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvModal(false)}>Cancelar</Button>
            <Button onClick={handleImportCSV} disabled={!csvFile || csvLoading}>
              {csvLoading ? 'Processando...' : 'Importar Dados'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
