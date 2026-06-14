import { useCallback, useEffect, useRef } from 'react'
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NODE_TYPES } from './nodeTypes'

let nodeIdCounter = 1
function makeNodeId() {
  return `node-${Date.now()}-${nodeIdCounter++}`
}

function cleanNodes(nodes) {
  return nodes.map(({ data, ...rest }) => {
    const { editing: _editing, onLabelChange: _onLabelChange, ...restData } = data ?? {}
    return { ...rest, data: restData }
  })
}

function LockedCanvasOverlay() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Lock className="h-10 w-10" />
        <p className="text-sm font-medium">{t('sdRoom.canvasLockedMessage')}</p>
      </div>
    </div>
  )
}

function CanvasInner({ value, onChange, isViewOnly }) {
  const { screenToFlowPosition } = useReactFlow()
  const { t } = useTranslation()
  const initialValueRef = useRef(value)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialValueRef.current?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialValueRef.current?.edges ?? [])
  const edgesRef = useRef(edges)
  const nodesRef = useRef(nodes)

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const emitChange = useCallback(
    (nextNodes, nextEdges) => {
      onChange?.({ nodes: cleanNodes(nextNodes), edges: nextEdges })
    },
    [onChange],
  )

  const handleLabelChange = useCallback(
    (nodeId, newLabel) => {
      setNodes((current) => {
        const updated = current.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: newLabel.trim() || node.data.label,
                  editing: false,
                  onLabelChange: undefined,
                },
              }
            : node,
        )
        emitChange(updated, edgesRef.current)
        return updated
      })
    },
    [emitChange, setNodes],
  )

  const handleNodeDoubleClick = useCallback(
    (_event, node) => {
      if (isViewOnly) return
      setNodes((current) =>
        current.map((item) =>
          item.id === node.id
            ? {
                ...item,
                data: {
                  ...item.data,
                  editing: true,
                  onLabelChange: (newLabel) => handleLabelChange(node.id, newLabel),
                },
              }
            : { ...item, data: { ...item.data, editing: false, onLabelChange: undefined } },
        ),
      )
    },
    [handleLabelChange, isViewOnly, setNodes],
  )

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      setNodes((current) => {
        emitChange(current, edgesRef.current)
        return current
      })
    },
    [emitChange, onNodesChange, setNodes],
  )

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      setEdges((current) => {
        emitChange(nodesRef.current, current)
        return current
      })
    },
    [emitChange, onEdgesChange, setEdges],
  )

  const handleConnect = useCallback(
    (params) => {
      if (isViewOnly) return
      const label = window.prompt(t('sdRoom.edgeLabelPrompt'), '') ?? ''
      setEdges((current) => {
        const parallelCount = current.filter(
          (edge) =>
            (edge.source === params.source && edge.target === params.target) ||
            (edge.source === params.target && edge.target === params.source),
        ).length
        const nextEdge = {
          ...params,
          id: `edge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'bezier',
          label,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          pathOptions: { curvature: 0.25 + parallelCount * 0.4 },
        }
        const updated = [...current, nextEdge]
        emitChange(nodesRef.current, updated)
        return updated
      })
    },
    [emitChange, isViewOnly, setEdges, t],
  )

  const handleDrop = useCallback(
    (event) => {
      if (isViewOnly) return
      event.preventDefault()
      const type = event.dataTransfer.getData('nodeType')
      if (!type) return

      const newNode = {
        id: makeNodeId(),
        type,
        position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        data: { label: type.replace(/([A-Z])/g, ' $1').trim() },
      }

      setNodes((current) => {
        const updated = [...current, newNode]
        emitChange(updated, edgesRef.current)
        return updated
      })
    },
    [emitChange, isViewOnly, screenToFlowPosition, setNodes],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={isViewOnly ? undefined : handleNodesChange}
      onEdgesChange={isViewOnly ? undefined : handleEdgesChange}
      onConnect={isViewOnly ? undefined : handleConnect}
      connectionMode={ConnectionMode.Loose}
      onDrop={isViewOnly ? undefined : handleDrop}
      onDragOver={(event) => event.preventDefault()}
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

export default function SystemDesignCanvas({ value, isLocked, isViewOnly, onChange }) {
  if (isLocked) return <LockedCanvasOverlay />

  return (
    <div className="h-full flex-1">
      <ReactFlowProvider>
        <CanvasInner value={value} onChange={onChange} isViewOnly={isViewOnly} />
      </ReactFlowProvider>
    </div>
  )
}
