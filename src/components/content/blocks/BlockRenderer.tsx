// components/content/blocks/BlockRenderer.tsx
import { BlockSection } from "./BlockSection";
import type { ResolvedBlock } from "@/lib/content/blocks/resolve";

interface BlockRendererProps {
  blocks: ResolvedBlock[];
  className?: string;
}

export function BlockRenderer({ blocks, className }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((b) => (
        <BlockSection key={b.block._id} data={b} />
      ))}
    </div>
  );
}

export default BlockRenderer;
