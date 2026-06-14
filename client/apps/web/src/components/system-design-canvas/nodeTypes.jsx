import { Handle, Position } from '@xyflow/react'
import {
  Archive,
  Box,
  Cpu,
  Database,
  Globe,
  Layers,
  MessageSquare,
  Monitor,
  Network,
  Server,
  Zap,
} from 'lucide-react'

function BaseNode({ data, borderColor, Icon }) {
  return (
    <div className={`bg-card border-2 ${borderColor} rounded-lg px-3 py-2 min-w-[100px] shadow-sm`}>
      <Handle type="source" id="top" position={Position.Top} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" id="right" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" id="left" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
      <div className="flex flex-col items-center gap-1">
        <Icon className="w-5 h-5 text-slate-400" />
        {data.editing ? (
          <input
            autoFocus
            defaultValue={data.label}
            className="w-full border-b border-slate-400 bg-transparent text-center text-xs text-foreground outline-none"
            onBlur={(event) => data.onLabelChange?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.target.blur()
              if (event.key === 'Escape') {
                data.onLabelChange?.(data.label)
                event.target.blur()
              }
            }}
          />
        ) : (
          <span className="text-center text-xs font-medium leading-tight text-foreground">
            {data.label}
          </span>
        )}
      </div>
    </div>
  )
}

export const NODE_TYPES = {
  Client: (props) => <BaseNode {...props} borderColor="border-gray-400" Icon={Monitor} />,
  LoadBalancer: (props) => <BaseNode {...props} borderColor="border-blue-500" Icon={Layers} />,
  APIGateway: (props) => <BaseNode {...props} borderColor="border-blue-500" Icon={Network} />,
  CDN: (props) => <BaseNode {...props} borderColor="border-blue-500" Icon={Globe} />,
  WebServer: (props) => <BaseNode {...props} borderColor="border-green-500" Icon={Server} />,
  Worker: (props) => <BaseNode {...props} borderColor="border-green-500" Icon={Cpu} />,
  DatabaseSQL: (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Database} />,
  DatabaseNoSQL: (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Database} />,
  Cache: (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Zap} />,
  ObjectStorage: (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Archive} />,
  MessageQueue: (props) => <BaseNode {...props} borderColor="border-purple-500" Icon={MessageSquare} />,
  ExternalService: (props) => <BaseNode {...props} borderColor="border-gray-400" Icon={Box} />,
}

export const NODE_LIBRARY = [
  { category: 'clients', items: [{ type: 'Client', label: 'Client' }] },
  {
    category: 'infrastructure',
    items: [
      { type: 'LoadBalancer', label: 'Load Balancer' },
      { type: 'APIGateway', label: 'API Gateway' },
      { type: 'CDN', label: 'CDN' },
    ],
  },
  {
    category: 'compute',
    items: [
      { type: 'WebServer', label: 'Web Server' },
      { type: 'Worker', label: 'Worker' },
    ],
  },
  {
    category: 'storage',
    items: [
      { type: 'DatabaseSQL', label: 'Database (SQL)' },
      { type: 'DatabaseNoSQL', label: 'Database (NoSQL)' },
      { type: 'Cache', label: 'Cache (Redis)' },
      { type: 'ObjectStorage', label: 'Object Storage (S3)' },
    ],
  },
  { category: 'messaging', items: [{ type: 'MessageQueue', label: 'Message Queue' }] },
  { category: 'external', items: [{ type: 'ExternalService', label: 'External Service' }] },
]
