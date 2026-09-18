"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowBack, Close, Search } from "@mui/icons-material";
import ImageRenderer from "../ImageRenderer";
import { debounce } from "@/app/(search)/search/_component/debounce";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Autofocus on open, reset on close
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    setSearchInput("");
    setSuggestions([]);
    setSelectedIndex(-1);
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const fetchSuggestions = useCallback(
    debounce(async (value: string) => {
      if (value.trim().length < 2) {
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(value)}&limit=10`,
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Autocomplete fetch error:", error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250),
    [],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    setSelectedIndex(-1);
    fetchSuggestions(val);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchInput.trim())}`);
      onClose();
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    const term = suggestion.name || suggestion.title || "";
    router.push(`/search?query=${encodeURIComponent(term)}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) {
      if (e.key === "Enter") handleSubmit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center bg-black/50 backdrop-blur-sm lg:items-start lg:pt-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-background lg:h-auto lg:max-h-[70vh] lg:max-w-2xl lg:rounded-2xl lg:border lg:border-border lg:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="border-b border-border bg-background">
          <div className="flex items-center gap-2 px-3 py-3 lg:px-4 lg:py-2">
            <button
              onClick={onClose}
              aria-label="Close search"
              className="shrink-0 rounded-full p-2 text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <ArrowBack />
            </button>

            <form onSubmit={handleSubmit} className="flex-1" role="search">
              <div className="flex h-11 items-center overflow-hidden rounded-full border border-border bg-muted/40 transition-all focus-within:border-primary focus-within:bg-background focus-within:ring-2 focus-within:ring-ring">
                <Search
                  className="ml-3 text-muted-foreground"
                  style={{ fontSize: 20 }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search Novaorizon…"
                  className="h-full flex-1 border-none bg-transparent px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoComplete="off"
                  aria-label="Search for products"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSuggestions([]);
                      setSelectedIndex(-1);
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Close style={{ fontSize: 18 }} />
                  </button>
                )}
              </div>
            </form>

            {/* Desktop close */}
            <button
              onClick={onClose}
              aria-label="Close search"
              className="hidden shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted lg:inline-flex"
            >
              ESC
            </button>
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-4 lg:px-4">
            {searchInput.trim().length < 2 ? (
              <div className="py-16 text-center text-sm text-muted-foreground lg:py-12">
                Start typing to search products…
              </div>
            ) : isLoadingSuggestions ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground lg:py-12">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                Searching…
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground lg:py-12">
                No results for “{searchInput}”
              </div>
            ) : (
              <ul className="space-y-1" role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion._id}>
                    <button
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors lg:gap-3 lg:p-2.5 ${
                        index === selectedIndex
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                      role="option"
                      aria-selected={index === selectedIndex}
                    >
                      {suggestion.mainImage ? (
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted lg:h-10 lg:w-10">
                          <ImageRenderer image={suggestion.mainImage} />
                        </div>
                      ) : (
                        <div className="h-10 w-10 flex-shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {suggestion.name || suggestion.title}
                        </p>
                        {suggestion.listPrice != null && (
                          <p className="text-xs text-muted-foreground">
                            ${suggestion.listPrice}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Desktop footer hint */}
        <div className="hidden border-t border-border bg-muted/30 px-4 py-2 lg:flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                ↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              Open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
