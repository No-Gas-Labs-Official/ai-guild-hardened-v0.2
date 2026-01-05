# Flashware v1.0 - API Documentation

## Overview

Flashware provides a RESTful API for deploying and executing flash loan strategies on the Sui blockchain. All API endpoints require wallet signature authentication and implement rate limiting for security.

## Base URL

```
Development: http://localhost:3001
Production: https://api.flashware.dev
```

## Authentication

All write operations require wallet signature authentication:

```http
Authorization: Bearer <wallet_signature>
X-Signed-Message: <nonce_timestamp>
```

The message format should be: `flashware_${timestamp}_${nonce}`

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "details": "Detailed error message"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid signature)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Endpoints

### Health Check

#### GET /health

Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

### Deployment API

#### POST /api/deploy

Compile and deploy a Move smart contract for a flash loan strategy.

**Authentication:** Required  
**Rate Limit:** 10 requests per 5 minutes per wallet

**Request Body:**
```json
{
  "moveCode": "module flashware::strategy { ... }",
  "nodes": [
    {
      "id": "borrow-1",
      "type": "borrow",
      "data": {
        "parameters": {
          "amount": "1000000000",
          "poolId": "0x...",
          "tokenType": "0x2::sui::SUI"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "borrow-1",
      "target": "swap-1"
    }
  ],
  "walletAddress": "0x1234567890abcdef..."
}
```

**Response:**
```json
{
  "success": true,
  "packageId": "0xabcdef1234567890...",
  "transactionHash": "0x1234567890abcdef...",
  "gasUsed": "45000000",
  "deploymentId": "dep_123456789",
  "status": "DEPLOYED",
  "message": "Contract deployed successfully to Sui testnet"
}
```

**Error Response:**
```json
{
  "error": "Compilation Error",
  "details": "Move code compilation failed: Invalid syntax"
}
```

#### GET /api/deploy/:packageId

Get deployment information for a specific package.

**Authentication:** None  
**Rate Limit:** 100 requests per 15 minutes per IP

**Path Parameters:**
- `packageId` - The deployed package ID

**Response:**
```json
{
  "success": true,
  "deployment": {
    "id": "dep_123456789",
    "packageId": "0xabcdef1234567890...",
    "status": "DEPLOYED",
    "gasUsed": "45000000",
    "transactionHash": "0x1234567890abcdef...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "executions": [
      {
        "id": "exec_123456789",
        "status": "SUCCESS",
        "gasUsed": "25000000",
        "profitLoss": "5000000",
        "createdAt": "2024-01-01T00:05:00.000Z"
      }
    ]
  }
}
```

#### GET /api/deploy/wallet/:address

Get all deployments for a specific wallet address.

**Authentication:** None  
**Rate Limit:** 100 requests per 15 minutes per IP

**Path Parameters:**
- `address` - The wallet address

**Query Parameters:**
- `limit` (optional) - Maximum number of deployments to return (default: 50)
- `offset` (optional) - Number of deployments to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "deployments": [
    {
      "id": "dep_123456789",
      "packageId": "0xabcdef1234567890...",
      "status": "DEPLOYED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "executions": [...]
    }
  ],
  "count": 1
}
```

---

### Execution API

#### POST /api/execute

Build and prepare a transaction for executing a flash loan strategy.

**Authentication:** Required  
**Rate Limit:** 30 requests per minute per wallet

**Request Body:**
```json
{
  "transactionBlock": {
    "nodes": [...],
    "edges": [...]
  },
  "deploymentId": "dep_123456789",
  "walletAddress": "0x1234567890abcdef...",
  "gasBudget": 10000000
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "exec_123456789",
  "transactionBytes": "AAABAA...",
  "gasBudget": 10000000,
  "message": "Transaction prepared. Please sign in your wallet."
}
```

#### POST /api/execute/confirm

Confirm the execution of a transaction after user signing.

**Authentication:** Required  
**Rate Limit:** 30 requests per minute per wallet

**Request Body:**
```json
{
  "executionId": "exec_123456789",
  "transactionHash": "0x1234567890abcdef...",
  "gasUsed": "25000000",
  "status": "SUCCESS"
}
```

**Response:**
```json
{
  "success": true,
  "execution": {
    "id": "exec_123456789",
    "deploymentId": "dep_123456789",
    "walletAddress": "0x1234567890abcdef...",
    "status": "SUCCESS",
    "transactionHash": "0x1234567890abcdef...",
    "gasUsed": "25000000",
    "profitLoss": "5000000",
    "completedAt": "2024-01-01T00:05:00.000Z"
  },
  "message": "Execution status updated"
}
```

#### GET /api/execute/:executionId

Get execution information for a specific execution.

**Authentication:** None  
**Rate Limit:** 100 requests per 15 minutes per IP

**Path Parameters:**
- `executionId` - The execution ID

**Response:**
```json
{
  "success": true,
  "execution": {
    "id": "exec_123456789",
    "deploymentId": "dep_123456789",
    "walletAddress": "0x1234567890abcdef...",
    "status": "SUCCESS",
    "transactionHash": "0x1234567890abcdef...",
    "gasUsed": "25000000",
    "gasBudget": 10000000,
    "profitLoss": "5000000",
    "events": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:05:00.000Z"
  }
}
```

#### GET /api/execute/deployment/:deploymentId

Get all executions for a specific deployment.

**Authentication:** None  
**Rate Limit:** 100 requests per 15 minutes per IP

**Path Parameters:**
- `deploymentId` - The deployment ID

**Query Parameters:**
- `limit` (optional) - Maximum number of executions to return (default: 50)
- `status` (optional) - Filter by execution status (`PENDING`, `SUCCESS`, `FAILED`)

**Response:**
```json
{
  "success": true,
  "executions": [
    {
      "id": "exec_123456789",
      "status": "SUCCESS",
      "gasUsed": "25000000",
      "profitLoss": "5000000",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Simulation API

#### POST /api/simulate

Simulate the execution of a transaction without broadcasting to the blockchain.

**Authentication:** Required  
**Rate Limit:** 50 requests per minute per wallet

**Request Body:**
```json
{
  "transactionBytes": "AAABAA...",
  "walletAddress": "0x1234567890abcdef..."
}
```

**Response:**
```json
{
  "success": true,
  "simulation": {
    "effects": {
      "status": {
        "status": "success"
      },
      "gasUsed": {
        "computationCost": "25000000"
      }
    },
    "events": [
      {
        "type": "0xabcdef::flash_loan::BorrowEvent",
        "parsedJson": {
          "amount": "1000000000",
          "borrower": "0x1234567890abcdef..."
        }
      }
    ],
    "gasUsed": "25000000",
    "gasCost": {
      "computationCost": "25000000",
      "storageCost": "1000000",
      "storageRebate": "500000"
    },
    "status": "success"
  },
  "message": "Simulation completed successfully"
}
```

#### POST /api/simulate/flow

Simulate a flow execution without deploying the contract first.

**Authentication:** Required  
**Rate Limit:** 50 requests per minute per wallet

**Request Body:**
```json
{
  "nodes": [...],
  "edges": [...],
  "walletAddress": "0x1234567890abcdef...",
  "packageId": "0xabcdef1234567890..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionBytes": "AAABAA...",
  "simulation": {
    "effects": {...},
    "events": [...],
    "gasUsed": "25000000",
    "gasCost": {...},
    "status": "success"
  },
  "message": "Flow simulation completed successfully"
}
```

---

## Data Models

### Node Model

```typescript
interface Node {
  id: string;
  type: 'borrow' | 'swap' | 'repay';
  data: {
    label: string;
    parameters: {
      // Borrow parameters
      amount?: string;
      poolId?: string;
      tokenType?: string;
      
      // Swap parameters
      dex?: string;
      dexPoolId?: string;
      inputToken?: string;
      outputToken?: string;
      minOutputAmount?: string;
      
      // Repay parameters (none required)
    };
  };
}
```

### Edge Model

```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
}
```

### Deployment Model

```typescript
interface Deployment {
  id: string;
  packageId: string;
  moveCode: string;
  nodes: Node[];
  edges: Edge[];
  walletAddress: string;
  status: 'DEPLOYED' | 'FAILED' | 'PENDING';
  gasUsed?: bigint;
  transactionHash?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Execution Model

```typescript
interface Execution {
  id: string;
  deploymentId: string;
  walletAddress: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  transactionBytes?: string;
  transactionHash?: string;
  gasUsed?: bigint;
  gasBudget?: bigint;
  profitLoss?: bigint;
  events?: any[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}
```

## Rate Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| POST /api/deploy | 10 requests | 5 minutes |
| POST /api/execute | 30 requests | 1 minute |
| POST /api/simulate | 50 requests | 1 minute |
| GET /api/deploy/* | 100 requests | 15 minutes |
| GET /api/execute/* | 100 requests | 15 minutes |

Rate limits are applied per wallet address when authenticated, otherwise per IP address.

## SDK Integration

### JavaScript/TypeScript

```typescript
import { FlashwareClient } from '@flashware/sdk';

const client = new FlashwareClient({
  baseUrl: 'http://localhost:3001',
  network: 'testnet',
});

// Deploy strategy
const deployment = await client.deploy({
  moveCode: generatedCode,
  nodes,
  edges,
  walletAddress,
  signature,
});

// Execute strategy
const execution = await client.execute({
  deploymentId: deployment.id,
  transactionBlock,
  walletAddress,
  signature,
});

// Simulate execution
const simulation = await client.simulate({
  transactionBytes,
  walletAddress,
  signature,
});
```

### Python

```python
from flashware_sdk import FlashwareClient

client = FlashwareClient(
    base_url='http://localhost:3001',
    network='testnet'
)

# Deploy strategy
deployment = client.deploy(
    move_code=generated_code,
    nodes=nodes,
    edges=edges,
    wallet_address=wallet_address,
    signature=signature
)

# Execute strategy
execution = client.execute(
    deployment_id=deployment.id,
    transaction_block=transaction_block,
    wallet_address=wallet_address,
    signature=signature
)
```

## WebSocket API

### Real-time Execution Updates

Connect to WebSocket for real-time execution status updates:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/execution');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Execution update:', data);
};

// Subscribe to execution updates
ws.send(JSON.stringify({
  type: 'subscribe',
  executionId: 'exec_123456789'
}));
```

**WebSocket Message Format:**
```json
{
  "type": "execution_update",
  "executionId": "exec_123456789",
  "status": "SUCCESS",
  "transactionHash": "0x1234567890abcdef...",
  "timestamp": "2024-01-01T00:05:00.000Z"
}
```

## Error Codes

| Error Code | Description |
|------------|-------------|
| `E_INSUFFICIENT_LIQUIDITY` | Pool doesn't have enough liquidity |
| `E_INSUFFICIENT_REPAYMENT` | Repayment amount is insufficient |
| `E_INVALID_RECEIPT` | Receipt is invalid or corrupted |
| `E_EXPIRED_RECEIPT` | Receipt has expired |
| `E_UNAUTHORIZED` | Invalid or missing authentication |
| `E_RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `E_COMPILATION_FAILED` | Move code compilation failed |
| `E_VALIDATION_ERROR` | Input validation failed |
| `E_DEPLOYMENT_FAILED` | Contract deployment failed |
| `E_EXECUTION_FAILED` | Transaction execution failed |

## Testing

### Test Environment

```bash
# Start test server
npm run test:server

# Run API tests
npm run test:api

# Run integration tests
npm run test:integration
```

### Example Test

```javascript
describe('Deployment API', () => {
  test('should deploy strategy successfully', async () => {
    const response = await request(app)
      .post('/api/deploy')
      .set('Authorization', `Bearer ${validSignature}`)
      .set('X-Signed-Message', signedMessage)
      .send({
        moveCode: validMoveCode,
        nodes: validNodes,
        edges: validEdges,
        walletAddress: validAddress,
      })
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.packageId).toBeDefined();
  });
});
```

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Deployment and execution endpoints
- WebSocket support
- Rate limiting and authentication
- Simulation endpoints

---

For support and questions, please contact the Flashware team at api@flashware.dev.