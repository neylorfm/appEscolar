import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

import { criarAvaliacao, DisciplinaConfig } from "@/services/avaliacoes"
import { getTurmas, Turma } from "@/services/turmas"

export default function NovaAvaliacaoPage() {
  const navigate = useNavigate()
  
  // States - Basic Info
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [etapa, setEtapa] = useState<string>("1º BIMESTRE")
  const [nome, setNome] = useState("")
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState<number | ''>('')
  
  // States - Turmas
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>([])
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([])
  
  // States - Disciplinas
  const [disciplinas, setDisciplinas] = useState<DisciplinaConfig[]>([
    { nome: "", inicio: 1, valor: 1 }
  ])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getTurmas()
        setTurmasDisponiveis(data)
      } catch (error) {
        toast.error("Erro ao puxar turma do banco de dados")
      }
    }
    load()
  }, [])

  const handleAddDisciplina = () => {
    // A próxima disciplina começa logicamente depois da última definida (ou +1), mas vamos focar na UX
    const ultimoInicio = disciplinas.length > 0 ? disciplinas[disciplinas.length - 1].inicio : 1
    setDisciplinas([...disciplinas, { nome: "", inicio: ultimoInicio + 10, valor: 1 }])
  }

  const handleRemoverDisciplina = (index: number) => {
    setDisciplinas(disciplinas.filter((_, i) => i !== index))
  }

  const handleUpdateDisciplina = (index: number, field: keyof DisciplinaConfig, value: any) => {
    const novas = [...disciplinas]
    novas[index] = { ...novas[index], [field]: value }
    setDisciplinas(novas)
  }

  const toggleTurma = (id: string) => {
    if (turmasSelecionadas.includes(id)) {
      setTurmasSelecionadas(prev => prev.filter(t => t !== id))
    } else {
      setTurmasSelecionadas(prev => [...prev, id])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações básicas
    if (!nome) return toast.error("Informe o nome da avaliação.")
    if (!quantidadeQuestoes || Number(quantidadeQuestoes) <= 0) return toast.error("A quantidade de questões deve ser válida.")
    if (turmasSelecionadas.length === 0) return toast.error("Selecione ao menos uma turma.")
    if (disciplinas.length === 0) return toast.error("Defina ao menos uma disciplina.")
    
    // Validação de disciplinas formatadas
    for (const d of disciplinas) {
      if (!d.nome) return toast.error("Todas as disciplinas devem ter um nome.")
      if (d.inicio < 1 || d.inicio > Number(quantidadeQuestoes)) return toast.error(`A questão inicial da disciplina ${d.nome} é inválida.`)
      if (d.valor <= 0) return toast.error(`O valor da questão na disciplina ${d.nome} deve ser maior que zero.`)
    }

    // Verifica sobreposição de inicio (não podem existir duas disciplinas que iniciem na mesma questão)
    const inicios = disciplinas.map(d => Number(d.inicio))
    const uniqueInicios = new Set(inicios)
    if (inicios.length !== uniqueInicios.size) {
      return toast.error("Não pode haver mais de uma disciplina iniciando na mesma questão.")
    }

    try {
      setLoading(true)
      await criarAvaliacao({
        ano_letivo: anoLetivo,
        etapa,
        nome,
        quantidade_questoes: Number(quantidadeQuestoes),
        disciplinas,
        gabarito: null,
        questoes_anuladas: null
      }, turmasSelecionadas)
      
      toast.success("Avaliação cadastrada com sucesso!")
      navigate('/avaliacoes')
    } catch (err: any) {
      toast.error(err.message || "Erro fatal ao conectar com o banco de dados.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Avaliação</h1>
          <p className="text-muted-foreground mt-1">Configure os dados, formato e as disciplinas da prova.</p>
        </div>
      </div>

      <Separator />

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Bloco 1: Dados Básicos */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">1. Dados Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Ano Letivo</Label>
                <Input 
                  type="number" 
                  value={anoLetivo} 
                  onChange={(e) => setAnoLetivo(Number(e.target.value))} 
                />
             </div>
             <div className="space-y-2">
                <Label>Etapa / Bimestre</Label>
                <Select value={etapa} onValueChange={setEtapa}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1º BIMESTRE">1º BIMESTRE</SelectItem>
                    <SelectItem value="2º BIMESTRE">2º BIMESTRE</SelectItem>
                    <SelectItem value="3º BIMESTRE">3º BIMESTRE</SelectItem>
                    <SelectItem value="4º BIMESTRE">4º BIMESTRE</SelectItem>
                    <SelectItem value="RECUPERAÇÃO FINAL">RECUPERAÇÃO FINAL</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2 md:col-span-2">
                <Label>Nome da Avaliação</Label>
                <Input 
                  placeholder="Ex: Simulado ENEM, Prova Final de Exatas" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                />
             </div>
             <div className="space-y-2">
                <Label>Quantidade Total de Questões</Label>
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="Ex: 35"
                  value={quantidadeQuestoes} 
                  onChange={(e) => setQuantidadeQuestoes(e.target.value ? Number(e.target.value) : '')} 
                />
             </div>
          </div>
        </div>

        {/* Bloco 2: Turmas Associadas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">2. Turmas Participantes</h2>
          <Card>
            <CardContent className="pt-6">
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                 {turmasDisponiveis.map(t => (
                   <div key={t.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`turma-${t.id}`} 
                        checked={turmasSelecionadas.includes(t.id)}
                        onCheckedChange={() => toggleTurma(t.id)}
                      />
                      <label 
                        htmlFor={`turma-${t.id}`} 
                        className="text-sm cursor-pointer select-none font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t.serie} - {t.nome}
                      </label>
                   </div>
                 ))}
                 {turmasDisponiveis.length === 0 && (
                   <span className="text-muted-foreground text-sm">Carregando turmas ou banco vazio...</span>
                 )}
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Bloco 3: Configuração de Disciplinas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-xl font-semibold">3. Disciplinas e Pesos</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddDisciplina}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Disciplina
            </Button>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-xl border space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure a divisão da prova. Exemplo: Se PORTUGUÊS inicia na questão 1 e INGLÊS inicia na 21, subentende-se que as questões de 1 a 20 são de Português.
            </p>

            {disciplinas.map((disc, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end bg-background p-4 rounded-lg border shadow-sm">
                 <div className="space-y-2 flex-1 w-full relative">
                    <Label className="text-xs">Nome da Disciplina</Label>
                    <Input 
                      placeholder="Ex: Português"
                      value={disc.nome}
                      onChange={e => handleUpdateDisciplina(idx, 'nome', e.target.value)}
                    />
                 </div>
                 <div className="space-y-2 w-full sm:w-32">
                    <Label className="text-xs">Começa na Q.</Label>
                    <Input 
                      type="number"
                      min="1"
                      value={disc.inicio || ''}
                      onChange={e => handleUpdateDisciplina(idx, 'inicio', Number(e.target.value))}
                    />
                 </div>
                 <div className="space-y-2 w-full sm:w-32">
                    <Label className="text-xs">Valor por Q.</Label>
                    <Input 
                      type="number"
                      step="any"
                      min="0"
                      value={disc.valor || ''}
                      onChange={e => handleUpdateDisciplina(idx, 'valor', Number(e.target.value))}
                    />
                 </div>
                 <Button 
                   type="button" 
                   variant="ghost" 
                   size="icon" 
                   className="text-destructive hover:bg-destructive/10"
                   onClick={() => handleRemoverDisciplina(idx)}
                   disabled={disciplinas.length === 1} // Não permite apagar a única disciplina
                 >
                    <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : <><Save className="h-4 w-4 mr-2" /> Salvar Avaliação</>}
          </Button>
        </div>

      </form>
    </div>
  )
}
