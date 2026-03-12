import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PapelUsuario,
  Usuario,
  convidarUsuario,
  atualizarUsuario,
  atualizarSenhaUsuario,
  fazerUploadFoto
} from '@/services/usuarios'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UploadCloud } from 'lucide-react'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  usuario?: Usuario | null
}

export function UserModal({ isOpen, onClose, onSuccess, usuario }: UserModalProps) {
  const isEditing = !!usuario

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [apelido, setApelido] = useState('')
  const [papel, setPapel] = useState<PapelUsuario>('Professor')
  const [senha, setSenha] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [foto, setFoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (isEditing && usuario) {
        setNome(usuario.nome_completo || '')
        setEmail(usuario.email || '')
        setApelido(usuario.apelido || '')
        setPapel(usuario.papel || 'Professor')
        setPreviewUrl(usuario.foto_url || null)
      } else {
        setNome('')
        setEmail('')
        setApelido('')
        setPapel('Professor')
        setPreviewUrl(null)
      }
      setSenha('')
      setFoto(null)
      setError(null)
    }
  }, [isOpen, isEditing, usuario])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFoto(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      let savedUserId = usuario?.id

      if (isEditing && usuario) {
        await atualizarUsuario(usuario.id, nome, apelido, papel)
        if (senha) {
          await atualizarSenhaUsuario(usuario.id, senha)
        }
      } else {
        const result = await convidarUsuario(nome, email, apelido, papel)
        savedUserId = result.user?.id
        
        // Se a senha foi informada na criação, não existe API direto no invite para admin.
        // O Supabase enviará o email para o usuário definir a senha, 
        // ou nós atualizamos a senha do usuário recém criado logo após:
        if (senha && savedUserId) {
           await atualizarSenhaUsuario(savedUserId, senha)
        }
      }

      // Upload de foto se houver uma nova
      if (foto && savedUserId) {
        await fazerUploadFoto(foto, savedUserId)
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao salvar o usuário.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleClickTrocarFoto = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuário' : 'Convidar Usuário'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* Upload de foto */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl || ''} />
              <AvatarFallback>{nome ? nome.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" size="sm" onClick={handleClickTrocarFoto}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Trocar Foto
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".png,.jpg,.jpeg,.svg" 
              onChange={handleFileChange} 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nome">Nome Completo <span className="text-red-500">*</span></Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span> {isEditing && '(Não editável via painel)'}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@escola.com"
              disabled={isEditing}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apelido">Como deseja ser chamado</Label>
            <Input
              id="apelido"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              placeholder="Ex: Prof. João"
            />
          </div>

          <div className="grid gap-2">
             <Label htmlFor="senha">{isEditing ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha Inicial'}</Label>
             <Input
               id="senha"
               type="password"
               value={senha}
               onChange={(e) => setSenha(e.target.value)}
               placeholder="********"
             />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="papel">Papel / Nível <span className="text-red-500">*</span></Label>
            <Select value={papel} onValueChange={(val) => setPapel(val as PapelUsuario)}>
              <SelectTrigger id="papel">
                <SelectValue placeholder="Selecione um papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professor">Professor</SelectItem>
                <SelectItem value="Coordenador">Coordenador</SelectItem>
                <SelectItem value="Administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !nome || !email}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
