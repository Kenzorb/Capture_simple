"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";

const HeadingFocus = createContext<
  ((view: string, heading: HTMLHeadingElement) => void) | null
>(null);

export function DashboardFocus({ children }: { children: ReactNode }) {
  const lastView = useRef<string>(null);
  const focusHeading = useCallback(
    (view: string, heading: HTMLHeadingElement) => {
      const previous = lastView.current;
      lastView.current = view;
      if (previous === null || previous === view) return;
      requestAnimationFrame(() => {
        if (lastView.current === view && heading.getClientRects().length) {
          heading.focus();
        }
      });
    },
    [],
  );
  return (
    <HeadingFocus.Provider value={focusHeading}>
      {children}
    </HeadingFocus.Provider>
  );
}

export function DashboardHeading({
  children,
  view,
  className,
}: {
  children: ReactNode;
  view: string;
  className: string;
}) {
  const focusHeading = useContext(HeadingFocus);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (heading.current) focusHeading?.(view, heading.current);
  }, [focusHeading, view]);

  return (
    <h1 ref={heading} tabIndex={-1} className={className}>
      {children}
    </h1>
  );
}
