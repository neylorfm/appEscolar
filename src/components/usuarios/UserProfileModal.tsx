import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { alternarDesejoSerChamado, atualizarSenhaUsuarioLocal } from '@/services/usuarios'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { usuario } = useAuth()
  
  const [apelido, setApelido] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && usuario) {
      setApelido(usuario.apelido || '')
      setNovaSenha('')
      setConfirmarSenha('')
      setError(null)
      setSuccessMsg(null)
    }
  }, [isOpen, usuario])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) return

    setError(null)
    setSuccessMsg(null)

    if (novaSenha && novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }

    if (novaSenha && novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      // 1. Atualizar Apelido
      if (apelido !== usuario.apelido) {
        await alternarDesejoSerChamado(usuario.id, apelido)
      }

      // 2. Atualizar Senha se preenchida
      if (novaSenha) {
        await atualizarSenhaUsuarioLocal(novaSenha)
      }

      setSuccessMsg('Perfil atualizado com sucesso!')
      
      // Fecha o modal após 1.5s se der sucesso
      setTimeout(() => {
         onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o perfil.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md">
              {successMsg}
            </div>
          )}

          <div className="space-y-2 pb-2 border-b">
             <Label className="text-muted-foreground text-xs uppercase tracking-wider">Conta</Label>
             <div>
                <p className="font-medium">{usuario?.nome_completo}</p>
                <p className="text-sm text-muted-foreground">{usuario?.email}</p>
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apelido">Como deseja ser chamado</Label>
            <Input
              id="apelido"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              placeholder="Ex: Prof. Silva, Joãozinho..."
              className="h-10"
            />
          </div>

          <div className="space-y-4 pt-2">
             <Label className="text-muted-foreground text-xs uppercase tracking-wider block">Segurança</Label>
             
             <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha (opcional)</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Deixe em branco para não alterar"
                  className="h-10"
                />
             </div>
             
             {novaSenha && (
                 <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmarSenha"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="h-10"
                      required={!!novaSenha}
                    />
                 </div>
             )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
