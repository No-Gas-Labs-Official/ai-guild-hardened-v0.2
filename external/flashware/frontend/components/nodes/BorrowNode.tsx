import { Handle, Position, NodeProps } from 'reactflow'
import { Borrow } from 'lucide-react'
import { useState } from 'react'

interface BorrowNodeData {
  label: string
  parameters: {
    amount?: string
    poolId?: string
    tokenType?: string
  }
  onParameterChange?: (parameters: any) => void
}

export default function BorrowNode({ data }: NodeProps<BorrowNodeData>) {
  const [amount, setAmount] = useState(data.parameters.amount || '1')
  const [poolId, setPoolId] = useState(data.parameters.poolId || '')
  const [tokenType, setTokenType] = useState(data.parameters.tokenType || '0x2::sui::SUI')

  const updateParameters = (updates: any) => {
    const newParams = { ...data.parameters, ...updates }
    if (data.onParameterChange) {
      data.onParameterChange(newParams)
    }
  }

  return (
    <div className="cyber-border bg-slate-900 rounded-lg p-4 min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-cyber-green border-2 border-slate-900"
      />
      
      <div className="flex items-center space-x-2 mb-3">
        <Borrow className="w-4 h-4 text-cyber-green" />
        <span className="font-semibold text-white">{data.label}</span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <label className="text-gray-400 block mb-1">Amount (SUI)</label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              updateParameters({ amount: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan"
            placeholder="1.0"
          />
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Pool ID</label>
          <input
            type="text"
            value={poolId}
            onChange={(e) => {
              setPoolId(e.target.value)
              updateParameters({ poolId: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan font-mono text-[10px]"
            placeholder="0x..."
          />
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Token Type</label>
          <select
            value={tokenType}
            onChange={(e) => {
              setTokenType(e.target.value)
              updateParameters({ tokenType: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan"
          >
            <option value="0x2::sui::SUI">SUI</option>
            <option value="0x2::sui::SUI">USDC</option>
            <option value="0x2::sui::SUI">USDT</option>
          </select>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-cyber-green border-2 border-slate-900"
      />
    </div>
  )
}