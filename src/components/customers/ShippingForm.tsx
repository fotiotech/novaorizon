// components/ShippingForm.tsx
import { getCarriersById } from "@/app/actions/carrier";
import { updateShippingInfos } from "@/app/actions/customer";
import { useUser } from "@/app/context/UserContext";
import { Carrier } from "@/constant/types";
import { useState, FormEvent, useEffect } from "react";

export interface ShippingData {
  street: string;
  region: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  carrier: string;
  shippingMethod: "standard" | "express" | "overnight";
}

const ShippingForm = ({
  shippingAddressCheck,
}: {
  shippingAddressCheck?: boolean;
}) => {
  const { user } = useUser();
  const { customerInfos } = useUser();
  const toUpdateShippingInfos = updateShippingInfos.bind(
    null,
    user?._id as string,
    shippingAddressCheck ? false : true
  );

  const [carrier, setCarrier] = useState<Carrier | null>(null);

  useEffect(() => {
    async function fetchCarriers() {
      const data = await getCarriersById("675eeda75a81d16c81aca736");
      setCarrier(data);
    }
    fetchCarriers();
  }, []);

  const billingAddress = customerInfos?.billingAddress;

  return (
    <form action={toUpdateShippingInfos}>
      <div
        className={
          !shippingAddressCheck
            ? `space-y-4 max-w-md mx-auto p-6
             bg-white rounded-lg shadow`
            : "hidden"
        }
      >
        {/* Address Fields */}
        <label>
          Street Address:
          <input type="text" name="street" required className="input" />
        </label>
        <div>
          <label>region</label>
          <select
            title="region"
            name="region"
            defaultValue={billingAddress?.region}
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

        <label>
          City:
          <input
            type="text"
            name="city"
            defaultValue={billingAddress?.city}
            required
            className="input"
          />
        </label>

        <label>
          Postal Code:
          <input
            type="text"
            name="postalCode"
            defaultValue={billingAddress?.postalCode}
            required
            className="input"
          />
        </label>

        <label>
          Country:
          <input
            type="text"
            name="country"
            defaultValue={billingAddress?.country}
            required
            className="input"
          />
        </label>

        {/* Carrier Selection */}
        <label>
          Carrier:
          <input type="text" name="carrier" required className="input" />
        </label>

        {/* Shipping Method Selection */}
        <label>
          Shipping Method:
          <select name="shippingMethod" required className="input">
            <option value="standard">Standard</option>
            <option value="express">Express</option>
            <option value="overnight">Overnight</option>
          </select>
        </label>

        <button type="submit" className="btn w-1/2">
          Save
        </button>
      </div>
    </form>
  );
};

export default ShippingForm;
