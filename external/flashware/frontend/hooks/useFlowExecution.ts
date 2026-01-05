import { useState, useCallback } from 'react'
import { useFlashwareStore } from '../lib/store'
import { validateFlow } from '../lib/validation'
import { buildPTB, simulatePTB, executePTB } from '../lib/ptbBuilder'
import { useWallet } from '@suiet/wallet-kit'

interface ExecutionState {
  isDeploying: boolean
  isExecuting: boolean
  isSimulating: boolean
  error: string | null
  txHash: string | null
  simulationResult: any | null
}

export function useFlowExecution() {
  const [executionState, setExecutionState] = useState<ExecutionState>({
    isDeploying: false,
    isExecuting: false,
    isSimulating: false,
    error: null,
    txHash: null,
    simulationResult: null,
  })

  const { signAndExecuteTransactionBlock } = useWallet()
  const { moveCode, walletConnected } = useFlashwareStore()

  const deployStrategy = useCallback(async (nodes: any[], edges: any[]) => {
    if (!walletConnected) {
      setExecutionState(prev => ({
        ...prev,
        error: 'Please connect your wallet first'
      }))
      return
    }

    const validation = validateFlow(nodes, edges)
    if (!validation.isValid) {
      setExecutionState(prev => ({
        ...prev,
        error: validation.error
      }))
      return
    }

    setExecutionState(prev => ({ ...prev, isDeploying: true, error: null }))

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moveCode,
          nodes,
          edges,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Deployment failed')
      }

      const result = await response.json()
      
      setExecutionState(prev => ({
        ...prev,
        isDeploying: false,
        txHash: result.packageId,
        error: null,
      }))

      return result
    } catch (error) {
      setExecutionState(prev => ({
        ...prev,
        isDeploying: false,
        error: error instanceof Error ? error.message : 'Deployment failed'
      }))
      return null
    }
  }, [walletConnected, moveCode])

  const simulateExecution = useCallback(async (nodes: any[], edges: any[]) => {
    const validation = validateFlow(nodes, edges)
    if (!validation.isValid) {
      setExecutionState(prev => ({
        ...prev,
        error: validation.error
      }))
      return
    }

    setExecutionState(prev => ({ ...prev, isSimulating: true, error: null }))

    try {
      const tx = buildPTB(nodes, edges)
      const result = await simulatePTB(tx)
      
      setExecutionState(prev => ({
        ...prev,
        isSimulating: false,
        simulationResult: result,
        error: null,
      }))

      return result
    } catch (error) {
      setExecutionState(prev => ({
        ...prev,
        isSimulating: false,
        error: error instanceof Error ? error.message : 'Simulation failed'
      }))
      return null
    }
  }, [])

  const executeStrategy = useCallback(async (nodes: any[], edges: any[]) => {
    if (!walletConnected) {
      setExecutionState(prev => ({
        ...prev,
        error: 'Please connect your wallet first'
      }))
      return
    }

    const validation = validateFlow(nodes, edges)
    if (!validation.isValid) {
      setExecutionState(prev => ({
        ...prev,
        error: validation.error
      }))
      return
    }

    setExecutionState(prev => ({ ...prev, isExecuting: true, error: null }))

    try {
      const tx = buildPTB(nodes, edges)
      
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          showObjectChanges: true,
        },
      })

      if (result.effects?.status.status !== 'success') {
        throw new Error('Transaction failed')
      }

      setExecutionState(prev => ({
        ...prev,
        isExecuting: false,
        txHash: result.digest,
        error: null,
      }))

      return result
    } catch (error) {
      setExecutionState(prev => ({
        ...prev,
        isExecuting: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      }))
      return null
    }
  }, [walletConnected, signAndExecuteTransactionBlock])

  const clearError = useCallback(() => {
    setExecutionState(prev => ({ ...prev, error: null }))
  }, [])

  const resetState = useCallback(() => {
    setExecutionState({
      isDeploying: false,
      isExecuting: false,
      isSimulating: false,
      error: null,
      txHash: null,
      simulationResult: null,
    })
  }, [])

  return {
    ...executionState,
    deployStrategy,
    executeStrategy,
    simulateExecution,
    clearError,
    resetState,
  }
}