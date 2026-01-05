import { Rocket, Code, Play } from 'lucide-react'
import { useFlashwareStore } from '../lib/store'
import { validateFlow } from '../lib/validation'
import { buildPTB } from '../lib/ptbBuilder'
import { useState } from 'react'

interface ExecutionPanelProps {
  onPreviewCode: () => void
  nodes: any[]
  edges: any[]
}

export default function ExecutionPanel({ onPreviewCode, nodes, edges }: ExecutionPanelProps) {
  const { walletConnected, moveCode } = useFlashwareStore()
  const [isDeploying, setIsDeploying] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const handleDeploy = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first')
      return
    }

    const validation = validateFlow(nodes, edges)
    if (!validation.isValid) {
      alert(`Flow validation error: ${validation.error}`)
      return
    }

    setIsDeploying(true)
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes,
          edges,
          moveCode,
        }),
      })

      if (!response.ok) {
        throw new Error('Deployment failed')
      }

      const result = await response.json()
      alert(`Strategy deployed! Package ID: ${result.packageId}`)
    } catch (error) {
      console.error('Deployment error:', error)
      alert('Deployment failed. Please try again.')
    } finally {
      setIsDeploying(false)
    }
  }

  const handleExecute = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first')
      return
    }

    const validation = validateFlow(nodes, edges)
    if (!validation.isValid) {
      alert(`Flow validation error: ${validation.error}`)
      return
    }

    setIsExecuting(true)
    try {
      const ptb = buildPTB(nodes, edges)
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionBlock: ptb,
        }),
      })

      if (!response.ok) {
        throw new Error('Execution preparation failed')
      }

      const result = await response.json()
      alert('Transaction prepared! Please sign in your wallet.')
      // The actual signing will be handled by the wallet
    } catch (error) {
      console.error('Execution error:', error)
      alert('Execution failed. Please try again.')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="cyber-border bg-slate-900 rounded-lg p-4 flex justify-between items-center">
      <div className="flex space-x-4">
        <button
          onClick={onPreviewCode}
          className="flex items-center space-x-2 px-4 py-2 bg-cyber-purple hover:bg-purple-600 text-white rounded transition-all"
        >
          <Code className="w-4 h-4" />
          <span>Preview Code</span>
        </button>

        <button
          onClick={handleDeploy}
          disabled={!walletConnected || isDeploying}
          className="flex items-center space-x-2 px-4 py-2 bg-cyber-green hover:bg-green-600 disabled:bg-gray-600 text-white rounded transition-all"
        >
          <Rocket className="w-4 h-4" />
          <span>{isDeploying ? 'Deploying...' : 'Deploy Strategy'}</span>
        </button>

        <button
          onClick={handleExecute}
          disabled={!walletConnected || isExecuting}
          className="flex items-center space-x-2 px-4 py-2 bg-cyber-cyan hover:bg-cyan-600 disabled:bg-gray-600 text-white rounded transition-all"
        >
          <Play className="w-4 h-4" />
          <span>{isExecuting ? 'Preparing...' : 'Execute'}</span>
        </button>
      </div>

      {!walletConnected && (
        <div className="text-xs text-orange-400">
          Connect wallet to enable deployment
        </div>
      )}
    </div>
  )
}