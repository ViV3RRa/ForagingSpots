"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=closed]:duration-200 fixed inset-0 z-50 bg-[rgba(20,15,8,0.4)]",
        className,
      )}
      {...props}
    />
  );
}

/* Centered grab handle from the design's bottom-sheet chrome. */
function SheetHandle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-handle"
      className={cn("flex shrink-0 justify-center pt-[12px] pb-[4px]", className)}
      {...props}
    >
      <div className="h-[5px] w-[42px] rounded-[3px] bg-line" />
    </div>
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  handle,
  showClose,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  /** Render the design's grab handle (defaults to true for bottom sheets). */
  handle?: boolean;
  /** Render the corner close button (defaults to false for bottom sheets). */
  showClose?: boolean;
}) {
  const isBottom = side === "bottom";
  const withHandle = handle ?? isBottom;
  const withClose = showClose ?? !isBottom;

  // Drag-to-dismiss on the grab handle (bottom sheets): the sheet tracks the
  // finger 1:1; releasing past a distance or velocity threshold closes it
  // through the hidden Radix Close (so the sheet's onOpenChange fires exactly
  // like a scrim tap), anything less snaps back.
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startY: number;
    startT: number;
    dy: number;
  } | null>(null);

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = contentRef.current;
    if (!el) return;
    dragRef.current = { pointerId: e.pointerId, startY: e.clientY, startT: e.timeStamp, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    el.style.transition = "none";
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = contentRef.current;
    if (!drag || !el || e.pointerId !== drag.pointerId) return;
    const raw = e.clientY - drag.startY;
    drag.dy = raw < 0 ? raw / 4 : raw; // rubber-band resistance upward
    el.style.transform = `translateY(${drag.dy}px)`;
  };

  const onHandlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = contentRef.current;
    if (!drag || !el || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    el.style.transition = "";
    const elapsed = Math.max(e.timeStamp - drag.startT, 1);
    const velocity = drag.dy / elapsed; // px/ms, positive = downward
    const shouldClose =
      e.type !== "pointercancel" &&
      drag.dy > 24 &&
      (drag.dy > el.offsetHeight * 0.25 || velocity > 0.5);
    if (shouldClose) {
      // Keep the dragged offset — the slide-out-to-bottom exit animation
      // continues from the sheet's current position.
      closeRef.current?.click();
      // A dirty-guard may refuse the close (onOpenChange keeps open=true, e.g.
      // the profile sheet's discard dialog): if the sheet is still open after
      // the click's re-render, snap it back up via the class transition.
      requestAnimationFrame(() => {
        if (el.getAttribute("data-state") === "open") el.style.transform = "";
      });
    } else {
      el.style.transform = ""; // the class transition animates the snap-back
    }
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={contentRef}
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[state=closed]:duration-300 data-[state=open]:duration-300",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-lg",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto max-h-[92%] gap-0 overflow-hidden rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.3)] safe-area-bottom",
          className,
        )}
        {...props}
      >
        {withHandle && (
          <SheetHandle
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerEnd}
            onPointerCancel={onHandlePointerEnd}
            // pb/-mb enlarge the touch target without shifting layout;
            // relative+z keep the overlapped strip hit-testing the handle
            className="relative z-10 -mb-[12px] cursor-grab touch-none select-none pb-[16px] active:cursor-grabbing"
          />
        )}
        {withHandle && (
          <SheetPrimitive.Close ref={closeRef} className="hidden" tabIndex={-1} aria-hidden="true" />
        )}
        {children}
        {withClose && (
          <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-serif font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
