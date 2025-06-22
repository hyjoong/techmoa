"use client"

import { Home, Heart, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function NavigationBar() {
  const [activeTab, setActiveTab] = useState("home")

  const navItems = [
    { id: "home", label: "홈", icon: Home },
    { id: "favorites", label: "즐겨찾기", icon: Heart },
    { id: "settings", label: "설정", icon: Settings },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 h-auto py-2 transition-colors ${
                activeTab === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
