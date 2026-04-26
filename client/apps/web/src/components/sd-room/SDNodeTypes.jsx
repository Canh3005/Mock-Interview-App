import { Handle, Position } from '@xyflow/react'
import {
  Monitor,
  Layers,
  Cpu,
  Server,
  Database,
  Zap,
  Archive,
  MessageSquare,
  Globe,
  Network,
  Box,
} from 'lucide-react'

function BaseNode({ data, borderColor, Icon }) {
  const [label, setLabel] = data.__setLabel
    ? [data.label, data.__setLabel]
    : [data.label, null]

  return (
    <div className={`bg-card border-2 ${borderColor} rounded-lg px-3 py-2 min-w-[100px] shadow-sm`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex flex-col items-center gap-1">
        <Icon className="w-5 h-5 text-slate-400" />
        {data.editing ? (
          <input
            autoFocus
            defaultValue={data.label}
            className="text-xs text-center bg-transparent border-b border-slate-400 outline-none text-foreground w-full"
            onBlur={(e) => data.onLabelChange?.(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
          />
        ) : (
          <span className="text-xs text-center text-foreground font-medium leading-tight">
            {data.label}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  )
}

export const ClientNode = (props) => <BaseNode {...props} borderColor="border-gray-400" Icon={Monitor} />
export const LoadBalancerNode = (props) => <BaseNode {...props} borderColor="border-blue-500" Icon={Layers} />
export const APIGatewayNode = (props) => <BaseNode {...props} borderColor="border-blue-500" Icon={Network} />
export const CDNNode = (props) => <BaseNode {...props} borderColor="border-blue-500" Icon={Globe} />
export const WebServerNode = (props) => <BaseNode {...props} borderColor="border-green-500" Icon={Server} />
export const WorkerNode = (props) => <BaseNode {...props} borderColor="border-green-500" Icon={Cpu} />
export const DatabaseSQLNode = (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Database} />
export const DatabaseNoSQLNode = (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Database} />
export const CacheNode = (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Zap} />
export const ObjectStorageNode = (props) => <BaseNode {...props} borderColor="border-yellow-500" Icon={Archive} />
export const MessageQueueNode = (props) => <BaseNode {...props} borderColor="border-purple-500" Icon={MessageSquare} />
export const ExternalServiceNode = (props) => <BaseNode {...props} borderColor="border-gray-400" Icon={Box} />

export const NODE_TYPES = {
  Client: ClientNode,
  LoadBalancer: LoadBalancerNode,
  APIGateway: APIGatewayNode,
  CDN: CDNNode,
  WebServer: WebServerNode,
  Worker: WorkerNode,
  DatabaseSQL: DatabaseSQLNode,
  DatabaseNoSQL: DatabaseNoSQLNode,
  Cache: CacheNode,
  ObjectStorage: ObjectStorageNode,
  MessageQueue: MessageQueueNode,
  ExternalService: ExternalServiceNode,
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
