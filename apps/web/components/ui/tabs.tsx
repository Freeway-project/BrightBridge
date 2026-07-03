"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-xl p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none transition-all duration-300",
  {
    variants: {
      variant: {
        default: "glass shadow-sm border border-white/5",
        line: "gap-4 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-all duration-300 ease-out group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-md [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-white/10 data-active:text-foreground data-active:backdrop-blur-lg dark:data-active:border-input dark:data-active:bg-white/10 dark:data-active:text-foreground group-data-[variant=line]/tabs-list:data-active:text-violet group-data-[variant=line]/tabs-list:hover:text-violet/80",
        "group-data-[variant=line]/tabs-list:border-t group-data-[variant=line]/tabs-list:border-x group-data-[variant=line]/tabs-list:border-b-transparent group-data-[variant=line]/tabs-list:border-t-border/50 group-data-[variant=line]/tabs-list:border-x-border/50 group-data-[variant=line]/tabs-list:rounded-t-lg group-data-[variant=line]/tabs-list:rounded-b-none",
        "group-data-[variant=line]/tabs-list:data-active:border-t-violet group-data-[variant=line]/tabs-list:data-active:border-x-violet",
        "after:absolute after:bg-foreground group-data-[variant=line]/tabs-list:after:bg-violet after:opacity-0 after:transition-all after:duration-300 group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-[3px] group-data-[variant=line]/tabs-list:group-data-horizontal/tabs:after:rounded-t-full group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-[3px] group-data-[variant=line]/tabs-list:data-active:after:opacity-100 group-data-[variant=line]/tabs-list:after:shadow-[0_0_12px_var(--color-violet)]",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  keepMounted = true,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content> & {
  /**
   * Keep the panel mounted while inactive (hidden via CSS) so in-tab state —
   * typed-but-unsaved input, scroll position, expanded/collapsed cards — is
   * preserved when switching tabs and back. Opt out with `keepMounted={false}`
   * for panels that should reset on each open. Defaults to true.
   */
  keepMounted?: boolean
}) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      // With forceMount, Radix keeps the panel mounted (present is always true),
      // so we hide the inactive one with CSS instead of unmounting it.
      forceMount={keepMounted ? true : undefined}
      className={cn(
        "flex-1 text-sm outline-none",
        keepMounted && "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
