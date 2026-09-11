// components/PaymentLogos.tsx
import React from "react";

type IconProps = {
  className?: string;
  title?: string;
};

/* -------------------- Visa -------------------- */
export const VisaLogo: React.FC<IconProps> = ({
  className = "h-8 w-auto",
  title = "Visa",
}) => (
  <svg
    viewBox="0 0 96 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={title}
    preserveAspectRatio="xMidYMid meet"
  >
    <title>{title}</title>
    <text
      x="48"
      y="23"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="22"
      fontWeight="800"
      fontStyle="italic"
      fill="#1A1F71"
      letterSpacing="1"
    >
      VISA
    </text>
  </svg>
);

/* -------------------- Mastercard -------------------- */
export const MastercardLogo: React.FC<IconProps> = ({
  className = "h-8 w-auto",
  title = "Mastercard",
}) => (
  <svg
    viewBox="0 0 96 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={title}
    preserveAspectRatio="xMidYMid meet"
  >
    <title>{title}</title>
    <g transform="translate(48 16)">
      <circle cx="-9" cy="0" r="11" fill="#EB001B" />
      <circle cx="9" cy="0" r="11" fill="#F79E1B" />
      <path d="M-9 -11a11 11 0 0 0 0 22 11 11 0 0 0 0-22Z" fill="#FF5F00" />
    </g>
  </svg>
);

/* -------------------- PayPal -------------------- */
export const PayPalLogo: React.FC<IconProps> = ({
  className = "h-8 w-auto",
  title = "PayPal",
}) => (
  <svg
    viewBox="0 0 128 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={title}
    preserveAspectRatio="xMidYMid meet"
  >
    <title>{title}</title>
    {/* Back P */}
    <path
      d="M8 4h15.5c5.6 0 9.2 2.9 8.5 8.5-.6 4.8-3.8 7.8-8.9 7.8h-6.3l-1.6 10h-6.8L8 4Z"
      fill="#003087"
    />
    {/* Front P */}
    <path
      d="M14.5 9h15.5c5.6 0 9.2 2.9 8.5 8.5-.6 4.8-3.8 7.8-8.9 7.8h-6.3L21.7 35h-6.8L14.5 9Z"
      fill="#009CDE"
    />
    {/* Wordmark */}
    <text
      x="46"
      y="24"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="15"
      fontWeight="700"
      fontStyle="italic"
    >
      <tspan fill="#003087">Pay</tspan>
      <tspan fill="#009CDE">Pal</tspan>
    </text>
  </svg>
);

/* -------------------- Mobile Money (generic) -------------------- */
export const MobileMoneyLogo: React.FC<IconProps> = ({
  className = "h-8 w-auto",
  title = "Mobile Money",
}) => (
  <svg
    viewBox="0 0 128 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={title}
    preserveAspectRatio="xMidYMid meet"
  >
    <title>{title}</title>
    {/* Phone body */}
    <rect
      x="6"
      y="3"
      width="16"
      height="26"
      rx="3"
      fill="none"
      stroke="#F5A623"
      strokeWidth="2.2"
    />
    {/* Screen */}
    <rect x="8.5" y="6" width="11" height="16" rx="1" fill="#FFF7E6" />
    {/* Home button */}
    <circle cx="14" cy="25.5" r="1.4" fill="#F5A623" />
    {/* Signal waves */}
    <path
      d="M27 16a5 5 0 0 1 5-5"
      stroke="#16A34A"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M27 21a10 10 0 0 1 10-10"
      stroke="#16A34A"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M27 26a15 15 0 0 1 15-15"
      stroke="#16A34A"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    {/* Wordmark */}
    <text
      x="46"
      y="21"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="11"
      fontWeight="700"
      fill="#16A34A"
    >
      Mobile
    </text>
    <text
      x="46"
      y="30"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="9"
      fontWeight="600"
      fill="#F5A623"
    >
      Money
    </text>
  </svg>
);

/* -------------------- MTN MoMo -------------------- */
export const MtnMomoLogo: React.FC<IconProps> = ({
  className = "h-8 w-auto",
  title = "MTN Mobile Money",
}) => (
  <svg
    viewBox="0 0 128 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={title}
    preserveAspectRatio="xMidYMid meet"
  >
    <title>{title}</title>
    <rect x="4" y="4" width="120" height="24" rx="4" fill="#FFCC00" />
    <text
      x="64"
      y="21"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="13"
      fontWeight="800"
      fill="#000000"
    >
      MTN MoMo
    </text>
  </svg>
);

/* -------------------- Orange Money -------------------- */
export const OrangeMoneyLogo: React.FC<IconProps> = ({
  className = "h-8 w-auto",
  title = "Orange Money",
}) => (
  <svg
    viewBox="0 0 128 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label={title}
    preserveAspectRatio="xMidYMid meet"
  >
    <title>{title}</title>
    <rect x="4" y="4" width="120" height="24" rx="4" fill="#FF7900" />
    <text
      x="64"
      y="21"
      textAnchor="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="12"
      fontWeight="800"
      fill="#FFFFFF"
    >
      Orange Money
    </text>
  </svg>
);

/* -------------------- Registry -------------------- */
export const PAYMENT_LOGOS: Record<
  string,
  { label: string; Component: React.FC<IconProps> }
> = {
  visa: { label: "Visa", Component: VisaLogo },
  mastercard: { label: "Mastercard", Component: MastercardLogo },
  paypal: { label: "PayPal", Component: PayPalLogo },
  "mobile-money": { label: "Mobile Money", Component: MobileMoneyLogo },
  momo: { label: "MTN MoMo", Component: MtnMomoLogo },
  "orange-money": { label: "Orange Money", Component: OrangeMoneyLogo },
};
