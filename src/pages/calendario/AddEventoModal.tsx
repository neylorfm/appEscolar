import { useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { upsertEvento, deletarEvento, TipoEvento, CalendarioEvento } from "@/services/calendario"
import { Trash2 } from "lucide-react"

export default function AddEventoModal({ 
    isOpen, 
    onClose, 
    data, 
    anoLetivoId, 
    tiposDisponiveis,
    eventoExistente,
    somenteLeitura
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    data: Date;
    anoLetivoId: number;
    tiposDisponiveis: TipoEvento[];
    eventoExistente?: CalendarioEvento;
    somenteLeitura?: boolean;
}) {
    const [loading, setLoading] = useState(false)
    const [nome, setNome] = useState(eventoExistente ? eventoExistente.nome : "")
    const [tipo, setTipo] = useState(eventoExistente ? eventoExistente.tipo : "")
    const [descricao, setDescricao] = useState(eventoExistente?.descricao || "")

    const isEditMode = !!eventoExistente

    const handleSalvar = async () => {
        if (!nome || !tipo) {
            toast.error("Preencha o título e o tipo do evento.")
            return
        }

        const tipoEncontrado = tiposDisponiveis.find(t => t.nome === tipo)
        const cor = tipoEncontrado?.cor || '#000000'

        setLoading(true)
        try {
            await upsertEvento({
                ...(isEditMode ? { id: eventoExistente.id } : {}),
                ano_letivo: anoLetivoId,
                data_evento: format(data, 'yyyy-MM-dd'),
                nome,
                tipo,
                cor,
                descricao
            })
            toast.success(isEditMode ? "Evento atualizado!" : "Evento adicionado!")
            onClose()
        } catch (error) {
            console.error(error)
            toast.error(isEditMode ? "Erro ao atualizar evento" : "Erro ao adicionar evento")
        } finally {
            setLoading(false)
        }
    }

    const handleExcluir = async () => {
        if (!eventoExistente) return;
        if (!confirm("Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.")) return;
        setLoading(true);
        try {
            await deletarEvento(eventoExistente.id);
            toast.success("Evento excluído com sucesso!");
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao excluir o evento.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{somenteLeitura ? "Detalhes do Evento" : (isEditMode ? "Editar Evento" : "Adicionar Evento")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-1.5">
                        <div className="text-sm font-medium text-slate-500">Data: {format(data, 'dd/MM/yyyy')}</div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <Input 
                            placeholder="Título do Evento" 
                            className="font-semibold text-base border-slate-300 disabled:opacity-90 disabled:bg-slate-50"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            disabled={somenteLeitura}
                            autoFocus={!somenteLeitura}
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <Select value={tipo} onValueChange={setTipo} disabled={somenteLeitura}>
                            <SelectTrigger className="border-slate-300 disabled:opacity-90 disabled:bg-slate-50">
                                <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                {tiposDisponiveis.map(t => (
                                    <SelectItem key={t.nome} value={t.nome}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.cor }} />
                                            {t.nome}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Textarea 
                            placeholder="Descrição (opcional)..." 
                            className="resize-none h-24 border-slate-300 text-sm disabled:opacity-90 disabled:bg-slate-50"
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                            disabled={somenteLeitura}
                            readOnly={somenteLeitura}
                        />
                    </div>
                </div>
                <DialogFooter className="flex gap-2 sm:justify-between items-center w-full border-t border-slate-100 pt-3">
                    <div className="flex flex-1 items-center">
                        {isEditMode && !somenteLeitura && (
                           <Button variant="ghost" onClick={handleExcluir} disabled={loading} className="text-red-500 hover:bg-red-50 hover:text-red-600 px-2">
                               <Trash2 className="w-4 h-4 mr-2" /> Excluir
                           </Button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={loading}>
                            {somenteLeitura ? "Fechar" : "Cancelar"}
                        </Button>
                        {!somenteLeitura && (
                            <Button onClick={handleSalvar} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                {loading ? "Salvando..." : "Salvar"}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
