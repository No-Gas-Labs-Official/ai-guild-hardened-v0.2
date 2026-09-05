import React, { useState, useEffect } from 'react';

// QUADRUPLE EXPOSURE - Unified Interface
// Renders: Continuity, The Leak, The Mutation, Regeneration

const QuadrupleExposure = () => {
  // State for all 4 panels
  const [activeTab, setActiveTab] = useState('continuity');
  const [continuity, setContinuity] = useState({
    moduleHealth: {},
    systemUptime: 0,
    alerts: []
  });
  
  const [leak, setLeak] = useState({
    nodeConflicts: [],
    reasoningLogs: [],
    rawOutput: []
  });
  
  const [mutation, setMutation] = useState({
    chaosLevel: 0,
    injectedChaos: [],
    foundationData: {}
  });
  
  const [regeneration, setRegeneration] = useState({
    liverHealth: 100,
    bobFactorHits: 0,
    memoryArtifacts: [],
    regenerationCycles: 0
  });

  // Real-time data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Continuity: 9-module health
        const healthRes = await fetch('/api/quadruple/health'); // Continuity: matches routes/quadruple.js GET /health
        if (healthRes.ok) {
          setContinuity(prev => ({ ...prev, ...await healthRes.json() }));
        }

        // Leak: Node reasoning logs
        const leakRes = await fetch('/api/quadruple/leak'); // The Leak: matches routes/quadruple.js GET /leak
        if (leakRes.ok) {
          setLeak(await leakRes.json());
        }

        // Mutation: Chaos injection state
        const mutationRes = await fetch('/api/quadruple/chaos'); // Mutation: matches routes/quadruple.js GET /chaos
        if (mutationRes.ok) {
          setMutation(await mutationRes.json());
        }

        // Regeneration: Liver status
        const liverRes = await fetch('/api/quadruple/regeneration'); // Regeneration: matches routes/quadruple.js GET /regeneration
        if (liverRes.ok) {
          setRegeneration(await liverRes.json());
        }
      } catch (error) {
        console.error('Quadruple data fetch error:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000); // 1-second refresh
    return () => clearInterval(interval);
  }, []);

  // Module health colors
  const getHealthColor = (health) => {
    if (health >= 90) return '#50C878'; // Emerald
    if (health >= 70) return '#FFBF00'; // Amber
    if (health >= 50) return '#FF4500'; // Orange-Red
    return '#FF0000'; // Critical
  };

  return (
    <div className="quadruple-exposure" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      gap: '2px',
      border: '1px solid #333'
    }}>
      {/* PANEL 1: CONTINUITY - 9-Module Health Dashboard */}
      <div className="panel continuity" style={{
        padding: '20px',
        borderRight: '1px solid #333',
        borderBottom: '1px solid #333',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#00FFFF', marginBottom: '15px', borderBottom: '2px solid #00FFFF' }}>
          CONTINUITY: 9-MODULE HEALTH
        </h3>
        
        {/* 9 Module Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { name: 'Repo Analysis', id: 1 },
            { name: 'Architecture', id: 2 },
            { name: 'Maintainer', id: 3 },
            { name: 'Model Registry', id: 4 },
            { name: 'Prototypes', id: 5 },
            { name: 'Dashboard', id: 6 },
            { name: 'Agent Director', id: 7 },
            { name: 'CLI Tool', id: 8 },
            { name: 'Health Monitor', id: 9 }
          ].map(mod => (
            <div key={mod.id} style={{
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid #00FFFF',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#00FFFF', marginBottom: '5px' }}>
                {mod.name}
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: getHealthColor(continuity.moduleHealth[mod.id] || 85)
              }}>
                {continuity.moduleHealth[mod.id] || 85}%
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                Module {mod.id}
              </div>
            </div>
          ))}
        </div>

        {/* System Uptime */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(0, 255, 255, 0.05)',
          borderRadius: '8px'
        }}>
          <div style={{ color: '#00FFFF', fontSize: '14px' }}>
            System Uptime: {(continuity.systemUptime / 3600).toFixed(2)} hours
          </div>
          <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
            Active Alerts: {continuity.alerts.length}
          </div>
        </div>
      </div>

      {/* PANEL 2: THE LEAK - Raw Node Reasoning Logs */}
      <div className="panel leak" style={{
        padding: '20px',
        borderBottom: '1px solid #333',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '11px'
      }}>
        <h3 style={{ color: '#FF00FF', marginBottom: '15px', borderBottom: '2px solid #FF00FF' }}>
          THE LEAK: 40+ NODE CONFLICTS
        </h3>
        
        <div style={{ color: '#666', marginBottom: '10px' }}>
          Live stream of internal reasoning conflicts...
        </div>

        {/* Node Conflict Log */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {leak.nodeConflicts.map((conflict, idx) => (
            <div key={idx} style={{
              marginBottom: '8px',
              padding: '8px',
              background: conflict.severity === 'HIGH' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 255, 0.05)',
              borderLeft: `3px solid ${conflict.severity === 'HIGH' ? '#FF0000' : '#FF00FF'}`
            }}>
              <div style={{ color: '#FF00FF', fontWeight: 'bold' }}>
                Node {conflict.nodeId} vs Node {conflict.conflictingNode}
              </div>
              <div style={{ color: '#999', marginTop: '4px' }}>
                {conflict.reasoning}
              </div>
              <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
                {new Date(conflict.timestamp).toISOString()}
              </div>
            </div>
          ))}
        </div>

        {/* Raw Output */}
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: '4px',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <div style={{ color: '#666', marginBottom: '5px' }}>RAW OUTPUT:</div>
          {leak.rawOutput.map((line, idx) => (
            <div key={idx} style={{ color: '#00FF00', fontSize: '10px' }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* PANEL 3: THE MUTATION - Chaos Injection Sandbox */}
      <div className="panel mutation" style={{
        padding: '20px',
        borderRight: '1px solid #333',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#FF4500', marginBottom: '15px', borderBottom: '2px solid #FF4500' }}>
          THE MUTATION: CHAOS INJECTION
        </h3>

        {/* Chaos Level */}
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(255, 69, 0, 0.1)',
          borderRadius: '8px',
          border: '1px solid #FF4500'
        }}>
          <div style={{ color: '#FF4500', fontSize: '14px', marginBottom: '5px' }}>
            Chaos Level: {mutation.chaosLevel}%
          </div>
          <div style={{
            width: '100%',
            height: '20px',
            background: '#333',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${mutation.chaosLevel}%`,
              height: '100%',
              background: `linear-gradient(90deg, #FF4500, #FF0000)`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Injected Chaos List */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: '#FF4500', fontSize: '14px', marginBottom: '10px' }}>
            Injected Chaos from Foundations:
          </div>
          {mutation.injectedChaos.map((chaos, idx) => (
            <div key={idx} style={{
              marginBottom: '8px',
              padding: '10px',
              background: 'rgba(255, 69, 0, 0.05)',
              border: '1px solid #FF4500',
              borderRadius: '4px'
            }}>
              <div style={{ color: '#FF4500', fontSize: '12px', fontWeight: 'bold' }}>
                {chaos.source}
              </div>
              <div style={{ color: '#999', fontSize: '11px', marginTop: '4px' }}>
                {chaos.description}
              </div>
              <div style={{ color: '#666', fontSize: '10px' }}>
                Impact: {chaos.impact}
              </div>
            </div>
          ))}
        </div>

        {/* Foundation Data Preview */}
        <div style={{
          padding: '15px',
          background: '#0a0a0a',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div style={{ color: '#FF4500', fontSize: '12px', marginBottom: '10px' }}>
            Foundation Data Stream:
          </div>
          <pre style={{ color: '#999', fontSize: '10px', overflow: 'auto' }}>
            {JSON.stringify(mutation.foundationData, null, 2)}
          </pre>
        </div>
      </div>

      {/* PANEL 4: REGENERATION - System Memory Visualization */}
      <div className="panel regeneration" style={{
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h3 style={{ color: '#50C878', marginBottom: '15px', borderBottom: '2px solid #50C878' }}>
          REGENERATION: AUTONOMOUS LIVER
        </h3>

        {/* Liver Health Visualization */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '20px',
          height: '150px',
          position: 'relative'
        }}>
          {/* Animated Liver */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: `radial-gradient(circle, #50C878 0%, #228B22 100%)`,
            boxShadow: `0 0 ${regeneration.liverHealth / 2}px #50C878`,
            animation: 'pulse 2s infinite',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#FFF',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {regeneration.liverHealth}%
          </div>
        </div>

        {/* Regeneration Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            padding: '10px',
            background: 'rgba(80, 200, 120, 0.1)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#50C878', fontSize: '20px', fontWeight: 'bold' }}>
              {regeneration.bobFactorHits}
            </div>
            <div style={{ color: '#666', fontSize: '11px' }}>
              Bob Factor Hits
            </div>
          </div>
          <div style={{
            padding: '10px',
            background: 'rgba(80, 200, 120, 0.1)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#50C878', fontSize: '20px', fontWeight: 'bold' }}>
              {regeneration.regenerationCycles}
            </div>
            <div style={{ color: '#666', fontSize: '11px' }}>
              Cycles
            </div>
          </div>
        </div>

        {/* Memory Artifacts */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: '#50C878', fontSize: '14px', marginBottom: '10px' }}>
            Memory Artifacts:
          </div>
          {regeneration.memoryArtifacts.map((artifact, idx) => (
            <div key={idx} style={{
              marginBottom: '8px',
              padding: '10px',
              background: 'rgba(80, 200, 120, 0.05)',
              borderLeft: '3px solid #50C878',
              borderRadius: '4px'
            }}>
              <div style={{ color: '#50C878', fontSize: '12px' }}>
                {artifact.type}
              </div>
              <div style={{ color: '#666', fontSize: '10px' }}>
                {new Date(artifact.timestamp).toISOString()}
              </div>
            </div>
          ))}
        </div>

        {/* Regeneration Status */}
        <div style={{
          padding: '15px',
          background: 'rgba(80, 200, 120, 0.1)',
          borderRadius: '8px',
          border: '1px solid #50C878'
        }}>
          <div style={{ color: '#50C878', fontSize: '12px', marginBottom: '5px' }}>
            Status: {regeneration.liverHealth > 80 ? 'HEALTHY' : 'REGENERATING'}
          </div>
          <div style={{ color: '#666', fontSize: '11px' }}>
            Next Cycle: {new Date(regeneration.nextDetoxCycle).toISOString()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QuadrupleExposure;