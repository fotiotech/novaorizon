import React, { useEffect, useState, useCallback, useRef } from "react";
import ImageRenderer from "./ImageRenderer";

interface DetailImagesProps {
  file?: string[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showThumbnails?: boolean;
}

const DetailImages: React.FC<DetailImagesProps> = ({
  file = [],
  autoPlay = true,
  autoPlayInterval = 6000,
  showThumbnails = true,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalImages = file.length;

  const slideToIndex = useCallback(
    (direction: "left" | "right" | number) => {
      if (typeof direction === "number") {
        setCurrentImageIndex(direction);
        return;
      }

      setCurrentImageIndex((prevIndex) => {
        if (direction === "right") {
          return prevIndex === totalImages - 1 ? 0 : prevIndex + 1;
        } else {
          return prevIndex === 0 ? totalImages - 1 : prevIndex - 1;
        }
      });
    },
    [totalImages]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left
      slideToIndex("right");
    } else if (touchEnd - touchStart > 50) {
      // Swipe right
      slideToIndex("left");
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        slideToIndex("right");
      } else if (e.key === "ArrowLeft") {
        slideToIndex("left");
      } else if (e.key === " ") {
        setIsPlaying((prev) => !prev);
      }
    },
    [slideToIndex]
  );

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || !isPlaying || totalImages <= 1) return;

    intervalRef.current = setInterval(() => {
      slideToIndex("right");
    }, autoPlayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoPlay, autoPlayInterval, isPlaying, slideToIndex, totalImages]);

  // Keyboard navigation
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!file || file.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No images to display</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto group">
      {/* Play/Pause Button */}
      {autoPlay && totalImages > 1 && (
        <button
          aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute top-2 right-2 z-20 p-2 bg-black bg-opacity-50 rounded-full 
                     text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}

      {/* Navigation Arrows */}
      {totalImages > 1 && (
        <div
          className="absolute z-10 flex justify-between items-center 
                  px-2 lg:px-4 top-1/2 transform -translate-y-1/2 
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                  left-0 w-full pointer-events-none"
        >
          <button
            aria-label="Previous image"
            title="Previous image"
            onClick={() => slideToIndex("left")}
            className="pointer-events-auto flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 
                     bg-white bg-opacity-80 rounded-full shadow-md cursor-pointer 
                     hover:bg-opacity-100 transition-all duration-200"
          >
            <svg
              className="w-4 h-4 lg:w-5 lg:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            aria-label="Next image"
            title="Next image"
            onClick={() => slideToIndex("right")}
            className="pointer-events-auto flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 
                     bg-white bg-opacity-80 rounded-full shadow-md cursor-pointer 
                     hover:bg-opacity-100 transition-all duration-200"
          >
            <svg
              className="w-4 h-4 lg:w-5 lg:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Image Counter */}
      {totalImages > 1 && (
        <div className="absolute top-2 left-2 z-20 px-2 py-1 text-xs text-white bg-black bg-opacity-50 rounded-md">
          {currentImageIndex + 1} / {totalImages}
        </div>
      )}

      {/* Image Slider */}
      <div
        className="whitespace-nowrap bg-gray-100 transition-transform duration-500 ease-in-out overflow-hidden rounded-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {file.map((image, index) => (
          <div
            key={index}
            className="inline-block w-full h-full relative flex-shrink-0"
            style={{
              transform: `translateX(-${currentImageIndex * 100}%)`,
            }}
          >
            <ImageRenderer image={image} />
          </div>
        ))}
      </div>

      {/* Thumbnail Navigation */}
      {showThumbnails && totalImages > 1 && (
        <div className="flex justify-start items-center gap-2 mt-4 overflow-x-auto py-2 px-1">
          {file.map((image, index) => (
            <button
              key={index}
              onClick={() => slideToIndex(index)}
              aria-label={`View image ${index + 1}`}
              className={`flex-shrink-0 w-16 h-16 overflow-hidden rounded-md border-2 
                        transition-all duration-200 hover:opacity-100 ${
                          index === currentImageIndex
                            ? "border-blue-500 opacity-100"
                            : "border-gray-300 opacity-70"
                        }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dots Navigation */}
      {!showThumbnails && totalImages > 1 && (
        <div className="flex justify-center items-center gap-2 lg:gap-3 w-full py-3">
          {file.map((_, index) => (
            <button
              key={index}
              onClick={() => slideToIndex(index)}
              aria-label={`View image ${index + 1}`}
              className={`${
                index === currentImageIndex
                  ? "bg-blue-500 w-6"
                  : "bg-gray-300 w-2"
              } h-2 rounded-full cursor-pointer transition-all duration-300 hover:bg-blue-400`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DetailImages;
