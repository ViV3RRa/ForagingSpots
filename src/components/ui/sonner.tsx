import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";
import type { CSSProperties } from "react";
import { useTheme } from "../../hooks/useTheme";

/*
 * Design toast recipe (Skovens Skatte, `isToastSuccess`/`isToastError` blocks):
 * bottom-anchored card ~110px above the bottom edge (clears the Kort/Liste
 * toggle and FAB), 16px side margins, 16px radius, 13/15px padding, Spectral
 * 600 15px message, 34px icon disc, 28px circular dismiss ✕ at 60% text
 * opacity, 3200ms auto-dismiss (`fireToast`). Success/info sit on --brand,
 * error on a hard-coded rust-brown #7a2e1c in both themes.
 *
 * Dark-mode deviation (sanctioned by subtask 3.6): the design hard-codes
 * cream #f4efe3 text and a gold #e9c98a check on --brand, but --brand is
 * itself gold #c9a24b in dark, which leaves both illegible — so dark mode
 * uses --brand-ink (#273226) for the success text/icon instead.
 *
 * The entrance uses sonner's built-in bottom mount transition
 * (translateY(100%) → 0 with fade), which matches the design's ss-rise.
 */

const successIcon = (
  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#e9c98a]/20 text-[#e9c98a] dark:bg-[#273226]/15 dark:text-[#273226]">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  </span>
);

const errorIcon = (
  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/[0.14] text-[#f2c8b8]">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 8v5M12 16.5v.5" />
      <path d="M10.3 3.9L2.4 18a1.9 1.9 0 0 0 1.7 2.9h15.8a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0z" />
    </svg>
  </span>
);

const closeIcon = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// Design offsets: 16px side margins on a 430px viewport → 398px max card width;
// 110px bottom clearance plus the home-indicator safe area.
const BOTTOM_OFFSET = {
  bottom: "calc(max(env(safe-area-inset-bottom), 0px) + 110px)",
};

const brandCard = "bg-brand text-[#f4efe3] dark:text-brand-ink";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      duration={3200}
      gap={10}
      // Horizontal swipe-to-dismiss (like the PWA update toast) on top of the
      // bottom-center default's down-swipe
      swipeDirections={["left", "right", "bottom"]}
      offset={BOTTOM_OFFSET}
      mobileOffset={BOTTOM_OFFSET}
      closeButton
      icons={{ success: successIcon, info: successIcon, error: errorIcon, close: closeIcon }}
      style={
        {
          "--width": "min(calc(100vw - 32px), 398px)",
          // sonner's dark-theme skins the close button via `--normal-*` vars even
          // for unstyled toasts — neutralize so our classNames.closeButton wins
          "--normal-bg": "transparent",
          "--normal-bg-hover": "transparent",
          "--normal-border": "transparent",
          "--normal-border-hover": "transparent",
          "--normal-text": "currentColor",
        } as CSSProperties
      }
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-[12px] rounded-[16px] px-[15px] py-[13px] shadow-[0_14px_34px_-8px_rgba(0,0,0,.4)]",
          content: "min-w-0 flex-1",
          title: "font-serif text-[15px] font-semibold leading-[1.3]",
          description: "mt-[1px] font-sans text-[12px] font-normal leading-[1.4] opacity-70",
          icon: "shrink-0",
          // Rendered first in sonner's DOM; the design puts the ✕ at the row end
          closeButton:
            "order-last flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-current opacity-60",
          // No `default` entry: sonner concatenates it with the per-type class,
          // so a default background would fight the error card's rust-brown.
          success: brandCard,
          info: brandCard,
          error: "bg-[#7a2e1c] text-[#fdeee6]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
