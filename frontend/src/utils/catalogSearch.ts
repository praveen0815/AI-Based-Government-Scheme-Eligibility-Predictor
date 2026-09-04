import type { CatalogSearchItem } from "../types/api";

export const UNSPECIFIED_FILTER = "unspecified";

export interface CatalogSearchState {
  query: string;
  mlScope: string;
  department: string;
  gender: string;
  student: string;
  category: string;
}

export const EMPTY_CATALOG_FILTERS: CatalogSearchState = {
  query: "",
  mlScope: "all",
  department: "all",
  gender: "all",
  student: "all",
  category: "all",
};

function uniqueValues(values: Array<string | null | undefined>): string[] {
  const seen: string[] = [];
  for (const value of values) {
    if (value && !seen.includes(value)) seen.push(value);
  }
  return seen;
}

export function catalogFacets(schemes: CatalogSearchItem[]) {
  return {
    mlScopes: uniqueValues(schemes.map((item) => item.ml_scope)),
    departments: uniqueValues(schemes.map((item) => item.department)),
    genders: uniqueValues(schemes.map((item) => item.gender_requirement)),
    studentStatuses: uniqueValues(schemes.map((item) => item.student_status_requirement)),
    categories: uniqueValues(schemes.map((item) => item.scheme_category)),
  };
}

function matchesOptional(actual: string | null | undefined, selected: string): boolean {
  if (selected === "all") return true;
  if (selected === UNSPECIFIED_FILTER) return !actual;
  return actual === selected;
}

export function filterCatalog(schemes: CatalogSearchItem[], state: CatalogSearchState): CatalogSearchItem[] {
  const needle = state.query.trim().toLowerCase();
  return schemes.filter((scheme) => {
    const matchesQuery =
      !needle ||
      scheme.scheme_name.toLowerCase().includes(needle) ||
      scheme.scheme_id.toLowerCase().includes(needle);
    return (
      matchesQuery &&
      (state.mlScope === "all" || scheme.ml_scope === state.mlScope) &&
      (state.department === "all" || scheme.department === state.department) &&
      (state.category === "all" || scheme.scheme_category === state.category) &&
      matchesOptional(scheme.gender_requirement, state.gender) &&
      matchesOptional(scheme.student_status_requirement, state.student)
    );
  });
}

export function catalogFiltersActive(state: CatalogSearchState): boolean {
  return (
    state.query.trim() !== "" ||
    state.mlScope !== "all" ||
    state.department !== "all" ||
    state.gender !== "all" ||
    state.student !== "all" ||
    state.category !== "all"
  );
}
