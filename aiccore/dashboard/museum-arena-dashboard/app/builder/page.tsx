"use client"

import { useState, useEffect } from "react"
import { LockScreen } from "@/components/arena/lock-screen"
import { Shield, Rocket, RefreshCw, Trophy, CheckCircle2, Zap, BarChart3, Medal } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ArenaBuilderPage() {
    const [session, setSession] = useState<{ id: string; nickname: string } | null>(null)
    const [stats, setStats] = useState<{ flows: number; achievements: number } | null>(null)
    const [iframeLoaded, setIframeLoaded] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    // Handle unlock from LockScreen
    const handleUnlock = (sessionId: string, nickname: string, userStats?: any) => {
        setSession({ id: sessionId, nickname })
        localStorage.setItem("aiccore_session_id", sessionId)
        localStorage.setItem("aiccore_nickname", nickname)
        document.cookie = `aiccore_session_id=${sessionId}; path=/; max-age=86400; SameSite=Lax`

        if (userStats) {
            setStats({ flows: userStats.flows_count || 0, achievements: userStats.achievements_count || 0 })
            localStorage.setItem("aiccore_flows_count", String(userStats.flows_count || 0))
            localStorage.setItem("aiccore_achievements_count", String(userStats.achievements_count || 0))
        }

        setIsSubmitted(false)
    }

    const handleReset = async () => {
        if (session) {
            try {
                const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                await fetch(`http://${host}:7860/api/v1/aiccore/session/${session.id}/deactivate`, {
                    method: "POST",
                    credentials: "include"
                })
            } catch (err) {
                console.error("Cleanup failed:", err)
            }
        }
        localStorage.removeItem("aiccore_session_id")
        localStorage.removeItem("aiccore_nickname")
        localStorage.removeItem("aiccore_flows_count")
        localStorage.removeItem("aiccore_achievements_count")
        document.cookie = "aiccore_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC"
        setSession(null)
        setStats(null)
        setIframeLoaded(false)
        setIsSubmitted(false)
    }

    // Poll for submission status
    useEffect(() => {
        if (!session || isSubmitted) return

        const checkStatus = async () => {
            try {
                const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                const response = await fetch(`http://${host}:7860/api/v1/aiccore/session/${session.id}/status`, {
                    credentials: "include"
                })

                if (response.status === 404) {
                    console.warn("Session expired or purged. Resetting...")
                    handleReset()
                    return
                }

                const data = await response.json()
                if (data.is_submitted) {
                    setIsSubmitted(true)
                }
            } catch (err) {
                console.log("Status poll failed:", err)
            }
        }

        const interval = setInterval(checkStatus, 3000)
        return () => clearInterval(interval)
    }, [session, isSubmitted])

    // Load session from storage if it exists
    useEffect(() => {
        const savedId = localStorage.getItem("aiccore_session_id")
        const savedName = localStorage.getItem("aiccore_nickname")
        const savedFlows = localStorage.getItem("aiccore_flows_count")
        const savedAchs = localStorage.getItem("aiccore_achievements_count")

        if (savedId && savedName) {
            setSession({ id: savedId, nickname: savedName })
            if (savedFlows !== null && savedAchs !== null) {
                setStats({ flows: Number(savedFlows), achievements: Number(savedAchs) })
            }
        }
    }, [])

    if (!session) {
        return <LockScreen onUnlock={handleUnlock} />
    }

    if (isSubmitted) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

                <div className="relative flex flex-col items-center gap-8 text-center p-8 max-w-lg">
                    <div className="relative">
                        <div className="absolute -inset-8 rounded-full bg-amber-400/20 blur-3xl animate-pulse" />
                        <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-amber-400/10 ring-1 ring-amber-400/30 shadow-2xl shadow-amber-400/20">
                            <Trophy className="h-16 w-16 text-amber-400" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">Mission Complete</h1>
                        <p className="text-lg font-medium text-muted-foreground">
                            Agent successfully deployed to the AICCORE Arena!
                        </p>
                        <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-secondary/50 p-6 ring-1 ring-border">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Builder</span>
                                <span className="text-lg font-black text-foreground">{session.nickname}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-t border-border pt-2 mt-2">
                                <span className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Status</span>
                                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>SUBMITTED</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleReset}
                        className="group relative flex h-16 w-full items-center justify-center rounded-2xl bg-primary font-black text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-primary/20 uppercase tracking-widest"
                    >
                        Finish & logout
                    </button>

                    <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                        Your work will appear on the live dashboard shortly.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
            {/* Mini Header for the builder */}
            <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
                        <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold tracking-tight text-foreground">AICCORE Arena</span>
                        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Builder Mode</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {stats && (
                        <div className="flex items-center gap-3 border-r border-border pr-4 mr-2">
                            <div className="flex items-center gap-1.5 opacity-70">
                                <BarChart3 className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-bold font-mono tracking-tighter uppercase">{stats.flows} FLOWS</span>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-70">
                                <Medal className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] font-bold font-mono tracking-tighter uppercase">{stats.achievements} BADGES</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 ring-1 ring-primary/20">
                        <div className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-foreground">Participant: {session.nickname}</span>
                    </div>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all uppercase tracking-tighter"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Reset Station
                    </button>
                </div>
            </header>

            {/* Langflow IFrame */}
            <main className="relative flex-1 bg-secondary/20">
                {!iframeLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <Rocket className="h-8 w-8 animate-bounce text-primary" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">Launching Building Deck...</p>
                    </div>
                )}

                <iframe
                    src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5173/?session_id=${session.id}`} // Point to Langflow Frontend Dev Server
                    className={cn(
                        "h-full w-full border-0 transition-opacity duration-700",
                        iframeLoaded ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => setIframeLoaded(true)}
                    title="AICCORE Agent Builder"
                />
            </main>

            {/* Footer / Status */}
            <footer className="flex h-8 items-center justify-between border-t border-border bg-card px-4 text-[10px] text-muted-foreground font-mono">
                <div className="flex gap-4">
                    <span>STATION_LOCAL</span>
                    <span>LATENCY: 12ms</span>
                </div>
                <div className="flex gap-2 items-center">
                    <Zap className="h-3 w-3 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>LIVE TELEMETRY ACTIVE</span>
                </div>
            </footer>
        </div>
    )
}
