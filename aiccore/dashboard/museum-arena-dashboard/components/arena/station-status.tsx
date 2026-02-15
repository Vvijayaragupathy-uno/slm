"use client"

import { useState, useEffect } from "react"
import {
    Cpu,
    Activity,
    Wifi,
    WifiOff,
    Thermometer,
    MemoryStick,
    HardDrive,
    AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface Station {
    id: string
    status: string
    ip: string
    load: number
    temp: number
}

export function StationStatus() {
    const [stations, setStations] = useState<Station[]>([])

    useEffect(() => {
        // Simulated station telemetry for museum environment
        // In production, each station would emit heartbeat to /api/v1/aiccore/stations/heartbeat
        const mockStations = [
            { id: "STATION_01", status: "active", ip: "192.168.1.101", load: 45, temp: 42 },
            { id: "STATION_02", status: "active", ip: "192.168.1.102", load: 12, temp: 38 },
            { id: "STATION_03", status: "occupied", ip: "192.168.1.103", load: 88, temp: 55 },
            { id: "STATION_04", status: "active", ip: "192.168.1.104", load: 5, temp: 35 },
            { id: "STATION_05", status: "maintenance", ip: "192.168.1.105", load: 0, temp: 30 },
            { id: "STATION_06", status: "active", ip: "192.168.1.106", load: 22, temp: 40 },
        ]
        setStations(mockStations)
    }, [])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {stations.map((s) => (
                <Card key={s.id} className="glass group overflow-hidden border-primary/10 hover:border-primary/30 transition-all">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg ring-1",
                                    s.status === "active" ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30" :
                                        s.status === "occupied" ? "bg-primary/15 text-primary ring-primary/30" :
                                            "bg-rose-500/15 text-rose-400 ring-rose-500/30"
                                )}>
                                    <Cpu className="h-4 w-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold">{s.id}</CardTitle>
                                    <p className="text-[10px] font-mono text-muted-foreground">{s.ip}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-bold px-1.5 py-0",
                                s.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    s.status === "occupied" ? "bg-primary/10 text-primary border-primary/20" :
                                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>
                                {s.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground/70">
                                <div className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" /> CPU Load
                                </div>
                                <span className={cn(s.load > 80 ? "text-rose-400" : "text-foreground")}>{s.load}%</span>
                            </div>
                            <Progress value={s.load} className="h-1 bg-primary/5" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground/70">
                                    <Thermometer className="h-3 w-3" /> Core Temp
                                </div>
                                <p className="text-sm font-bold text-foreground">{s.temp}°C</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground/70">
                                    <Wifi className="h-3 w-3" /> Signal
                                </div>
                                <p className="text-sm font-bold text-foreground">Excellent</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                            <Badge variant="outline" className="text-[9px] text-muted-foreground font-mono px-2 py-0 border-0">
                                UPTIME: 14h 22m
                            </Badge>
                            {s.status === "maintenance" && (
                                <div className="flex items-center gap-1 text-rose-400">
                                    <AlertCircle className="h-3 w-3" />
                                    <span className="text-[9px] font-bold uppercase">Critical Update</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
