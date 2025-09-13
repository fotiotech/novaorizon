import { getCarriersById } from "@/app/actions/carrier";
import { updateShippingInfos } from "@/app/actions/customer";
import { useUser } from "@/app/context/UserContext";
import { Carrier } from "@/constant/types";
import { useState, useEffect } from "react";

export interface ShippingData {
  street: string;
  region: string;
  city: string;
  address: string;
  country: string;
  carrier: string;
  shippingMethod: "standard" | "express" | "overnight";
}

const ShippingForm = ({
  shippingAddressCheck,
}: {
  shippingAddressCheck?: boolean;
}) => {
  const { user, customerInfos } = useUser();
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null
  );

  // Wrap the action to ensure it returns void
  const toUpdateShippingInfos = async (formData: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await updateShippingInfos(user?._id as string, formData);
      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");
      console.error("Failed to update shipping information:", error);
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

  const shippingAddress = shippingAddressCheck
    ? customerInfos?.billingAddress
    : customerInfos?.shippingAddress;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-1">
        <div className="bg-gradient-to-r from-green-600 to-teal-700 p-6 text-white">
          <h2 className="text-2xl font-bold">Shipping Information</h2>
          <p className="text-green-100 mt-1">
            {shippingAddressCheck
              ? "Using billing address as shipping address"
              : "Update your shipping details and delivery preferences"}
          </p>
        </div>

        <div className="p-6">
          {submitStatus === "success" && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
              Shipping information updated successfully!
            </div>
          )}

          {submitStatus === "error" && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
              Failed to update shipping information. Please try again.
            </div>
          )}

          <form
            action={toUpdateShippingInfos}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Address Information Section */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                Address Details
              </h3>
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className="mb-2 font-medium text-gray-700">
                Street Address
              </label>
              <input
                id="street"
                name="street"
                type="text"
                required
                defaultValue={shippingAddress?.street}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                title="Street Address"
                placeholder="Enter street address"
                autoComplete="street-address"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">City</label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={shippingAddress?.city}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                title="City"
                autoComplete="address-level2"
                placeholder="Enter city"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Region</label>
              <select
                id="region"
                name="region"
                defaultValue={shippingAddress?.region}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition appearance-none bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDE0IDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw3IDdMMTMgMSIgc3Ryb2tlPSIjNkI3MjhBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[center_right_1rem]"
                title="Region"
              >
                <option value="" disabled>
                  Select your Region
                </option>
                {carrier &&
                  carrier.regionsServed.map((region: any) => (
                    <option key={region._id} value={region.region}>
                      {region.region}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">
                Postal Code
              </label>
              <input
                id="address"
                name="address"
                type="text"
                defaultValue={shippingAddress?.address}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                title="Postal Code"
                pattern="^[A-Za-z0-9 -]{3,12}$"
                placeholder="Enter postal code"
                autoComplete="postal-code"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Country</label>
              <input
                id="country"
                name="country"
                type="text"
                defaultValue={shippingAddress?.country}
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                title="Country"
                autoComplete="country"
                placeholder="Enter country"
              />
            </div>

            {/* Shipping Details Section */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                Shipping Details
              </h3>
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">Carrier</label>
              <input
                id="carrier"
                name="carrier"
                type="text"
                defaultValue={customerInfos?.shippingAddress?.carrier || ""}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                title="Carrier"
                placeholder="Enter carrier"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-2 font-medium text-gray-700">
                Shipping Method
              </label>
              <select
                id="shippingMethod"
                name="shippingMethod"
                defaultValue={
                  customerInfos?.shippingAddress?.shippingMethod || "standard"
                }
                required
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition appearance-none bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDE0IDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw3IDdMMTMgMSIgc3Ryb2tlPSIjNkI3MjhBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-[center_right_1rem]"
                title="Shipping Method"
              >
                <option value="standard">Standard</option>
                <option value="express">Express</option>
                <option value="overnight">Overnight</option>
              </select>
            </div>

            <div className="md:col-span-2 text-center mt-8 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md"
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
                  "Save Shipping Details"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShippingForm;
