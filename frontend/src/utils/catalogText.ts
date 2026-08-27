const MISSING = "Information not available in the current research dataset.";

export function displayCatalogText(
  value: string | null | undefined,
  missing: string = MISSING,
): string {
  if (value === null || value === undefined || value.trim() === "") {
    return missing;
  }
  return value;
}

export function isUnverified(value: string | null | undefined): boolean {
  return Boolean(value && value.includes("NEEDS VERIFICATION"));
}
