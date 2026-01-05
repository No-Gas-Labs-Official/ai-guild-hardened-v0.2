'use client'

import { useState, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from 'reactflow'
import 'reactflow/dist/style.css'

import BlockPalette from '../components/BlockPalette'
import WalletConnect from '../components/WalletConnect'
import ExecutionPanel from '../components/ExecutionPanel'
import MonacoEditor from '../components/MonacoEditor'
import { useFlashwareStore } from '../lib/store'
import { generateMoveCode } from '../lib/moveGenerator'
import { validateFlow } from '../lib/validation'

import BorrowNode from '../components/nodes/BorrowNode'
import SwapNode from '../components/nodes/SwapNode'
import RepayNode from '../components/nodes/RepayNode'

const nodeTypes = {
  borrow: BorrowNode,
  swap: SwapNode,
  repay: RepayNode,
}

const initialNodes: Node[] = []
const initialEdges: Edge[] = []

export default function FlashwareCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [showCode, setShowCode] = useState(false)
  
  const { 
    walletConnected, 
    selectedBlocks,
    moveCode,
    setMoveCode,
    addBlock,
    updateNode
  } = useFlashwareStore()

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')

      if (typeof type === 'undefined' || !type) {
        return
      }

      const position = {
        x: event.clientX - reactFlowBounds.left - 75,
        y: event.clientY - reactFlowBounds.top - 40,
      }

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: type.charAt(0).toUpperCase() + type.slice(1),
          parameters: {}
        },
      }

      setNodes((nds) => nds.concat(newNode))
      addBlock(type)
    },
    [setNodes, addBlock]
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handlePreviewCode = () => {
    const validation = validateFlow(nodes, edges)
    if (!validation.isValid) {
      alert(`Flow validation error: ${validation.error}`)
      return
    }

    const code = generateMoveCode(nodes, edges)
    setMoveCode(code)
    setShowCode(true)
  }

  const handleNodeUpdate = (nodeId: string, parameters: any) => {
    updateNode(nodeId, parameters)
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, parameters } }
          : node
      )
    )
  }

  return (
    <div className="w-screen h-screen bg-slate-950 flex">
      {/* Left Sidebar - Block Palette */}
      <div className="w-64 bg-slate-900 border-r border-cyan-400/30 p-4">
        <h2 className="cyber-text text-xl font-bold mb-6">Flashware Builder</h2>
        <WalletConnect />
        <BlockPalette />
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative" onDrop={handleDrop} onDragOver={handleDragOver}>
        <ReactFlow
          nodes={nodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onParameterChange: (params: any) => handleNodeUpdate(node.id, params)
            }
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950"
        >
          <Background color="#06b6d4" gap={16} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'borrow': return '#10b981'
                case 'swap': return '#a855f7'
                case 'repay': return '#f59e0b'
                default: return '#06b6d4'
              }
            }}
            maskColor="rgba(15, 23, 42, 0.8)"
          />
        </ReactFlow>

        {/* Execution Panel */}
        <div className="absolute bottom-4 left-4 right-4">
          <ExecutionPanel 
            onPreviewCode={handlePreviewCode}
            nodes={nodes}
            edges={edges}
          />
        </div>
      </div>

      {/* Code Preview Modal */}
      {showCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="w-full max-w-6xl h-full max-h-[80vh] bg-slate-900 rounded-lg border border-cyan-400/30 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="cyber-text text-xl font-bold">Generated Move Code</h3>
              <button
                onClick={() => setShowCode(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Close
              </button>
            </div>
            <MonacoEditor code={moveCode} />
          </div>
        </div>
      )}
    </div>
  )
}