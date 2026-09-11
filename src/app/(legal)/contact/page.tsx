// app/contact/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { submitContactMessage } from "@/app/actions/contact";
import { useSearchParams } from "next/navigation";

const SUBJECT_OPTIONS = [
  "General enquiry",
  "Order status",
  "Returns & refunds",
  "Shipping & delivery",
  "Product question",
  "Payment issue",
  "Partnership / wholesale",
  "Other",
];

const CONTACT_DETAILS = [
  {
    label: "Email",
    value: "support@novaorizon.com",
    href: "mailto:support@novaorizon.com",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
        />
      </svg>
    ),
  },
  {
    label: "Phone / WhatsApp",
    value: "+237 6 XX XX XX XX",
    href: "tel:+2376XXXXXXXX",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
        />
      </svg>
    ),
  },
  {
    label: "Office",
    value: "Douala, Cameroon",
    href: null,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
        />
      </svg>
    ),
  },
  {
    label: "Business Hours",
    value: "Mon – Sat, 8:00 – 18:00 WAT",
    href: null,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  },
];

const ContactPage = () => {
  const searchParams = useSearchParams();
  const initialSubject =
    SUBJECT_OPTIONS.find((s) => s === searchParams.get("subject")) ||
    SUBJECT_OPTIONS[0];

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: initialSubject,
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await submitContactMessage(form);

    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setForm({
        name: "",
        email: "",
        phone: "",
        subject: SUBJECT_OPTIONS[0],
        message: "",
      });
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-2 text-sm text-gray-500">
            Have a question about an order, a product, or anything else?
            We&apos;d love to hear from you. Our team typically responds within
            24 hours.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 mt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Contact details column */}
          <aside className="lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Get in touch
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Prefer to reach out directly? Use one of the channels below.
              </p>

              <ul className="mt-6 space-y-5">
                {CONTACT_DETAILS.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        {item.label}
                      </p>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-sm font-medium text-gray-800 hover:text-blue-600 break-words"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-800">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">
                Quick links
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link
                    href="/returns-refunds"
                    className="text-blue-600 hover:underline"
                  >
                    Returns &amp; Refunds
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile/myorders"
                    className="text-blue-600 hover:underline"
                  >
                    Track my order
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </aside>

          {/* Contact form column */}
          <div className="lg:col-span-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Send us a message
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Fill in the form and we&apos;ll get back to you by email.
              </p>

              {success && (
                <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    Thank you! Your message has been sent.
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    We&apos;ll get back to you at the email address you
                    provided.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+237 696 210 939"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                    >
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Please include your order number if your enquiry is about a
                    specific order.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        name: "",
                        email: "",
                        phone: "",
                        subject: SUBJECT_OPTIONS[0],
                        message: "",
                      })
                    }
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ teaser (optional) */}
        <div className="mt-12 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Frequently asked questions
          </h2>
          <div className="mt-4 space-y-4">
            <details className="group rounded-lg border border-gray-200 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-gray-800">
                How long does delivery take?
              </summary>
              <p className="mt-2 text-sm text-gray-600">
                Deliveries within Douala and Yaoundé typically arrive within 1–3
                business days. Other urban centres take 3–7 business days, and
                remote areas up to 10 business days.
              </p>
            </details>
            <details className="group rounded-lg border border-gray-200 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-gray-800">
                What payment methods do you accept?
              </summary>
              <p className="mt-2 text-sm text-gray-600">
                MTN Mobile Money, Orange Money, Visa/Mastercard, and cash on
                delivery for eligible locations within Cameroon.
              </p>
            </details>
            <details className="group rounded-lg border border-gray-200 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-gray-800">
                How do I return an item?
              </summary>
              <p className="mt-2 text-sm text-gray-600">
                Visit our{" "}
                <Link href="/returns" className="text-blue-600 hover:underline">
                  Returns &amp; Refunds
                </Link>{" "}
                page to submit a return request. Consumers in Cameroon have 15
                business days from delivery to withdraw from a purchase.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
