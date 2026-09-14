"use client";

import React, { useEffect } from "react";

interface BottomSheetProps {
  /** Controls visibility. The sheet is fully unmounted when `false`. */
  open: boolean;
  /** Called when the user dismisses (backdrop click, X, or Escape). */
  onClose: () => void;
  /** Optional header title. */
  title?: string;
  /** Optional custom node to the right of the title (e.g. a secondary action). */
  headerRight?: React.ReactNode;
  /** Prevent closing when the backdrop is clicked. */
  disableBackdropClose?: boolean;
  /** Prevent closing on Escape. */
  disableEscapeClose?: boolean;
  /** Additional classes for the sheet panel. */
  panelClassName?: string;
  /** Sheet contents. */
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  headerRight,
  disableBackdropClose = false,
  disableEscapeClose = false,
  panelClassName = "",
  children,
}) => {
  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open || disableEscapeClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, disableEscapeClose, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={disableBackdropClose ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative w-full max-h-[85vh] bg-background rounded-t-2xl shadow-2xl flex flex-col ${panelClassName}`}
        style={{ animation: "slideUpSheet 0.25s ease-out" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {(title || headerRight) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">
              {title || ""}
            </h2>
            <div className="flex items-center gap-2">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-4 pb-8 flex-1">{children}</div>

        {/* Keyframes — scoped to this component's subtree via a unique name */}
        <style>{`
          @keyframes slideUpSheet {
            from { transform: translateY(100%); opacity: 0.6; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BottomSheet;
