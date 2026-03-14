import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Usuario, getUsuarios, alternarStatusUsuario } from '@/services/usuarios'
import { UserModal } from '@/components/usuarios/UserModal'
import { DeleteUserModal } from '@/components/usuarios/DeleteUserModal'
import { useAuth } from '@/contexts/AuthContext'
import { Ban, CheckCircle, Trash2, Edit2 } from 'lucide-react'

export function UsuariosTab() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null)
  
  const { usuario: currentUser } = useAuth()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsuarios()
      setUsuarios(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenCreate = () => {
    setSelectedUser(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (usuario: Usuario) => {
    setSelectedUser(usuario)
    setIsModalOpen(true)
  }

  const handleOpenDelete = (usuario: Usuario) => {
    setUserToDelete(usuario)
    setIsDeleteModalOpen(true)
  }

  const handleToggleStatus = async (usuario: Usuario) => {    
    try {
      await alternarStatusUsuario(usuario.id, !usuario.ativo)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status do usuário.')
    }
  }

  const getRoleBadgeStyle = (papel: string) => {
    switch (papel) {
      case 'Administrador':
        return 'bg-red-100 text-red-800'
      case 'Coordenador':
        return 'bg-blue-100 text-blue-800'
      case 'Professor':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h2>
          <p className="text-muted-foreground text-sm">
            Adicione, edite ou remova acessos ao sistema.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>Novo Usuário</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Como deseja ser chamado</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={usuario.foto_url || ''} alt={usuario.nome_completo || ''} />
                        <AvatarFallback>
                          {usuario.nome_completo ? usuario.nome_completo.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{usuario.nome_completo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {usuario.email}
                  </TableCell>
                  <TableCell>
                    {usuario.apelido || '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(usuario.papel)}`}>
                      {usuario.papel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button
                         variant="outline"
                         size="icon"
                         title="Editar usuário"
                         onClick={() => handleOpenEdit(usuario)}
                       >
                         <Edit2 className="w-4 h-4 text-muted-foreground" />
                       </Button>
                       
                       {currentUser?.id !== usuario.id && (
                         <>
                           <Button
                             variant="outline"
                             size="icon"
                             title={usuario.ativo ? "Inativar usuário" : "Ativar usuário"}
                             onClick={() => handleToggleStatus(usuario)}
                           >
                             {usuario.ativo ? <Ban className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                           </Button>
                           <Button
                             variant="outline"
                             size="icon"
                             title="Excluir usuário"
                             className="hover:bg-destructive hover:text-destructive-foreground"
                             onClick={() => handleOpenDelete(usuario)}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </>
                       )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal is rendered outside the tabular flow */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchUsers}
        usuario={selectedUser}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={fetchUsers}
        usuario={userToDelete}
      />
    </div>
  )
}
