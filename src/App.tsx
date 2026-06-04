import { StageProvider } from './store/stage'
import { UIProvider } from './store/ui'
import { ProjectProvider, useProject } from './store/project'
import { GenerateProvider } from './store/generate'
import { TitleBar } from './layout/TitleBar'
import { LeftPanel } from './layout/LeftPanel'
import { CenterPanel } from './layout/CenterPanel'
import { RightPanel } from './layout/RightPanel'
import { BottomPanel } from './layout/BottomPanel'
import { StatusBar } from './layout/StatusBar'
import { GenerateRunner } from './components/GenerateRunner'
import { ProjectsWorkspace } from './components/ProjectsWorkspace'

export default function App() {
  return (
    <ProjectProvider>
      <StageProvider>
        <GenerateProvider>
          <UIProvider>
            <AppShell />
            <GenerateRunner />
          </UIProvider>
        </GenerateProvider>
      </StageProvider>
    </ProjectProvider>
  )
}

function AppShell() {
  const { projectLoaded } = useProject()

  // 启动界面: 未打开项目时, 整窗只显示项目管理界面, 不显示编辑器管线与左右面板
  if (!projectLoaded) {
    return (
      <div className="h-full flex flex-col bg-panel-deep text-ink min-w-[1280px] overflow-x-auto">
        <ProjectsWorkspace />
      </div>
    )
  }

  // 打开或新建项目后才进入编辑界面
  return (
    <div className="h-full flex flex-col bg-panel-deep text-ink min-w-[1280px] overflow-x-auto">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
      <BottomPanel />
      <StatusBar />
    </div>
  )
}
