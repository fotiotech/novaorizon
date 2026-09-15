"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { SignOut } from "@/app/(auth)/components/auth/SignInButton";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { useUnreadMessages } from "../../(checkout)/checkout/chat/_component/useUnreadMessages";
import { useUserData } from "@/app/context/UserDataContext";
import { updateUserProfile } from "@/app/actions/users";

const CURRENCIES = ["XAF", "USD", "EUR", "GBP", "NGN", "GHS", "KES"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
  { code: "pt", label: "Português" },
  { code: "sw", label: "Kiswahili" },
];

const Profile = () => {
  const { data: session, status } = useSession();
  const unreadCount = useUnreadMessages();
  const user: any = session?.user;
  const router = useRouter();

  const {
    profile,
    phone,
    preferences,
    profileCompletion,
    loading: profileLoading,
  } = useUserData();

  const [prefsOpen, setPrefsOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session || !user) {
    router.push("/auth/login");
    return null;
  }

  const displayName = profile?.fullName || user.name || user.email;

  const displayPhone =
    phone?.e164 ||
    (phone?.countryCode && phone?.number
      ? `${phone.countryCode}${phone.number}`
      : null);

  const avatarUrl = profile?.image || user.image;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-semibold text-xl text-gray-800">Profile</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
              className="hidden sm:block px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
            >
              {preferences?.currency ?? "Currency"} ·{" "}
              {(preferences?.language ?? "en").toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Completion banner */}
          {!profileLoading && !profileCompletion.completed && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900">
                    Complete your profile
                  </p>
                  <p className="text-sm text-amber-800 mt-1">
                    {profileCompletion.missing.length === 4
                      ? "Add your name, phone number, avatar, and preferences to get started."
                      : `Missing: ${profileCompletion.missing
                          .map((m: string) =>
                            m === "preferences" ? "preferences" : m,
                          )
                          .join(", ")}.`}
                  </p>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-amber-800 mb-1">
                      <span>Progress</span>
                      <span>{profileCompletion.percentage}%</span>
                    </div>
                    <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${profileCompletion.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Link
                  href="/profile/edit"
                  className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Complete
                </Link>
              </div>
            </div>
          )}

          {/* User card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center min-w-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-12 w-12 rounded-full object-cover mr-3 border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="bg-blue-100 text-blue-800 rounded-full h-12 w-12 flex items-center justify-center font-bold text-lg mr-3">
                      {(profile?.email || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {displayName}
                    </p>
                    <p className="text-gray-600 text-sm truncate">
                      {profile?.email || user.email}
                    </p>
                    {displayPhone && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">
                        {displayPhone}
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href="/profile/edit"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium shrink-0"
                >
                  Edit
                </Link>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Edit Profile */}
              <Link
                href="/profile/edit"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">
                  Edit Profile
                </span>
                {!profileCompletion.completed && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Incomplete
                  </span>
                )}
              </Link>

              {/* Language / Currency / Theme — opens modal */}
              <button
                type="button"
                onClick={() => setPrefsOpen(true)}
                className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group text-left"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <div className="flex-1">
                  <span className="text-gray-700 group-hover:text-blue-600 block">
                    Language, Currency & Theme
                  </span>
                  <span className="text-xs text-gray-400">
                    {(preferences?.language ?? "en").toUpperCase()} ·{" "}
                    {preferences?.currency ?? "XAF"} ·{" "}
                    {preferences?.theme ?? "system"}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400 group-hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {/* My Orders */}
              <Link
                href="/profile/myorders"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">
                  My Orders
                </span>
              </Link>

              {/* Chats */}
              {/* <Link
                href={`/checkout/chat`}
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="relative">
                  {unreadCount > 0 && (
                    <p className="absolute right-0 -top-2 bg-red-500 text-xs rounded-full px-1 min-w-[18px] text-center text-white">
                      {unreadCount}
                    </p>
                  )}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <span className="text-gray-700 group-hover:text-blue-600">
                  Chats
                </span>
              </Link> */}

              {/* Addresses */}
              <Link
                href="/profile/address"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">
                  Addresses
                </span>
              </Link>

              {/* Payment Methods */}
              <Link
                href="/profile/payment"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">
                  Payment Methods
                </span>
              </Link>

              {/* My Reviews */}
              <Link
                href="/profile/myreviews"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">
                  My Reviews
                </span>
              </Link>

              {/* Seller */}
              {user.role === "seller" ? (
                <Link
                  href="https://novaorizon-seller.vercel.app"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-gray-700 group-hover:text-blue-600">
                    Seller Account
                  </span>
                </Link>
              ) : (
                <Link
                  href="https://novaorizon-seller.vercel.app/auth/sign_up"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 mr-3 group-hover:text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-gray-700 group-hover:text-blue-600">
                    Become Seller
                  </span>
                </Link>
              )}

              {/* Sign out */}
              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-700">
                  <SignOut />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences modal */}
      {prefsOpen && (
        <PreferencesModal
          initialLanguage={preferences?.language ?? "en"}
          initialCurrency={preferences?.currency ?? "XAF"}
          initialTheme={(preferences?.theme as any) ?? "system"}
          onClose={() => setPrefsOpen(false)}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Preferences Modal                             */
/* -------------------------------------------------------------------------- */

function PreferencesModal({
  initialLanguage,
  initialCurrency,
  initialTheme,
  onClose,
}: {
  initialLanguage: string;
  initialCurrency: string;
  initialTheme: "light" | "dark" | "system";
  onClose: () => void;
}) {
  const { refetch } = useUserData();
  const [language, setLanguage] = useState(initialLanguage);
  const [currency, setCurrency] = useState(initialCurrency);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(initialTheme);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res: any = await updateUserProfile({
        preferences: { language, currency, theme },
      });
      if (res?.error) {
        setError(res.error);
        setSaving(false);
        return;
      }
      await refetch();
      setSaving(false);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            Language, Currency & Theme
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => {
                const active = theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      active
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
