import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Background,
  Controls,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NODE_TYPES } from './SDNodeTypes'
import { canvasChanged } from '../../store/slices/sdSessionSlice'

let nodeIdCounter = 1
function makeNodeId() {
  return `node-${Date.now()}-${nodeIdCounter++}`
}

function LockedCanvasOverlay() {
  const { t } = useTranslation()
  return (
    <div className="flex-1 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Lock className="w-10 h-10" />
        <p className="text-sm font-medium">{t('sdRoom.canvasLockedMessage')}</p>
      </div>
    </div>
  )
}

function SDCanvasInner({ savedJSON, dispatch }) {
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState(savedJSON?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedJSON?.edges ?? [])

  useEffect(() => {
    if (savedJSON) {
      setNodes(savedJSON.nodes ?? [])
      setEdges(savedJSON.edges ?? [])
    }
  }, []) // only on mount

  const dispatchChange = useCallback(
    (newNodes, newEdges) => {
      dispatch(canvasChanged({ nodes: newNodes, edges: newEdges }))
    },
    [dispatch]
  )

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      setNodes((nds) => {
        dispatchChange(nds, edges)
        return nds
      })
    },
    [onNodesChange, setNodes, edges, dispatchChange]
  )

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      setEdges((eds) => {
        dispatchChange(nodes, eds)
        return eds
      })
    },
    [onEdgesChange, setEdges, nodes, dispatchChange]
  )

  const handleConnect = useCallback(
    (params) => {
      const label = window.prompt('Edge label (optional):', '') ?? ''
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, label, animated: false }, eds)
        dispatchChange(nodes, newEdges)
        return newEdges
      })
    },
    [setEdges, nodes, dispatchChange]
  )

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('nodeType')
      if (!type) return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })

      const newNode = {
        id: makeNodeId(),
        type,
        position,
        data: { label: type.replace(/([A-Z])/g, ' $1').trim() },
      }

      setNodes((nds) => {
        const updated = [...nds, newNode]
        dispatchChange(updated, edges)
        return updated
      })
    },
    [setNodes, edges, dispatchChange, screenToFlowPosition]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}

export default function SDCanvas({ isLocked }) {
  const dispatch = useDispatch()
  const savedJSON = useSelector((s) => s.sdSession.architectureJSON)

  if (isLocked) return <LockedCanvasOverlay />

  return (
    <div className="flex-1 h-full">
      <ReactFlowProvider>
        <SDCanvasInner savedJSON={savedJSON} dispatch={dispatch} />
      </ReactFlowProvider>
    </div>
  )
}
