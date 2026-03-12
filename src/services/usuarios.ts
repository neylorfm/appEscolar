import { supabase } from '../lib/supabase'

export type PapelUsuario = 'Administrador' | 'Coordenador' | 'Professor'

export interface Usuario {
  id: string
  email: string
  nome_completo: string | null
  apelido: string | null
  foto_url: string | null
  papel: PapelUsuario
  created_at: string
}

export async function getUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar usuários:', error)
    throw new Error('Não foi possível carregar a lista de usuários.')
  }

  return data as Usuario[]
}

export async function convidarUsuario(nomeCompleto: string, email: string, apelido: string, papel: PapelUsuario) {
  // Chamada para a Edge Function
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Você precisa estar logado para realizar esta ação.')
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action: 'invite',
      email,
      nome_completo: nomeCompleto,
      apelido,
      papel
    })
  })

  const responseData = await response.json()

  if (!response.ok) {
    console.error('Erro ao convidar usuário:', responseData)
    throw new Error(responseData.error || 'Falha ao convidar o usuário.')
  }

  return responseData
}

export async function atualizarUsuario(id: string, nomeCompleto: string, apelido: string, papel: PapelUsuario) {
  const { data, error } = await supabase
    .from('usuarios')
    .update({
      nome_completo: nomeCompleto,
      apelido: apelido,
      papel: papel
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao editar usuário:', error)
    throw new Error('Não foi possível atualizar os dados do usuário.')
  }

  return data as Usuario
}

export async function atualizarSenhaUsuario(id: string, novaSenha: string) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Você precisa estar logado para realizar esta ação.')
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      action: 'update_password',
      id,
      password: novaSenha
    })
  })

  const responseData = await response.json()

  if (!response.ok) {
    console.error('Erro ao atualizar senha:', responseData)
    throw new Error(responseData.error || 'Falha ao atualizar a senha do usuário.')
  }

  return responseData
}

export async function fazerUploadFoto(file: File, usuarioId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${usuarioId}-${Math.random()}.${fileExt}`
  const filePath = `fotos_perfil/${fileName}`

  // A tabela storage "avatars" ou "fotos" precisaria estar configurada
  // Assumindo um bucket chamado 'public'
  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    console.error('Erro no upload da foto:', uploadError)
    throw new Error('Falha ao fazer upload da foto de perfil.')
  }

  const { data: { publicUrl } } = supabase.storage
    .from('public')
    .getPublicUrl(filePath)

  // Atualizar a url na tabela de usuarios
  const { error: updateError } = await supabase
    .from('usuarios')
    .update({ foto_url: publicUrl })
    .eq('id', usuarioId)

  if (updateError) {
     throw new Error('Upload feito, mas falha ao atualizar o perfil do usuário.')
  }

  return publicUrl
}
