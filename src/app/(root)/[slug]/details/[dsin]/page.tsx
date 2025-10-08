// app/[slug]/details/[dsin]/page.tsx (SERVER COMPONENT)
import { Metadata } from "next";
import Details from "./_compnents/Details";
import { findProducts } from "@/app/actions/products";

interface Params {
  slug: string;
  dsin: string;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const product: any = await findProducts(params?.dsin);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The product you are looking for does not exist.",
    };
  }

  return {
    title: product?.title || "Product Details",
    description: product?.description || "Discover this amazing product",
    openGraph: {
      title: product?.title,
      description: product?.description,
      images: [product?.main_image || "/logo.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title || "Product Details",
      description: product.description || "Discover this amazing product",
      images: [product.main_image || "/logo.png"],
    },
  };
}

export default async function DetailsPage({ params }: { params: Params }) {
  return <Details params={params} />;
}
