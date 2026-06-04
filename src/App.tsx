import { StageProvider } from './store/stage'
import { UIProvider } from './store/ui'
import { ProjectProvider } from './store/project'
import { GenerateProvider } from './store/generate'
import { TitleBar } from './layout/TitleBar'
import { LeftPanel } from './layout/LeftPanel'
import { CenterPanel } from './layout/CenterPanel'
import { RightPanel } from './layout/RightPanel'
import { BottomPanel } from './layout/BottomPanel'
import { StatusBar } from './layout/StatusBar'
import { GenerateRunner } from './components/GenerateRunner'

export default function App() {
  return (
    <ProjectProvider>
      <StageProvider>
        <GenerateProvider>
          <UIProvider>
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
            <GenerateRunner />
          </UIProvider>
        </GenerateProvider>
      </StageProvider>
    </ProjectProvider>
  )
}
