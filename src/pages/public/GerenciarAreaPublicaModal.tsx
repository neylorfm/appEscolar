import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AvisoPublico, upsertAvisoPublico } from "@/services/areaPublica"
import { toast } from "sonner"
import { Megaphone, Image as ImageIcon, Link as LinkIcon } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useInstituicao } from "@/contexts/InstituicaoContext"

interface GerenciarAreaPublicaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  avisoParaEditar?: Partial<AvisoPublico> | null
  onSuccess: () => void
}

const CATEGORIAS_AREA_PUBLICA = [
  { rotulo: "COMUNICADO", valor: "COMUNICADO" },
  { rotulo: "EVENTO", valor: "EVENTO" },
  { rotulo: "PRAZO", valor: "PRAZO" },
  { rotulo: "AVISO GERAL", valor: "AVISO GERAL" },
  { rotulo: "IMPORTANTE", valor: "IMPORTANTE" },
  { rotulo: "COMUNIDADE", valor: "COMUNIDADE" },
  { rotulo: "PEDAGÓGICO", valor: "PEDAGÓGICO" },
]

export function GerenciarAreaPublicaModal({
  open,
  onOpenChange,
  avisoParaEditar,
  onSuccess
}: GerenciarAreaPublicaModalProps) {
  const { usuario } = useAuth()
  const { configuracoes } = useInstituicao()
  const corPrincipal = configuracoes?.cor_principal || '#7f1d1d'

  const [formData, setFormData] = useState<Partial<AvisoPublico>>({
    titulo: "",
    conteudo: "",
    imagem_url: "",
    link: "",
    categoria: "COMUNICADO",
    data_publicacao: new Date().toISOString()
  })
  const [salvando, setSalvando] = useState(false)
  const [previewErroImagem, setPreviewErroImagem] = useState(false)

  useEffect(() => {
    if (avisoParaEditar) {
      setFormData({
        id: avisoParaEditar.id,
        titulo: avisoParaEditar.titulo || "",
        conteudo: avisoParaEditar.conteudo || "",
        imagem_url: avisoParaEditar.imagem_url || "",
        link: avisoParaEditar.link || "",
        categoria: avisoParaEditar.categoria || "COMUNICADO",
        data_publicacao: avisoParaEditar.data_publicacao || new Date().toISOString(),
        ordem: avisoParaEditar.ordem ?? 0
      })
    } else {
      setFormData({
        titulo: "",
        conteudo: "",
        imagem_url: "",
        link: "",
        categoria: "COMUNICADO",
        data_publicacao: new Date().toISOString(),
        ordem: 0
      })
    }
    setPreviewErroImagem(false)
  }, [avisoParaEditar, open])

  function formatarUrl(url?: string | null) {
    if (!url) return ""
    const trimmed = url.trim()
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  async function handleSalvar() {
    if (!formData.titulo?.trim()) {
      toast.error("O título do comunicado é obrigatório")
      return
    }
    if (!formData.conteudo?.trim()) {
      toast.error("O conteúdo do comunicado é obrigatório")
      return
    }

    try {
      setSalvando(true)
      await upsertAvisoPublico({
        ...formData,
        autor_id: usuario?.id,
        link: formData.link ? formatarUrl(formData.link) : null,
        imagem_url: formData.imagem_url ? formData.imagem_url.trim() : null,
        categoria: formData.categoria || "COMUNICADO"
      })

      toast.success(
        formData.id 
          ? "Comunicado da Área Pública atualizado com sucesso!" 
          : "Comunicado publicado na Área Pública com sucesso!",
        { icon: "🌐" }
      )
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error("Erro ao salvar aviso público:", err)
      toast.error("Erro ao salvar comunicado", {
        description: err?.message || "Verifique a conexão com o banco de dados."
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle 
            className="flex items-center gap-2 text-xl font-bold"
            style={{ color: corPrincipal }}
          >
            <Megaphone className="h-5 w-5" />
            {formData.id ? "Editar Comunicado - Área Pública" : "Novo Comunicado - Área Pública"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Este comunicado ficará visível publicamente na página inicial para pais, alunos e toda a comunidade escolar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          {/* Categoria */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoria" className="text-xs font-bold">
              Categoria do Comunicado
            </Label>
            <Select
              value={formData.categoria || "COMUNICADO"}
              onValueChange={(val) => setFormData(prev => ({ ...prev, categoria: val }))}
            >
              <SelectTrigger id="categoria" className="h-9">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_AREA_PUBLICA.map(cat => (
                  <SelectItem key={cat.valor} value={cat.valor} className="font-semibold text-xs">
                    {cat.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo" className="text-xs font-bold">
              Título do Comunicado *
            </Label>
            <Input
              id="titulo"
              placeholder="Ex: Calendário de Matrículas e Rematrículas 2026"
              value={formData.titulo || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              className="h-9 font-medium"
            />
          </div>

          {/* Conteúdo */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conteudo" className="text-xs font-bold">
              Texto / Mensagem Completa *
            </Label>
            <Textarea
              id="conteudo"
              placeholder="Digite todas as orientações, horários, locais e detalhes para a comunidade..."
              value={formData.conteudo || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, conteudo: e.target.value }))}
              rows={5}
              className="resize-y text-sm font-normal leading-relaxed"
            />
          </div>

          {/* Link para Imagem Externa (Banner/Foto) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="imagem_url" className="text-xs font-bold flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                Link de Imagem Externa (Opcional)
              </Label>
              <span className="text-[11px] text-muted-foreground">URL direta da imagem</span>
            </div>
            <Input
              id="imagem_url"
              placeholder="https://exemplo.com/fotos/banner-evento.jpg"
              value={formData.imagem_url || ""}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, imagem_url: e.target.value }))
                setPreviewErroImagem(false)
              }}
              className="h-9 text-xs"
            />
            {formData.imagem_url && !previewErroImagem && (
              <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted/30 max-h-44 flex items-center justify-center mt-1">
                <img
                  src={formData.imagem_url}
                  alt="Prévia do comunicado"
                  className="max-h-44 w-full object-cover"
                  loading="lazy"
                  onError={() => setPreviewErroImagem(true)}
                />
              </div>
            )}
            {previewErroImagem && (
              <span className="text-[11px] text-amber-600 font-medium">
                Não foi possível carregar a prévia desta URL de imagem. Verifique se o link direto é público.
              </span>
            )}
          </div>

          {/* Link para Arquivo ou Site Externo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="link" className="text-xs font-bold flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-primary" />
                Link de Arquivo ou Site Externo (Opcional)
              </Label>
              <span className="text-[11px] text-muted-foreground">PDF no Google Drive, portal, notícia, etc.</span>
            </div>
            <Input
              id="link"
              placeholder="https://drive.google.com/... ou https://seduc.ce.gov.br"
              value={formData.link || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className="text-xs font-bold text-white gap-1.5"
            style={{ backgroundColor: corPrincipal }}
          >
            {salvando ? "Publicando..." : formData.id ? "Salvar Alterações" : "Publicar na Área Pública"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
