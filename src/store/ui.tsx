import { createContext, useContext, useState, useCallback } from 'react'

type Modal = 'library' | 'settings' | null

interface UICtx {
  modal: Modal
  openLibrary: () => void
  openSettings: () => void
  closeModal: () => void
}

const Ctx = createContext<UICtx>({
  modal: null,
  openLibrary: () => {},
  openSettings: () => {},
  closeModal: () => {}
})

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<Modal>(null)

  const openLibrary = useCallback(() => setModal('library'), [])
  const openSettings = useCallback(() => setModal('settings'), [])
  const closeModal = useCallback(() => setModal(null), [])

  return (
    <Ctx.Provider value={{ modal, openLibrary, openSettings, closeModal }}>
      {children}
    </Ctx.Provider>
  )
}

export function useUI() {
  return useContext(Ctx)
}
