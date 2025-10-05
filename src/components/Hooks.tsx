import React, { useEffect, useRef, useState } from "react";

// Hook to detect clicks outside of a specified DOM node
export default function useClickOutside(handler: () => void) {
  const domNode = useRef<HTMLDivElement>(null); // Changed to HTMLElement for general use

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (domNode.current && !domNode.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handler]); // Include handler in the dependency array

  return domNode;
}

// Hook to hide an element on click
export const useClickAndHide = (handler: () => void) => {
  const domNode = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleClick() {
      handler();
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [handler]); // Include handler in the dependency array

  return domNode;
};

// Hook to handle screen resize events
// In ./Hooks.tsx
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState(0);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setScreenSize(window.innerWidth);
    
    const handleResize = () => setScreenSize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return screenSize;
};
