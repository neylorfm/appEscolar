import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ConfiguracoesInstituicao } from '../types/instituicao'

interface InstituicaoContextType {
  configuracoes: ConfiguracoesInstituicao | null
  loading: boolean
  refreshConfiguracoes: () => Promise<void>
}

const InstituicaoContext = createContext<InstituicaoContextType | undefined>(undefined)

export function InstituicaoProvider({ children }: { children: React.ReactNode }) {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesInstituicao | null>(null)
  const [loading, setLoading] = useState(true)

  const applyColorsToCss = (config: ConfiguracoesInstituicao) => {
    const root = document.documentElement
    if (config.cor_principal) root.style.setProperty('--primary-color', config.cor_principal)
    if (config.cor_secundaria_1) root.style.setProperty('--secondary-color-1', config.cor_secundaria_1)
    if (config.cor_secundaria_2) root.style.setProperty('--secondary-color-2', config.cor_secundaria_2)
    if (config.cor_destaque_1) root.style.setProperty('--highlight-color-1', config.cor_destaque_1)
    if (config.cor_destaque_2) root.style.setProperty('--highlight-color-2', config.cor_destaque_2)
  }

  const applyBrandingToDocument = (config: ConfiguracoesInstituicao) => {
    if (config.nome_instituicao) {
      document.title = config.nome_instituicao;
    }
    
    if (config.logo_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = config.logo_url;
    }
  }

  const refreshConfiguracoes = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('configuracoes_instituicao')
        .select('*')
        .single()

      if (error) {
        console.error('Erro ao buscar configurações da instituição:', error)
      } else if (data) {
        setConfiguracoes(data as ConfiguracoesInstituicao)
        applyColorsToCss(data as ConfiguracoesInstituicao)
        applyBrandingToDocument(data as ConfiguracoesInstituicao)
      }
    } catch (err) {
      console.error('Falha ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshConfiguracoes()
  }, [refreshConfiguracoes])

  return (
    <InstituicaoContext.Provider value={{ configuracoes, loading, refreshConfiguracoes }}>
      {children}
    </InstituicaoContext.Provider>
  )
}

export function useInstituicao() {
  const context = useContext(InstituicaoContext)
  if (context === undefined) {
    throw new Error('useInstituicao deve ser usado dentro de um InstituicaoProvider')
  }
  return context
}
