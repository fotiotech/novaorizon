// app/privacy/page.tsx
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Novaorizon",
  description:
    "Learn how Novaorizon collects, uses, and protects your personal information.",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Last Updated: September 2026
        </p>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700">
            At <strong>Novaorizon</strong> ("we," "our," or "us"), your privacy
            is important to us. This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you visit our
            website and use our services.
          </p>

          <hr className="my-6 border-gray-200" />

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            1. Information We Collect
          </h2>
          <p className="text-gray-700">
            We collect information you provide directly to us, such as when you
            create an account, place an order, subscribe to our newsletter, or
            contact customer support.
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              <strong>Personal Information:</strong> Name, email address, phone
              number, shipping address, billing address.
            </li>
            <li>
              <strong>Payment Information:</strong> Credit card details, PayPal
              information (processed securely by our payment partners).
            </li>
            <li>
              <strong>Order History:</strong> Products you have purchased or
              viewed.
            </li>
            <li>
              <strong>Account Credentials:</strong> Username and password
              (hashed and encrypted).
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              Process and fulfill your orders, including shipping and delivery.
            </li>
            <li>
              Send you order confirmations, updates, and promotional offers (you
              can opt out anytime).
            </li>
            <li>Improve our website, products, and customer service.</li>
            <li>
              Personalize your shopping experience and recommend products you
              may like.
            </li>
            <li>Prevent fraud and ensure the security of our platform.</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            3. Data Sharing & Third-Party Services
          </h2>
          <p className="text-gray-700">
            We may share your information with trusted third-party services to
            operate our business:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              <strong>Payment Processors:</strong> Stripe, PayPal, or other
              payment gateways to process transactions.
            </li>
            <li>
              <strong>Shipping & Logistics:</strong> FedEx, DHL, or local
              carriers to deliver your orders.
            </li>
            <li>
              <strong>Analytics & Marketing:</strong> Google Analytics, Meta
              (Facebook) Pixel, TikTok Pixel, and other platforms to measure ad
              performance and improve our campaigns.
            </li>
            <li>
              <strong>Customer Support:</strong> Zendesk, Freshdesk, or other
              ticketing systems.
            </li>
          </ul>
          <p className="text-gray-700 mt-2">
            We do <strong>not</strong> sell your personal information to third
            parties.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            4. Cookies & Tracking Technologies
          </h2>
          <p className="text-gray-700">
            We use cookies and similar tracking technologies to enhance your
            browsing experience, analyze site traffic, and deliver personalized
            ads. You can control cookie preferences through your browser
            settings.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            5. Your Rights
          </h2>
          <p className="text-gray-700">
            Depending on your location, you may have the following rights
            regarding your personal data:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>
              <strong>Access:</strong> Request a copy of your data.
            </li>
            <li>
              <strong>Correction:</strong> Update or correct inaccurate data.
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your data (subject
              to legal obligations).
            </li>
            <li>
              <strong>Opt-Out:</strong> Unsubscribe from marketing
              communications at any time.
            </li>
          </ul>
          <p className="text-gray-700 mt-2">
            To exercise these rights, please contact us at{" "}
            <strong>support@novaorizon.com</strong>.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            6. Data Security
          </h2>
          <p className="text-gray-700">
            We implement industry-standard security measures, including SSL
            encryption, secure servers, and restricted access, to protect your
            data from unauthorized access, alteration, or destruction.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            7. Data Retention
          </h2>
          <p className="text-gray-700">
            We retain your personal information only as long as necessary to
            fulfill the purposes outlined in this policy, unless a longer
            retention period is required by law.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            8. Children's Privacy
          </h2>
          <p className="text-gray-700">
            Our services are not directed to individuals under the age of 13. We
            do not knowingly collect personal information from children. If you
            believe we have inadvertently collected such data, please contact us
            immediately.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            9. Changes to This Policy
          </h2>
          <p className="text-gray-700">
            We may update this Privacy Policy from time to time. The latest
            version will always be posted on this page with the effective date.
            We encourage you to review it periodically.
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mt-6">
            10. Contact Us
          </h2>
          <p className="text-gray-700">
            If you have any questions, concerns, or requests regarding this
            Privacy Policy, please reach out to us:
          </p>
          <ul className="list-none pl-6 text-gray-700 space-y-1">
            <li>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:support@novaorizon.com"
                className="text-blue-600 hover:underline"
              >
                support@novaorizon.com
              </a>
            </li>
            <li>
              <strong>Address:</strong> 123 Commerce Street, City, State, ZIP
            </li>
            <li>
              <strong>Phone:</strong> +1 (555) 123-4567
            </li>
          </ul>

          <hr className="my-6 border-gray-200" />

          <p className="text-sm text-gray-500 italic">
            This Privacy Policy was created to comply with applicable data
            protection laws including GDPR, CCPA, and other global privacy
            regulations.
          </p>
        </div>

        {/* Back to home button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
