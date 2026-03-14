import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Usuario, deletarUsuario } from '@/services/usuarios'

interface DeleteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  usuario: Usuario | null
}

export function DeleteUserModal({ isOpen, onClose, onSuccess, usuario }: DeleteUserModalProps) {
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNameMatching = confirmName === usuario?.nome_completo

  const handleDelete = async () => {
    if (!usuario) return
    
    setLoading(true)
    setError(null)
    
    try {
      await deletarUsuario(usuario.id)
      onSuccess()
      onClose()
      setConfirmName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmName('')
      setError(null)
      onClose()
    }
  }

  if (!usuario) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Excluir Usuário</DialogTitle>
          <DialogDescription>
             Esta ação não pode ser desfeita. Isso excluirá permanentemente a conta e removerá os dados associados.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="py-2">
           <p className="text-sm text-muted-foreground mb-2">
             Para confirmar, digite o nome completo do usuário abaixo:
           </p>
           <p className="font-semibold px-3 py-2 bg-muted rounded-md mb-4 select-none pointer-events-none">
             {usuario.nome_completo}
           </p>
           
           <Input
             value={confirmName}
             onChange={(e) => setConfirmName(e.target.value)}
             placeholder="Digite o nome completo do usuário"
             className="w-full"
             autoComplete="off"
           />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={loading || !isNameMatching}
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
