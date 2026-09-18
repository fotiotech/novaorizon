"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Close, Search } from "@mui/icons-material";
import ImageRenderer from "../ImageRenderer";
import useClickOutside from "../Hooks";
import { debounce } from "@/app/(search)/search/_component/debounce";

interface DesktopSearchBarProps {
  isTransparent?: boolean;
}

const DesktopSearchBar: React.FC<DesktopSearchBarProps> = ({
  isTransparent = false,
}) => {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useClickOutside(() => setShowSuggestions(false));

  const fetchSuggestions = useCallback(
    debounce(async (value: string) => {
      if (value.trim().length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(value)}&limit=8`,
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Autocomplete fetch error:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250),
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    setSelectedIndex(-1);
    setShowSuggestions(true);
    fetchSuggestions(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?query=${encodeURIComponent(searchInput.trim())}`);
  };

  const handleSuggestionClick = (suggestion: any) => {
    const term = suggestion.name || suggestion.title || "";
    setSearchInput(term);
    setShowSuggestions(false);
    router.push(`/search?query=${encodeURIComponent(term)}`);
  };

  const handleClear = () => {
    setSearchInput("");
    setSuggestions([]);
    setSelectedIndex(-1);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
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
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Theme tokens based on header state
  const wrapClass = isTransparent
    ? "border-white/25 bg-white/15 focus-within:bg-white/20 focus-within:border-white/40"
    : "border-border bg-muted/40 focus-within:bg-background focus-within:border-primary";

  const textClass = isTransparent ? "text-white/90" : "text-foreground";
  const placeholderClass = isTransparent
    ? "placeholder:text-white/70"
    : "placeholder:text-muted-foreground";
  const iconClass = isTransparent ? "text-white/80" : "text-muted-foreground";

  return (
    <div ref={dropdownRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        className={`flex h-10 items-center overflow-hidden rounded-full border transition-all focus-within:ring-2 focus-within:ring-ring ${wrapClass}`}
      >
        <Search className={`ml-3 ${iconClass}`} style={{ fontSize: 20 }} />
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchInput.trim().length >= 2) setShowSuggestions(true);
          }}
          placeholder="Search Novaorizon…"
          className={`h-full flex-1 border-none bg-transparent px-3 py-2 text-sm focus:outline-none ${textClass} ${placeholderClass}`}
          aria-label="Search for products"
          autoComplete="off"
        />
        {searchInput && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className={`p-2 transition-colors ${iconClass} hover:opacity-80`}
          >
            <Close style={{ fontSize: 18 }} />
          </button>
        )}
      </form>

      {showSuggestions && searchInput.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-background py-2 shadow-2xl">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              Searching…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No results for “{searchInput}”
            </div>
          ) : (
            <ul role="listbox">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion._id}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      index === selectedIndex
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    }`}
                    role="option"
                    aria-selected={index === selectedIndex}
                  >
                    {suggestion.mainImage ? (
                      <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        <ImageRenderer image={suggestion.mainImage} />
                      </div>
                    ) : (
                      <div className="h-9 w-9 flex-shrink-0 rounded-md bg-muted" />
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
      )}
    </div>
  );
};

export default DesktopSearchBar;
