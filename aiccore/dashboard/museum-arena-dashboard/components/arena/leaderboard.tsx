import { useState, useEffect } from "react"
import {
  Monitor,
  Cpu,
  FlaskConical,
  Rocket,
  Crown,
  TrendingUp,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StudentStatus = "BUILDING" | "PROTOTYPING" | "TESTING" | "READY"

interface Student {
  id: string
  nickname: string
  station: number
  progress: number
  status: StudentStatus
  score: number
  is_winner: boolean
}

const statusConfig: Record<StudentStatus, {
  color: string
  bgColor: string
  ringColor: string
  icon: typeof Monitor
}> = {
  BUILDING: {
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    ringColor: "ring-sky-400/20",
    icon: Cpu,
  },
  PROTOTYPING: {
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    ringColor: "ring-amber-400/20",
    icon: FlaskConical,
  },
  TESTING: {
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    ringColor: "ring-violet-400/20",
    icon: Monitor,
  },
  READY: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    ringColor: "ring-emerald-400/20",
    icon: Rocket,
  },
}

function ProgressBar({ value, status }: { value: number; status: StudentStatus }) {
  const gradients: Record<StudentStatus, string> = {
    BUILDING: "from-sky-500 to-sky-400",
    PROTOTYPING: "from-amber-500 to-amber-400",
    TESTING: "from-violet-500 to-violet-400",
    READY: "from-emerald-500 to-emerald-400",
  }

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",
          gradients[status],
          status === "READY" && "animate-pulse-glow"
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 ring-1 ring-amber-400/30">
        <Crown className="h-4 w-4 text-amber-400" />
      </div>
    )
  }
  if (rank <= 3) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
        <span className="text-sm font-bold text-primary">{rank}</span>
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary ring-1 ring-border">
      <span className="text-sm font-medium text-muted-foreground">{rank}</span>
    </div>
  )
}

export function Leaderboard({
  onDataUpdate,
  refreshKey
}: {
  onDataUpdate?: (count: number) => void;
  refreshKey?: number;
}) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const response = await fetch(`http://${host}:7860/api/v1/aiccore/leaderboard`)
      const data = await response.json()
      setStudents(data)
      if (onDataUpdate) {
        onDataUpdate(data.length)
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 5000)
    return () => clearInterval(interval)
  }, [])

  // Listen for real-time refresh
  useEffect(() => {
    if (refreshKey !== undefined) {
      fetchLeaderboard()
    }
  }, [refreshKey])

  const avgProgress = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
    : 0

  const readyCount = students.filter(s => s.status === "READY").length

  return (
    <div className="flex flex-col gap-3">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-1">
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs text-muted-foreground">Avg Progress</span>
          <span className="text-xs font-mono font-semibold text-foreground">{avgProgress}%</span>
        </div>
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <Rocket className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Ready</span>
          <span className="text-xs font-mono font-semibold text-foreground">{readyCount} / {students.length || 10}</span>
        </div>
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-muted-foreground">Arena State</span>
          <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-tighter">Live Session</span>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[48px_1fr_100px_1fr_120px_80px_70px] items-center gap-4 px-4 py-2">
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">Rank</span>
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">Contestant</span>
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">Terminal</span>
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">Builder Progress</span>
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">Engagement</span>
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase text-right">Score</span>
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase text-right">Award</span>
      </div>

      {/* Student Rows */}
      <div className="flex flex-col gap-1.5">
        {loading && students.length === 0 && (
          <div className="flex items-center justify-center p-8 text-muted-foreground text-sm uppercase tracking-widest animate-pulse">
            Awaiting Arena Connections...
          </div>
        )}
        {students.map((student, i) => {
          const config = statusConfig[student.status]
          const StatusIcon = config.icon
          const rank = i + 1

          return (
            <div
              key={student.id}
              className={cn(
                "grid grid-cols-[48px_1fr_100px_1fr_120px_80px_70px] items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300",
                "glass hover:ring-1 hover:ring-primary/20",
                rank === 1 && "ring-1 ring-amber-400/20 glow-gold",
                rank <= 3 && rank !== 1 && "ring-1 ring-primary/10"
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <RankBadge rank={rank} />

              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-1",
                  rank === 1 ? "bg-amber-400/15 text-amber-400 ring-amber-400/30" :
                    rank <= 3 ? "bg-primary/15 text-primary ring-primary/30" :
                      "bg-secondary text-muted-foreground ring-border"
                )}>
                  {student.nickname.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground tracking-wide">{student.nickname}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="font-mono text-sm text-muted-foreground">#{student.station}</span>
              </div>

              <div className="flex items-center gap-3">
                <ProgressBar value={student.progress} status={student.status} />
                <span className="font-mono text-xs text-muted-foreground w-8 text-right">{student.progress}%</span>
              </div>

              <Badge
                className={cn(
                  "gap-1.5 rounded-md border-0 px-2 py-0.5 text-[10px] font-semibold tracking-wider ring-1",
                  config.bgColor,
                  config.color,
                  config.ringColor
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {student.status}
              </Badge>

              <span className="font-mono text-sm font-semibold text-foreground text-right">{(student.score ?? 0).toLocaleString()}</span>
              <div className="flex justify-end">
                {student.is_winner && <Crown className="h-4 w-4 text-amber-400 animate-pulse-glow" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
