import React, { ReactNode, Suspense } from "react";
import Header from "./Header";
import Footer from "./Footer";
import Loading from "@/app/loading";

interface layoutProps {
  children: ReactNode;
}

const Layout = ({ children }: layoutProps) => {
  return (
    <div>
      <Header />
      <Suspense fallback={<Loading />}>{children}</Suspense>
      <Footer />
    </div>
  );
};

export default Layout;
