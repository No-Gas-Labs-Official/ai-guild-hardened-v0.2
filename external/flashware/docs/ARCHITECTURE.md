# Flashware v1.0 - Architecture Documentation

## Overview

Flashware is a no-code flash loan builder for the Sui blockchain, enabling users to create, deploy, and execute flash loan arbitrage strategies through a visual drag-and-drop interface.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Sui Network   │
│   (Next.js)     │◄──►│   (Express)     │◄──►│  (Testnet)      │
│                 │    │                 │    │                 │
│ • React Flow    │    │ • Sui SDK       │    │ • Move Contracts│
│ • Suiet Wallet  │    │ • PostgreSQL    │    │ • PTB Execution │
│ • Monaco Editor │    │ • Compilation   │    │ • Flash Loans   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   PostgreSQL    │              │
         └──────────────►│   Database      │◄─────────────┘
                        │                 │
                        │ • Deployments   │
                        │ • Executions    │
                        │ • User Sessions │
                        └─────────────────┘
```

## Components

### Frontend Architecture

#### Core Components

1. **React Flow Canvas**
   - Visual block-based interface
   - Drag-and-drop functionality
   - Real-time connection validation
   - Cyberpunk-themed UI

2. **Block Components**
   - `BorrowNode`: Flash loan initialization
   - `SwapNode`: DEX integration (Cetus, Turbos, etc.)
   - `RepayNode`: Loan repayment (mandatory)

3. **Wallet Integration**
   - Suiet wallet adapter
   - Transaction signing
   - Signature verification
   - Network connection

4. **Code Generation**
   - Real-time Move code preview
   - Monaco editor integration
   - Syntax highlighting
   - Live validation

#### State Management

```typescript
interface FlashwareState {
  walletConnected: boolean
  userAddress: string | null
  blocks: Block[]
  moveCode: string
  selectedBlocks: string[]
}
```

#### Key Libraries

- `reactflow`: Visual flow editor
- `@mysten/sui.js`: Sui blockchain interaction
- `@suiet/wallet-kit`: Wallet integration
- `zustand`: State management
- `@monaco-editor/react`: Code editing

### Backend Architecture

#### API Endpoints

1. **Deployment API** (`/api/deploy`)
   - Compile Move contracts
   - Deploy to Sui testnet
   - Store deployment metadata

2. **Execution API** (`/api/execute`)
   - Build Transaction Blocks (PTBs)
   - Prepare transactions for signing
   - Handle execution confirmation

3. **Simulation API** (`/api/simulate`)
   - Dry-run transaction execution
   - Gas estimation
   - Risk assessment

#### Services

1. **Move Compiler Service**
   - Docker-based compilation
   - Bytecode generation
   - Error handling

2. **PTB Compiler Service**
   - Transaction block construction
   - Gas optimization
   - Event parsing

3. **Database Service**
   - PostgreSQL with Prisma ORM
   - Deployment tracking
   - Execution history

#### Middleware

1. **Authentication**
   - Wallet signature verification
   - Request validation
   - Rate limiting

2. **Rate Limiting**
   - Per-wallet limits
   - IP-based restrictions
   - Endpoint-specific rules

### Smart Contract Architecture

#### Core Modules

1. **Flash Loan Module** (`flash_loan.move`)
   - Hot potato pattern implementation
   - Borrow/repay functions
   - Receipt management

2. **Pool Module** (`pool.move`)
   - Liquidity management
   - Deposit/withdrawal
   - Statistics tracking

3. **Receipt Module** (`receipt.move`)
   - Hot potato receipt
   - Expiration handling
   - Proof generation

#### Key Patterns

1. **Hot Potato Pattern**
   ```move
   public fun borrow<T>(
       pool: &mut Pool<T>,
       amount: u64,
       ctx: &mut TxContext
   ): (Coin<T>, FlashLoanReceipt<T>)
   ```

2. **Shared Objects**
   - Pool objects are shared
   - Concurrent access control
   - Atomic operations

3. **Type Parameters**
   - Generic token support
   - Type safety
   - Composability

## Data Flow

### Strategy Creation Flow

1. **User Interface**
   ```
   User drags blocks → Canvas updates → State management → Validation
   ```

2. **Code Generation**
   ```
   Block connections → Move code generator → Syntax validation → Preview
   ```

3. **Deployment**
   ```
   Move code → Compiler → Bytecode → Network deployment → Package ID
   ```

### Execution Flow

1. **Transaction Building**
   ```
   Block parameters → PTB builder → Transaction bytes → User signing
   ```

2. **Blockchain Execution**
   ```
   Signed transaction → Sui network → Flash loan execution → Results
   ```

3. **Result Processing**
   ```
   Transaction results → Event parsing → Database storage → UI update
   ```

## Security Considerations

### Smart Contract Security

1. **Hot Potato Pattern**
   - Ensures atomic execution
   - Prevents partial state changes
   - Guarantees repayment

2. **Reentrancy Protection**
   - Single transaction constraint
   - No external calls during execution
   - State isolation

3. **Access Control**
   - Pool ownership validation
   - Receipt verification
   - Expiration checks

### Backend Security

1. **Authentication**
   - Signature verification
   - Request validation
   - CSRF protection

2. **Rate Limiting**
   - Request throttling
   - Resource protection
   - DoS prevention

3. **Input Validation**
   - Parameter sanitization
   - Type checking
   - Range validation

### Frontend Security

1. **Wallet Security**
   - Secure connection
   - Transaction verification
   - Phishing protection

2. **Data Validation**
   - Client-side validation
   - Server verification
   - Error handling

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**
   - Lazy loading
   - Route-based splitting
   - Component boundaries

2. **State Management**
   - Efficient updates
   - Memoization
   - Selective re-renders

3. **Asset Optimization**
   - Image optimization
   - Bundle compression
   - CDN usage

### Backend Optimization

1. **Database Optimization**
   - Query optimization
   - Indexing strategy
   - Connection pooling

2. **Caching Strategy**
   - Response caching
   - Database caching
   - CDN caching

3. **API Optimization**
   - Request batching
   - Pagination
   - Compression

## Monitoring & Observability

### Application Monitoring

1. **Health Checks**
   - Service health
   - Database connectivity
   - Network status

2. **Performance Metrics**
   - Response times
   - Error rates
   - Resource usage

3. **Logging**
   - Structured logging
   - Error tracking
   - Audit trails

### Blockchain Monitoring

1. **Transaction Monitoring**
   - Success rates
   - Gas usage
   - Execution times

2. **Pool Monitoring**
   - Liquidity levels
   - Utilization rates
   - Profit/loss tracking

## Deployment Architecture

### Local Development

```
┌─────────────────┐
│   Development   │
│   Environment   │
│                 │
│ • Frontend:3000 │
│ • Backend:3001 │
│ • PostgreSQL    │
│ • Sui Testnet   │
└─────────────────┘
```

### Production Deployment

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │
│   (Vercel)      │    │   (Railway)     │
│                 │    │                 │
│ • Static Files  │    │ • API Server    │
│ • CDN           │    │ • Database      │
│ • Edge Cache    │    │ • Background    │
└─────────────────┘    └─────────────────┘
```

## Future Enhancements

### Planned Features

1. **Advanced Strategies**
   - Multi-pool arbitrage
   - Cross-pool lending
   - Yield farming integration

2. **Enhanced UI**
   - Strategy templates
   - Performance analytics
   - Risk assessment tools

3. **Protocol Integration**
   - Additional DEXs
   - Lending protocols
   - Yield aggregators

### Scalability Improvements

1. **Architecture**
   - Microservices migration
   - Event-driven architecture
   - Horizontal scaling

2. **Performance**
   - Caching layers
   - Database sharding
   - Load balancing

## Conclusion

Flashware v1.0 provides a secure, efficient, and user-friendly platform for creating flash loan strategies on Sui. The architecture emphasizes security, performance, and extensibility while maintaining simplicity for end users.

The hot potato pattern ensures atomic execution, the visual interface lowers barriers to entry, and the modular architecture allows for future enhancements and protocol integrations.