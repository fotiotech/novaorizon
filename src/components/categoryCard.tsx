import ImageRenderer from "@/components/ImageRenderer";

interface CategoryCardProps {
  name: string;
  imageUrl: string;
  href?: string;
}

export default function CategoryCard({
  name,
  imageUrl,
  href,
}: CategoryCardProps) {
  const CardContent = (
    <div className="bg-white shadow rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow">
      <div className="w-full h-48 bg-gray-100">
        <ImageRenderer
          image={imageUrl}
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-center">{name}</h3>
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{CardContent}</a>;
  }

  return CardContent;
}
