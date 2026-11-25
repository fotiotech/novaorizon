"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Delete } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import { useSession } from "@/lib/session";
import {
  getWishlist,
  removeFromWishlist,
  type WishlistItem,
} from "@/lib/api/wishlist";

function formatPrice(value: any): string {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "—";
  return `${number.toLocaleString("en-US")} F`;
}

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getWishlist();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) toast.error("Could not load your wishlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  const remove = async (productId: string) => {
    setRemoving(productId);
    try {
      await removeFromWishlist(productId);
      setItems((prev) =>
        prev.filter((item) => String(item.product?._id) !== productId),
      );
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Could not remove this item");
    } finally {
      setRemoving(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground">
        Loading wishlist…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold text-foreground">My wishlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please sign in to see your saved products.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">My wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} saved product{items.length === 1 ? "" : "s"}.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Your wishlist is empty.
          </p>
          <Link
            href="/products"
            className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((item) => {
            const product = item.product ?? {};
            const id = String(product._id ?? "");
            const href = `/products/${product.slug ?? "product"}/${id}`;

            return (
              <div
                key={item._id}
                className="group overflow-hidden rounded-xl border border-border bg-card"
              >
                <Link href={href} className="block">
                  <div className="relative aspect-square bg-muted">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]}
                        alt={product.name ?? "Product"}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      {product.name ?? "Product"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </Link>
                <div className="flex justify-end px-3 pb-3">
                  <button
                    type="button"
                    onClick={() => void remove(id)}
                    disabled={removing === id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-destructive disabled:opacity-50"
                  >
                    <Delete fontSize="inherit" />
                    {removing === id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((value) => Math.min(totalPages, value + 1))
            }
            disabled={currentPage === totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}