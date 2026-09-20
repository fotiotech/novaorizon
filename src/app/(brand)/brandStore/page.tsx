import { Suspense } from "react";
import BrandStoreContent from "./_component/BrandStoreContent";

function BrandStoreFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

export default function BrandStorePage() {
  return (
    <Suspense fallback={<BrandStoreFallback />}>
      <BrandStoreContent />
    </Suspense>
  );
}
