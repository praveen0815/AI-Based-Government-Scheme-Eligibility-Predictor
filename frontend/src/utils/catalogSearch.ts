import type { CatalogSearchItem, RecommendResponse, RecommendedScheme } from "../types/api";

export const UNSPECIFIED_FILTER = "unspecified";

export type CatalogEligibilityFilter = "all" | "eligible" | "not_eligible" | "incomplete";
export type CatalogSort = "relevance" | "name_asc" | "name_desc" | "eligible_first";
export type DiscoveryEligibility = "eligible" | "not_eligible" | "incomplete";

export interface CatalogSearchState {
  query: string;
  mlScope: string;
  department: string;
  gender: string;
  student: string;
  category: string;
  eligibility: CatalogEligibilityFilter;
  sort: CatalogSort;
}

export const EMPTY_CATALOG_FILTERS: CatalogSearchState = {
  query: "",
  mlScope: "all",
  department: "all",
  gender: "all",
  student: "all",
  category: "all",
  eligibility: "all",
  sort: "relevance",
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

export function schemeSearchHaystack(scheme: CatalogSearchItem): string {
  return [
    scheme.scheme_name,
    scheme.scheme_id,
    scheme.description,
    scheme.eligibility_notes,
    scheme.benefit_description,
    scheme.scheme_category,
    scheme.department,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

export function catalogFiltersActive(state: CatalogSearchState): boolean {
  return (
    state.query.trim() !== "" ||
    state.mlScope !== "all" ||
    state.department !== "all" ||
    state.gender !== "all" ||
    state.student !== "all" ||
    state.category !== "all" ||
    state.eligibility !== "all" ||
    state.sort !== "relevance"
  );
}

export function discoveryEligibility(
  schemeId: string,
  result: RecommendResponse | null,
): DiscoveryEligibility | null {
  if (!result) {
    return null;
  }
  if (result.recommendations.some((scheme) => scheme.scheme_id === schemeId)) {
    return "eligible";
  }
  const evaluated = result.evaluated_schemes.find((scheme) => scheme.scheme_id === schemeId);
  if (evaluated) {
    return evaluated.prediction === "eligible" ? "eligible" : "not_eligible";
  }
  return "incomplete";
}

export function recommendedEligibleSchemes(result: RecommendResponse | null): RecommendedScheme[] {
  return result?.recommendations ?? [];
}

export function recommendedIncompleteSchemes(
  schemes: CatalogSearchItem[],
  result: RecommendResponse | null,
): CatalogSearchItem[] {
  if (!result) {
    return [];
  }
  return schemes.filter((scheme) => discoveryEligibility(scheme.scheme_id, result) === "incomplete");
}

export function filterCatalog(
  schemes: CatalogSearchItem[],
  state: CatalogSearchState,
  result: RecommendResponse | null = null,
): CatalogSearchItem[] {
  const needle = state.query.trim().toLowerCase();
  return schemes.filter((scheme) => {
    const matchesQuery = !needle || schemeSearchHaystack(scheme).includes(needle);
    if (!matchesQuery) {
      return false;
    }
    if (state.mlScope !== "all" && scheme.ml_scope !== state.mlScope) {
      return false;
    }
    if (state.department !== "all" && scheme.department !== state.department) {
      return false;
    }
    if (state.category !== "all" && scheme.scheme_category !== state.category) {
      return false;
    }
    if (!matchesOptional(scheme.gender_requirement, state.gender)) {
      return false;
    }
    if (!matchesOptional(scheme.student_status_requirement, state.student)) {
      return false;
    }
    if (state.eligibility !== "all") {
      return discoveryEligibility(scheme.scheme_id, result) === state.eligibility;
    }
    return true;
  });
}

function relevanceRank(scheme: CatalogSearchItem, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return 0;
  }
  if (scheme.scheme_name.toLowerCase().includes(needle)) {
    return 0;
  }
  if (scheme.scheme_id.toLowerCase().includes(needle)) {
    return 1;
  }
  if ((scheme.scheme_category ?? "").toLowerCase().includes(needle)) {
    return 2;
  }
  return 3;
}

function eligibilityRank(schemeId: string, result: RecommendResponse | null): number {
  const status = discoveryEligibility(schemeId, result);
  if (status === "eligible") return 0;
  if (status === "not_eligible") return 1;
  if (status === "incomplete") return 2;
  return 3;
}

export function sortCatalog(
  schemes: CatalogSearchItem[],
  state: CatalogSearchState,
  result: RecommendResponse | null = null,
): CatalogSearchItem[] {
  const next = [...schemes];
  if (state.sort === "name_asc") {
    next.sort((a, b) => a.scheme_name.localeCompare(b.scheme_name));
    return next;
  }
  if (state.sort === "name_desc") {
    next.sort((a, b) => b.scheme_name.localeCompare(a.scheme_name));
    return next;
  }
  if (state.sort === "eligible_first") {
    next.sort((a, b) => {
      const rank = eligibilityRank(a.scheme_id, result) - eligibilityRank(b.scheme_id, result);
      return rank !== 0 ? rank : a.scheme_name.localeCompare(b.scheme_name);
    });
    return next;
  }
  if (!state.query.trim()) {
    return next;
  }
  next.sort((a, b) => {
    const rank = relevanceRank(a, state.query) - relevanceRank(b, state.query);
    return rank !== 0 ? rank : a.scheme_name.localeCompare(b.scheme_name);
  });
  return next;
}

export function applyCatalogDiscovery(
  schemes: CatalogSearchItem[],
  state: CatalogSearchState,
  result: RecommendResponse | null = null,
): CatalogSearchItem[] {
  return sortCatalog(filterCatalog(schemes, state, result), state, result);
}

const URL_KEYS = ["q", "scope", "department", "gender", "student", "category", "eligibility", "sort"] as const;

export function catalogFiltersFromSearch(search: URLSearchParams): CatalogSearchState {
  const eligibility = search.get("eligibility");
  const sort = search.get("sort");
  return {
    query: search.get("q") ?? "",
    mlScope: search.get("scope") ?? "all",
    department: search.get("department") ?? "all",
    gender: search.get("gender") ?? "all",
    student: search.get("student") ?? "all",
    category: search.get("category") ?? "all",
    eligibility:
      eligibility === "eligible" || eligibility === "not_eligible" || eligibility === "incomplete"
        ? eligibility
        : "all",
    sort:
      sort === "name_asc" || sort === "name_desc" || sort === "eligible_first" || sort === "relevance"
        ? sort
        : "relevance",
  };
}

export function catalogSearchFromFilters(filters: CatalogSearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.mlScope !== "all") params.set("scope", filters.mlScope);
  if (filters.department !== "all") params.set("department", filters.department);
  if (filters.gender !== "all") params.set("gender", filters.gender);
  if (filters.student !== "all") params.set("student", filters.student);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.eligibility !== "all") params.set("eligibility", filters.eligibility);
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  return params;
}

export function catalogSearchKeysEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  return URL_KEYS.every((key) => (a.get(key) ?? "") === (b.get(key) ?? ""));
}
