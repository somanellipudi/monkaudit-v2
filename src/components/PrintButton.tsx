"use client";

import { buttonClassName } from "./ui";

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button type="button" className={buttonClassName()} onClick={() => window.print()}>
      {label}
    </button>
  );
}
