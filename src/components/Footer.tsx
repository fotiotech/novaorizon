// components/Footer.tsx
import Image from "next/image";
import React from "react";
import Link from "next/link";
import {
  LocationOn,
  Phone,
  Email,
  Facebook,
  Instagram,
  Twitter,
} from "@mui/icons-material";
import NewsletterForm from "./NewsletterForm";
import { PAYMENT_LOGOS } from "./PaymentLogos";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border text-foreground w-full">
      <div className="px-4 lg:px-10 py-12 max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand/Logo Section */}
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="mb-4">
              <div className="w-32 h-32 lg:w-40 lg:h-40 relative">
                <Image
                  src="/logoc1.png"
                  alt="Dyfk Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            <p className="text-center md:text-left text-muted-foreground mb-6 max-w-xs text-sm leading-relaxed">
              Faites vos Achats en un <br />
              Clik sur Novaorizon
            </p>

            {/* Social Media */}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
              <a
                href="#"
                className="bg-muted hover:bg-primary/20 p-2 rounded-full transition-all duration-200 hover:scale-110 text-foreground"
                aria-label="Twitter"
              >
                <Twitter fontSize="small" />
              </a>
              <a
                href="#"
                className="bg-muted hover:bg-primary/20 p-2 rounded-full transition-all duration-200 hover:scale-110 text-foreground"
                aria-label="Instagram"
              >
                <Instagram fontSize="small" />
              </a>
              <a
                href="#"
                className="bg-muted hover:bg-primary/20 p-2 rounded-full transition-all duration-200 hover:scale-110 text-foreground"
                aria-label="Facebook"
              >
                <Facebook fontSize="small" />
              </a>
            </div>

            {/* Newsletter Subscription */}
            <NewsletterForm />
          </div>

          {/* Company Information */}
          <div className="md:ml-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Novaorizon.com
            </h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Novaorizon is your premier destination for quality products at
              affordable prices. We are committed to providing exceptional
              customer service and a seamless shopping experience.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <div className="flex items-center">
                  <LocationOn
                    fontSize="small"
                    className="mr-2 opacity-70 shrink-0"
                  />
                  <span className="text-muted-foreground">
                    Ngousso, Yaounde, Cameroun
                  </span>
                </div>
                <div className="flex items-center">
                  <LocationOn
                    fontSize="small"
                    className="mr-2 opacity-70 shrink-0 sm:hidden"
                  />
                  <span className="text-muted-foreground">
                    Bonaberie, Douala, Cameroun
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <Phone fontSize="small" className="mr-2 opacity-70 shrink-0" />
                <span className="text-muted-foreground">
                  + (237) 696-210-939
                </span>
              </div>
              <div className="flex items-center">
                <Email fontSize="small" className="mr-2 opacity-70 shrink-0" />
                <span className="text-muted-foreground">
                  support@novaorizon.com
                </span>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="lg:ml-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Novaorizon Products
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                "Electronics",
                "Fashion & Apparel",
                "Home & Kitchen",
                "Beauty & Health",
                "Sports & Outdoors",
                "Books & Media",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Support */}
          <div className="lg:ml-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Customer Support
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { name: "Contact Us", link: "/contact" },
                { name: "FAQs", link: "/faqs" },
                { name: "Shipping Information", link: "/shipping-info" },
                { name: "Returns & Refunds", link: "/returns-refunds" },
                { name: "Track Order", link: "/profile/myorders" },
                { name: "Privacy Policy", link: "/privacy" },
                { name: "Terms of Service", link: "/terms" },
              ].map((item) => (
                <li
                  key={item.name}
                  className={
                    item.name === "Terms of Service" ? "col-span-2" : ""
                  }
                >
                  <Link
                    href={item.link}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-12 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold mb-3 text-center text-foreground">
            We Accept
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(
              [
                { key: "visa", h: "h-5" },
                { key: "mastercard", h: "h-5" },
                { key: "paypal", h: "h-5" },
                { key: "mobile-money", h: "h-6" },
                { key: "momo", h: "h-4" },
                { key: "orange-money", h: "h-4" },
              ] as const
            ).map(({ key, h }) => {
              const { label, Component } = PAYMENT_LOGOS[key];
              return (
                <div
                  key={key}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-muted/50 p-1 transition-colors duration-200 hover:border-primary"
                  title={label}
                >
                  <Component className={`${h} w-auto`} title={label} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Novaorizon. All rights reserved. |{" "}
            <a
              href="mailto:fotiodev@gmail.com"
              className="hover:text-primary transition-colors"
            >
              fotiodev@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
