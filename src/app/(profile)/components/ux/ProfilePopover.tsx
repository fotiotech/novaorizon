"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Close } from "@mui/icons-material";
import { SignOut } from "@/app/(auth)/components/auth/SignInButton";
import { useUnreadMessages } from "@/app/(checkout)/checkout/chat/_component/useUnreadMessages";

/** Duration of the exit animation in ms (must match the CSS duration). */
const EXIT_DURATION = 150;

type ProfilePopoverProps = {
  open: boolean;
  onClose: () => void;
  /** Wrapper element that contains the trigger + this panel. */
  anchorRef: React.RefObject<HTMLElement>;
};

const ProfilePopover = ({ open, onClose, anchorRef }: ProfilePopoverProps) => {
  const { data: session } = useSession();
  const unreadCount = useUnreadMessages();
  const user = session?.user as any;

  const panelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      return;
    }
    const t = setTimeout(() => setIsMounted(false), EXIT_DURATION);
    return () => clearTimeout(t);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, anchorRef]);

  if (!isMounted || !user) return null;

  const displayName = user.name || user.email || "User";
  const displayEmail = user.email ?? "";
  const avatarUrl = user.image;
  const initial = displayEmail.charAt(0).toUpperCase();
  const isSeller = user.role === "seller";

  const itemClass =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div
      ref={panelRef}
      id="profile-popover-panel"
      role="dialog"
      aria-label="Profile menu"
      aria-hidden={!open}
      style={{ transitionDuration: `${EXIT_DURATION}ms` }}
      className={[
        "absolute right-0 top-[calc(100%+10px)] z-[60] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl",
        "origin-top-right transform-gpu transition-all ease-out",
        open
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "pointer-events-none -translate-y-1 scale-95 opacity-0",
      ].join(" ")}
    >
      {/* User header */}
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initial}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {displayEmail}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile menu"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Close style={{ fontSize: 18 }} />
        </button>
      </div>

      {/* Menu items */}
      <nav className="p-2">
        <Link href="/profile" onClick={onClose} className={itemClass}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          My Profile
        </Link>

        <Link href="/profile/myorders" onClick={onClose} className={itemClass}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          My Orders
        </Link>

        <Link
          href="/checkout/chat"
          onClick={onClose}
          className={`${itemClass} justify-between`}
        >
          <span className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Chats
          </span>
          {unreadCount > 0 && (
            <span
              className="min-w-[20px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground"
              aria-label={`${unreadCount} unread messages`}
            >
              {unreadCount}
            </span>
          )}
        </Link>

        <Link href="/profile/address" onClick={onClose} className={itemClass}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Addresses
        </Link>

        <Link href="/profile/payment" onClick={onClose} className={itemClass}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          Payment Methods
        </Link>

        <Link
          href={
            isSeller
              ? "https://novaorizon-seller.vercel.app"
              : "https://novaorizon-seller.vercel.app/auth/sign_up"
          }
          onClick={onClose}
          className={itemClass}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {isSeller ? "Seller Account" : "Become a Seller"}
        </Link>
      </nav>

      {/* Sign out */}
      <div className="border-t border-border p-2">
        <div className="rounded-lg text-destructive transition-colors hover:bg-destructive/10">
          <SignOut />
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProfilePopover);
