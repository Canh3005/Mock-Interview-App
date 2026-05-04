import { useMemo } from 'react'
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Monitor, Layers, Cpu, Server, Database, Zap,
  Archive, MessageSquare, Globe, Network, Box,
} from 'lucide-react'

const NODE_ICON_MAP = {
  Client:        { Icon: Monitor,        borderColor: 'border-gray-400' },
  LoadBalancer:  { Icon: Layers,         borderColor: 'border-blue-500' },
  APIGateway:    { Icon: Network,        borderColor: 'border-blue-500' },
  CDN:           { Icon: Globe,          borderColor: 'border-blue-500' },
  WebServer:     { Icon: Server,         borderColor: 'border-green-500' },
  Worker:        { Icon: Cpu,            borderColor: 'border-green-500' },
  DatabaseSQL:   { Icon: Database,       borderColor: 'border-yellow-500' },
  DatabaseNoSQL: { Icon: Database,       borderColor: 'border-yellow-500' },
  Cache:         { Icon: Zap,            borderColor: 'border-yellow-500' },
  ObjectStorage: { Icon: Archive,        borderColor: 'border-yellow-500' },
  MessageQueue:  { Icon: MessageSquare,  borderColor: 'border-purple-500' },
  ExternalService: { Icon: Box,          borderColor: 'border-gray-400' },
}

export function computeHighlights(candidateNodes, candidateEdges, refNodes, refEdges) {
  const candidateTypes = new Set(candidateNodes.map((n) => (n.type ?? '').toLowerCase()))

  const nodeHighlights = {}
  for (const n of refNodes) {
    nodeHighlights[n.id] = candidateTypes.has((n.type ?? '').toLowerCase()) ? 'green' : 'red'
  }

  const refNodeTypeMap = Object.fromEntries(refNodes.map((n) => [n.id, (n.type ?? '').toLowerCase()]))
  const refEdgePairs = new Set(
    refEdges.map((e) => `${refNodeTypeMap[e.from ?? e.source]}→${refNodeTypeMap[e.to ?? e.target]}`),
  )
  const candidateNodeTypeMap = Object.fromEntries(
    candidateNodes.map((n) => [n.id, (n.type ?? '').toLowerCase()]),
  )
  const edgeHighlights = {}
  for (const e of candidateEdges) {
    const id = `e-${e.from ?? e.source}-${e.to ?? e.target}`
    const pair = `${candidateNodeTypeMap[e.source ?? e.from]}→${candidateNodeTypeMap[e.target ?? e.to]}`
    edgeHighlights[id] = refEdgePairs.has(pair) ? 'green' : 'yellow'
  }

  return { nodeHighlights, edgeHighlights }
}

function _computeLayout(nodes, edges) {
  const children = Object.fromEntries(nodes.map((n) => [n.id, []]))
  const inDegree = Object.fromEntries(nodes.map((n) => [n.id, 0]))
  for (const e of edges) {
    const src = e.from ?? e.source
    const tgt = e.to ?? e.target
    children[src]?.push(tgt)
    if (inDegree[tgt] !== undefined) inDegree[tgt]++
  }
  const layer = {}
  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id)
  queue.forEach((id) => (layer[id] = 0))
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    for (const childId of children[id] ?? []) {
      layer[childId] = Math.max(layer[childId] ?? 0, layer[id] + 1)
      queue.push(childId)
    }
  }
  const layerCounts = {}
  const NODE_W = 160
  const NODE_H = 100
  return nodes.map((n) => {
    const l = layer[n.id] ?? 0
    const idx = layerCounts[l] ?? 0
    layerCounts[l] = idx + 1
    return { ...n, position: { x: l * (NODE_W + 40), y: idx * (NODE_H + 20) } }
  })
}

function _HighlightableNode({ data }) {
  const ringClass = { green: 'ring-2 ring-offset-1 ring-green-500', red: 'ring-2 ring-offset-1 ring-red-500' }[data.highlightStatus] ?? ''
  const { Icon, borderColor } = NODE_ICON_MAP[data.nodeType] ?? { Icon: Box, borderColor: 'border-gray-400' }
  return (
    <div className={`bg-card border-2 ${borderColor} rounded-lg px-3 py-2 min-w-[100px] shadow-sm ${ringClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex flex-col items-center gap-1">
        <Icon className="w-5 h-5 text-slate-400" />
        <span className="text-xs text-center text-foreground font-medium leading-tight">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  )
}

const NODE_TYPES = { highlightable: _HighlightableNode }

export default function ReferenceCanvas({ nodes = [], edges = [], nodeHighlights, edgeHighlights, title }) {
  const rfNodes = useMemo(
    () => _computeLayout(nodes, edges).map((n) => ({
      id: n.id,
      type: 'highlightable',
      position: n.position,
      data: { label: n.label, nodeType: n.type, highlightStatus: nodeHighlights?.[n.id] },
    })),
    [nodes, edges, nodeHighlights],
  )

  const rfEdges = useMemo(
    () => edges.map((e) => {
      const id = `e-${e.from ?? e.source}-${e.to ?? e.target}`
      const hl = edgeHighlights?.[id]
      return {
        id,
        source: String(e.from ?? e.source),
        target: String(e.to ?? e.target),
        label: e.label,
        style: { stroke: hl === 'yellow' ? '#f59e0b' : hl === 'green' ? '#22c55e' : '#94a3b8' },
        labelStyle: { fontSize: 10 },
      }
    }),
    [edges, edgeHighlights],
  )

  return (
    <div className="h-[360px] w-full border border-slate-700 rounded-lg overflow-hidden">
      <p className="text-xs font-medium px-3 py-1.5 border-b border-slate-700 text-slate-400 bg-slate-900">{title}</p>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
