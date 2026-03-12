import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsuariosTab } from './UsuariosTab'
import { InstituicaoTab } from './InstituicaoTab'

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
          {/* Future tabs will go here */}
        </TabsList>
        
        <TabsContent value="usuarios" className="mt-0">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="instituicao" className="mt-0">
          <InstituicaoTab />
        </TabsContent>
        {/* Future TabContents will go here */}
      </Tabs>
    </div>
  )
}
