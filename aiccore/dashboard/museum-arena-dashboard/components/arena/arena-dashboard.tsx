"use client"

import { useState } from "react"
import { ArenaHeader } from "./arena-header"
import { ArenaSidebar } from "./arena-sidebar"
import { MobileTabs } from "./mobile-tabs"
import { Leaderboard } from "./leaderboard"
import { ReviewPanel } from "./review-panel"
import { MosaicArena } from "./mosaic-arena"
import { cn } from "@/lib/utils"

export function ArenaDashboard() {
  const [activeTab, setActiveTab] = useState("live")
  const [stationCount, setStationCount] = useState(8)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ArenaHeader stationCount={stationCount} />
      <MobileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 overflow-hidden">
        <ArenaSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* View title */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-bold tracking-wide text-foreground">
                  {activeTab === "live" ? "Live Spectator Leaderboard" :
                    activeTab === "mosaic" ? "Mosaic Workflow Arena" :
                      "Admin Review Panel"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {activeTab === "live"
                    ? "Real-time progress of all contestants in the arena"
                    : activeTab === "mosaic"
                      ? "Live view of all active builder workflows"
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
              {activeTab === "live" ? <Leaderboard onDataUpdate={setStationCount} /> :
                activeTab === "mosaic" ? <MosaicArena /> :
                  <ReviewPanel />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
