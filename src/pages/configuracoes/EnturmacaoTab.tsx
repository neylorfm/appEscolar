import { useState, useEffect } from 'react'
import { Plus, Trash2, Library, BookOpen } from 'lucide-react'
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

import { useAuth } from '@/contexts/AuthContext'
import { getProfessorDisciplinas, ProfessorDisciplina, vincularProfessorDisciplina, desvincularProfessorDisciplina } from '@/services/enturmacoes'
import { getUsuarios, Usuario } from '@/services/usuarios'
import { getDisciplinas, Disciplina } from '@/services/disciplinas'

export function EnturmacaoTab() {
  const { usuario } = useAuth()
  const podeEditar = usuario?.papel === 'Administrador'

  // Data states
  const [professores, setProfessores] = useState<Usuario[]>([])
  const [todasDisciplinas, setTodasDisciplinas] = useState<Disciplina[]>([])
  const [vinculos, setVinculos] = useState<ProfessorDisciplina[]>([])
  
  // Selection states
  const [selectedProfId, setSelectedProfId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Vinculo forms
  const [novaDisciplinaId, setNovaDisciplinaId] = useState<string>('')

  // Feedback states
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [profsData, discData, vinculosData] = await Promise.all([
        getUsuarios(),
        getDisciplinas(),
        getProfessorDisciplinas() // Load all
      ])
      
      const profs = profsData.filter(u => u.papel === 'Professor')
      setProfessores(profs)
      setTodasDisciplinas(discData)
      setVinculos(vinculosData)
      
      if (profs.length > 0) {
        setSelectedProfId(profs[0].id)
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao carregar os dados iniciais.' })
    } finally {
      setLoading(false)
    }
  }

  const handleVincularNovaDisciplina = async () => {
    if (!selectedProfId || !novaDisciplinaId) return

    setLoading(true)
    try {
      const novoVinculo = await vincularProfessorDisciplina(selectedProfId, novaDisciplinaId)
      setVinculos(prev => [...prev, novoVinculo])
      setNovaDisciplinaId('')
      setFeedbackMsg({ type: 'success', text: 'Disciplina vinculada ao professor com sucesso!' })
    } catch (err) {
       setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao vincular disciplina.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDesvincular = async (idVinculo: string) => {
    if (!confirm('Deseja realmente remover esta disciplina do professor?')) return

    setLoading(true)
    try {
      await desvincularProfessorDisciplina(idVinculo)
      setVinculos(prev => prev.filter(v => v.id !== idVinculo))
      setFeedbackMsg({ type: 'success', text: 'Vínculo removido com sucesso.' })
    } catch (err) {
       setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao desvincular.' })
    } finally {
      setLoading(false)
    }
  }

  const profSelecionado = professores.find(p => p.id === selectedProfId)
  const disciplinasDoProf = vinculos.filter(v => v.professor_id === selectedProfId)
  
  // Para não deixar ele adicionar a mesma disciplina duas vezes
  const disciplinasDisponiveisParaAdicionar = todasDisciplinas.filter(
    d => !disciplinasDoProf.some(vp => vp.disciplina_id === d.id)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Enturmação (Disciplinas do Professor)</h2>
          <p className="text-sm text-muted-foreground">
            Defina quais disciplinas cada Professor está habilitado a lecionar na Escola.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
         
         {/* Painel Esquerdo: Seleção do Professor */}
         <div className="md:col-span-1 space-y-4">
             <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b pb-4">
                   <CardTitle className="text-base text-slate-800 flex items-center">
                     <Library className="w-4 h-4 mr-2 text-indigo-500" /> Corpo Docente
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto divide-y">
                     {loading && professores.length === 0 ? (
                       <div className="p-4 text-sm text-slate-500 text-center">Carregando...</div>
                     ) : professores.length === 0 ? (
                       <div className="p-4 text-sm text-slate-500 text-center">Nenhum professor cadastrado.</div>
                     ) : (
                       professores.map(prof => (
                          <div 
                            key={prof.id}
                            onClick={() => setSelectedProfId(prof.id)}
                            className={`p-4 cursor-pointer transition-colors ${selectedProfId === prof.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                          >
                             <div className={`font-semibold text-sm ${selectedProfId === prof.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                               {prof.nome_completo}
                             </div>
                             <div className="text-xs text-slate-500 mt-1 truncate">{prof.email}</div>
                          </div>
                       ))
                     )}
                  </div>
                </CardContent>
             </Card>
         </div>

         {/* Painel Direito: Configuração do Professor Selecionado */}
         <div className="md:col-span-3">
             <Card className="shadow-sm border-slate-200 min-h-[300px]">
                {!profSelecionado ? (
                  <div className="flex items-center justify-center min-h-[300px] text-slate-400">
                    Selecione um professor na lista ao lado para gerenciar suas disciplinas.
                  </div>
                ) : (
                  <>
                     <CardHeader className="border-b pb-6">
                        <div className="flex items-start justify-between">
                           <div>
                              <CardTitle className="text-xl text-slate-800">
                                Matérias do Professor(a) {profSelecionado.nome_completo?.split(' ')[0]}
                              </CardTitle>
                              <p className="text-sm text-slate-500 mt-1">
                                Gerencie as disciplinas lecionadas por este usuário.
                              </p>
                           </div>
                           
                           {podeEditar && (
                              <div className="bg-slate-50 border p-3 rounded-lg flex items-center gap-2">
                                 <Select value={novaDisciplinaId} onValueChange={setNovaDisciplinaId}>
                                    <SelectTrigger className="w-[250px] bg-white h-9">
                                       <SelectValue placeholder="Adicionar nova disciplina..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                       {disciplinasDisponiveisParaAdicionar.length === 0 ? (
                                         <SelectItem value="none" disabled>Todas já adicionadas</SelectItem>
                                       ) : (
                                         disciplinasDisponiveisParaAdicionar.map(d => (
                                           <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                                         ))
                                       )}
                                    </SelectContent>
                                 </Select>
                                 <Button 
                                   size="sm" 
                                   onClick={handleVincularNovaDisciplina} 
                                   disabled={!novaDisciplinaId || novaDisciplinaId === 'none' || loading}
                                   className="bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                                 >
                                    <Plus className="w-4 h-4 mr-1" /> Vincular
                                 </Button>
                              </div>
                           )}
                        </div>
                     </CardHeader>
                     <CardContent className="p-6">
                       
                       {loading && disciplinasDoProf.length === 0 ? (
                          <div className="py-12 border rounded-xl text-center text-slate-500 bg-slate-50/50">Carregando vinculações...</div>
                       ) : disciplinasDoProf.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center border border-dashed rounded-xl text-center text-slate-500 bg-slate-50/50">
                            <BookOpen className="w-8 h-8 text-slate-300 mb-3" />
                            <p className="font-medium text-slate-700">O Professor ainda não possui disciplinas atribuídas.</p>
                            <p className="text-sm">Vincule uma disciplina utilizando a caixa superior.</p>
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {disciplinasDoProf.map(vinculo => (
                               <div key={vinculo.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-indigo-300 hover:shadow-md transition-all bg-white">
                                  <div className="flex items-center gap-3">
                                     <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                        <BookOpen className="w-5 h-5 text-indigo-600" />
                                     </div>
                                     <div>
                                        <div className="font-semibold text-slate-800">{vinculo.disciplina?.nome}</div>
                                        <div className="text-xs text-slate-500">{vinculo.disciplina?.area?.nome || 'Área não definida'}</div>
                                     </div>
                                  </div>

                                  {podeEditar && (
                                     <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 -mr-2"
                                       onClick={() => handleDesvincular(vinculo.id)}
                                     >
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                  )}
                               </div>
                             ))}
                          </div>
                       )}

                     </CardContent>
                  </>
                )}
             </Card>
         </div>

      </div>

      {/* Global Status/Error Modal */}
      <Dialog open={!!feedbackMsg} onOpenChange={(open) => {
         if (!open) setFeedbackMsg(null)
      }}>
        <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle className={feedbackMsg?.type === 'error' ? 'text-red-600' : 'text-emerald-600'}>
               {feedbackMsg?.type === 'error' ? 'Atenção' : 'Sucesso'}
             </DialogTitle>
             <DialogDescription className="pt-2 text-base text-slate-700">
               {feedbackMsg?.text}
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="mt-4">
              <Button onClick={() => setFeedbackMsg(null)} className="w-full">Entendi</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
