"use client"

import { useState, useEffect } from "react"
import { Shield, ArrowRight, Loader2, UserPlus, Fingerprint, Sparkles, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface Challenge {
    id: string
    title: string
    description: string
    complexity_level: string
}

interface LockScreenProps {
    onUnlock: (sessionId: string, nickname: string) => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
    const [view, setView] = useState<"unlock" | "register">("unlock")
    const [code, setCode] = useState("")
    const [nickname, setNickname] = useState("")
    const [username, setUsername] = useState("")
    const [selectedChallenge, setSelectedChallenge] = useState<string>("")
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successCode, setSuccessCode] = useState<string | null>(null)

    useEffect(() => {
        if (view === "register") {
            const fetchChallenges = async () => {
                try {
                    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                    const response = await fetch(`http://${host}:7860/api/v1/aiccore/challenges`)
                    if (response.ok) {
                        const data = await response.json()
                        setChallenges(data)
                        if (data.length > 0) setSelectedChallenge(data[0].id)
                    }
                } catch (err) {
                    console.error("Failed to fetch challenges", err)
                }
            }
            fetchChallenges()
        }
    }, [view])

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault()
        if (code.length !== 4) return

        setLoading(true)
        setError(null)

        try {
            const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            const response = await fetch(`http://${host}:7860/api/v1/aiccore/auth/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ unlock_code: code }),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.detail || "Invalid code")
            }

            const data = await response.json()
            onUnlock(data.session_id, data.nickname)
        } catch (err: any) {
            setError(err.message)
            setCode("")
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nickname || !username) return

        setLoading(true)
        setError(null)

        try {
            const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            const response = await fetch(`http://${host}:7860/api/v1/aiccore/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, username }),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.detail || "Registration failed")
            }

            const data = await response.json()
            setSuccessCode(data.unlock_code)
            // Wait a moment so they can see the code before we switch
            setTimeout(() => {
                setCode(data.unlock_code)
                setView("unlock")
                setSuccessCode(null)
            }, 5000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full animate-pulse-slow"></div>
            </div>

            <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center gap-8 p-6 text-center animate-in fade-in zoom-in duration-500">
                {/* Logo/Icon */}
                <div className="relative group transition-transform hover:scale-105 duration-300">
                    <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-2xl animate-pulse group-hover:bg-primary/30 transition-colors" />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-black ring-1 ring-primary/30 shadow-2xl shadow-primary/20">
                        {view === "unlock" ? <Fingerprint className="h-12 w-12 text-primary" /> : <UserPlus className="h-12 w-12 text-primary" />}
                    </div>
                </div>

                {/* Text */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
                        {view === "unlock" ? "Station Access" : "Join the Arena"}
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium px-4">
                        {view === "unlock"
                            ? "Enter your 4-digit code to initialize the building deck."
                            : "Create your builder profile to start creating agents."}
                    </p>
                </div>

                {successCode ? (
                    <div className="flex w-full flex-col gap-6 p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 animate-in zoom-in duration-300">
                        <div className="flex flex-col gap-2">
                            <Sparkles className="h-8 w-8 text-emerald-400 mx-auto" />
                            <h2 className="text-xl font-bold text-emerald-400">Welcome, {nickname}!</h2>
                            <p className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Your Unlock Code</p>
                        </div>
                        <div className="text-6xl font-black tracking-[0.2em] text-white font-mono bg-black/40 py-6 rounded-2xl shadow-inner border border-white/5">
                            {successCode}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Entering station in 5 seconds...</p>
                    </div>
                ) : view === "unlock" ? (
                    <form onSubmit={handleUnlock} className="flex w-full flex-col gap-6">
                        <div className="relative group">
                            <input
                                type="text"
                                maxLength={4}
                                placeholder="0000"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                className={cn(
                                    "h-24 w-full rounded-3xl bg-secondary/30 text-center font-mono text-6xl font-black tracking-[0.5em] transition-all",
                                    "border-2 border-white/5 focus:border-primary/50 focus:bg-secondary/50 focus:outline-none focus:ring-8 focus:ring-primary/5",
                                    "shadow-inner placeholder:opacity-10",
                                    error && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10"
                                )}
                                disabled={loading}
                                autoFocus
                            />
                            {loading && (
                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-xs font-bold text-destructive uppercase tracking-wider animate-bounce">
                                Access Denied: {error}
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading || code.length !== 4}
                                className={cn(
                                    "group relative flex h-16 items-center justify-center rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all",
                                    "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-primary/20",
                                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                )}
                            >
                                Unlock Station
                                <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setView("register")}
                                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest py-2"
                            >
                                First time here? <span className="text-primary">Create Profile</span>
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="flex w-full flex-col gap-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 tracking-widest">Display Nickname</label>
                                    <input
                                        placeholder="e.g. PixelMaster"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="h-12 w-full rounded-xl bg-secondary/50 px-4 text-xs font-bold border border-white/5 focus:border-primary/50 focus:outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 tracking-widest">Unique Handle</label>
                                    <input
                                        placeholder="e.g. user_99"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                                        className="h-12 w-full rounded-xl bg-secondary/50 px-4 text-xs font-bold border border-white/5 focus:border-primary/50 focus:outline-none transition-all font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 text-left">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground pl-1 tracking-widest">Choose Your Challenge</label>
                                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                                    {challenges.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setSelectedChallenge(c.id)}
                                            className={cn(
                                                "relative flex flex-col gap-1 rounded-xl p-3 text-left transition-all",
                                                "border border-white/5 bg-secondary/30 hover:bg-secondary/50",
                                                selectedChallenge === c.id ? "border-primary/50 bg-primary/10 ring-1 ring-primary/50 opacity-100" : "opacity-60"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-foreground capitalize">{c.title}</span>
                                                <Badge
                                                    className={cn(
                                                        "text-[8px] px-1.5 py-0 border-0",
                                                        c.complexity_level === "Beginner" ? "bg-emerald-500/20 text-emerald-400" :
                                                            c.complexity_level === "Intermediate" ? "bg-amber-500/20 text-amber-400" :
                                                                "bg-rose-500/20 text-rose-400"
                                                    )}
                                                >
                                                    {c.complexity_level}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{c.description}</p>
                                        </button>
                                    ))}
                                    {challenges.length === 0 && (
                                        <div className="h-10 flex items-center justify-center rounded-xl bg-secondary/30 border border-white/5 animate-pulse">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Scanning Arena...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <p className="text-xs font-bold text-destructive uppercase tracking-wider">
                                {error}
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading || !nickname || !username || !selectedChallenge}
                                className={cn(
                                    "group relative flex h-14 items-center justify-center rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all",
                                    "bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/10",
                                    "disabled:cursor-not-allowed disabled:opacity-50"
                                )}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Initialize Agent Builder"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setView("unlock")}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
                            >
                                Have a code? <span className="text-primary underline underline-offset-4">Unlock Station</span>
                            </button>
                        </div>
                    </form>
                )}

                <div className="flex items-center gap-1.5 opacity-30 mt-2">
                    <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.3em] font-mono">
                        STATION_LOCAL • ARENA_V1
                    </p>
                </div>
            </div>

            <style jsx global>{`
                @keyframes pulse-slow {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.05; }
                    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.1; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 10s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
