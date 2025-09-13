import { getCarriersById } from "@/app/actions/carrier";
import { updateBillingAddresses } from "@/app/actions/customer";
import { useUser } from "@/app/context/UserContext";
import { Carrier } from "@/constant/types";
import React, { useEffect, useState } from "react";

const BillingAddresses: React.FC = () => {
  const { user, customerInfos } = useUser();
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null
  );

  const toUpdateBillingAddresses = async (formData: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await updateBillingAddresses(user?._id as string, formData);
      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");
      console.error("Failed to update billing addresses:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchCarriers() {
      try {
        const data = await getCarriersById("675eeda75a81d16c81aca736");
        setCarrier(data);
      } catch (error) {
        console.error("Failed to fetch carriers:", error);
      }
    }
    fetchCarriers();
  }, []);

  useEffect(() => {
    if (submitStatus) {
      const timer = setTimeout(() => {
        setSubmitStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const billingAddress = customerInfos?.billingAddress;
  const paymentMeth = customerInfos?.billingMethod?.methodType;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-1">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <h2 className="text-2xl font-bold">Billing Information</h2>
          <p className="text-blue-100 mt-1">
            Update your payment details and billing address
          </p>
        </div>

        <div className="p-6">
          {submitStatus === "success" && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
              Billing information updated successfully!
            </div>
          )}

          {submitStatus === "error" && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              Failed to update billing information. Please try again.
            </div>
          )}

          <form
            action={toUpdateBillingAddresses}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Personal Information Section */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                Personal Information
              </h3>
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                defaultValue={billingAddress?.firstName}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter first name"
                title="First Name"
                pattern="^[A-Za-zÀ-ÿ' -]{2,40}$"
                autoComplete="given-name"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                defaultValue={billingAddress?.lastName}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter last name"
                title="Last Name"
                pattern="^[A-Za-zÀ-ÿ' -]{2,40}$"
                autoComplete="family-name"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                defaultValue={billingAddress?.email}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter email"
                title="Email"
                pattern="^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                defaultValue={billingAddress?.phone}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                pattern="^[+]?[0-9]{7,15}$"
                autoComplete="tel"
                title="Phone"
                placeholder="Enter phone number"
              />
            </div>

            {/* Address Section */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                Address Information
              </h3>
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Street</label>
              <input
                type="text"
                name="street"
                defaultValue={billingAddress?.street}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                autoComplete="address-line1"
                title="street"
                placeholder="Enter street"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Address</label>
              <input
                type="text"
                name="address"
                defaultValue={billingAddress?.address}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                autoComplete="street-address"
                title="Address"
                placeholder="Enter address"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">City</label>
              <input
                type="text"
                name="city"
                defaultValue={billingAddress?.city}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                autoComplete="address-level2"
                title="City"
                placeholder="Enter city"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Region</label>
              <select
                name="region"
                defaultValue={billingAddress?.region}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDE0IDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw3IDdMMTMgMSIgc3Ryb2tlPSIjNkI3MjhBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[center_right_1rem]"
                autoComplete="address-level1"
                title="Region"
              >
                <option value="">Select your Region</option>
                {carrier &&
                  carrier.regionsServed.map((region: any) => (
                    <option key={region._id} value={region.region}>
                      {region.region}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Country</label>
              <input
                type="text"
                name="country"
                defaultValue={billingAddress?.country}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                autoComplete="country"
                title="Country"
                placeholder="Enter country"
              />
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className="mb-2 font-medium text-gray-700">
                Preferences
              </label>
              <input
                type="text"
                name="preferences"
                defaultValue={billingAddress?.preferences}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                title="Preferences"
                placeholder="Any special preferences?"
              />
            </div>

            {/* Payment Section */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                Payment Method
              </h3>
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className="mb-2 font-medium text-gray-700">
                Payment Method
              </label>
              <select
                name="methodType"
                defaultValue={paymentMeth}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDE0IDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw3IDdMMTMgMSIgc3Ryb2tlPSIjNkI3MjhBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[center_right_1rem]"
                autoComplete="payment-method"
                title="Payment Method"
              >
                <option value="">Select your Payment Method</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="PayPal">PayPal</option>
              </select>
            </div>

            <div className="md:col-span-2 text-center mt-8 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BillingAddresses;
