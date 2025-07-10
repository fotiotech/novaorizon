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

const ShippingForm = ({ shippingAddressCheck }: { shippingAddressCheck?: boolean }) => {
  const { user, customerInfos } = useUser();
  const toUpdateShippingInfos = updateShippingInfos.bind(null, user?._id as string);
  const [carrier, setCarrier] = useState<Carrier | null>(null);

  useEffect(() => {
    async function fetchCarriers() {
      const data = await getCarriersById("675eeda75a81d16c81aca736");
      setCarrier(data);
    }
    fetchCarriers();
  }, []);

  const shippingAddress = shippingAddressCheck
    ? customerInfos?.billingAddress
    : customerInfos?.shippingAddress;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-6 text-center">Shipping Information</h2>
      <form action={toUpdateShippingInfos} className="grid grid-cols-1 gap-4">
        <div className="flex flex-col">
          <label htmlFor="street">Street Address</label>
          <input
            id="street"
            name="street"
            type="text"
            required
            defaultValue={shippingAddress?.street}
            className="input input-bordered"
            title="Street Address"
            placeholder="Enter street address"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="region">Region</label>
          <select
            id="region"
            name="region"
            defaultValue={shippingAddress?.region}
            className="input input-bordered"
            title="Region"
          >
            <option value="" disabled>Select your Region</option>
            {carrier &&
              carrier.regionsServed.map((region: any) => (
                <option key={region._id} value={region.region}>{region.region}</option>
              ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="city">City</label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={shippingAddress?.city}
            required
            className="input input-bordered"
            title="City"
            autoComplete="address-level2"
            placeholder="Enter city"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="address">address</label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={shippingAddress?.address}
            required
            className="input input-bordered"
            title="address"
            pattern="^[A-Za-z0-9 -]{3,12}$"
            placeholder="Enter postal code"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="country">Country</label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={shippingAddress?.country}
            required
            className="input input-bordered"
            title="Country"
            autoComplete="country"
            placeholder="Enter country"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="carrier">Carrier</label>
          <input
            id="carrier"
            name="carrier"
            type="text"
            defaultValue={customerInfos?.shippingAddress?.carrier || ""}
            className="input input-bordered"
            title="Carrier"
            placeholder="Enter carrier"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="shippingMethod">Shipping Method</label>
          <select
            id="shippingMethod"
            name="shippingMethod"
            defaultValue={customerInfos?.shippingAddress?.shippingMethod || "standard"}
            required
            className="input input-bordered"
            title="Shipping Method"
          >
            <option value="standard">Standard</option>
            <option value="express">Express</option>
            <option value="overnight">Overnight</option>
          </select>
        </div>

        <div className="text-center mt-4">
          <button type="submit" className="btn btn-primary px-10">Save</button>
        </div>
      </form>
    </div>
  );
};

export default ShippingForm;