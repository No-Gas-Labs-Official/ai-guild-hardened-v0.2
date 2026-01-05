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

export function generateMoveCode(nodes: Node[], edges: Edge[]): string {
  const borrowNode = nodes.find(n => n.type === 'borrow')
  const swapNodes = nodes.filter(n => n.type === 'swap')
  const repayNode = nodes.find(n => n.type === 'repay')

  if (!borrowNode || !repayNode) {
    return '// Error: Missing required Borrow or Repay nodes'
  }

  const amount = borrowNode.data.parameters.amount || '1000000000' // Default 1 SUI
  const tokenType = borrowNode.data.parameters.tokenType || '0x2::sui::SUI'

  let swapCode = ''
  swapNodes.forEach((swapNode, index) => {
    const dex = swapNode.data.parameters.dex || 'cetus'
    const swapAmount = swapNode.data.parameters.amount || amount
    
    if (dex === 'cetus') {
      swapCode += `
        // Swap ${index + 1} via Cetus
        let swap_result = cetus::swap(
            coin::split(&mut borrowed_coins, ${swapAmount}),
            input_token,
            output_token,
            min_output_amount
        );`
    } else if (dex === 'turbos') {
      swapCode += `
        // Swap ${index + 1} via Turbos
        let swap_result = turbos::swap(
            coin::split(&mut borrowed_coins, ${swapAmount}),
            input_token,
            output_token,
            min_output_amount
        );`
    }
  })

  return `module flashware::strategy_${Date.now()} {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    
    use flashware::flash_loan::{Self, FlashLoanReceipt};
    use flashware::pool::Pool;

    // DEX imports (comment out unused ones)
    // use cetus::cetus;
    // use turbos::turbos;

    public entry fun execute_strategy(
        pool: &mut Pool<SUI>,
        ctx: &mut TxContext
    ) {
        // Flash loan from pool
        let (borrowed_coins, receipt) = flash_loan::borrow(
            pool,
            ${amount}u64,
            ctx
        );

        // Strategy logic goes here
        ${swapCode}

        // Repay flash loan
        flash_loan::repay(
            pool,
            borrowed_coins,
            receipt,
            ctx
        );
    }
}`
}

export function generateContractName(): string {
  return `flashware_strategy_${Date.now()}`
}

export function validateMoveSyntax(code: string): { isValid: boolean; error?: string } {
  // Basic syntax validation
  const requiredKeywords = ['module', 'public entry fun', 'use']
  
  for (const keyword of requiredKeywords) {
    if (!code.includes(keyword)) {
      return {
        isValid: false,
        error: `Missing required keyword: ${keyword}`
      }
    }
  }

  // Check for balanced braces
  let braceCount = 0
  for (const char of code) {
    if (char === '{') braceCount++
    if (char === '}') braceCount--
    if (braceCount < 0) {
      return {
        isValid: false,
        error: 'Unbalanced braces'
      }
    }
  }

  if (braceCount !== 0) {
    return {
      isValid: false,
      error: 'Unbalanced braces'
    }
  }

  return { isValid: true }
}