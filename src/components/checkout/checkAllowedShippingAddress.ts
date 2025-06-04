const checkShippingLocation = (shippingAddress: {
  country: string;
  state: string;
  postalCode: string;
}) => {
  const { country, state, postalCode } = shippingAddress;

  const disallowedCountries = ["North Korea", "Iran", "Syria"]; // Add countries you don't ship to
  const disallowedTowns = ["California"]; // Add states you don't ship to
  const disallowedZipCodes = ["00000", "99999"]; // Add zip codes if applicable

  // Check if the country is disallowed
  if (disallowedCountries.includes(country)) {
    return {
      allowed: false,
      message: "Shipping is not available to this country.",
    };
  }

  // Check if the state is disallowed
  if (disallowedTowns.includes(state)) {
    return {
      allowed: false,
      message: "Shipping is not available to this state.",
    };
  }

  // Check if the postal code is disallowed
  if (disallowedZipCodes.includes(postalCode)) {
    return {
      allowed: false,
      message: "Shipping is not available to this postal code.",
    };
  }

  // If no disallowed location is found
  return { allowed: true, message: "Shipping is available." };
};
