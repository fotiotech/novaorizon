import Image from "next/image";
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-surface text-text w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand/Logo Section */}
          <div className="flex flex-col items-center md:items-start">
            <div className="w-24 h-24 lg:w-32 lg:h-32 relative mb-4">
              <Image
                src="/logo.png"
                alt="Dyfk Logo"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-center md:text-left mb-6 max-w-xs">
              Faites vos Achats en un <br />
              Clik sur Dyfk
            </p>

            {/* Social Media */}
            <div className="flex items-center justify-center md:justify-start mb-6">
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
              <div className="flex flex-col sm:flex-row">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-2 rounded-t-lg sm:rounded-l-lg sm:rounded-t-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-b-lg sm:rounded-r-lg sm:rounded-b-none hover:bg-blue-700 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="md:ml-4">
            <h3 className="text-xl font-semibold mb-4">Dyfk.com</h3>
            <p className="mb-4">
              Dyfk is your premier destination for quality products at
              affordable prices. We are committed to providing exceptional
              customer service and a seamless shopping experience.
            </p>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center">
                <div className="flex items-center mb-1 sm:mb-0">
                  <Image
                    src="/perso/map-pin-line.png"
                    alt="Address"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  <span>Ngousso, Yaounde, Cameroun</span>
                </div>
                <div className="flex items-center sm:ml-4">
                  <span>Bonaberie, Douala, Cameroun</span>
                </div>
              </div>
              <div className="flex items-center">
                <Image
                  src="/perso/phone-line.png"
                  alt="Phone"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                <span>+ (237) 696-210-939</span>
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
          <div className="lg:ml-4">
            <h3 className="text-xl font-semibold mb-4">Dyfk Products</h3>
            <ul className="grid grid-cols-2 gap-2">
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Electronics
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Fashion & Apparel
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Home & Kitchen
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Beauty & Health
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Sports & Outdoors
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Books & Media
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="lg:ml-4">
            <h3 className="text-xl font-semibold mb-4">Customer Support</h3>
            <ul className="grid grid-cols-2 gap-2">
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Shipping Information
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Returns & Refunds
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Track Order
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Privacy Policy
                </a>
              </li>
              <li className="col-span-2">
                <a href="#" className="hover:text-blue-500 transition-colors text-sm md:text-base">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <h3 className="text-lg font-semibold mb-4 text-center">We Accept</h3>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
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
        <div className="mt-8 text-center text-sm md:text-base">
          <p>© 2023 Dyfk. All rights reserved. | fotiodev@gmail.com</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;