import * as React from "react";

import { cn } from "./utils";

/*
 * Uppercase Space Mono micro-label — the design's recurring section-label
 * pattern. Delegates to the canonical .label-mono class from tokens.css.
 */
function MonoLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="mono-label" className={cn("label-mono", className)} {...props} />;
}

export { MonoLabel };
