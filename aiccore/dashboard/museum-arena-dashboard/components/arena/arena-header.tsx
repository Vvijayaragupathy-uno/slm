"use client"

import { Activity, Radio, Shield, Zap } from "lucide-react"

export function ArenaHeader({ stationCount = 8 }: { stationCount?: number }) {
  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-wide text-foreground">
                  AICCORE
                </span>
                <span className="text-muted-foreground text-xs font-light">|</span>
                <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                  Museum Agent Arena
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider uppercase">
                Command Center v1.0
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 ring-1 ring-border">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse-glow" />
            <span className="text-xs font-medium text-emerald-400">ACTIVE</span>
            <span className="text-xs text-muted-foreground font-mono">{stationCount} stations</span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 ring-1 ring-border">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-muted-foreground font-mono">Arena Challenge #1</span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 ring-1 ring-primary/20">
            <Radio className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
            <span className="text-xs font-medium text-primary">BROADCASTING</span>
          </div>
        </div>
      </div>
    </header>
  )
}
