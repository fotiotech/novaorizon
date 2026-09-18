export default function BrandStoreRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="mt-10">{children}</div>;
}
