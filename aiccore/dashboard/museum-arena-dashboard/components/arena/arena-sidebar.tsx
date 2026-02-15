"use client"

import {
  LayoutDashboard,
  Trophy,
  ClipboardCheck,
  Settings,
  Users,
  Cpu,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArenaSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems = [
  { id: "live", label: "Spectator Deck", icon: LayoutDashboard },
  { id: "mosaic", label: "Mosaic Arena", icon: Trophy },
  { id: "review", label: "Curator Review", icon: ClipboardCheck },
]

const bottomItems = [
  { id: "contestants", label: "Arena Registry", icon: Users },
  { id: "stations", label: "Station Status", icon: Cpu },
  { id: "settings", label: "Arena Config", icon: Settings },
]

export function ArenaSidebar({ activeTab, onTabChange }: ArenaSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border glass-strong h-full" role="navigation" aria-label="Main navigation">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-wide text-foreground">Arena</span>
          <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">DASHBOARD</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/50 uppercase px-2 pb-2 pt-1">
          Main
        </span>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}

        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/50 uppercase px-2 pb-2 pt-5">
          Arena Control
        </span>
        {bottomItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2.5 ring-1 ring-primary/10">
          <Trophy className="h-4 w-4 text-amber-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground">Arena Lifecycle</span>
            <span className="text-xs font-mono font-semibold text-foreground">Active Round</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
