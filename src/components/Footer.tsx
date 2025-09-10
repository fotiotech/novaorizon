import Image from "next/image";
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-surface text-text w-full">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main footer content */}
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          {/* Brand/Logo Section */}
          <div className="flex-1 flex flex-col items-center lg:items-start">
            <div className="w-32 h-32 relative mb-4">
              <Image
                src="/logo.png"
                alt="Dyfk Logo"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-center lg:text-left mb-6">
              Faites vos Achats en un <br />
              Clik sur Dyfk
            </p>

            {/* Social Media */}
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <a href="#" className="mx-2 transition-transform hover:scale-110">
                <Image
                  src="/perso/twitter-x-line.png"
                  alt="Twitter/X"
                  width={30}
                  height={30}
                  className="bg-white p-2 rounded-full"
                />
              </a>
              <a href="#" className="mx-2 transition-transform hover:scale-110">
                <Image
                  src="/perso/instagram-line.png"
                  alt="Instagram"
                  width={30}
                  height={30}
                  className="bg-white p-2 rounded-full"
                />
              </a>
              <a href="#" className="mx-2 transition-transform hover:scale-110">
                <Image
                  src="/perso/facebook-line.png"
                  alt="Facebook"
                  width={30}
                  height={30}
                  className="bg-white p-2 rounded-full"
                />
              </a>
            </div>

            {/* Newsletter Subscription */}
            <div className="w-full max-w-xs">
              <p className="font-medium mb-2">Subscribe to our newsletter</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4">Dyfk.com</h3>
            <p className="mb-4">
              Dyfk is your premier destination for quality products at
              affordable prices. We are committed to providing exceptional
              customer service and a seamless shopping experience.
            </p>
            <div className="space-y-2">
              <div className="flex items-center">
                <Image
                  src="/perso/map-pin-line.png"
                  alt="Address"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                <span>123 Commerce Street, City, Country</span>
              </div>
              <div className="flex items-center">
                <Image
                  src="/perso/phone-line.png"
                  alt="Phone"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center">
                <Image
                  src="/perso/mail-line.png"
                  alt="Email"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                <span>support@dyfk.com</span>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4">Dyfk Products</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Electronics
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Fashion & Apparel
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Home & Kitchen
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Beauty & Health
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Sports & Outdoors
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Books & Media
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4">Customer Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Shipping Information
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Returns & Refunds
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Track Order
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <h3 className="text-lg font-semibold mb-4 text-center">We Accept</h3>
          <div className="flex justify-center gap-4">
            <Image
              src="/payment/visa.png"
              alt="Visa"
              width={50}
              height={30}
              className="border rounded p-1"
            />
            <Image
              src="/payment/mastercard.png"
              alt="Mastercard"
              width={50}
              height={30}
              className="border rounded p-1"
            />
            <Image
              src="/payment/paypal.png"
              alt="PayPal"
              width={50}
              height={30}
              className="border rounded p-1"
            />
            <Image
              src="/payment/apple-pay.png"
              alt="Apple Pay"
              width={50}
              height={30}
              className="border rounded p-1"
            />
            <Image
              src="/payment/google-pay.png"
              alt="Google Pay"
              width={50}
              height={30}
              className="border rounded p-1"
            />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center">
          <p>© 2023 Dyfk. All rights reserved. | fotiodev@gmail.com</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
