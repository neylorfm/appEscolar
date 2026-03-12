import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInstituicao } from '@/contexts/InstituicaoContext'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UploadCloud } from 'lucide-react'

export function InstituicaoTab() {
  const { configuracoes, refreshConfiguracoes } = useInstituicao()
  
  const [nome, setNome] = useState('')
  const [corPrincipal, setCorPrincipal] = useState('#ea580c')
  const [corSecundaria1, setCorSecundaria1] = useState('#16a34a')
  const [corSecundaria2, setCorSecundaria2] = useState('#312e81')
  const [corDestaque1, setCorDestaque1] = useState('#e0e7ff')
  const [corDestaque2, setCorDestaque2] = useState('#f1f5f9')
  
  const [timeoutProf, setTimeoutProf] = useState(60)
  const [timeoutCoord, setTimeoutCoord] = useState(60)
  const [timeoutAdmin, setTimeoutAdmin] = useState(20)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [foto, setFoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (configuracoes) {
      setNome(configuracoes.nome_instituicao || '')
      setCorPrincipal(configuracoes.cor_principal || '#ea580c')
      setCorSecundaria1(configuracoes.cor_secundaria_1 || '#16a34a')
      setCorSecundaria2(configuracoes.cor_secundaria_2 || '#312e81')
      setCorDestaque1(configuracoes.cor_destaque_1 || '#e0e7ff')
      setCorDestaque2(configuracoes.cor_destaque_2 || '#f1f5f9')
      setTimeoutProf(configuracoes.timeout_professor_min || 60)
      setTimeoutCoord(configuracoes.timeout_coordenador_min || 60)
      setTimeoutAdmin(configuracoes.timeout_administrador_min || 20)
      setPreviewUrl(configuracoes.logo_url || null)
    }
  }, [configuracoes])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFoto(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const uploadLogo = async (instituicaoId: string) => {
    if (!foto) return null
    
    const fileExt = foto.name.split('.').pop()
    const fileName = `logo-${instituicaoId}-${Math.random()}.${fileExt}`
    const filePath = `instituicao/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, foto, { upsert: true })

    if (uploadError) {
      console.error('Erro no upload do logo:', uploadError)
      throw new Error('Falha ao fazer upload do logotipo.')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSave = async () => {
    if (!configuracoes?.id) return

    setLoading(true)
    setMessage('')
    setError('')

    try {
      let finalLogoUrl = configuracoes.logo_url
      if (foto) {
        finalLogoUrl = await uploadLogo(configuracoes.id)
      }

      const { error: updateError } = await supabase
        .from('configuracoes_instituicao')
        .update({
          nome_instituicao: nome,
          cor_principal: corPrincipal,
          cor_secundaria_1: corSecundaria1,
          cor_secundaria_2: corSecundaria2,
          cor_destaque_1: corDestaque1,
          cor_destaque_2: corDestaque2,
          timeout_professor_min: timeoutProf,
          timeout_coordenador_min: timeoutCoord,
          timeout_administrador_min: timeoutAdmin,
          logo_url: finalLogoUrl
        })
        .eq('id', configuracoes.id)

      if (updateError) throw updateError

      setMessage('Configurações salvas com sucesso!')
      await refreshConfiguracoes() // Refresh globcontext to update CSS variables immediately
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações.')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 3000) // Clear success message
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Escola & Visual</h2>
          <p className="text-muted-foreground text-sm">
            Defina o nome da sua instituição, logotipo, paleta de cores e limites de sessão.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {message && (
        <div className="bg-green-100 text-green-800 p-4 rounded-md text-sm border border-green-200">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Identidade Visual */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
        <h3 className="text-lg font-semibold border-b pb-2">Identidade Visual</h3>
        
        <div className="grid gap-6">
           <div>
             <Label className="mb-3 block">Logotipo da Instituição</Label>
             <div className="flex items-center gap-6">
               <Avatar className="h-24 w-24 rounded-lg border-2 border-dashed">
                 <AvatarImage src={previewUrl || ''} className="object-contain" />
                 <AvatarFallback className="rounded-lg bg-gray-50 text-xs text-center text-gray-400">Sem<br/>Logo</AvatarFallback>
               </Avatar>
               <div>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Alterar Imagem
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Recomendado: fundo transparente (PNG)</p>
               </div>
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".png,.jpg,.jpeg,.svg" 
                  onChange={handleFileChange} 
               />
             </div>
           </div>

           <div className="grid gap-2">
             <Label htmlFor="nome">Nome de Exibição</Label>
             <Input
               id="nome"
               value={nome}
               onChange={(e) => setNome(e.target.value)}
               placeholder="Ex: Escola Estadual..."
               className="max-w-md"
             />
           </div>

           <div>
              <Label className="mb-2 block">Paleta de Cores</Label>
              <p className="text-xs text-muted-foreground mb-4">Escolha as cores que predominarão no sistema e no Login.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                 <div className="space-y-1">
                    <Label className="text-xs font-normal">Cor Principal</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={corPrincipal} onChange={(e) => setCorPrincipal(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
                      <Input value={corPrincipal} onChange={(e) => setCorPrincipal(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs font-normal">Cor Secundária 1</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={corSecundaria1} onChange={(e) => setCorSecundaria1(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
                      <Input value={corSecundaria1} onChange={(e) => setCorSecundaria1(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs font-normal">Cor Secundária 2</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={corSecundaria2} onChange={(e) => setCorSecundaria2(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
                      <Input value={corSecundaria2} onChange={(e) => setCorSecundaria2(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs font-normal">Cor de Destaque 1</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={corDestaque1} onChange={(e) => setCorDestaque1(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
                      <Input value={corDestaque1} onChange={(e) => setCorDestaque1(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-xs font-normal">Cor de Destaque 2</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={corDestaque2} onChange={(e) => setCorDestaque2(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none" />
                      <Input value={corDestaque2} onChange={(e) => setCorDestaque2(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Sessões */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
        <div>
           <h3 className="text-lg font-semibold border-b pb-2">Segurança e Sessões</h3>
           <p className="text-sm text-muted-foreground mt-2">
             Defina o tempo limite (em minutos) antes que os usuários precisem fazer login novamente ao ficarem ociosos.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="grid gap-2">
             <Label htmlFor="t_prof">Professor (min)</Label>
             <Input
               id="t_prof"
               type="number"
               min={5}
               value={timeoutProf}
               onChange={(e) => setTimeoutProf(parseInt(e.target.value) || 60)}
             />
           </div>
           
           <div className="grid gap-2">
             <Label htmlFor="t_coord">Coordenador (min)</Label>
             <Input
               id="t_coord"
               type="number"
               min={5}
               value={timeoutCoord}
               onChange={(e) => setTimeoutCoord(parseInt(e.target.value) || 60)}
             />
           </div>

           <div className="grid gap-2">
             <Label htmlFor="t_admin">Administrador (min)</Label>
             <Input
               id="t_admin"
               type="number"
               min={5}
               value={timeoutAdmin}
               onChange={(e) => setTimeoutAdmin(parseInt(e.target.value) || 20)}
             />
           </div>
        </div>
      </div>
      
    </div>
  )
}
