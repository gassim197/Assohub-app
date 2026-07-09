"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("relative w-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="block h-1.5 w-full overflow-hidden rounded-full bg-primary/20"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="block h-full bg-primary transition-all duration-300 ease-in-out data-[status=indeterminate]:animate-pulse"
          style={{
            width: value == null ? undefined : `${value}%`,
          }}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
