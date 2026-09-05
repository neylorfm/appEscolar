import { useState, useEffect } from "react"
import { 
  ArrowUpDown, 
  GripVertical, 
  ChevronsUp, 
  ArrowUp, 
  ArrowDown, 
  Check 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tutorial, reordenarTutoriais } from "@/services/tutoriais"
import { toast } from "sonner"

interface TutorialReordenarModalProps {
  isOpen: boolean
  onClose: () => void
  tutoriais: Tutorial[]
  onSuccess: () => void
}

export function TutorialReordenarModal({
  isOpen,
  onClose,
  tutoriais,
  onSuccess
}: TutorialReordenarModalProps) {
  const [lista, setLista] = useState<Tutorial[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setLista([...tutoriais])
  }, [tutoriais, isOpen])

  function handleMover(fromIndex: number, direcao: -1 | 1) {
    const toIndex = fromIndex + direcao
    if (toIndex < 0 || toIndex >= lista.length) return

    const novaLista = [...lista]
    const [removido] = novaLista.splice(fromIndex, 1)
    novaLista.splice(toIndex, 0, removido)
    setLista(novaLista)
  }

  function handleMoverParaTopo(index: number) {
    if (index === 0) return
    const novaLista = [...lista]
    const [removido] = novaLista.splice(index, 1)
    novaLista.unshift(removido)
    setLista(novaLista)
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const novaLista = [...lista]
    const [removido] = novaLista.splice(draggedIndex, 1)
    novaLista.splice(targetIndex, 0, removido)
    setDraggedIndex(null)
    setLista(novaLista)
  }

  async function handleSalvarOrdem() {
    setSalvando(true)
    try {
      await reordenarTutoriais(lista)
      toast.success("Ordem dos tutoriais atualizada com sucesso!")
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar ordem dos tutoriais:", error)
      toast.error("Erro ao salvar ordem", {
        description: error?.message || "Tente novamente mais tarde."
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-5 sm:p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            <span>Reordenar Tutoriais</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste os cards ou utilize as setas para ajustar a sequência de exibição.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 py-3 max-h-[55vh]">
          {lista.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDraggedIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all bg-card ${
                draggedIndex === idx
                  ? "opacity-40 border-dashed border-primary"
                  : "border-border/80 hover:border-primary/40 shadow-2xs"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="cursor-grab text-muted-foreground/60 hover:text-foreground shrink-0 p-1">
                  <GripVertical className="h-4 w-4" />
                </div>

                <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center border border-primary/20 shrink-0">
                  {idx + 1}º
                </span>

                <div className="flex flex-col truncate">
                  <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                    {item.titulo}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {item.link ? "Contém link/vídeo anexo" : "Apenas texto instrutivo"}
                  </span>
                </div>
              </div>

              {/* Botões de Movimentação */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={idx === 0}
                  onClick={() => handleMoverParaTopo(idx)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Mover para o 1º lugar"
                >
                  <ChevronsUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={idx === 0}
                  onClick={() => handleMover(idx, -1)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-lg"
                  title="Subir uma posição"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={idx === lista.length - 1}
                  onClick={() => handleMover(idx, 1)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded-lg"
                  title="Descer uma posição"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvarOrdem}
            disabled={salvando}
            className="bg-[#7f1d1d] hover:bg-[#661717] text-white font-bold gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>{salvando ? "Salvando..." : "Salvar Nova Ordem"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
