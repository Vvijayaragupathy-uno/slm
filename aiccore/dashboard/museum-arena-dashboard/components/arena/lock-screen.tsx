"use client"

import { useState } from "react"
import { Shield, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LockScreenProps {
    onUnlock: (sessionId: string, nickname: string) => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
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

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-8 p-6 text-center">
                {/* Logo/Icon */}
                <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30 shadow-2xl shadow-primary/20">
                        <Shield className="h-10 w-10 text-primary" />
                    </div>
                </div>

                {/* Text */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Station Locked</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter the 4-digit code from your AICCORE profile to start building.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            maxLength={4}
                            placeholder="0000"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                            className={cn(
                                "h-20 w-full rounded-2xl bg-secondary/50 text-center font-mono text-5xl font-bold tracking-[0.5em] transition-all",
                                "border-2 border-transparent focus:border-primary/50 focus:bg-secondary/80 focus:outline-none focus:ring-4 focus:ring-primary/10",
                                error && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10"
                            )}
                            disabled={loading}
                            autoFocus
                        />
                        {loading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-destructive animate-bounce">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || code.length !== 4}
                        className={cn(
                            "group relative flex h-14 items-center justify-center rounded-xl font-bold transition-all",
                            "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
                            "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                    >
                        Unlock Station
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </form>

                <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-mono">
                    Arena ID: STATION_LOCAL
                </p>
            </div>
        </div>
    )
}
