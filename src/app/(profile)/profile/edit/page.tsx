"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Spinner from "@/components/Spinner";
import { useUserData } from "@/app/context/UserDataContext";
import { updateUserProfile } from "@/app/actions/users";
import useFileUploader from "@/hooks/useFileUploader";

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const COUNTRY_CODES = [
  { code: "+237", label: "🇨🇲 +237" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+234", label: "🇳🇬 +234" },
  { code: "+233", label: "🇬🇭 +233" },
  { code: "+254", label: "🇰🇪 +254" },
];

const GENDERS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

type Gender = "" | "male" | "female" | "other" | "prefer_not_to_say";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const AVATAR_SUBFOLDER = "avatars";

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function EditProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { profile, phone, loading: profileLoading, refetch } = useUserData();

  /* --------------------------- Avatar (S3 hook) ---------------------------- */
  const {
    files: avatarFiles,
    loading: avatarLoading,
    progressByName,
    addFiles: addAvatarFiles,
    removeFile: removeAvatarFile,
  } = useFileUploader(
    `avatar-${profile?._id ?? "new"}`,
    profile?.image ? [profile.image] : [],
    AVATAR_SUBFOLDER,
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // The most recently uploaded file is treated as the current avatar.
  const currentAvatar =
    avatarFiles.length > 0 ? avatarFiles[avatarFiles.length - 1] : null;

  // Aggregate upload progress for the single avatar tile.
  const progressValues = Object.values(progressByName);
  const inFlightPct = progressValues.length
    ? Math.min(...progressValues.map((p) => p ?? 0))
    : 100;
  const isAvatarUploading =
    avatarLoading || progressValues.some((p) => p !== undefined && p < 100);

  /* ------------------------------- Form state ------------------------------ */
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [countryCode, setCountryCode] = useState("+237");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* ----------------------------- Hydrate from ctx -------------------------- */
  useEffect(() => {
    if (profileLoading) return;
    setFullName(profile?.fullName ?? "");
    setGender(((profile as any)?.gender ?? "") as Gender);

    const dob = (profile as any)?.dateOfBirth;
    if (dob) {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) setDateOfBirth(d.toISOString().slice(0, 10));
    }

    setCountryCode(phone?.countryCode ?? "+237");
    setPhoneNumber(phone?.number ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading, profile?.fullName, phone?.number]);

  /* --------------------------------- Guards -------------------------------- */
  if (status === "loading" || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    router.push("/auth/login");
    return null;
  }

  /* ------------------------- Avatar: pick / remove ------------------------- */

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (!picked.length) return;

    // Client-side size guard (server still validates via presigned PUT)
    const tooBig = picked.find((f) => f.size > MAX_AVATAR_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is too large. Max 2 MB.`);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    // useFileUploader auto-uploads on add
    addAvatarFiles(picked);

    // Reset so picking the same file again still triggers onChange
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleAvatarRemove = async () => {
    if (!currentAvatar) return;
    if (!window.confirm("Remove your profile photo?")) return;

    const idx = avatarFiles.length - 1;
    try {
      await removeAvatarFile(idx, currentAvatar);
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove photo");
    }
  };

  /* ------------------------------- Validation ------------------------------ */

  const validate = () => {
    const errs: Record<string, string> = {};

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      errs.fullName = "Please enter both your first and last name.";
    }

    if (phoneNumber.trim()) {
      const digits = phoneNumber.replace(/\D/g, "");
      if (digits.length < 6)
        errs.phoneNumber = "Please enter a valid phone number.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* --------------------------------- Save ---------------------------------- */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isAvatarUploading) {
      setError("Please wait for the photo upload to finish.");
      return;
    }
    if (!validate()) return;

    setSaving(true);
    try {
      const res: any = await updateUserProfile({
        fullName: fullName.trim(),
        image: currentAvatar, // ← URL (or null to clear)
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender === "" ? null : (gender as Exclude<Gender, "">),
        phone: {
          countryCode: countryCode || null,
          number: phoneNumber.trim() || null,
        },
      });

      if (res?.error) {
        setError(res.error);
        setSaving(false);
        return;
      }

      await refetch();
      setSuccess("Profile updated successfully.");
      setSaving(false);
      setTimeout(() => router.push("/profile"), 900);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save profile");
      setSaving(false);
    }
  };

  const initial = (profile?.email || session.user?.email || "?")
    .charAt(0)
    .toUpperCase();

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="font-semibold text-lg text-gray-800">Edit Profile</h1>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="container mx-auto px-4 mt-6 max-w-2xl space-y-4"
      >
        {/* ------------------------------ Avatar ----------------------------- */}
        <section className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Profile Photo
          </h2>

          <div className="flex items-center gap-5">
            {/* Avatar preview / upload progress */}
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
              {isAvatarUploading ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-2">
                  <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden mb-2">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${inFlightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{inFlightPct}%</span>
                </div>
              ) : currentAvatar ? (
                <Image
                  src={currentAvatar}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-3xl">
                  {initial}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isAvatarUploading}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {currentAvatar ? "Change photo" : "Upload photo"}
                </button>

                {currentAvatar && !isAvatarUploading && (
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    className="px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                JPG, PNG or GIF. Max 2 MB.
              </p>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
        </section>

        {/* --------------------------- Personal info ------------------------- */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Personal Information
          </h2>

          {/* Full name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) {
                  setFieldErrors((p) => {
                    const n = { ...p };
                    delete n.fullName;
                    return n;
                  });
                }
              }}
              placeholder="Jane Doe"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none bg-white text-gray-900 ${
                fieldErrors.fullName
                  ? "border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-200"
              }`}
            />
            {fieldErrors.fullName ? (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.fullName}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                First and last name, e.g. "Jane Doe".
              </p>
            )}
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="dob"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date of Birth
              </label>
              <input
                id="dob"
                type="date"
                value={dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white text-gray-900"
              >
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ------------------------------ Contact ---------------------------- */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Contact Information
            </h2>
            {(profile as any)?.phoneVerified ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Verified
              </span>
            ) : phoneNumber ? (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Unverified
              </span>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-2 w-20 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                id="phoneNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (fieldErrors.phoneNumber) {
                    setFieldErrors((p) => {
                      const n = { ...p };
                      delete n.phoneNumber;
                      return n;
                    });
                  }
                }}
                placeholder="6XX XXX XXX"
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none bg-white text-gray-900 ${
                  fieldErrors.phoneNumber
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
              />
            </div>
            {fieldErrors.phoneNumber ? (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.phoneNumber}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Used for order updates. You can verify it later.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile?.email ?? session.user?.email ?? ""}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email can't be changed here.
            </p>
          </div>
        </section>

        {/* --------------------------- Feedback ------------------------------ */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* --------------------------- Actions ------------------------------- */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/profile"
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || isAvatarUploading}
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
            ) : isAvatarUploading ? (
              "Uploading photo..."
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
