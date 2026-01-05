// IP MOAT - Russian Doll Nest Encapsulation
// Multiple layers of IP protection nested like Russian Dolls
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Russian Doll Nest Structure
const DOLL_LAYERS = {
  OUTER_DOLL: 'outer_doll',      // Public API layer
  MIDDLE_DOLL: 'middle_doll',    // Authentication layer
  INNER_DOLL: 'inner_doll',      // Business logic layer
  CORE_DOLL: 'core_doll',        // Database layer
  HEART_DOLL: 'heart_doll'       // Sacred data layer
};

// Nest State
const nestState = {
  currentLayer: DOLL_LAYERS.OUTER_DOLL,
  protectionLevel: 0,
  accessLog: [],
  dollsOpened: 0
};

// Layer permissions
const LAYER_PERMISSIONS = {
  [DOLL_LAYERS.OUTER_DOLL]: ['public_read'],
  [DOLL_LAYERS.MIDDLE_DOLL]: ['authenticated_read', 'public_read'],
  [DOLL_LAYERS.INNER_DOLL]: ['authorized_read', 'authenticated_read'],
  [DOLL_LAYERS.CORE_DOLL]: ['admin_read', 'authorized_read'],
  [DOLL_LAYERS.HEART_DOLL]: ['governor_access', 'admin_read']
};

// Open Next Doll Layer
router.post('/nest/open', async (req, res) => {
  try {
    const { layer, credentials } = req.body;
    const layerOrder = Object.values(DOLL_LAYERS);
    const currentIdx = layerOrder.indexOf(nestState.currentLayer);
    const requestIdx = layerOrder.indexOf(layer);

    // Validate layer sequence
    if (requestIdx !== currentIdx + 1) {
      return res.status(400).json({ 
        error: 'Invalid doll sequence',
        message: 'Must open dolls in order: outer → middle → inner → core → heart'
      });
    }

    // Verify credentials for layer
    const requiredPerms = LAYER_PERMISSIONS[layer];
    if (!hasPermission(credentials, requiredPerms)) {
      nestState.accessLog.push({
        timestamp: Date.now(),
        layer,
        status: 'DENIED',
        reason: 'Insufficient permissions'
      });
      return res.status(403).json({ error: 'Access denied to doll layer' });
    }

    // Open doll
    nestState.currentLayer = layer;
    nestState.protectionLevel++;
    nestState.dollsOpened++;

    const dollContent = getDollContent(layer);

    nestState.accessLog.push({
      timestamp: Date.now(),
      layer,
      status: 'OPENED',
      protectionLevel: nestState.protectionLevel
    });

    res.json({
      status: 'DOLL_OPENED',
      layer,
      protectionLevel: nestState.protectionLevel,
      content: dollContent,
      message: `Russian Doll Nest: ${layer} opened`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Close Doll Nest
router.post('/nest/close', (req, res) => {
  nestState.currentLayer = DOLL_LAYERS.OUTER_DOLL;
  nestState.protectionLevel = 0;

  res.json({
    status: 'NEST_CLOSED',
    message: 'All dolls closed, returned to outer layer'
  });
});

// Get Nest Status
router.get('/nest/status', (req, res) => {
  res.json({
    ...nestState,
    totalLayers: Object.keys(DOLL_LAYERS).length,
    layersRemaining: Object.keys(DOLL_LAYERS).length - nestState.protectionLevel,
    currentDoll: nestState.currentLayer
  });
});

// Get Doll Content
function getDollContent(layer) {
  const contents = {
    [DOLL_LAYERS.OUTER_DOLL]: {
      name: 'Outer Doll',
      description: 'Public API Interface',
      availableRoutes: ['/api/health', '/api/status', '/api/public'],
      protection: 'Basic rate limiting'
    },
    [DOLL_LAYERS.MIDDLE_DOLL]: {
      name: 'Middle Doll',
      description: 'Authentication & Authorization',
      features: ['JWT validation', 'User sessions', 'Role-based access'],
      protection: 'Token-based authentication'
    },
    [DOLL_LAYERS.INNER_DOLL]: {
      name: 'Inner Doll',
      description: 'Business Logic Layer',
      modules: ['Repository Analysis', 'Architecture Mapping', 'Maintainer'],
      protection: 'Application-level security'
    },
    [DOLL_LAYERS.CORE_DOLL]: {
      name: 'Core Doll',
      description: 'Database & Persistence',
      databases: ['PostgreSQL', 'Redis', 'IPFS'],
      protection: 'Encryption at rest'
    },
    [DOLL_LAYERS.HEART_DOLL]: {
      name: 'Heart Doll',
      description: 'Sacred Data & IP Assets',
      assets: [
        'Subtractive Fire variables',
        'Cipher of Numerical Echoes',
        'Sacred Iconography',
        'Autonomous Liver'
      ],
      protection: 'Governor-only access',
      governor: 'Damien Edward Featherstone'
    }
  };

  return contents[layer] || {};
}

// Permission Check
function hasPermission(credentials, requiredPerms) {
  if (!credentials || !credentials.permissions) return false;
  
  return requiredPerms.some(perm => 
    credentials.permissions.includes(perm)
  );
}

// IP Moat Validation
router.post('/validate', (req, res) => {
  const { asset, requester } = req.body;

  const validation = {
    asset,
    requester,
    timestamp: Date.now(),
    moatLevel: nestState.protectionLevel,
    isValid: false,
    protection: 'ENFORCED'
  };

  // Governor bypass
  if (requester === 'Damien Edward Featherstone') {
    validation.isValid = true;
    validation.protection = 'GOVERNOR_OVERRIDE';
  } else if (nestState.protectionLevel >= 5) {
    validation.isValid = true;
  }

  res.json(validation);
});

// Export nest state for monitoring
router.get('/export', (req, res) => {
  res.json({
    exportType: 'IP_MOAT_STATE',
    timestamp: Date.now(),
    state: nestState,
    checksum: crypto.createHash('sha256')
      .update(JSON.stringify(nestState))
      .digest('hex')
  });
});

module.exports = router;