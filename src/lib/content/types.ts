// lib/content/types.ts
//
// Shared render shapes for content blocks. These are *types only* — the
// resolution itself now happens in the Express backend
// (`GET /api/catalog/blocks?location=…`).
import type {
  BlockAnimation,
  BlockAlignment,
  BlockLocation,
  BlockSourceStyles,
  BlockTheme,
  CardLayout,
  CardRatio,
  CardShape,
  CardSize,
  ImagePosition,
  TitlePosition,
} from "@/lib/content/constants";

export type { BlockSourceStyles };

export interface NormalizedContentItem {
  _id: string;
  name: string;
  image: string | null;
  description?: string | null;
  href: string;
  contentType: "Product" | "Category" | "Brand" | "Promotion" | "Page" | "Collection";
  price?: number | null;
  listPrice?: number | null;
  badge?: string | null;
  subline?: string | null;
  meta?: { code?: string };
  averageRating?: number | null;
  reviewCount?: number | null;
  promotions?: Array<{
    _id: string;
    label: string;
    description?: string | null;
    code?: string | null;
    calculationType?: string;
    discount?: number | null;
  }>;
  pricing?: {
    originalPrice: number;
    promotionalPrice: number;
    discount: number;
    appliedPromotionId: string | null;
  } | null;
}

export interface ResolvedHeading {
  title: string;
  subtitle: string;
  showHeading: boolean;
}

export interface ResolvedCta {
  text: string;
  link: string;
  style: "none" | "link" | "button";
}

export interface ResolvedDisplayConfig {
  theme: BlockTheme;
  columns: number;
  gap: number;
  borderless: boolean;
  rounded: boolean;
  shadow: boolean;
  alignment: BlockAlignment;
  animation: BlockAnimation;
  cardShape: CardShape;
  cardRatio: CardRatio;
  cardSize: CardSize;
  cardLayout: CardLayout;
  titlePosition: TitlePosition;
  imagePosition: ImagePosition;
  backgroundColor: string;
  textColor: string;
}

export type ResolvedSourceStyles = BlockSourceStyles;

export interface ResolvedBlock {
  block: {
    _id: string;
    name: string;
    location: BlockLocation;
    display: string;
    heading: ResolvedHeading;
    displayConfig: ResolvedDisplayConfig;
    sourceStyles: ResolvedSourceStyles;
    cta: ResolvedCta;
    limit: number;
  };
  items: NormalizedContentItem[];
}