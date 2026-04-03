import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Upload, Save, Download, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

import { Avaliacao, getAvaliacaoPorId, calcularNota } from "@/services/avaliacoes"
import { supabase } from "@/lib/supabase"
// Need Aluno type (assuming it exists in src/services/alunos.ts or we fetch directly here via Supabase)

export default function LancamentoResultadosPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  
  const canEdit = usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador'

  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null)
  const [turmas, setTurmas] = useState<{id: string, nome: string, serie: string}[]>([])
  
  const [selectedTurma, setSelectedTurma] = useState<string>("")
  const [alunos, setAlunos] = useState<any[]>([])
  const [resultadosOriginal, setResultadosOriginal] = useState<Record<string, any>>({}) // aluno_id -> row db
  
  // aluno_id -> array de respostas (tamanho quantidade_questoes)
  const [respostasDraft, setRespostasDraft] = useState<Record<string, string[]>>({})
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) loadData(id)
  }, [id])

  async function loadData(avaliacaoId: string) {
    setLoading(true)
    try {
      const ava = await getAvaliacaoPorId(avaliacaoId)
      if (!ava) return navigate('/avaliacoes')
      setAvaliacao(ava)

      // Se houver turmas na avaliação, buscar os dados reais das turmas
      if (ava.turmas_ids && ava.turmas_ids.length > 0) {
        const { data: turmasData } = await supabase
          .from('turmas')
          .select('id, nome, serie')
          .in('id', ava.turmas_ids)
        
        setTurmas(turmasData || [])
        if (turmasData && turmasData.length > 0) {
          setSelectedTurma(turmasData[0].id)
        }
      }
    } catch (e) {
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  // Quando selectedTurma mudar, baixa alunos e resultados
  useEffect(() => {
    if (selectedTurma && avaliacao) {
      loadAlunosEResultados(selectedTurma)
    }
  }, [selectedTurma, avaliacao])

  async function loadAlunosEResultados(turmaId: string) {
    try {
      // Baixar alunos da turma
      const { data: alunosData } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId)
        .order('nome', { ascending: true })

      setAlunos(alunosData || [])

      // Baixar resultados existentes
      const { data: resData } = await supabase
        .from('resultados_alunos')
        .select('*')
        .eq('avaliacao_id', avaliacao!.id)
        .in('aluno_id', (alunosData || []).map((a: any) => a.matricula))

      const mapOrig: Record<string, any> = {}
      const mapDraft: Record<string, string[]> = {}

      const length = avaliacao!.quantidade_questoes

      if (alunosData) {
        alunosData.forEach((al: any) => {
           const row = resData?.find(r => r.aluno_id === al.matricula)
           if (row) {
             mapOrig[al.matricula] = row
             mapDraft[al.matricula] = row.respostas && Array.isArray(row.respostas) 
               ? [...row.respostas] 
               : new Array(length).fill('')
           } else {
             mapDraft[al.matricula] = new Array(length).fill('')
           }
        })
      }

      setResultadosOriginal(mapOrig)
      setRespostasDraft(mapDraft)
    } catch (err) {
      toast.error('Erro ao carregar estudantes.')
    }
  }

  // ----- INSERÇÃO MANUAL -----
  const handleRespostaChange = (alunoId: string, qIndex: number, val: string) => {
    // Permite apenas A, B, C, D, E ou vazio
    const char = val.toUpperCase().trim()
    if (char && !['A', 'B', 'C', 'D', 'E'].includes(char)) return

    setRespostasDraft(prev => {
      const nov = { ...prev }
      nov[alunoId] = [...nov[alunoId]]
      nov[alunoId][qIndex] = char
      return nov
    })
  }

  // ----- PARSER CSV -----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      // Simples parser CSV (separado por vírgula ou ponto e vírgula)
      const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 0)
      
      const newDraft = { ...respostasDraft }
      let importCount = 0
      
      // Assume-se que a estrutura seja: "Matricula ou Nome", "A", "B", "C" ... ou agrupado "A, B, C"
      // Faremos uma buscar cruza por Matrícula
      lines.forEach((line, idx) => {
         // ignora a primeira linha se parecer cabeçalho
         if (idx === 0 && line.toLowerCase().includes('matricula')) return
         
         const cols = line.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''))
         const identificador = cols[0]
         const respostasCsv = cols.slice(1) // Q1, Q2, Q3

         const aluno = alunos.find(a => 
           a.matricula === identificador || 
           a.nome.toLowerCase() === identificador.toLowerCase()
         )

         if (aluno && respostasCsv.length > 0) {
           // Normaliza respostas para array tamanho certo, pegando a formatacao (ex: coluna unica vs multiplas colunas)
           let rArray: string[] = []
           if (respostasCsv.length === 1 && respostasCsv[0].length > 1) {
             // O usuario grudou tudo na coluna 2 tipo: ABCDDEE
             rArray = respostasCsv[0].split('')
           } else {
             rArray = respostasCsv
           }
           
           // Corta ate tamanho maximo e padroniza
           const qtd = avaliacao!.quantidade_questoes
           const formatedArray = new Array(qtd).fill('')
           
           for(let j=0; j<Math.min(rArray.length, qtd); j++){
             const c = rArray[j].toUpperCase()
             if (['A','B','C','D','E'].includes(c)) {
                formatedArray[j] = c
             }
           }
           
           newDraft[aluno.matricula] = formatedArray
           importCount++
         }
      })
      
      setRespostasDraft(newDraft)
      toast.success(`Foram lidos registros de ${importCount} alunos com sucesso!`)
    }
    reader.readAsText(file)
    // reseta o input para permitir re-upload
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Exportar um CSV Template
  const handleDownloadTemplate = () => {
    let csv = "matricula,nome"
    for(let i=1; i<=avaliacao!.quantidade_questoes; i++) {
       csv += `,Q${i}`
    }
    csv += "\\n"
    
    alunos.forEach(a => {
       csv += `${a.matricula},"${a.nome}"`
       for(let i=1; i<=avaliacao!.quantidade_questoes; i++) {
          csv += `,`
       }
       csv += "\\n"
    })
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `template_lançamento_${avaliacao?.nome.replace(/\\s/g,'_')}.csv`
    link.click()
  }

  // ----- SAVING -----
  const handleSave = async () => {
    setSaving(true)
    
    try {
      // 1. Processar todas as draft changes para o banco (upsert payload)
      // Usaremos o calcularNotas do backend para enviar a PONTUACAO certa em CACHE JSONB!
      const upserts = []
      
      for (const al of alunos) {
        const res = respostasDraft[al.matricula]
        
        // Verifica se houve alguma marcacao
        const isEmptyRow = res.every((r: string) => r === '')
        if (isEmptyRow) continue // Não insere nada vazio
        
        const pont = calcularNota(res, avaliacao!.disciplinas, avaliacao!.gabarito, avaliacao!.questoes_anuladas)
        
        upserts.push({
          avaliacao_id: avaliacao!.id,
          aluno_id: al.matricula,
          respostas: res,
          pontuacoes: pont,
          updated_at: new Date().toISOString()
        })
      }
      
      if (upserts.length === 0) {
        toast.info('Nenhuma resposta lançada para salvar.')
        setSaving(false)
        return
      }
      
      const { error } = await supabase
         .from('resultados_alunos')
         .upsert(upserts, { onConflict: 'avaliacao_id, aluno_id' })
         
      if (error) throw error
      
      // Atualiza o state original para não perder o link
      toast.success('Notas lançadas e processadas com sucesso!')
      loadAlunosEResultados(selectedTurma) // recarrega a tabela base
      
    } catch(err) {
      toast.error('Falha ao salvar as notas. Verifique permissões.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }


  if (loading) return <div className="p-8">Carregando...</div>
  if (!avaliacao) return <div className="p-8">Avaliação não encontrada.</div>

  const questoesRange = Array.from({ length: avaliacao.quantidade_questoes }, (_, i) => i)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/avaliacoes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas e Resultados</h1>
          <p className="text-muted-foreground mt-1">
            {avaliacao.nome} - {avaliacao.etapa} ({avaliacao.ano_letivo})
          </p>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/20">
           <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1">
                 <Label>Turma</Label>
                 <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                    <SelectTrigger className="w-[280px]">
                       <SelectValue placeholder="Selecione uma Turma" />
                    </SelectTrigger>
                    <SelectContent>
                       {turmas.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.serie} - {t.nome}</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>
              
              {canEdit && (
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                     <Download className="mr-2 h-4 w-4" /> Template CSV
                   </Button>
                   <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                     <Upload className="mr-2 h-4 w-4" /> Importar CSV
                   </Button>
                   <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                   />
                </div>
              )}
           </div>
        </CardHeader>
        <CardContent className="p-0">
           {!avaliacao.gabarito || avaliacao.gabarito.length === 0 ? (
             <div className="p-6 flex items-center gap-4 text-amber-600 bg-amber-50">
               <AlertCircle className="h-5 w-5" />
               <p className="text-sm font-medium">Atenção: O gabarito ainda não foi registrado! Você pode lançar as marcas dos alunos, mas as notas ficarão zeradas até a Coordenação adicionar o gabarito oficial.</p>
             </div>
           ) : null}

           {alunos.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum aluno encontrado ou turma vazia.
              </div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-muted text-muted-foreground uppercase text-xs">
                     <tr>
                        <th className="px-4 py-3 sticky left-0 z-10 bg-muted font-semibold min-w-[200px] border-r">Aluno</th>
                        <th className="px-4 py-3 min-w-[120px] text-center bg-muted/80 border-r" title="Nota Geral">Nota Calc.</th>
                        {questoesRange.map(q => (
                          <th key={q} className="px-2 py-3 text-center w-12 font-medium">Q{q + 1}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody>
                     {alunos.map((al: any) => {
                        const rDraft = respostasDraft[al.matricula] || []
                        const resRow = resultadosOriginal[al.matricula]
                        const notaGeral = resRow?.pontuacoes?.['_total_geral']
                        
                        return (
                          <tr key={al.matricula} className="border-b hover:bg-muted/50 transition-colors">
                             <td className="px-4 py-2 sticky left-0 z-10 bg-background/95 border-r font-medium truncate max-w-[200px]">
                               {al.nome}
                               <div className="text-[10px] text-muted-foreground font-mono font-normal">Mat: {al.matricula}</div>
                             </td>
                             <td className="px-4 py-2 text-center bg-gray-50 dark:bg-gray-900 border-r font-bold text-primary">
                               {notaGeral !== undefined ? notaGeral : '-'}
                             </td>
                             {questoesRange.map(q => {
                                const inputVal = rDraft[q] || ''
                                const gabCorrect = avaliacao.gabarito?.[q]
                                const isAnulada = avaliacao.questoes_anuladas?.includes(q+1)
                                
                                // Correção de cores se já tiver nota oficial
                                let colorClass = ""
                                if (resRow) { // Já persistido no sistema
                                  const dbVal = resRow.respostas?.[q] || ''
                                  if (isAnulada && dbVal !== '') colorClass = "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30"
                                  else if (dbVal !== '' && dbVal === gabCorrect) colorClass = "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30"
                                  else if (dbVal !== '' && dbVal !== gabCorrect) colorClass = "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30"
                                }

                                return (
                                 <td key={q} className="px-1 py-2 text-center">
                                   <input
                                      type="text"
                                      disabled={!canEdit}
                                      maxLength={1}
                                      value={inputVal}
                                      onChange={(e) => handleRespostaChange(al.matricula, q, e.target.value)}
                                      className={`w-8 h-8 text-center text-xs font-mono font-bold uppercase rounded border focus:outline-none focus:ring-1 focus:ring-ring \${colorClass} \${!canEdit ? 'bg-muted/50 cursor-not-allowed opacity-80' : 'bg-background'}`}
                                   />
                                 </td>
                               )
                             })}
                          </tr>
                        )
                     })}
                  </tbody>
                </table>
             </div>
           )}
        </CardContent>
        {canEdit && alunos.length > 0 && (
          <CardFooter className="pt-4 grid justify-end">
             <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Processando e Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Registros</>}
             </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
