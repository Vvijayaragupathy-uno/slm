"use client"

import { useState, useEffect } from "react"
import {
    Settings,
    Plus,
    Trash2,
    Activity,
    Shield,
    Award,
    Zap,
    CheckCircle2,
    XCircle,
    BarChart3,
    RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface Challenge {
    id: string
    title: string
    description: string
    complexity_level: string
    is_active: boolean
}

interface Achievement {
    id: string
    name: string
    description: string
}

export function ArenaConfig() {
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // New challenge form
    const [newChallenge, setNewChallenge] = useState({
        title: "",
        description: "",
        complexity: "Beginner"
    })

    // New achievement form
    const [newAchievement, setNewAchievement] = useState({
        name: "",
        description: ""
    })

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

    const fetchData = async () => {
        try {
            const [cRes, aRes] = await Promise.all([
                fetch(`http://${host}:7860/api/v1/aiccore/challenges`),
                fetch(`http://${host}:7860/api/v1/aiccore/achievements`)
            ])
            if (cRes.ok) setChallenges(await cRes.json())
            if (aRes.ok) setAchievements(await aRes.json())
        } catch (err) {
            console.error("Fetch error", err)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreateChallenge = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const res = await fetch(`http://${host}:7860/api/v1/aiccore/challenges`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newChallenge.title,
                    description: newChallenge.description,
                    complexity_level: newChallenge.complexity
                })
            })
            if (res.ok) {
                setNewChallenge({ title: "", description: "", complexity: "Beginner" })
                fetchData()
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleChallenge = async (id: string) => {
        await fetch(`http://${host}:7860/api/v1/aiccore/challenges/${id}/toggle`, { method: "POST" })
        fetchData()
    }

    const handleCreateAchievement = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const res = await fetch(`http://${host}:7860/api/v1/aiccore/achievements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAchievement)
            })
            if (res.ok) {
                setNewAchievement({ name: "", description: "" })
                fetchData()
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Arena Summary */}
                <Card className="glass lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight">System Configuration</CardTitle>
                            <CardDescription>Global arena rules and environmental settings</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                <Activity className="h-3 w-3 mr-1" /> Engine Online
                            </Badge>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                v1.0.4-rolling
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* Challenge Management */}
                <Card className="glass lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-400" />
                            Challenge Scenarios
                        </CardTitle>
                        <CardDescription>Manage the active logical contexts available to students</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <form onSubmit={handleCreateChallenge} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <div className="md:col-span-1">
                                <Input
                                    placeholder="Challenge Title"
                                    value={newChallenge.title}
                                    onChange={e => setNewChallenge({ ...newChallenge, title: e.target.value })}
                                    className="bg-background/50 border-white/5"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input
                                    placeholder="Short description of the goal"
                                    value={newChallenge.description}
                                    onChange={e => setNewChallenge({ ...newChallenge, description: e.target.value })}
                                    className="bg-background/50 border-white/5"
                                    required
                                />
                            </div>
                            <Button disabled={isSubmitting} type="submit" className="w-full">
                                <Plus className="h-4 w-4 mr-2" /> Add Scenario
                            </Button>
                        </form>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {challenges.map(c => (
                                <div key={c.id} className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                                    c.is_active ? "bg-background border-primary/20 shadow-sm" : "bg-secondary/20 border-border opacity-60 grayscale-[0.5]"
                                )}>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{c.title}</span>
                                            <Badge className={cn(
                                                "text-[10px] px-1.5 py-0 border-0",
                                                c.complexity_level === "Beginner" ? "bg-emerald-500/20 text-emerald-400" :
                                                    c.complexity_level === "Intermediate" ? "bg-amber-500/20 text-amber-400" :
                                                        "bg-rose-500/20 text-rose-400"
                                            )}>
                                                {c.complexity_level}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{c.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleChallenge(c.id)}
                                            className={c.is_active ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground"}
                                        >
                                            {c.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Honor/Badge System */}
                <Card className="glass">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Honor Registry
                        </CardTitle>
                        <CardDescription>Badges available for curation</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <form onSubmit={handleCreateAchievement} className="flex flex-col gap-2">
                            <Input
                                placeholder="Badge Name (e.g. Logic Master)"
                                value={newAchievement.name}
                                onChange={e => setNewAchievement({ ...newAchievement, name: e.target.value })}
                                className="bg-background/50 border-white/5"
                                required
                            />
                            <Input
                                placeholder="Achievement criteria"
                                value={newAchievement.description}
                                onChange={e => setNewAchievement({ ...newAchievement, description: e.target.value })}
                                className="bg-background/50 border-white/5"
                                required
                            />
                            <Button disabled={isSubmitting} variant="secondary" type="submit" className="w-full mt-1">
                                Initialize Badge
                            </Button>
                        </form>

                        <div className="space-y-3 mt-4">
                            {achievements.map(a => (
                                <div key={a.id} className="flex flex-col gap-1 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-3 w-3 text-primary" />
                                        <span className="text-xs font-bold">{a.name}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-tight">{a.description}</p>
                                </div>
                            ))}
                            {achievements.length === 0 && (
                                <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">No custom badges defined</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
