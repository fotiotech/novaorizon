// app/terms/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Novaorizon",
  description: "Terms and conditions governing the use of Novaorizon online store.",
};

export default function TermsPage() {
  const lastUpdated = "September 11, 2026";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <header className="mb-12 border-b border-gray-200 pb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            Last updated: {lastUpdated}
          </p>
        </header>

        {/* Content */}
        <article className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-blue-600">
          <p className="lead text-lg text-gray-700">
            Welcome to Novaorizon. These Terms of Service (&quot;Terms&quot;)
            govern your access to and use of the Novaorizon online store located
            at novaorizon.vercel.app (the &quot;Site&quot;) and any products or
            services offered through the Site.
          </p>

          <p>
            By accessing, browsing, or purchasing from the Site, you agree to be
            bound by these Terms. If you do not agree to these Terms, please do
            not use the Site.
          </p>

          {/* Section 1 */}
          <h2>1. Acceptance of Terms</h2>
          <p>
            By using the Site, you confirm that you are at least 18 years of age
            or have the legal capacity to enter into a binding contract in your
            jurisdiction. If you are using the Site on behalf of a business
            entity, you represent that you have authority to bind that entity to
            these Terms.
          </p>

          {/* Section 2 */}
          <h2>2. Use of the Site</h2>
          <p>
            You agree to use the Site only for lawful purposes and in accordance
            with these Terms. You shall not:
          </p>
          <ul>
            <li>
              Use the Site in any way that violates applicable local, national,
              or international laws or regulations;
            </li>
            <li>
              Engage in any conduct that restricts or inhibits anyone&apos;s use
              or enjoyment of the Site;
            </li>
            <li>
              Attempt to gain unauthorized access to any portion of the Site,
              other accounts, or computer systems;
            </li>
            <li>
              Use any automated system, including robots, spiders, or scrapers,
              to access the Site;
            </li>
            <li>
              Introduce any viruses, malware, or other harmful material to the
              Site.
            </li>
          </ul>

          {/* Section 3 */}
          <h2>3. Products and Pricing</h2>
          <p>
            All products displayed on the Site are subject to availability. We
            reserve the right to discontinue any product at any time.
          </p>
          <p>
            Prices are listed in CFA Francs (XAF) and include applicable taxes
            unless otherwise stated. We reserve the right to change prices at any
            time without prior notice. In the event of a pricing error, we
            reserve the right to cancel any orders placed at the incorrect
            price.
          </p>

          {/* Section 4 */}
          <h2>4. Orders and Payment</h2>
          <p>
            By placing an order, you make an offer to purchase the selected
            products. All orders are subject to acceptance by Novaorizon. We will
            confirm your order by email or SMS after payment is received.
          </p>
          <p>
            We accept the following payment methods:
          </p>
          <ul>
            <li>MTN Mobile Money</li>
            <li>Orange Money</li>
            <li>Visa and Mastercard (where available)</li>
            <li>Cash on delivery (for eligible locations within Cameroon)</li>
          </ul>
          <p>
            Payment must be received in full before orders are dispatched, except
            for cash-on-delivery orders. We use secure third-party payment
            processors and do not store your full payment card details on our
            servers.
          </p>

          {/* Section 5 */}
          <h2>5. Shipping and Delivery</h2>
          <p>
            We currently ship within Cameroon. Delivery times vary depending on
            your location:
          </p>
          <ul>
            <li>
              <strong>Douala and Yaoundé:</strong> 1–3 business days
            </li>
            <li>
              <strong>Other urban centers:</strong> 3–7 business days
            </li>
            <li>
              <strong>Remote areas:</strong> 5–10 business days
            </li>
          </ul>
          <p>
            Shipping costs are calculated at checkout based on your delivery
            address and order weight. Risk of loss passes to you upon delivery.
            If your order is lost or damaged in transit, please contact us within
            48 hours of the expected delivery date.
          </p>

          {/* Section 6 */}
          <h2>6. Returns and Refunds</h2>
          <p>
            Under Cameroon&apos;s e-commerce law (Law No. 2010/021 of 21 December
            2010), consumers have the right to withdraw from a distance purchase
            within <strong>fifteen (15) business days</strong> without providing
            a reason and without penalty.
          </p>
          <p>To exercise your right of withdrawal, please contact us at:</p>
          <ul>
            <li>
              Email:{" "}
              <a href="mailto:support@novaorizon.com">
                support@novaorizon.com
              </a>
            </li>
          </ul>
          <p>
            Products must be returned in their original condition, unused, and
            with all original packaging. Return shipping costs are the
            responsibility of the customer unless the product is defective or
            incorrect.
          </p>
          <p>
            Refunds will be processed within 15 days of receiving the returned
            product, using the same payment method used for the original
            transaction.
          </p>
          <p>
            <strong>Exceptions:</strong> The right of withdrawal does not apply
            to:
          </p>
          <ul>
            <li>Perishable goods;</li>
            <li>Customized or personalized products;</li>
            <li>
              Sealed goods that have been unsealed for hygiene reasons (e.g.,
              cosmetics, personal care items);
            </li>
            <li>Digital products or services delivered immediately.</li>
          </ul>

          {/* Section 7 */}
          <h2>7. Intellectual Property</h2>
          <p>
            All content on the Site, including text, graphics, logos, images, and
            software, is the property of Novaorizon or its content suppliers and
            is protected by copyright and trademark laws. You may not reproduce,
            distribute, modify, or create derivative works from any content on
            the Site without our express written permission.
          </p>

          {/* Section 8 */}
          <h2>8. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Post or transmit any unlawful, threatening, or offensive content;</li>
            <li>
              Impersonate any person or entity or misrepresent your affiliation
              with any person or entity;
            </li>
            <li>
              Interfere with or disrupt the Site or servers connected to the
              Site;
            </li>
            <li>
              Violate any applicable laws or regulations in connection with your
              use of the Site.
            </li>
          </ul>
          <p>
            We reserve the right to terminate your access to the Site for
            violations of these Terms.
          </p>

          {/* Section 9 */}
          <h2>9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, Novaorizon shall
            not be liable for any indirect, incidental, special, consequential,
            or punitive damages arising out of or related to your use of the
            Site or any products purchased through the Site.
          </p>
          <p>
            Our total liability to you for any claim arising from these Terms or
            your use of the Site shall not exceed the amount you paid for the
            product or service giving rise to the claim.
          </p>
          <p>
            We do not warrant that the Site will be uninterrupted, error-free, or
            free of viruses or other harmful components.
          </p>

          {/* Section 10 */}
          <h2>10. Privacy</h2>
          <p>
            Your use of the Site is also governed by our{" "}
            <Link href="/privacy">Privacy Policy</Link>, which describes how we
            collect, use, and protect your personal information. By using the
            Site, you consent to our collection and use of your information as
            described in the Privacy Policy.
          </p>

          {/* Section 11 */}
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the
            laws of the Republic of Cameroon. Any disputes arising from these
            Terms or your use of the Site shall be subject to the exclusive
            jurisdiction of the courts of Douala, Cameroon.
          </p>

          {/* Section 12 */}
          <h2>12. Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will
            be effective immediately upon posting to the Site. Your continued use
            of the Site after any changes constitutes your acceptance of the
            revised Terms. We encourage you to review these Terms periodically.
          </p>

          {/* Section 13 */}
          <h2>13. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please
            contact us at:
          </p>
          <ul>
            <li>
              Email:{" "}
              <a href="mailto:support@novaorizon.com">
                support@novaorizon.com
              </a>
            </li>
            <li>Address: Douala, Cameroon</li>
          </ul>

          {/* Footer note */}
          <hr className="my-12" />
          <p className="text-sm text-gray-500">
            By using Novaorizon, you acknowledge that you have read, understood,
            and agree to be bound by these Terms of Service.
          </p>
        </article>

        {/* Back to store */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}