import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { PlusCircle, FileText, Trash2, Edit } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/AuthContext"
import { Avaliacao, getAvaliacoes, deletarAvaliacao } from "@/services/avaliacoes"
import { toast } from "sonner"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"

export default function AvaliacoesList() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)

  const canEdit = usuario?.papel === 'Administrador' || usuario?.papel === 'Coordenador'

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getAvaliacoes()
      setAvaliacoes(data)
    } catch (e) {
      toast.error('Erro ao carregar as avaliações.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletarAvaliacao(id)
      toast.success('Avaliação deletada com sucesso.')
      setAvaliacoes(prev => prev.filter(a => a.id !== id))
    } catch (error) {
      toast.error('Erro ao excluir avaliação.')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as avaliações e simulados da instituição.
          </p>
        </div>
        
        {canEdit && (
          <Button onClick={() => navigate('/avaliacoes/nova')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Avaliação
          </Button>
        )}
      </div>

      <Separator />

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <FileText className="animate-pulse h-12 w-12 opacity-50 mb-4" />
          <p>Carregando avaliações...</p>
        </div>
      ) : avaliacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed bg-muted/20">
          <FileText className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-xl font-medium">Nenhuma avaliação encontrada</h3>
          <p className="text-muted-foreground max-w-sm mt-2 mb-6">
            Ainda não há avaliações cadastradas. Cadastre a primeira para acompanhar os resultados de seus alunos.
          </p>
          {canEdit && (
            <Button onClick={() => navigate('/avaliacoes/nova')}>Nova Avaliação</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {avaliacoes.map(avaliacao => (
            <Card key={avaliacao.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <CardTitle className="text-xl truncate" title={avaliacao.nome}>
                      {avaliacao.nome}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {avaliacao.etapa} - {avaliacao.ano_letivo}
                    </CardDescription>
                  </div>
                  {/* Etiqueta de Quantidade de Questões */}
                  <Badge variant="secondary" className="font-mono">
                    {avaliacao.quantidade_questoes} Q
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-4">
                <div className="flex flex-col gap-2 relative h-full">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Disciplinas:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {avaliacao.disciplinas.length > 0 ? (
                       avaliacao.disciplinas.map((d, i) => (
                         <Badge key={i} variant="outline">{d.nome}</Badge>
                       ))
                    ) : (
                       <span className="text-sm text-muted-foreground italic">Nenhuma configurada.</span>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t bg-muted/10 gap-2 justify-end">
                {canEdit && (
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/avaliacoes/${avaliacao.id}/gabarito`)}>
                    Gabarito
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={() => navigate(`/avaliacoes/${avaliacao.id}/resultados`)}>
                  Notas e Resultados
                </Button>
                
                {canEdit && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A remoção de uma avaliação apagará permanentemente todos os gabaritos e notas dos alunos registrados nela. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          autoFocus
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(avaliacao.id)}
                        >
                          Sim, excluir avaliacao
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
