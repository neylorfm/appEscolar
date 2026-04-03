import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

import { Avaliacao, getAvaliacaoPorId } from "@/services/avaliacoes"
import { supabase } from "@/lib/supabase"

const ALTERNATIVAS = ["A", "B", "C", "D", "E"]

export default function ConfigurarGabarito() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null)
  
  const [gabarito, setGabarito] = useState<string[]>([])
  const [anuladas, setAnuladas] = useState<number[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(avaliacaoId: string) {
    try {
      const data = await getAvaliacaoPorId(avaliacaoId)
      if (!data) return navigate('/avaliacoes')
        
      setAvaliacao(data)
      
      // Initialize states based on existing data or fill arrays
      if (data.gabarito && data.gabarito.length > 0) {
        setGabarito(data.gabarito)
      } else {
        setGabarito(new Array(data.quantidade_questoes).fill(''))
      }
      
      setAnuladas(data.questoes_anuladas || [])
    } catch (e) {
      toast.error('Erro ao carregar a avaliação.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAlternativa = (index: number, value: string) => {
    const newGab = [...gabarito]
    newGab[index] = value
    setGabarito(newGab)
  }

  const toggleAnulada = (numeroQuestao: number) => {
    if (anuladas.includes(numeroQuestao)) {
      setAnuladas(anuladas.filter(n => n !== numeroQuestao))
    } else {
      setAnuladas([...anuladas, numeroQuestao])
    }
  }

  const handleSave = async () => {
    if (!avaliacao) return
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('avaliacoes')
        .update({
           gabarito: gabarito,
           questoes_anuladas: anuladas
        })
        .eq('id', avaliacao.id)

      if (error) throw error

      // TODO: Re-calcular notas de todos os alunos submetidos após salvar gabarito
      
      toast.success('Gabarito salvo com sucesso!')
      navigate('/avaliacoes')
    } catch (err: any) {
      toast.error('Erro ao salvar gabarito.')
      console.error(err)
    } finally {
       setSaving(false)
    }
  }

  if (loading) return <div>Carregando...</div>
  if (!avaliacao) return null

  // Gera o grid de questões
  const questoes = Array.from({ length: avaliacao.quantidade_questoes }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gabarito e Anulações</h1>
            <p className="text-muted-foreground mt-1">
              Avaliação: {avaliacao.nome} - {avaliacao.etapa} ({avaliacao.ano_letivo})
            </p>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
        </Button>
      </div>

      <Separator />
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {questoes.map(q => {
          const anulada = anuladas.includes(q)
          const index = q - 1
          
          return (
            <Card key={q} className={`overflow-hidden transition-all \${anulada ? 'opacity-60 border-destructive outline outline-destructive/50' : ''}`}>
              <CardContent className="p-3 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                   <Label className="font-bold">Q{q}</Label>
                   <div className="flex items-center space-x-1" title="Marcar como Anulada">
                     <Checkbox 
                       checked={anulada} 
                       onCheckedChange={() => toggleAnulada(q)} 
                     />
                     <span className="text-[10px] uppercase font-semibold text-destructive">Anulada</span>
                   </div>
                </div>
                
                <Select 
                  disabled={anulada} 
                  value={gabarito[index] || ''} 
                  onValueChange={(val) => handleSelectAlternativa(index, val)}
                >
                   <SelectTrigger className="w-full">
                     <SelectValue placeholder="Selecione" />
                   </SelectTrigger>
                   <SelectContent>
                      {ALTERNATIVAS.map(alt => (
                         <SelectItem key={alt} value={alt}>{alt}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
