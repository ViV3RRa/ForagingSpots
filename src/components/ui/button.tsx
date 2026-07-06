import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/*
 * Button recipes from the "Skovens Skatte" design:
 * - default: accent CTA with glow shadow ("Kom i gang", "Gem fund")
 * - brand:   forest/gold action button (detail drawer primary)
 * - secondary: surface bg + line border ("Tilføj foto")
 * - outline: transparent bg + line border ("Annullér")
 * - ghost:   plain Work Sans text button ("Jeg har allerede en konto", "Ikke nu")
 * Sizes use explicit px values — the root font-size is 14px, so rem scales are off-design.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-serif transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[18px] shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-ink font-semibold shadow-[0_8px_22px_-6px_var(--accent)] hover:opacity-90",
        brand: "bg-brand text-brand-ink font-semibold hover:opacity-90",
        destructive:
          "bg-accent text-accent-ink font-semibold hover:opacity-90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        secondary:
          "bg-surface text-ink font-medium border border-line hover:bg-line2",
        outline:
          "bg-transparent text-ink2 font-medium border border-line hover:bg-surface",
        ghost: "font-sans font-medium text-ink2 hover:bg-surface",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[52px] px-[24px] rounded-[14px] text-[16px]",
        lg: "h-[56px] px-[26px] rounded-[16px] text-[17px]",
        sm: "h-[38px] gap-1.5 px-[14px] rounded-[10px] text-[14px]",
        icon: "size-[44px] rounded-full",
        "icon-sm": "size-[36px] rounded-full [&_svg:not([class*='size-'])]:size-[16px]",
        "icon-lg": "size-[52px] rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
