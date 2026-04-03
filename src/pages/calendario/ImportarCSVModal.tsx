import { useState, useRef } from "react"
import { toast } from "sonner"
import { DownloadCloud, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TipoEvento, inserirListaEventosViaCSV } from "@/services/calendario"

export default function ImportarCSVModal({ 
    isOpen, 
    onClose, 
    tipos,
    anoContexto
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    tipos: TipoEvento[];
    anoContexto: number;
}) {
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        try {
            const text = await file.text()
            // Split por quebra de linha
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
            
            const eventosArr: any[] = []
            let ignorados = 0

            // Supomos que a linha 0 seja o cabeçalho "Data,Titulo,Tipo,Descricao"
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim())
                if (cols.length >= 3) {
                   const [dataStr, nome, tipoStr, desc] = cols
                   const [d,m,y] = dataStr.split('/')
                   if(d && m && y) {
                      const dataFormatada = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
                      const tipoFound = tipos.find(t => t.nome.toLowerCase() === tipoStr.toLowerCase())
                      const cor = tipoFound ? tipoFound.cor : '#9ca3af'
                      eventosArr.push({
                          ano_letivo: parseInt(y),
                          data_evento: dataFormatada,
                          nome,
                          tipo: tipoStr,
                          cor,
                          descricao: desc || null
                      })
                   } else {
                       ignorados++
                   }
                } else {
                    ignorados++
                }
            }

            if (eventosArr.length > 0) {
               await inserirListaEventosViaCSV(eventosArr)
               let msg = `${eventosArr.length} eventos importados com sucesso.`
               if(ignorados > 0) msg += ` (${ignorados} linhas ignoradas por erro de formato).`
               toast.success(msg)
               onClose()
            } else {
                toast.error("Nenhum evento válido encontrado no arquivo.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro ao ler ou importar o arquivo CSV. Verifique o padrão.")
        } finally {
            setLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const downloadModelo = () => {
        const cabecalho = "Data,Titulo,Tipo,Descricao\n"
        const exemplo1 = `15/04/${anoContexto},Reunião Pedagógica,Geral,Preparação do conselho\n`
        const exemplo2 = `21/04/${anoContexto},Tiradentes,Feriado,\n`
        const conteudo = cabecalho + exemplo1 + exemplo2
        
        const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'modelo_eventos.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Upload className="w-5 h-5 text-indigo-600" />
                        Importar Eventos via CSV
                    </DialogTitle>
                    <DialogDescription>
                        Suba um arquivo <b>.csv</b> para importar feriados ou eventos em lote.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-700 my-4 space-y-3">
                    <p>O arquivo precisa conter <strong>exatamente estas colunas na primeira linha (cabeçalho)</strong> separadas por vírgula:</p>
                    <div className="bg-white p-2 border border-slate-200 rounded font-mono text-xs select-all text-center">
                        Data,Titulo,Tipo,Descricao
                    </div>
                    
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                        <li><strong>Data:</strong> no formato <code className="bg-slate-200 px-1 rounded">DD/MM/YYYY</code></li>
                        <li><strong>Tipo:</strong> deve ser o nome exato da legenda desejada (ex: <code className="bg-slate-200 px-1 rounded">Feriado</code>, <code className="bg-slate-200 px-1 rounded">Prova Bimestral</code>).</li>
                        <li>Não use ponto e vírgula (;). Use apenas vírgula como separador.</li>
                    </ul>

                    <Button variant="link" className="px-0 h-auto text-indigo-600 text-xs" onClick={downloadModelo}>
                        <DownloadCloud className="w-3.5 h-3.5 mr-1" /> Baixar exemplo de CSV
                    </Button>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCSVUpload} />
                    <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={loading} 
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                    >
                        {loading ? "Processando..." : "Escolher Arquivo e Enviar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
