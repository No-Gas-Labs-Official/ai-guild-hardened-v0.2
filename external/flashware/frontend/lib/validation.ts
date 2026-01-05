interface Node {
  id: string
  type: string
  data: {
    parameters: Record<string, any>
  }
}

interface Edge {
  id: string
  source: string
  target: string
}

export function validateFlow(nodes: Node[], edges: Edge[]): { isValid: boolean; error?: string } {
  // Check if there are any nodes
  if (nodes.length === 0) {
    return {
      isValid: false,
      error: 'No blocks added. Please add blocks to create a strategy.'
    }
  }

  // Check for required blocks
  const borrowNode = nodes.find(n => n.type === 'borrow')
  const swapNodes = nodes.filter(n => n.type === 'swap')
  const repayNode = nodes.find(n => n.type === 'repay')

  if (!borrowNode) {
    return {
      isValid: false,
      error: 'Missing Borrow block. Every strategy must start with a Borrow block.'
    }
  }

  if (swapNodes.length === 0) {
    return {
      isValid: false,
      error: 'Missing Swap block. You need at least one Swap block between Borrow and Repay.'
    }
  }

  if (!repayNode) {
    return {
      isValid: false,
      error: 'Missing Repay block. Every strategy must end with a Repay block.'
    }
  }

  // Check if all blocks are connected
  if (edges.length !== nodes.length - 1) {
    return {
      isValid: false,
      error: 'Blocks must be connected in sequence. Make sure all blocks are connected.'
    }
  }

  // Validate connections: Borrow -> Swap(s) -> Repay
  const connectionMap = new Map<string, string[]>()
  
  edges.forEach(edge => {
    if (!connectionMap.has(edge.source)) {
      connectionMap.set(edge.source, [])
    }
    connectionMap.get(edge.source)!.push(edge.target)
  })

  // Check if borrow has outgoing connection
  if (!connectionMap.has(borrowNode.id)) {
    return {
      isValid: false,
      error: 'Borrow block must be connected to a Swap block.'
    }
  }

  // Check if repay has incoming connection
  let hasIncomingToRepay = false
  edges.forEach(edge => {
    if (edge.target === repayNode.id) {
      hasIncomingToRepay = true
    }
  })

  if (!hasIncomingToRepay) {
    return {
      isValid: false,
      error: 'A block must be connected to the Repay block.'
    }
  }

  // Check for cycles (shouldn't happen with proper flow)
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true
    }
    if (visited.has(nodeId)) {
      return false
    }

    visited.add(nodeId)
    recursionStack.add(nodeId)

    const neighbors = connectionMap.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  if (hasCycle(borrowNode.id)) {
    return {
      isValid: false,
      error: 'Invalid flow: detected circular connections.'
    }
  }

  // Validate block parameters
  const borrowParams = borrowNode.data.parameters
  if (!borrowParams.amount || parseFloat(borrowParams.amount) <= 0) {
    return {
      isValid: false,
      error: 'Borrow block requires a valid amount greater than 0.'
    }
  }

  if (!borrowParams.poolId) {
    return {
      isValid: false,
      error: 'Borrow block requires a pool ID.'
    }
  }

  // Validate swap parameters
  for (const swapNode of swapNodes) {
    const swapParams = swapNode.data.parameters
    if (!swapParams.dexPoolId) {
      return {
        isValid: false,
        error: `Swap block requires a DEX pool ID.`
      }
    }
    if (!swapParams.outputToken) {
      return {
        isValid: false,
        error: `Swap block requires an output token.`
      }
    }
  }

  return { isValid: true }
}

export function validateParameters(nodeType: string, parameters: Record<string, any>): { isValid: boolean; error?: string } {
  switch (nodeType) {
    case 'borrow':
      if (!parameters.amount || parseFloat(parameters.amount) <= 0) {
        return {
          isValid: false,
          error: 'Amount must be greater than 0'
        }
      }
      if (!parameters.poolId) {
        return {
          isValid: false,
          error: 'Pool ID is required'
        }
      }
      break

    case 'swap':
      if (!parameters.dexPoolId) {
        return {
          isValid: false,
          error: 'DEX Pool ID is required'
        }
      }
      if (!parameters.outputToken) {
        return {
          isValid: false,
          error: 'Output token is required'
        }
      }
      if (parameters.minOutputAmount && parseFloat(parameters.minOutputAmount) < 0) {
        return {
          isValid: false,
          error: 'Minimum output amount cannot be negative'
        }
      }
      break

    case 'repay':
      // Repay block doesn't require additional parameters
      break

    default:
      return {
        isValid: false,
        error: `Unknown block type: ${nodeType}`
      }
  }

  return { isValid: true }
}

export function sanitizeAmount(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num) || num <= 0) {
    return '1000000000' // Default to 1 SUI (9 decimals)
  }
  return (num * 1000000000).toString() // Convert to smallest unit
}