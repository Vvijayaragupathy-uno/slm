"use client"

import { useState, useEffect } from "react"
import { FlowPreviewCard } from "./flow-preview-card"
import { cn } from "@/lib/utils"
import { Monitor, User, Zap } from "lucide-react"

interface MosaicSession {
    id: string
    nickname: string
    station: string
    nodes: any[]
    edges: any[]
    lastUpdate: number
}

export function MosaicArena() {
    const [sessions, setSessions] = useState<Record<string, MosaicSession>>({})
    const [activeIds, setActiveIds] = useState<string[]>([])

    useEffect(() => {
        // Connect to WebSocket
        const ws = new WebSocket(`ws://${window.location.hostname}:7860/api/v1/aiccore/ws`)

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)

            if (data.event_type === "flow_saved" || data.event_type === "submitted") {
                const payload = data.payload
                const flow = payload.snapshot || {}

                setSessions(prev => ({
                    ...prev,
                    [data.session_id]: {
                        id: data.session_id,
                        nickname: payload.nickname || "Anonymous",
                        station: payload.station_id || "0",
                        nodes: flow.nodes || [],
                        edges: flow.edges || [],
                        lastUpdate: Date.now()
                    }
                }))

                setActiveIds(prev => {
                    if (!prev.includes(data.session_id)) {
                        return [...prev, data.session_id]
                    }
                    return prev
                })
            }
        }

        return () => ws.close()
    }, [])

    // Dynamic grid column calculation
    const count = activeIds.length
    const cols = count <= 1 ? "grid-cols-1" : count <= 4 ? "grid-cols-2" : "grid-cols-3"
    const rows = count <= 2 ? "grid-rows-1" : count <= 6 ? "grid-rows-2" : "grid-rows-3"

    if (count === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground opacity-50">
                <Monitor className="h-12 w-12 stroke-[1.5]" />
                <p className="text-sm font-medium uppercase tracking-[0.2em]">Awaiting Arena Activity</p>
            </div>
        )
    }

    return (
        <div className={cn("grid h-full w-full gap-4 p-4", cols, rows)}>
            {activeIds.slice(0, 9).map((id) => {
                const session = sessions[id]
                return (
                    <div key={id} className="glass relative flex flex-col overflow-hidden rounded-2xl border-primary/10 ring-1 ring-primary/5 transition-all">
                        <div className="flex items-center justify-between border-b border-primary/5 bg-primary/5 px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                                    {session.nickname.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-bold tracking-tight text-foreground">{session.nickname}</span>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-50">
                                <Monitor className="h-3 w-3" />
                                <span className="font-mono text-[10px] font-bold italic">STATION #{session.station}</span>
                            </div>
                        </div>

                        <div className="flex-1 p-3">
                            <FlowPreviewCard
                                nodes={session.nodes}
                                edges={session.edges}
                                className="h-full border-0 bg-transparent ring-0"
                            />
                        </div>

                        <div className="absolute bottom-3 right-3 flex items-center gap-1 scale-75">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-tighter">Live</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
