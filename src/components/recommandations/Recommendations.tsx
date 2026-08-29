import { getRecommendations } from "@/app/actions/events";
import { ProductCard } from "./ProductCard";

interface RecommendationsProps {
  /** Number of items to show, default 10 */
  limit?: number;
  /** Custom class name for the grid container */
  className?: string;
  /** Custom message when no recommendations are found */
  emptyMessage?: string;
}

export default async function Recommendations({
  limit = 10,
  className = "grid grid-cols-2 md:grid-cols-5 gap-4",
  emptyMessage = "No recommendations yet. Start browsing to get personalized picks!",
}: RecommendationsProps) {
  const products = await getRecommendations(limit);

  if (!products || products.length === 0) {
    return (
      <div className="text-center px-2 text-sm text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-2">For You</h1>
      <div className={className}>
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
