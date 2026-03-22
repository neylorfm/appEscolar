import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Recurso, getRecursos, criarRecurso, atualizarRecurso, deletarRecurso } from '@/services/recursos'
import { useAuth } from '@/contexts/AuthContext'
import { useInstituicao } from '@/contexts/InstituicaoContext'
import { supabase } from '@/lib/supabase'

export function RecursosTab() {
  const { configuracoes, refreshConfiguracoes } = useInstituicao()
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [errorDesc, setErrorDesc] = useState<string | null>(null)
  const [successConfigMsg, setSuccessConfigMsg] = useState('')
  
  // Regras States
  const [formSemanasLimit, setFormSemanasLimit] = useState(4)
  const [formDataLimit, setFormDataLimit] = useState('')
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form states
  const [formNome, setFormNome] = useState('')
  const [formIcone, setFormIcone] = useState('Box')
  const [formDetalhes, setFormDetalhes] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)

  const { usuario } = useAuth()
  const podeEditar = usuario?.papel === 'Administrador'

  useEffect(() => {
    loadRecursos()
  }, [])

  useEffect(() => {
    if (configuracoes) {
      setFormSemanasLimit(configuracoes.semanas_limite_agendamento || 4)
      setFormDataLimit(configuracoes.data_limite_agendamento || '')
    }
  }, [configuracoes])

  const handleSaveRegras = async () => {
    if (!configuracoes?.id) return
    setIsSavingConfig(true)
    setErrorDesc(null)
    setSuccessConfigMsg('')
    try {
      const { error } = await supabase
        .from('configuracoes_instituicao')
        .update({
          semanas_limite_agendamento: formSemanasLimit,
          data_limite_agendamento: formDataLimit || null
        })
        .eq('id', configuracoes.id)

      if (error) throw error
      await refreshConfiguracoes()
      setSuccessConfigMsg('Regras atualizadas com sucesso!')
      setTimeout(() => setSuccessConfigMsg(''), 3000)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao salvar regras de agendamento.')
    } finally {
      setIsSavingConfig(false)
    }
  }

  async function loadRecursos() {
    try {
      setLoading(true)
      const data = await getRecursos()
      setRecursos(data)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao carregar recursos.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (recurso?: Recurso) => {
    if (recurso) {
      setEditingId(recurso.id)
      setFormNome(recurso.nome)
      setFormIcone(recurso.icone)
      setFormDetalhes(recurso.detalhes || '')
      setFormAtivo(recurso.ativo)
    } else {
      setEditingId(null)
      setFormNome('')
      setFormIcone('Box')
      setFormDetalhes('')
      setFormAtivo(true)
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formNome.trim() || !formIcone.trim()) {
      setErrorDesc('O Nome e o Ícone do recurso são obrigatórios.')
      return
    }

    try {
      if (editingId) {
        const atualizado = await atualizarRecurso(editingId, {
          nome: formNome.trim(),
          icone: formIcone.trim(),
          detalhes: formDetalhes.trim() || null,
          ativo: formAtivo
        })
        setRecursos(prev => prev.map(r => r.id === editingId ? atualizado : r))
      } else {
        const novo = await criarRecurso({
          nome: formNome.trim(),
          icone: formIcone.trim(),
          detalhes: formDetalhes.trim() || null,
          ativo: formAtivo
        })
        setRecursos(prev => [...prev, novo])
      }
      setIsModalOpen(false)
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao salvar recurso.')
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!confirm('Deseja realmente excluir este recurso? Esta ação é irreversível.')) return
    
    try {
      await deletarRecurso(id)
      setRecursos(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      setErrorDesc(err instanceof Error ? err.message : 'Erro ao excluir o recurso.')
    }
  }

  // Helper to dynamically render a Lucide component by string name
  const renderIcon = (iconName: string, size = 24, className = "") => {
    // @ts-ignore - Indexing the imported lucide icons
    const IconComponent = LucideIcons[iconName] || LucideIcons['Box']
    return <IconComponent size={size} className={className} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Recursos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os laboratórios, salas de vídeo, quadras e outros espaços.
          </p>
        </div>
        {podeEditar && (
           <Button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90">
             <Plus className="mr-2 h-4 w-4" />
             Novo Recurso
           </Button>
        )}
      </div>

      {podeEditar && (
        <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4 mb-8">
          <div className="border-b pb-2 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Regras Globais de Agendamento</h3>
            {successConfigMsg && <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{successConfigMsg}</span>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="semanasLimit" className="font-medium">Limite Móvel (Semanas à Frente)</Label>
              <Input 
                id="semanasLimit"
                type="number" 
                min={1} 
                max={52}
                value={formSemanasLimit}
                onChange={(e) => setFormSemanasLimit(parseInt(e.target.value) || 4)}
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Impede que os professores agendem aulas para meses distantes no futuro. O padrão do sistema é 4 semanas. Ao usar uma "Data Final" abaixo, esta regra móvel é ignorada.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataLimit" className="font-medium">Data Final do Bimestre/Semestre (Opcional)</Label>
              <Input 
                id="dataLimit"
                type="date" 
                value={formDataLimit}
                onChange={(e) => setFormDataLimit(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Se definida, crava um limite absoluto na tabela de agendamentos para toda a escola. Nenhum usuário (nem mesmo a coordenação) poderá avançar a grade além dessa data.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveRegras} disabled={isSavingConfig} size="sm" className="bg-slate-800 hover:bg-slate-700">
              {isSavingConfig ? 'Salvando...' : 'Salvar Regras'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
         <div className="py-12 text-center text-muted-foreground">Carregando recursos...</div>
      ) : recursos.length === 0 ? (
         <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
           Nenhum recurso cadastrado ainda. Clique em "Novo Recurso" para começar.
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recursos.map((recurso) => (
             <div 
               key={recurso.id} 
               className={`relative bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden group transition-all duration-200 ${podeEditar ? 'hover:shadow-md hover:border-blue-200 cursor-pointer' : ''} ${!recurso.ativo ? 'opacity-80' : ''}`}
               onClick={() => podeEditar && handleOpenModal(recurso)}
             >
                {/* Status Ribbon/Badge in top right corner */}
                <div className={`absolute -right-8 top-4 rotate-45 px-10 py-0.5 text-[10px] font-bold text-white text-center shadow-sm w-[120px] ${recurso.ativo ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                   {recurso.ativo ? 'ATIVO' : 'INATIVO'}
                </div>
                
                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50/50 flex items-center justify-center text-blue-600 border border-blue-100/50 flex-shrink-0">
                      {renderIcon(recurso.icone, 24)}
                    </div>
                    <h3 className="font-semibold text-slate-800 text-lg leading-tight pr-8">
                      {recurso.nome}
                    </h3>
                  </div>
                  
                  {recurso.detalhes ? (
                    <p className="text-sm text-slate-500 mt-auto line-clamp-2">
                       {recurso.detalhes}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic mt-auto">
                       Sem detalhes
                    </p>
                  )}
                </div>

                {/* Optional Quick Delete overlay on hover - just for convenience */}
                {podeEditar && (
                  <Button
                     variant="destructive"
                     size="icon"
                     className="absolute bottom-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-500 hover:bg-rose-600 rounded-full shadow-sm"
                     onClick={(e) => handleDelete(recurso.id, e)}
                  >
                     <Trash2 className="h-4 w-4" />
                  </Button>
                )}
             </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingId ? 'Editar Recurso' : 'Adicionar Novo Recurso'}</DialogTitle>
            <DialogDescription>
              Preencha as informações do espaço ou equipamento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome" className="text-slate-700 font-medium">Nome do Recurso *</Label>
              <Input
                id="nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Laboratório de Informática 1, Quadra Norte..."
                className="h-10"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                 <Label htmlFor="icone" className="text-slate-700 font-medium">Ícone (Lucide React) *</Label>
                 <a href="https://lucide.dev/icons/" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                    (Ver Lista)
                 </a>
              </div>
              <div className="flex gap-3">
                 <Input
                   id="icone"
                   value={formIcone}
                   onChange={(e) => setFormIcone(e.target.value)}
                   placeholder="Digite o nome do ícone (Ex: Monitor, Book)"
                   className="h-10 flex-1"
                 />
                 <div className="w-10 h-10 border rounded-md flex items-center justify-center bg-slate-50 text-slate-600 shrink-0 shadow-sm" title="Preview do Ícone">
                    {renderIcon(formIcone, 20)}
                 </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Digite o nome exato do ícone em PascalCase. Ex: 'Video', 'Monitor', 'Trophy'.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="detalhes" className="text-slate-700 font-medium">Detalhes / Especificações</Label>
              <Textarea
                id="detalhes"
                value={formDetalhes}
                onChange={(e) => setFormDetalhes(e.target.value)}
                placeholder="Ex: Bloco C, Capacidade 30 alunos, Computadores Positivo..."
                className="resize-none h-24"
              />
            </div>

            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border">
              <Checkbox
                id="ativo"
                checked={formAtivo}
                onCheckedChange={(checked: boolean | 'indeterminate') => setFormAtivo(checked === true)}
                className="mt-1"
              />
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor="ativo"
                  className="font-medium text-slate-800 cursor-pointer"
                >
                  Recurso Ativo e Operacional
                </Label>
                <p className="text-sm text-muted-foreground">
                  Desmarque se o recurso estiver em manutenção ou desativado.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              <SaveIcon className="mr-2 h-4 w-4" />
              Salvar Recurso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={!!errorDesc} onOpenChange={(open) => {
         if (!open) setErrorDesc(null)
      }}>
        <DialogContent className="sm:max-w-[425px] flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 text-red-600">
             <AlertCircle size={32} />
           </div>
           <DialogHeader>
             <DialogTitle className="text-xl text-center">Erro</DialogTitle>
             <DialogDescription className="text-center pt-2 text-base text-slate-700">
               {errorDesc}
             </DialogDescription>
           </DialogHeader>
           <DialogFooter className="mt-4 w-full flex-col sm:flex-col items-center gap-2">
              <Button variant="default" onClick={() => setErrorDesc(null)} className="w-full h-11">
                 Entendi
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Temporary inline component for the save icon in footer if not dynamically rendered
function SaveIcon({ className }: { className?: string }) {
  return <LucideIcons.Save className={className} />
}
