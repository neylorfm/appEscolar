import { useState } from "react"
import { toast } from "sonner"
import { Calendar as CalendarIcon, X, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { upsertAnoLetivo, CalendarioAnoLetivo, deleteAnoLetivo } from "@/services/calendario"

export default function GerenciarAnoModal({ 
    isOpen, 
    onClose, 
    currentAnoLetivo 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    currentAnoLetivo: CalendarioAnoLetivo;
}) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<CalendarioAnoLetivo>(currentAnoLetivo)
    const [confirmText, setConfirmText] = useState("")
    
    const [novoTipoNome, setNovoTipoNome] = useState("")
    const [novoTipoCor, setNovoTipoCor] = useState("#8b5cf6")

    const fraseReset = `Eu desejo apagar todas as datas deste ano letivo`

    const handleChangePeriodo = (idx: number, campo: 'inicio' | 'fim', valor: string) => {
        const novos = [...formData.periodos]
        novos[idx] = { ...novos[idx], [campo]: valor }
        setFormData({ ...formData, periodos: novos })
    }

    const handleSalvar = async () => {
        setLoading(true)
        try {
            await upsertAnoLetivo(formData)
            toast.success("Ano letivo salvo com sucesso!")
            onClose()
        } catch (error: any) {
            console.error(error)
            const errMsg = error?.message || error?.details || JSON.stringify(error)
            toast.error(`Erro ao salvar: ${errMsg}`)
        } finally {
            setLoading(false)
        }
    }

    const handleResetar = async () => {
        if (confirmText !== fraseReset) {
            toast.error("A frase de confirmação não confere.")
            return
        }
        
        if (!confirm("Isso apagará permanentemente todos os feriados, sábados letivos e todas as datas cadastradas para ESTE ANO. Confirma?")) {
            return
        }

        setLoading(true)
        try {
            await deleteAnoLetivo(formData.ano_letivo)
            toast.success("Ano letivo apagado com sucesso.")
            onClose()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao apagar ano letivo")
        } finally {
            setLoading(false)
        }
    }

    const handleAddTipo = () => {
        if (!novoTipoNome.trim()) return
        const atualizados = [...(formData.tipos_evento_customizados || [])]
        atualizados.push({ nome: novoTipoNome.trim(), cor: novoTipoCor })
        setFormData({ ...formData, tipos_evento_customizados: atualizados })
        setNovoTipoNome("")
    }

    const handleRemoverTipo = (idx: number) => {
        const atualizados = [...formData.tipos_evento_customizados]
        atualizados.splice(idx, 1)
        setFormData({ ...formData, tipos_evento_customizados: atualizados })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl flex items-center justify-between">
                        <div>
                            Gerenciar Ano Letivo
                            <DialogDescription className="mt-1">
                                Configuração de datas e períodos
                            </DialogDescription>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="flex flex-col gap-8">
                        {/* DATAS PRINCIPAIS */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                                <h3 className="font-bold text-sm text-slate-800 tracking-wider">DATAS PRINCIPAIS</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-xs font-bold text-slate-400 uppercase">Ano Letivo</Label>
                                    <div className="text-2xl font-bold mt-1 text-slate-800 tracking-tight">
                                        {formData.ano_letivo}
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Previsão Próx. Ano</Label>
                                    <Input 
                                        type="date" 
                                        value={formData.previsao_proximo_ano}
                                        onChange={e => setFormData({...formData, previsao_proximo_ano: e.target.value})}
                                        className="h-10 border-slate-200"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Início do Ano</Label>
                                    <Input 
                                        type="date" 
                                        value={formData.inicio_ano}
                                        onChange={e => setFormData({...formData, inicio_ano: e.target.value})}
                                        className="h-10 border-slate-200"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Fim do Ano</Label>
                                    <Input 
                                        type="date" 
                                        value={formData.fim_ano}
                                        onChange={e => setFormData({...formData, fim_ano: e.target.value})}
                                        className="h-10 border-slate-200"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* BIMESTRES */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                                <h3 className="font-bold text-sm text-slate-800 tracking-wider">BIMESTRES</h3>
                            </div>

                            <div className="flex flex-col gap-3">
                                {formData.periodos.map((per, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                        <div className="w-40 font-bold text-slate-700">{per.nome}</div>
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Início</Label>
                                                <Input 
                                                    type="date" 
                                                    value={per.inicio}
                                                    onChange={e => handleChangePeriodo(idx, 'inicio', e.target.value)}
                                                    className="h-9 bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Fim</Label>
                                                <Input 
                                                    type="date" 
                                                    value={per.fim}
                                                    onChange={e => handleChangePeriodo(idx, 'fim', e.target.value)}
                                                    className="h-9 bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <Separator />

                        {/* TIPOS DE EVENTO CUSTOMIZADOS E LEGENDAS */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-4 bg-purple-600 rounded-full" />
                                <h3 className="font-bold text-sm text-slate-800 tracking-wider">TIPO DE EVENTOS (LEGENDAS)</h3>
                            </div>
                            
                            <p className="text-sm text-slate-500 mb-3">Adicione legendas extras customizadas. Elas aparecerão no calendário junto aos tipos padrões.</p>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <Input 
                                    className="flex-1 bg-white" 
                                    placeholder="Ex: Reunião Pedagógica"
                                    value={novoTipoNome}
                                    onChange={e => setNovoTipoNome(e.target.value)} 
                                />
                                <div className="w-10 h-10 shrink-0 overflow-hidden rounded border border-slate-300">
                                    <Input 
                                        type="color" 
                                        className="w-16 h-16 -mt-3 -ml-3 cursor-pointer" 
                                        value={novoTipoCor} 
                                        onChange={e => setNovoTipoCor(e.target.value)} 
                                    />
                                </div>
                                <Button variant="secondary" onClick={handleAddTipo} disabled={!novoTipoNome.trim()}>
                                    Adicionar
                                </Button>
                            </div>

                            {formData.tipos_evento_customizados && formData.tipos_evento_customizados.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.tipos_evento_customizados.map((tipo, idx) => (
                                        <div key={idx} className="flex items-center bg-slate-50 border border-slate-200 rounded-md pl-3 pr-1 py-1 gap-2 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tipo.cor }} />
                                                <span className="text-sm font-semibold">{tipo.nome}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 ml-1" onClick={() => handleRemoverTipo(idx)}>
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <Separator />

                        {/* ZONA DE PERIGO */}
                        <section className="bg-red-50/50 border border-red-100 p-5 rounded-xl">
                            <div className="flex items-center gap-2 mb-3 text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Zona de Perigo</h3>
                            </div>
                            
                            <p className="text-sm text-slate-600 mb-4">
                                Para resetar todas as datas e eventos do banco, digite a frase abaixo e confirme.
                            </p>
                            
                            <div className="bg-white border border-slate-200 text-center py-2.5 rounded text-sm font-mono text-slate-700 tracking-tight mb-4 select-all shadow-sm">
                                {fraseReset}
                            </div>

                            <div className="space-y-3">
                                <Input 
                                    placeholder="Digite a frase de confirmação" 
                                    className="bg-white"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    autoComplete="off"
                                />
                                <Button 
                                    variant="destructive" 
                                    className="w-full font-bold uppercase tracking-widest bg-[#e11d48] hover:bg-[#be123c]"
                                    disabled={confirmText !== fraseReset || loading}
                                    onClick={handleResetar}
                                >
                                    Resetar Ano Letivo
                                </Button>
                            </div>
                        </section>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50/50">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSalvar} disabled={loading}>
                        {loading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
