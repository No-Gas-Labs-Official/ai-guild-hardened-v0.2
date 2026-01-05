import { Handle, Position, NodeProps } from 'reactflow'
import { Wallet } from 'lucide-react'

interface RepayNodeData {
  label: string
  parameters: Record<string, any>
  onParameterChange?: (parameters: any) => void
}

export default function RepayNode({ data }: NodeProps<RepayNodeData>) {
  return (
    <div className="cyber-border bg-slate-900 rounded-lg p-4 min-w-[180px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-orange-500 border-2 border-slate-900"
      />
      
      <div className="flex items-center space-x-2 mb-3">
        <Wallet className="w-4 h-4 text-orange-500" />
        <span className="font-semibold text-white">{data.label}</span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="p-2 bg-slate-800 rounded border border-cyan-400/20">
          <div className="text-gray-400 mb-1">Action</div>
          <div className="text-white">Repay Flash Loan</div>
        </div>

        <div className="p-2 bg-slate-800 rounded border border-cyan-400/20">
          <div className="text-gray-400 mb-1">Status</div>
          <div className="text-cyber-green">✓ Required</div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-orange-500 border-2 border-slate-900"
        style={{ display: 'none' }} // Repay is terminal node
      />
    </div>
  )
}