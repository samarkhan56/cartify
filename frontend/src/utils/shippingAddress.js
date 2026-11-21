export const checkoutAddressDraftKey = (userId) => `cartify.checkoutAddress:${userId}`;

export const readCheckoutAddressDraft = (userId) => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(checkoutAddressDraftKey(userId)) || "{}");
    return draft && typeof draft === "object" && !Array.isArray(draft) ? draft : {};
  } catch { return {}; }
};

export const hasCompleteShippingAddress = (address) => [
  "fullName", "email", "phoneNumber", "country", "state", "city", "zipCode", "address1",
].every((field) => {
  const value = address?.[field];
  const legacyNumber = ["phoneNumber", "zipCode"].includes(field) &&
    typeof value === "number" && Number.isFinite(value);
  return (typeof value === "string" || legacyNumber) && String(value).trim().length > 0;
});
