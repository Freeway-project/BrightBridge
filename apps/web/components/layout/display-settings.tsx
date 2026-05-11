"use client"

import { useTweaks } from "@/components/shared/tweak-provider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Type, Layout, Settings2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function DisplaySettings() {
  const { settings, setSettings } = useTweaks()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 px-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors h-9"
        >
          <Settings2 className="size-4 shrink-0" />
          {!collapsed && <span className="text-sm">Display Settings</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-64 p-4 space-y-4" sideOffset={12}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display Settings</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium">
              <Type className="size-3.5" />
              Font Size
            </label>
            <Tabs
              value={settings.fontSize}
              onValueChange={(v) => setSettings({ fontSize: v as "small" | "medium" | "large" })}
              className="w-full"
            >
              <TabsList className="grid h-8 w-full grid-cols-3 border border-primary/20 bg-background/50 p-1">
                <TabsTrigger value="small" className="text-[10px] py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Small</TabsTrigger>
                <TabsTrigger value="medium" className="text-[10px] py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Med</TabsTrigger>
                <TabsTrigger value="large" className="text-[10px] py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Large</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium">
              <Layout className="size-3.5" />
              Card Density
            </label>
            <Tabs
              value={settings.density}
              onValueChange={(v) => setSettings({ density: v as "compact" | "regular" | "comfy" })}
              className="w-full"
            >
              <TabsList className="grid h-8 w-full grid-cols-3 border border-primary/20 bg-background/50 p-1">
                <TabsTrigger value="compact" className="text-[10px] py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Small</TabsTrigger>
                <TabsTrigger value="regular" className="text-[10px] py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Med</TabsTrigger>
                <TabsTrigger value="comfy" className="text-[10px] py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Large</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
