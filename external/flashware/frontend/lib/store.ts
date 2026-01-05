import { create } from 'zustand'

interface Block {
  id: string
  type: string
  parameters: Record<string, any>
}

interface FlashwareState {
  // Wallet state
  walletConnected: boolean
  userAddress: string | null
  
  // Flow state
  blocks: Block[]
  moveCode: string
  
  // Actions
  setWalletConnected: (connected: boolean) => void
  setUserAddress: (address: string | null) => void
  addBlock: (type: string) => void
  updateBlock: (id: string, parameters: Record<string, any>) => void
  setMoveCode: (code: string) => void
  clearFlow: () => void
}

export const useFlashwareStore = create<FlashwareState>((set, get) => ({
  // Initial state
  walletConnected: false,
  userAddress: null,
  blocks: [],
  moveCode: '',

  // Actions
  setWalletConnected: (connected) => set({ walletConnected: connected }),
  
  setUserAddress: (address) => set({ userAddress: address }),
  
  addBlock: (type) => set((state) => ({
    blocks: [...state.blocks, {
      id: `${type}-${Date.now()}`,
      type,
      parameters: {}
    }]
  })),
  
  updateBlock: (id, parameters) => set((state) => ({
    blocks: state.blocks.map(block =>
      block.id === id ? { ...block, parameters } : block
    )
  })),
  
  setMoveCode: (code) => set({ moveCode: code }),
  
  clearFlow: () => set({
    blocks: [],
    moveCode: ''
  }),
}))

// Helper hook for updating React Flow nodes
export const useNodeUpdater = () => {
  const { updateBlock } = useFlashwareStore()
  
  const updateNode = (nodeId: string, parameters: Record<string, any>) => {
    // Extract block type from node ID
    const blockType = nodeId.split('-')[0]
    updateBlock(nodeId, parameters)
  }
  
  return { updateNode }
}