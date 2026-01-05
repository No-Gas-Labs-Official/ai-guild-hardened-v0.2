import { Borrow, ArrowUpDown, Wallet } from 'lucide-react'

const blockTypes = [
  {
    type: 'borrow',
    label: 'Borrow',
    icon: Borrow,
    description: 'Flash borrow from pool',
    color: 'bg-cyber-green',
  },
  {
    type: 'swap',
    label: 'Swap',
    icon: ArrowUpDown,
    description: 'Swap tokens (Cetus/Turbos)',
    color: 'bg-cyber-purple',
  },
  {
    type: 'repay',
    label: 'Repay',
    icon: Wallet,
    description: 'Repay flash loan',
    color: 'bg-orange-500',
  },
]

export default function BlockPalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="space-y-4">
      <h3 className="cyber-text text-lg font-semibold">Drag Blocks</h3>
      
      {blockTypes.map((block) => {
        const Icon = block.icon
        return (
          <div
            key={block.type}
            className={`cyber-border p-4 rounded cursor-move hover:bg-slate-800 transition-all hover:scale-105 ${block.color}/10`}
            draggable
            onDragStart={(event) => onDragStart(event, block.type)}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded ${block.color} bg-opacity-20`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-medium text-white">{block.label}</div>
                <div className="text-xs text-gray-400">{block.description}</div>
              </div>
            </div>
          </div>
        )
      })}

      <div className="mt-8 p-4 bg-slate-800 rounded border border-cyan-400/20">
        <h4 className="cyber-text text-sm font-semibold mb-2">Flow Rules:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Must start with Borrow</li>
          <li>• Must end with Repay</li>
          <li>• At least 1 Swap in between</li>
          <li>• Connect blocks in order</li>
        </ul>
      </div>
    </div>
  )
}