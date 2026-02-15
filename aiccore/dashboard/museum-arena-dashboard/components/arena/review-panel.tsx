import { useState, useEffect } from "react"
import {
  CheckCircle2,
  Trophy,
  Clock,
  User,
  Monitor,
  Sparkles,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlowPreviewCard } from "./flow-preview-card"
import { cn } from "@/lib/utils"

interface Submission {
  id: string
  nickname: string
  station: number
  submittedAt: string
  flowName: string
  description: string
  approved: boolean
  winner: boolean
  nodes: any[]
  edges: any[]
}

export function ReviewPanel() {
  const [items, setItems] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("http://localhost:7860/api/v1/aiccore/submissions")
      const data = await response.json()

      const mapped: Submission[] = data.map((d: any) => ({
        id: d.id,
        nickname: d.nickname,
        station: d.station_id || 0,
        submittedAt: new Date(d.submitted_at).toLocaleTimeString(),
        flowName: d.flow_snapshot?.name || "Agent Prototype",
        description: d.flow_snapshot?.description || "Custom agent flow developed during session.",
        approved: d.is_winner || false,
        winner: d.is_winner,
        nodes: (d.flow_snapshot?.nodes || []).map((n: any) => ({
          id: n.id,
          label: n.data?.label || n.id,
          type: n.type || (n.data?.type) || "process",
          x: n.position?.x || n.x || 0,
          y: n.position?.y || n.y || 0
        })),
        edges: (d.flow_snapshot?.edges || []).map((e: any) => ({
          from: e.source || e.from,
          to: e.target || e.to
        }))
      }))

      setItems(mapped)
    } catch (error) {
      console.error("Failed to fetch submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
    const interval = setInterval(fetchSubmissions, 5000)
    return () => clearInterval(interval)
  }, [])

  function handleApprove(id: string) {
    // Local UI update for approval (could be backend field later)
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, approved: true } : s))
    )
  }

  async function handlePublishWinner(id: string) {
    try {
      const res = await fetch(`http://localhost:7860/api/v1/aiccore/submissions/${id}/winner`, {
        method: "POST"
      })
      if (res.ok) {
        fetchSubmissions() // Refresh list
      }
    } catch (error) {
      console.error("Failed to mark winner:", error)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center gap-4 mb-1">
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Submissions</span>
          <span className="text-xs font-mono font-semibold text-foreground">{items.length}</span>
        </div>
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs text-muted-foreground">Approved</span>
          <span className="text-xs font-mono font-semibold text-foreground">
            {items.filter((s) => s.approved).length}
          </span>
        </div>
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-muted-foreground">Winner</span>
          <span className="text-xs font-mono font-semibold text-foreground">
            {items.find((s) => s.winner)?.nickname ?? "---"}
          </span>
        </div>
      </div>

      {/* Submissions Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {loading && items.length === 0 && (
          <div className="col-span-full flex items-center justify-center p-12 text-muted-foreground text-sm uppercase tracking-widest animate-pulse">
            Awaiting Submissions...
          </div>
        )}
        {items.map((sub) => (
          <div
            key={sub.id}
            className={cn(
              "group relative flex flex-col gap-4 rounded-xl p-4 transition-all duration-300",
              "glass hover:ring-1 hover:ring-primary/20",
              sub.winner && "ring-1 ring-amber-400/30 glow-gold",
              sub.approved && !sub.winner && "ring-1 ring-emerald-400/20"
            )}
          >
            {/* Winner Crown */}
            {sub.winner && (
              <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 ring-1 ring-amber-400/40">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ring-1",
                  sub.winner ? "bg-amber-400/15 text-amber-400 ring-amber-400/30" :
                    sub.approved ? "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30" :
                      "bg-primary/10 text-primary ring-primary/20"
                )}>
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{sub.nickname}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Monitor className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] font-mono text-muted-foreground">Station #{sub.station}</span>
                    </div>
                    <span className="text-muted-foreground/30">|</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground">{sub.submittedAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {sub.approved && (
                <Badge className={cn(
                  "gap-1 rounded-md border-0 px-2 py-0.5 text-[10px] font-semibold tracking-wider ring-1",
                  sub.winner
                    ? "bg-amber-400/10 text-amber-400 ring-amber-400/20"
                    : "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20"
                )}>
                  {sub.winner ? (
                    <>
                      <Trophy className="h-3 w-3" />
                      WINNER
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      APPROVED
                    </>
                  )}
                </Badge>
              )}
            </div>

            {/* Flow Name & Description */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground">{sub.flowName}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-5">{sub.description}</p>
            </div>

            {/* Mini Flow Preview */}
            <FlowPreviewCard
              nodes={sub.nodes}
              edges={sub.edges}
              className="h-28"
            />

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {!sub.approved && (
                <Button
                  size="sm"
                  onClick={() => handleApprove(sub.id)}
                  className="h-8 gap-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25 hover:text-emerald-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold tracking-wide">Approve</span>
                </Button>
              )}
              {!sub.winner && (
                <Button
                  size="sm"
                  onClick={() => handlePublishWinner(sub.id)}
                  className={cn(
                    "h-8 gap-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300",
                    "bg-primary/15 text-primary ring-1 ring-primary/25 hover:bg-primary/25 hover:text-primary",
                    "hover:glow-violet"
                  )}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Publish Winner
                </Button>
              )}
              {sub.winner && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-1.5 ring-1 ring-amber-400/20 glow-gold">
                  <Trophy className="h-3.5 w-3.5 text-amber-400 animate-pulse-glow" />
                  <span className="text-xs font-bold tracking-wider text-amber-400">CHAMPION</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
