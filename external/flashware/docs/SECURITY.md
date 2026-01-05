# Flashware v1.0 - Security Documentation

## Security Overview

Flashware implements multiple layers of security to protect user funds and ensure safe flash loan execution on the Sui blockchain. This document outlines the security model, threat vectors, and mitigation strategies.

## Smart Contract Security

### Hot Potato Pattern Implementation

The core security mechanism is the **hot potato pattern**, which ensures atomic execution of flash loans:

```move
// Borrow function returns receipt that MUST be consumed
public fun borrow<T>(
    pool: &mut Pool<T>,
    amount: u64,
    ctx: &mut TxContext
): (Coin<T>, FlashLoanReceipt<T>)

// Repay function consumes the receipt
public fun repay<T>(
    pool: &mut Pool<T>,
    coins: Coin<T>,
    receipt: FlashLoanReceipt<T>,
    ctx: &mut TxContext
)
```

**Security Properties:**
- **Atomic Execution**: Flash loans must be repaid in the same transaction
- **No Reentrancy**: Receipt cannot be stored or passed between transactions
- **State Isolation**: Pool state is consistent during execution

### Access Control

#### Pool Access Control

```move
// Only pool can lend/receive funds
public(friend) fun withdraw<T>(pool: &mut Pool<T>, amount: u64): Coin<T>
public(friend) fun deposit<T>(pool: &mut Pool<T>, coins: Coin<T>)
```

#### Receipt Validation

```move
// Verify receipt matches pool and hasn't expired
assert!(object::id(pool) == pool_id, E_INVALID_RECEIPT);
assert!(current_epoch <= borrowed_at + 1, E_EXPIRED_RECEIPT);
```

### Integer Overflow Protection

All arithmetic operations use Sui's built-in overflow protection:

```move
// Sui Move provides automatic overflow checks
pool.balance = pool.balance + amount; // Protected
assert!(pool.balance >= amount, E_INSUFFICIENT_LIQUIDITY); // Explicit check
```

### Expiration Mechanism

Receipts expire after 1 epoch to prevent stale receipt attacks:

```move
public fun is_expired<T>(receipt: &FlashLoanReceipt<T>, current_epoch: u64): bool {
    current_epoch > receipt.borrowed_at + 1
}
```

## Backend Security

### Authentication & Authorization

#### Wallet Signature Verification

```javascript
// Verify user's cryptographic signature
const result = await suiClient.verifySignature({
  message: new TextEncoder().encode(message),
  signature,
  publicKey: walletAddress,
});

if (!result) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

#### Request Validation

```javascript
// Validate all incoming requests
const deploySchema = Joi.object({
  moveCode: Joi.string().required().min(100),
  nodes: Joi.array().required(),
  edges: Joi.array().required(),
  walletAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40,}$/),
});
```

### Rate Limiting

#### Endpoint-Specific Limits

```javascript
// Deployment: 10 per 5 minutes per wallet
const deployLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.wallet?.address || req.ip,
});

// Execution: 30 per minute per wallet
const executeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.wallet?.address || req.ip,
});
```

### Input Sanitization

#### Move Code Sanitization

```javascript
// Compile in isolated Docker container
const compilationResult = await moveCompiler.compile(moveCode);
if (!compilationResult.success) {
  throw new Error('Compilation failed');
}
```

#### Parameter Validation

```javascript
// Sanitize all user inputs
const sanitizedAmount = sanitizeAmount(userInput.amount);
const sanitizedPoolId = validatePoolId(userInput.poolId);
```

### Database Security

#### Connection Security

```javascript
// Secure database connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Use environment variables
    },
  },
});
```

#### SQL Injection Prevention

```javascript
// Prisma ORM prevents SQL injection
const deployment = await prisma.deployment.create({
  data: {
    packageId: deploymentResult.packageId,
    moveCode, // Automatically escaped
    walletAddress, // Automatically escaped
  },
});
```

## Frontend Security

### Wallet Security

#### Secure Connection

```typescript
// Use official wallet adapters
import { ConnectButton, useWallet } from '@suiet/wallet-kit'

// Verify transaction before signing
const result = await signAndExecuteTransactionBlock({
  transactionBlock: tx,
  options: {
    showEffects: true,
    showEvents: true,
  },
});
```

#### Transaction Verification

```typescript
// Verify transaction matches user's intent
const validateTransaction = (tx: TransactionBlock, userIntent: UserIntent) => {
  // Check that transaction contains expected calls
  // Verify amounts and destinations
  // Ensure no unexpected operations
};
```

### Client-Side Validation

#### Input Validation

```typescript
// Validate user inputs before sending to backend
const validateParameters = (nodeType: string, parameters: Record<string, any>) => {
  switch (nodeType) {
    case 'borrow':
      if (!parameters.amount || parseFloat(parameters.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      break;
    // ... other validations
  }
};
```

#### Flow Validation

```typescript
// Validate block connections
const validateFlow = (nodes: Node[], edges: Edge[]): ValidationResult => {
  // Must have borrow -> swap -> repay pattern
  // All blocks must be connected
  // No circular connections
};
```

## Threat Model

### Identified Threats

#### 1. Flash Loan Default

**Threat**: User fails to repay flash loan
**Mitigation**: Hot potato pattern guarantees repayment or transaction failure

#### 2. Reentrancy Attack

**Threat**: Malicious contract reenters during execution
**Mitigation**: Single transaction constraint prevents reentrancy

#### 3. Stale Receipt Attack

**Threat**: Using old receipt to borrow
**Mitigation**: Receipt expiration after 1 epoch

#### 4. Integer Overflow

**Threat**: Arithmetic overflow causing incorrect calculations
**Mitigation**: Sui Move's built-in overflow protection

#### 5. Frontend Attack

**Threat**: Malicious frontend modifies transactions
**Mitigation**: User verification and wallet signing protection

#### 6. Backend Attack

**Threat**: Compromised backend injects malicious code
**Mitigation**: Compilation isolation and signature verification

#### 7. Database Attack

**Threat**: SQL injection or data tampering
**Mitigation**: Parameterized queries and access controls

#### 8. Network Attack

**Threat**: Man-in-the-middle or replay attacks
**Mitigation**: HTTPS and transaction nonces

### Attack Scenarios

#### Scenario 1: Malicious Strategy

```move
// Attacker tries to steal funds
module attacker::malicious {
    public fun steal(pool: &mut Pool<SUI>) {
        let stolen = pool.withdraw(1000000); // This won't work
        transfer::public_transfer(stolen, attacker_address); // Protected
    }
}
```

**Why it fails:**
- `withdraw` is `public(friend)` only
- Cannot transfer without proper access
- Hot potato prevents state changes

#### Scenario 2: Replay Attack

```javascript
// Attacker tries to replay transaction
const oldTransaction = getOldTransaction();
const result = await wallet.signTransaction(oldTransaction);
```

**Why it fails:**
- Transaction includes nonce
- Sui prevents duplicate transactions
- Receipt expiration prevents reuse

#### Scenario 3: Frontend Manipulation

```javascript
// Attacker modifies frontend to change amounts
const maliciousAmount = "1000000000"; // 1000 SUI instead of 1 SUI
```

**Why it fails:**
- User must sign transaction
- Wallet shows final transaction details
- Backend validation checks parameters

## Security Best Practices

### Development Practices

#### 1. Code Review

- All smart contracts undergo formal review
- Backend code reviewed for security issues
- Frontend code audited for XSS vulnerabilities

#### 2. Testing

```javascript
// Security-focused tests
describe('Flash Loan Security', () => {
  it('should prevent default', async () => {
    // Test that default causes transaction failure
  });
  
  it('should prevent reentrancy', async () => {
    // Test that reentrancy is impossible
  });
});
```

#### 3. Static Analysis

```bash
# Move security analysis
sui move verify --security-checks

# JavaScript security analysis
npm audit
npx eslint . --ext .js,.jsx,.ts,.tsx
```

### Operational Security

#### 1. Environment Variables

```bash
# Never commit secrets to repository
DATABASE_URL=postgresql://user:pass@localhost/db
SUI_PRIVATE_KEY=encrypted_value
JWT_SECRET=strong_random_string
```

#### 2. Access Controls

```javascript
// Role-based access control
const authorize = (requiredRole) => (req, res, next) => {
  if (req.user.role !== requiredRole) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

#### 3. Monitoring

```javascript
// Security event logging
const securityLogger = winston.createLogger({
  level: 'security',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
  ],
});
```

## Incident Response

### Security Incident Categories

#### 1. Smart Contract Exploit

**Response:**
1. Immediately pause contract interactions
2. Analyze exploit vector
3. Deploy patched version
4. Communicate with users

#### 2. Backend Compromise

**Response:**
1. Rotate all API keys and secrets
2. Audit access logs
3. Patch vulnerability
4. Implement additional monitoring

#### 3. Frontend Compromise

**Response:**
1. Deploy clean version
2. Clear CDN caches
3. Notify users of potential risk
4. Advise wallet reconnection

### Emergency Procedures

#### Contract Emergency Pause

```move
// Emergency pause function (admin only)
public fun emergency_pause(pool: &mut Pool<T>, ctx: &mut TxContext) {
    assert!(is_admin(ctx), E_UNAUTHORIZED);
    pool.paused = true;
}
```

#### Backend Emergency Shutdown

```javascript
// Emergency shutdown endpoint
app.post('/admin/emergency-shutdown', authorize('admin'), (req, res) => {
  process.exit(1); // Force restart
});
```

## Compliance Considerations

### Regulatory Compliance

#### 1. Anti-Money Laundering (AML)

- Monitor for suspicious transactions
- Implement transaction limits
- Report unusual activity patterns

#### 2. Know Your Customer (KYC)

- Optional identity verification
- Risk-based user assessment
- Document verification requirements

### Data Protection

#### 1. Privacy

```javascript
// Anonymize user data
const anonymizeUserData = (user) => ({
  walletAddress: hashAddress(user.walletAddress),
  transactions: user.transactions.map(t => ({
    hash: t.hash,
    amount: t.amount,
    timestamp: t.timestamp,
    // Remove personally identifiable information
  })),
});
```

#### 2. Data Retention

```javascript
// Automatically delete old data
const cleanupOldData = async () => {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await prisma.execution.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });
};
```

## Security Audits

### Audit Checklist

#### Smart Contract Audit

- [ ] Hot potato pattern implementation
- [ ] Access control verification
- [ ] Integer overflow protection
- [ ] Reentrancy prevention
- [ ] Gas optimization analysis

#### Backend Audit

- [ ] Authentication mechanisms
- [ ] Input validation
- [ ] Rate limiting effectiveness
- [ ] Database security
- [ ] API endpoint security

#### Frontend Audit

- [ ] XSS vulnerability assessment
- [ ] CSRF protection
- [ ] Transaction security
- [ ] Dependency security
- [ ] User privacy protection

### Third-Party Audits

- Engage professional security firms
- Conduct penetration testing
- Implement bug bounty program
- Regular security assessments

## Conclusion

Flashware implements a comprehensive security model that protects users at multiple layers:

1. **Smart Contract Layer**: Hot potato pattern ensures atomic execution
2. **Backend Layer**: Authentication and validation prevent malicious requests
3. **Frontend Layer**: User verification and transaction confirmation
4. **Operational Layer**: Monitoring and incident response capabilities

The security architecture is designed to be defense-in-depth, with multiple independent security controls that must all be bypassed for a successful attack. Regular security audits and updates ensure continued protection against emerging threats.

Users are protected by the fundamental property of flash loans: they either execute successfully and repay the loan, or the entire transaction fails and no funds are lost.