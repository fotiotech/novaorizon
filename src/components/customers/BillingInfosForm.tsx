import { getCarriersById } from "@/app/actions/carrier";
import { updateBillingAddresses } from "@/app/actions/customer";
import { useUser } from "@/app/context/UserContext";
import { Carrier } from "@/constant/types";
import React, { useEffect, useState } from "react";

const BillingAddresses: React.FC = () => {
  const { user, customerInfos } = useUser();
  const toUpdateBillingAddresses = async (formData: FormData) => {
    await updateBillingAddresses(user?._id as string, formData);
    // Optionally handle success/error here, but do not return anything
  };
  const [carrier, setCarrier] = useState<Carrier | null>(null);

  useEffect(() => {
    async function fetchCarriers() {
      const data = await getCarriersById("675eeda75a81d16c81aca736");
      setCarrier(data);
    }
    fetchCarriers();
  }, []);

  const billingAddress = customerInfos?.billingAddress;
  const paymentMeth = customerInfos?.billingMethod?.methodType;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h2 className="text-xl font-semibold mb-6 text-center">
        Billing Information
      </h2>
      <form
        action={toUpdateBillingAddresses}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="flex flex-col">
          <label className="mb-1">First Name</label>
          <input
            type="text"
            name="firstName"
            defaultValue={billingAddress?.firstName}
            required
            className="input input-bordered"
            placeholder="Enter first name"
            title="First Name"
            pattern="^[A-Za-zÀ-ÿ' -]{2,40}$"
            autoComplete="given-name"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Last Name</label>
          <input
            type="text"
            name="lastName"
            defaultValue={billingAddress?.lastName}
            required
            className="input input-bordered"
            placeholder="Enter last name"
            title="Last Name"
            pattern="^[A-Za-zÀ-ÿ' -]{2,40}$"
            autoComplete="family-name"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Email</label>
          <input
            type="email"
            name="email"
            defaultValue={billingAddress?.email}
            required
            className="input input-bordered"
            placeholder="Enter email"
            title="Email"
            pattern="^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$"
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Phone</label>
          <input
            type="tel"
            name="phone"
            defaultValue={billingAddress?.phone}
            className="input input-bordered"
            pattern="^[+]?[0-9]{7,15}$"
            autoComplete="tel"
            title="Phone"
            placeholder="Enter phone number"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">street</label>
          <input
            type="text"
            name="street"
            defaultValue={billingAddress?.street}
            className="input input-bordered"
            autoComplete="address-line1"
            title="street"
            placeholder="Enter street"
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1">Address</label>
          <input
            type="text"
            name="address"
            defaultValue={billingAddress?.address}
            className="input input-bordered"
            autoComplete="street-address"
            title="Address"
            placeholder="Enter address"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">City</label>
          <input
            type="text"
            name="city"
            defaultValue={billingAddress?.city}
            className="input input-bordered"
            autoComplete="address-level2"
            title="City"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Region</label>
          <select
            name="region"
            defaultValue={billingAddress?.region}
            className="input input-bordered"
            autoComplete="address-level1"
            title="Region"
          >
            <option value="">-Select your Region-</option>
            {carrier &&
              carrier.regionsServed.map((region: any) => (
                <option key={region._id} value={region.region}>
                  {region.region}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Country</label>
          <input
            type="text"
            name="country"
            defaultValue={billingAddress?.country}
            className="input input-bordered"
            autoComplete="country"
            title="Country"
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="mb-1">Preferences</label>
          <input
            type="text"
            name="preferences"
            defaultValue={billingAddress?.preferences}
            className="input input-bordered"
            title="Preferences"
          />
        </div>

        <div className="flex flex-col sm:col-span-2">
          <label className="mb-1">Payment Method</label>

          <select
            name="methodType"
            defaultValue={paymentMeth}
            className="input input-bordered"
            autoComplete="address-level1"
            title="Payment Method"
          >
            <option value="">-Select your Payment Method-</option>

            <option value="Mobile Money">Mobile Money</option>
            <option value="PayPal">PayPal</option>
          </select>
        </div>

        <div className="sm:col-span-2 text-center mt-6">
          <button type="submit" className="btn btn-primary px-10">
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default BillingAddresses;
