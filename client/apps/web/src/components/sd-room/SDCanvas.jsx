import { useCallback, useEffect, useRef } from 'react'
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

function SDCanvasInner({ savedJSON, dispatch, isViewOnly }) {
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState(savedJSON?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedJSON?.edges ?? [])
  const edgesRef = useRef(edges)

  useEffect(() => { edgesRef.current = edges }, [edges])

  useEffect(() => {
    if (savedJSON) {
      setNodes(savedJSON.nodes ?? [])
      setEdges(savedJSON.edges ?? [])
    }
  }, []) // only on mount

  const dispatchChange = useCallback(
    (newNodes, newEdges) => {
      // Strip transient UI state before persisting
      const clean = newNodes.map(({ data: { editing: _e, onLabelChange: _f, ...restData }, ...rest }) => ({
        ...rest,
        data: restData,
      }))
      dispatch(canvasChanged({ nodes: clean, edges: newEdges }))
    },
    [dispatch]
  )

  const handleLabelChange = useCallback(
    (nodeId, newLabel) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, label: newLabel.trim() || n.data.label, editing: false, onLabelChange: undefined } }
            : n
        )
        dispatchChange(updated, edgesRef.current)
        return updated
      })
    },
    [setNodes, dispatchChange]
  )

  const handleNodeDoubleClick = useCallback(
    (event, node) => {
      if (isViewOnly) return
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, editing: true, onLabelChange: (newLabel) => handleLabelChange(node.id, newLabel) } }
            : { ...n, data: { ...n.data, editing: false, onLabelChange: undefined } }
        )
      )
    },
    [setNodes, handleLabelChange, isViewOnly]
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
      if (isViewOnly) return
      const label = window.prompt('Edge label (optional):', '') ?? ''
      setEdges((eds) => {
        const newEdges = addEdge({ ...params, label, animated: false }, eds)
        dispatchChange(nodes, newEdges)
        return newEdges
      })
    },
    [setEdges, nodes, dispatchChange, isViewOnly]
  )

  const handleDrop = useCallback(
    (event) => {
      if (isViewOnly) return
      event.preventDefault()
      const type = event.dataTransfer.getData('nodeType')
      if (!type) return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })

      const newId = makeNodeId()
      const newNode = {
        id: newId,
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
    [setNodes, edges, dispatchChange, screenToFlowPosition, isViewOnly]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={isViewOnly ? undefined : handleNodesChange}
      onEdgesChange={isViewOnly ? undefined : handleEdgesChange}
      onConnect={isViewOnly ? undefined : handleConnect}
      onDrop={isViewOnly ? undefined : handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onNodeDoubleClick={isViewOnly ? undefined : handleNodeDoubleClick}
      nodesDraggable={!isViewOnly}
      nodesConnectable={!isViewOnly}
      elementsSelectable={!isViewOnly}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}

export default function SDCanvas({ isLocked, isViewOnly }) {
  const dispatch = useDispatch()
  const savedJSON = useSelector((s) => s.sdSession.architectureJSON)

  if (isLocked) return <LockedCanvasOverlay />

  return (
    <div className="flex-1 h-full">
      <ReactFlowProvider>
        <SDCanvasInner savedJSON={savedJSON} dispatch={dispatch} isViewOnly={isViewOnly} />
      </ReactFlowProvider>
    </div>
  )
}
