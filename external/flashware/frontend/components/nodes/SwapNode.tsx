import { Handle, Position, NodeProps } from 'reactflow'
import { ArrowUpDown } from 'lucide-react'
import { useState } from 'react'

interface SwapNodeData {
  label: string
  parameters: {
    dex?: string
    dexPoolId?: string
    amount?: string
    inputToken?: string
    outputToken?: string
    minOutputAmount?: string
  }
  onParameterChange?: (parameters: any) => void
}

export default function SwapNode({ data }: NodeProps<SwapNodeData>) {
  const [dex, setDex] = useState(data.parameters.dex || 'cetus')
  const [dexPoolId, setDexPoolId] = useState(data.parameters.dexPoolId || '')
  const [amount, setAmount] = useState(data.parameters.amount || '100%')
  const [inputToken, setInputToken] = useState(data.parameters.inputToken || '0x2::sui::SUI')
  const [outputToken, setOutputToken] = useState(data.parameters.outputToken || '')
  const [minOutputAmount, setMinOutputAmount] = useState(data.parameters.minOutputAmount || '0')

  const updateParameters = (updates: any) => {
    const newParams = { ...data.parameters, ...updates }
    if (data.onParameterChange) {
      data.onParameterChange(newParams)
    }
  }

  return (
    <div className="cyber-border bg-slate-900 rounded-lg p-4 min-w-[220px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-cyber-purple border-2 border-slate-900"
      />
      
      <div className="flex items-center space-x-2 mb-3">
        <ArrowUpDown className="w-4 h-4 text-cyber-purple" />
        <span className="font-semibold text-white">{data.label}</span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <label className="text-gray-400 block mb-1">DEX</label>
          <select
            value={dex}
            onChange={(e) => {
              setDex(e.target.value)
              updateParameters({ dex: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan"
          >
            <option value="cetus">Cetus</option>
            <option value="turbos">Turbos</option>
            <option value="kriya">Kriya</option>
          </select>
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Pool ID</label>
          <input
            type="text"
            value={dexPoolId}
            onChange={(e) => {
              setDexPoolId(e.target.value)
              updateParameters({ dexPoolId: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan font-mono text-[10px]"
            placeholder="0x..."
          />
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Amount</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              updateParameters({ amount: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan"
            placeholder="100% or 0.5"
          />
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Output Token</label>
          <select
            value={outputToken}
            onChange={(e) => {
              setOutputToken(e.target.value)
              updateParameters({ outputToken: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan"
          >
            <option value="">Select token</option>
            <option value="0x2::sui::SUI">SUI</option>
            <option value="0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN">USDC</option>
            <option value="0xce7ff77a81a5a54348b9cb46f92a050eda92385a331b5ec67e15e3dc356c47e1::coin::COIN">USDT</option>
          </select>
        </div>

        <div>
          <label className="text-gray-400 block mb-1">Min Output</label>
          <input
            type="text"
            value={minOutputAmount}
            onChange={(e) => {
              setMinOutputAmount(e.target.value)
              updateParameters({ minOutputAmount: e.target.value })
            }}
            className="w-full px-2 py-1 bg-slate-800 border border-cyan-400/20 rounded text-white focus:outline-none focus:border-cyber-cyan"
            placeholder="0"
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-cyber-purple border-2 border-slate-900"
      />
    </div>
  )
}