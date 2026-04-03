import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsuariosTab } from './UsuariosTab'
import { InstituicaoTab } from './InstituicaoTab'
import { TurmasTab } from './TurmasTab'
import { EnturmacaoTab } from './EnturmacaoTab'
import { AreasTab } from './AreasTab'
import { DisciplinasTab } from './DisciplinasTab'
import { HorariosTab } from './HorariosTab'
import { RecursosTab } from './RecursosTab'
import { AlunosTab } from './AlunosTab'

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
          <TabsTrigger value="enturmacao">Enturmação</TabsTrigger>
          <TabsTrigger value="areas">Áreas (Matriz)</TabsTrigger>
          <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="recursos">Recursos</TabsTrigger>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
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
        <TabsContent value="enturmacao" className="mt-0">
          <EnturmacaoTab />
        </TabsContent>
        <TabsContent value="areas" className="mt-0">
          <AreasTab />
        </TabsContent>
        <TabsContent value="disciplinas" className="mt-0">
          <DisciplinasTab />
        </TabsContent>
        <TabsContent value="horarios" className="mt-0">
          <HorariosTab />
        </TabsContent>
        <TabsContent value="recursos" className="mt-0">
          <RecursosTab />
        </TabsContent>
        <TabsContent value="alunos" className="mt-0">
          <AlunosTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
