"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  // Base styles: Modern rounded corners, soft shadow, and left-border accent
  "relative w-full rounded-2xl border-l-4 border p-5 shadow-sm [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-5 [&>svg]:text-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        // Default: Like a standard Patient Note
        default: "bg-white border-slate-200 border-l-slate-400 text-slate-900 dark:bg-slate-950 dark:text-slate-50",

        // Destructive: For Medical Contraindications / Critical Errors
        destructive:
          "bg-rose-50/50 border-rose-100 border-l-rose-600 text-rose-900 dark:border-rose-900/50 dark:text-rose-400 [&>svg]:text-rose-600",

        // Info: For Nursing Tips / Study Notes (Using Clinical Teal)
        info: "bg-teal-50/50 border-teal-100 border-l-teal-600 text-teal-900 dark:bg-teal-950 dark:border-teal-900/50 [&>svg]:text-teal-600",

        // Warning: For Observation / Clinical Caution
        warning: "bg-amber-50/50 border-amber-100 border-l-amber-500 text-amber-900 dark:bg-amber-950 dark:border-amber-900/50 [&>svg]:text-amber-600",

        // Success: For Correct Answers / Normal Vitals
        success: "bg-emerald-50/50 border-emerald-100 border-l-emerald-600 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-900/50 [&>svg]:text-emerald-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1.5 font-bold leading-none tracking-tight text-[15px]",
      className
    )}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-sm leading-relaxed opacity-90 font-medium",
      className
    )}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }