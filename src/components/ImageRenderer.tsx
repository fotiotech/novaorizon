import Image from "next/image";
import React from "react";

interface ImageRendererProps {
  image?: string;
}

const ImageRenderer = ({ image }: ImageRendererProps) => {
  const defaultImage = "/placeholder.png"; // Fallback image path

  // Determine class and rendering style based on file type
  const getImageStyle = (image: string | undefined) => {
    if (image?.includes(".png")) {
      return {
        className: "object-cover rounded-lg",
        layout: "intrinsic",
      };
    } else if (
      image?.includes(".jpg") ||
      image?.includes(".jpeg") ||
      image?.includes(".webp") ||
      image?.includes(".avif")
    ) {
      return { className: "object-cover rounded-lg", layout: "responsive" };
    }
    return {
      className: "object-cover rounded-lg",
      layout: "intrinsic",
    }; // Default style
  };

  const { className, layout } = getImageStyle(image);

  return (
    <Image
      src={image || defaultImage} // Use fallback if image is unavailable
      width={500}
      height={500}
      alt={image ? `Rendered image: ${image}` : "Default placeholder image"}
      loading="lazy"
      className={`${className}`}
      layout={layout}
    />
  );
};

export default ImageRenderer;
