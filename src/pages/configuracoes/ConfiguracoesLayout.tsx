import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsuariosTab } from './UsuariosTab'
import { InstituicaoTab } from './InstituicaoTab'
import { TurmasTab } from './TurmasTab'
import { HorariosTab } from './HorariosTab'

export function ConfiguracoesLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações gerais da escola e seus usuários.
        </p>
      </div>

      <Tabs defaultValue="instituicao" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="instituicao">Instituição</TabsTrigger>
          <TabsTrigger value="turmas">Turmas</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
        </TabsList>
        
        <TabsContent value="usuarios" className="mt-0">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="instituicao" className="mt-0">
          <InstituicaoTab />
        </TabsContent>
        <TabsContent value="turmas" className="mt-0">
          <TurmasTab />
        </TabsContent>
        <TabsContent value="horarios" className="mt-0">
          <HorariosTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
