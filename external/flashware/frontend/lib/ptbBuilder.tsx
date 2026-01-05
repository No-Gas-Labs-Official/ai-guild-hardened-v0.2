import { TransactionBlock } from '@mysten/sui.js'
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui.js/utils'

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

export function buildPTB(nodes: Node[], edges: Edge[]): TransactionBlock {
  const tx = new TransactionBlock()
  
  const borrowNode = nodes.find(n => n.type === 'borrow')
  const swapNodes = nodes.filter(n => n.type === 'swap')
  const repayNode = nodes.find(n => n.type === 'repay')

  if (!borrowNode || !repayNode) {
    throw new Error('Missing required Borrow or Repay nodes')
  }

  // Get parameters
  const amount = borrowNode.data.parameters.amount || '1000000000'
  const poolId = borrowNode.data.parameters.poolId
  const tokenType = borrowNode.data.parameters.tokenType || '0x2::sui::SUI'

  if (!poolId) {
    throw new Error('Pool ID is required for borrowing')
  }

  // Flash loan borrow
  const pool = tx.object(poolId)
  const clock = tx.object(SUI_CLOCK_OBJECT_ID)
  
  const [borrowedCoins, receipt] = tx.moveCall({
    target: `${getPackageId()}::flash_loan::borrow`,
    arguments: [pool, tx.pure(amount), clock],
    typeArguments: [tokenType],
  })

  let currentCoins = borrowedCoins

  // Execute swaps
  swapNodes.forEach((swapNode) => {
    const dex = swapNode.data.parameters.dex || 'cetus'
    const swapAmount = swapNode.data.parameters.amount || amount
    const inputToken = swapNode.data.parameters.inputToken || tokenType
    const outputToken = swapNode.data.parameters.outputToken
    const minOutputAmount = swapNode.data.parameters.minOutputAmount || '0'
    const dexPoolId = swapNode.data.parameters.dexPoolId

    if (!dexPoolId || !outputToken) {
      throw new Error('DEX pool ID and output token are required for swaps')
    }

    const swapCoins = tx.moveCall({
      target: `${getPackageId()}::${dex}::swap`,
      arguments: [
        tx.object(dexPoolId),
        coin::split(currentCoins, swapAmount),
        tx.pure(minOutputAmount),
        clock,
      ],
      typeArguments: [inputToken, outputToken],
    })

    // Merge remaining coins back
    tx.moveCall({
      target: '0x2::coin::join',
      arguments: [currentCoins, swapCoins],
      typeArguments: [inputToken],
    })

    currentCoins = swapCoins
  })

  // Repay flash loan
  tx.moveCall({
    target: `${getPackageId()}::flash_loan::repay`,
    arguments: [pool, currentCoins, receipt],
    typeArguments: [tokenType],
  })

  return tx
}

function getPackageId(): string {
  // This should be retrieved from the backend after contract deployment
  return process.env.NEXT_PUBLIC_FLASHWARE_PACKAGE_ID || '0x...'
}

export function simulatePTB(tx: TransactionBlock): Promise<any> {
  // This would call the backend simulation endpoint
  return fetch('/api/simulate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionBytes: tx.build({ provider: undefined }),
    }),
  }).then(res => res.json())
}

export function executePTB(tx: TransactionBlock, signer: any): Promise<any> {
  // This would be called after user signs the transaction
  return signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  })
}