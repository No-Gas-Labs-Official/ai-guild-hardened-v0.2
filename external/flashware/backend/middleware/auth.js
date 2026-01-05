const { SuiClient } = require('@mysten/sui.js');

const suiClient = new SuiClient({
  url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io',
});

// Authenticate wallet signature
const authenticateWallet = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Missing or invalid authorization header',
      });
    }

    const signature = authHeader.substring(7);
    const walletAddress = req.body.walletAddress || req.query.walletAddress;

    if (!walletAddress) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Wallet address is required',
      });
    }

    // Get the message that was signed (usually a timestamp + nonce)
    const message = req.headers['x-signed-message'];
    if (!message) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Signed message header is required',
      });
    }

    // Verify the signature
    const result = await suiClient.verifySignature({
      message: new TextEncoder().encode(message),
      signature,
      publicKey: walletAddress,
    });

    if (!result) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid signature',
      });
    }

    // Attach wallet info to request
    req.wallet = {
      address: walletAddress,
      signature,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      details: error.message,
    });
  }
};

// Check if wallet owns specific object
const checkObjectOwnership = async (req, res, next) => {
  try {
    const { objectId } = req.params;
    const walletAddress = req.wallet.address;

    if (!objectId) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'Object ID is required',
      });
    }

    // Check object ownership
    const object = await suiClient.getObject({
      id: objectId,
      options: { showOwner: true },
    });

    if (!object.data || !object.data.owner) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Object not found',
      });
    }

    // Check if wallet is the owner
    const isOwner = object.data.owner.AddressOwner === walletAddress ||
                   (object.data.owner && object.data.owner.AddressOwner === walletAddress);

    if (!isOwner) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not own this object',
      });
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({
      error: 'Ownership check failed',
      details: error.message,
    });
  }
};

// Rate limiting by wallet address
const createWalletRateLimit = (maxRequests, windowMs) => {
  const requests = new Map();

  return (req, res, next) => {
    const walletAddress = req.wallet.address;
    const now = Date.now();

    if (!requests.has(walletAddress)) {
      requests.set(walletAddress, { count: 0, resetTime: now + windowMs });
    }

    const walletRequests = requests.get(walletAddress);

    // Reset counter if window expired
    if (now > walletRequests.resetTime) {
      walletRequests.count = 0;
      walletRequests.resetTime = now + windowMs;
    }

    if (walletRequests.count >= maxRequests) {
      const resetIn = Math.ceil((walletRequests.resetTime - now) / 1000);
      return res.status(429).json({
        error: 'Too Many Requests',
        details: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        resetIn,
      });
    }

    walletRequests.count++;
    next();
  };
};

module.exports = {
  authenticateWallet,
  checkObjectOwnership,
  createWalletRateLimit,
};