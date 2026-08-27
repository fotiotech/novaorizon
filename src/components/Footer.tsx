import Image from "next/image";
import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border text-foreground w-full">
      <div className="px-4 lg:px-10 py-12 max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand/Logo Section */}
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="mb-4">
              <div className="w-24 h-24 lg:w-32 lg:h-32 relative">
                <Image
                  src="/logo.png"
                  alt="Dyfk Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            <p className="text-center md:text-left text-muted-foreground mb-6 max-w-xs text-sm leading-relaxed">
              Faites vos Achats en un <br />
              Clik sur Dyfk
            </p>

            {/* Social Media */}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
              <a
                href="#"
                className="bg-muted hover:bg-primary/20 p-2 rounded-full transition-all duration-200 hover:scale-110"
                aria-label="Twitter"
              >
                <Image
                  src="/perso/twitter-x-line.png"
                  alt="Twitter/X"
                  width={24}
                  height={24}
                  className="filter invert-0 dark:invert"
                />
              </a>
              <a
                href="#"
                className="bg-muted hover:bg-primary/20 p-2 rounded-full transition-all duration-200 hover:scale-110"
                aria-label="Instagram"
              >
                <Image
                  src="/perso/instagram-line.png"
                  alt="Instagram"
                  width={24}
                  height={24}
                  className="filter invert-0 dark:invert"
                />
              </a>
              <a
                href="#"
                className="bg-muted hover:bg-primary/20 p-2 rounded-full transition-all duration-200 hover:scale-110"
                aria-label="Facebook"
              >
                <Image
                  src="/perso/facebook-line.png"
                  alt="Facebook"
                  width={24}
                  height={24}
                  className="filter invert-0 dark:invert"
                />
              </a>
            </div>

            {/* Newsletter Subscription */}
            <div className="w-full max-w-xs">
              <p className="font-medium text-sm mb-2 text-foreground">
                Subscribe to our newsletter
              </p>
              <div className="flex flex-col sm:flex-row">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-2 rounded-t-lg sm:rounded-l-lg sm:rounded-t-none border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-b-lg sm:rounded-r-lg sm:rounded-b-none hover:bg-primary/90 transition-colors font-medium text-sm">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="md:ml-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Dyfk.com
            </h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Dyfk is your premier destination for quality products at
              affordable prices. We are committed to providing exceptional
              customer service and a seamless shopping experience.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <div className="flex items-center">
                  <Image
                    src="/perso/map-pin-line.png"
                    alt="Address"
                    width={18}
                    height={18}
                    className="mr-2 opacity-70"
                  />
                  <span className="text-muted-foreground">
                    Ngousso, Yaounde, Cameroun
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground">
                    Bonaberie, Douala, Cameroun
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <Image
                  src="/perso/phone-line.png"
                  alt="Phone"
                  width={18}
                  height={18}
                  className="mr-2 opacity-70"
                />
                <span className="text-muted-foreground">
                  + (237) 696-210-939
                </span>
              </div>
              <div className="flex items-center">
                <Image
                  src="/perso/mail-line.png"
                  alt="Email"
                  width={18}
                  height={18}
                  className="mr-2 opacity-70"
                />
                <span className="text-muted-foreground">support@dyfk.com</span>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="lg:ml-4">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Dyfk Products
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
                "Contact Us",
                "FAQs",
                "Shipping Information",
                "Returns & Refunds",
                "Track Order",
                "Privacy Policy",
                "Terms of Service",
              ].map((item) => (
                <li
                  key={item}
                  className={item === "Terms of Service" ? "col-span-2" : ""}
                >
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
        </div>

        {/* Payment Methods */}
        <div className="mt-12 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold mb-4 text-center text-foreground">
            We Accept
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {["visa", "mastercard", "paypal", "apple-pay", "google-pay"].map(
              (method) => (
                <div
                  key={method}
                  className="bg-muted/50 p-2 rounded-lg border border-border hover:border-primary transition-colors duration-200"
                >
                  <Image
                    src={`/payment/${method}.png`}
                    alt={method.charAt(0).toUpperCase() + method.slice(1)}
                    width={50}
                    height={30}
                    className="h-8 w-auto object-contain"
                  />
                </div>
              ),
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Dyfk. All rights reserved. |{" "}
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
