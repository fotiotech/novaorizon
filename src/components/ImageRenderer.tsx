import Image from "next/image";
import React from "react";

interface ImageRendererProps {
  image?: string;
  alt?: string;
  className?: string;
}

const ImageRenderer = ({ image, alt, className = "" }: ImageRendererProps) => {
  const defaultImage = "/placeholder.png"; // Fallback image path

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Image
        src={image || defaultImage}
        alt={alt || (image ? `Image: ${image}` : "Placeholder image")}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
        priority={false}
      />
    </div>
  );
};

export default ImageRenderer;