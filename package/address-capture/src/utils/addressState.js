const COUNTRY_CODE_DEFAULT = "US";

const BASE_ADDRESS = {
  line1: "",
  line2: "",
  locality: "",
  adminArea: "",
  postalCode: "",
  countryCode: COUNTRY_CODE_DEFAULT,
  normalized: null,
};

export function createEmptyAddress() {
  return { ...BASE_ADDRESS };
}

function cloneIfObject(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
}

export function normalizeAddressState(value) {
  if (!value) {
    return createEmptyAddress();
  }

  if (typeof value === "string") {
    return { ...createEmptyAddress(), line1: value };
  }

  if (typeof value !== "object") {
    return createEmptyAddress();
  }

  const normalized = {
    ...createEmptyAddress(),
    ...value,
  };

  normalized.line1 = typeof normalized.line1 === "string" ? normalized.line1 : "";
  normalized.line2 = typeof normalized.line2 === "string" ? normalized.line2 : "";
  normalized.locality = typeof normalized.locality === "string" ? normalized.locality : "";
  normalized.adminArea =
    typeof normalized.adminArea === "string"
      ? normalized.adminArea.toUpperCase()
      : "";
  normalized.postalCode =
    typeof normalized.postalCode === "string" ? normalized.postalCode : "";
  normalized.countryCode =
    typeof normalized.countryCode === "string"
      ? normalized.countryCode.toUpperCase()
      : COUNTRY_CODE_DEFAULT;

  if (value.normalized) {
    normalized.normalized = cloneIfObject(value.normalized);
  }

  return normalized;
}

export function formatAddressForDisplay(address) {
  const draft = normalizeAddressState(address);
  const normalizedFull = draft.normalized?.full || null;

  if (normalizedFull) {
    return normalizedFull;
  }

  const parts = [
    draft.line1,
    draft.line2,
    [draft.locality, draft.adminArea].filter(Boolean).join(" ").trim(),
    draft.postalCode,
    draft.countryCode,
  ].filter(Boolean);

  return parts.join(", ");
}

export function isEmptyAddress(address) {
  if (!address || typeof address !== "object") {
    return true;
  }
  const normalized = normalizeAddressState(address);
  return (
    !normalized.line1 &&
    !normalized.line2 &&
    !normalized.locality &&
    !normalized.adminArea &&
    !normalized.postalCode
  );
}
