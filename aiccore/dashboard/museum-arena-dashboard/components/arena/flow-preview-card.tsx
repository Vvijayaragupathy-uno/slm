"use client"

import { cn } from "@/lib/utils"

interface FlowNode {
  id: string
  label: string
  type: "input" | "process" | "output" | "llm"
  x: number
  y: number
}

interface FlowEdge {
  from: string
  to: string
}

interface FlowPreviewProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
  className?: string
}

const nodeColors: Record<FlowNode["type"], { bg: string; border: string; text: string }> = {
  input: { bg: "fill-sky-500/15", border: "stroke-sky-500/40", text: "fill-sky-300" },
  process: { bg: "fill-violet-500/15", border: "stroke-violet-500/40", text: "fill-violet-300" },
  output: { bg: "fill-emerald-500/15", border: "stroke-emerald-500/40", text: "fill-emerald-300" },
  llm: { bg: "fill-amber-500/15", border: "stroke-amber-500/40", text: "fill-amber-300" },
}

export function FlowPreviewCard({ nodes, edges, className }: FlowPreviewProps) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg bg-secondary/50 ring-1 ring-border", className)}>
      <svg viewBox="0 0 280 120" className="h-full w-full" aria-hidden="true">
        {/* Grid dots */}
        <defs>
          <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" className="fill-muted-foreground/20" />
          </pattern>
        </defs>
        <rect width="280" height="120" fill="url(#grid-dots)" />

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodeMap[edge.from]
          const to = nodeMap[edge.to]
          if (!from || !to) return null

          const fromX = (from.x || 0) + 36
          const fromY = (from.y || 0) + 12
          const toX = to.x || 0
          const toY = (to.y || 0) + 12
          const midX = (fromX + toX) / 2

          return (
            <path
              key={i}
              d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
              fill="none"
              className="stroke-primary/30"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          // Provide default type if missing
          const nodeType = node.type || "process"
          const colors = nodeColors[nodeType as keyof typeof nodeColors] || nodeColors.process

          // Provide default coordinates if missing
          const x = node.x || 0
          const y = node.y || 0

          return (
            <g key={node.id}>
              <rect
                x={x}
                y={y}
                width="72"
                height="24"
                rx="6"
                className={cn(colors.bg, colors.border)}
                strokeWidth="1"
              />
              <text
                x={x + 36}
                y={y + 15}
                textAnchor="middle"
                className={cn("text-[7px] font-medium", colors.text)}
              >
                {node.label || "Node"}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
