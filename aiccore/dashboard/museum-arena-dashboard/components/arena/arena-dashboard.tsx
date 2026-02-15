"use client"

import { useState, useEffect } from "react"
import { ArenaHeader } from "./arena-header"
import { ArenaSidebar } from "./arena-sidebar"
import { MobileTabs } from "./mobile-tabs"
import { Leaderboard } from "./leaderboard"
import { ReviewPanel } from "./review-panel"
import { MosaicArena } from "./mosaic-arena"
import { UserRegistry } from "./user-registry"
import { LoginPage } from "./login-page"
import { cn } from "@/lib/utils"

export function ArenaDashboard() {
  const [activeTab, setActiveTab] = useState("live")
  const [stationCount, setStationCount] = useState(8)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // Check for auth cookie/flag
    const isAuth = document.cookie.includes("aiccore_admin=true")
    setIsAuthenticated(isAuth)
  }, [])

  // Real-time Update Listener (Google Standard Pattern)
  useEffect(() => {
    if (!isAuthenticated) return

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const ws = new WebSocket(`ws://${host}:7860/api/v1/aiccore/ws`)

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === "REGISTRY_UPDATE" || message.type === "LEADERBOARD_UPDATE" || message.type === "SUBMISSION_UPDATE") {
          console.log("🚀 Real-time update received:", message.type)
          setRefreshKey(prev => prev + 1)
        }
      } catch (e) {
        console.error("WS Parse error", e)
      }
    }

    ws.onerror = () => console.log("WS connection stalled. Reverting to polling.")
    return () => ws.close()
  }, [isAuthenticated])

  const handleLogin = async (password: string) => {
    const response = await fetch("http://localhost:7860/api/v1/aiccore/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (response.ok) {
      setIsAuthenticated(true)
    } else {
      throw new Error("Invalid administrator passcode")
    }
  }

  const handleLogout = () => {
    document.cookie = "aiccore_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    setIsAuthenticated(false)
  }

  if (isAuthenticated === null) {
    return <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ArenaHeader stationCount={stationCount} onLogout={handleLogout} />
      <MobileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 overflow-hidden">
        <ArenaSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-auto bg-background/50 backdrop-blur-3xl">
          <div className="p-6">
            {/* View title */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-bold tracking-wide text-foreground">
                  {activeTab === "live" ? "Live Spectator Leaderboard" :
                    activeTab === "mosaic" ? "Mosaic Workflow Arena" :
                      activeTab === "contestants" ? "Contestant Registry" :
                        "Admin Review Panel"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "live"
                    ? "Real-time progress of all contestants in the arena"
                    : activeTab === "mosaic"
                      ? "Live view of all active builder workflows"
                      : activeTab === "contestants"
                        ? "Manage builder access codes and session status"
                        : "Review and approve submitted agent flows"}
                </p>
              </div>
            </div>

            {/* Content with smooth transition */}
            <div
              className={cn(
                "transition-all duration-300 ease-out",
                "animate-slide-in h-min-screen h-full"
              )}
              key={activeTab}
            >
              {activeTab === "live" ? <Leaderboard onDataUpdate={setStationCount} refreshKey={refreshKey} /> :
                activeTab === "mosaic" ? <MosaicArena /> :
                  activeTab === "contestants" ? <UserRegistry refreshKey={refreshKey} /> :
                    <ReviewPanel />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
