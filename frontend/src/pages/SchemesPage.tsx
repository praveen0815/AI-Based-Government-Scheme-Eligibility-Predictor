import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { CloseIcon } from "../components/icons";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import type { Messages } from "../i18n/types";
import {
  ApiError,
  fetchProfileCompleteness,
  fetchSchemeCatalog,
  getMyWallet,
  recommendFromWallet,
  walletToProfile,
} from "../services/api";
import type { CatalogSearchItem, ProfileCompleteness, RecommendResponse } from "../types/api";
import { displayCatalogText, isUnverified } from "../utils/catalogText";
import {
  EMPTY_CATALOG_FILTERS,
  UNSPECIFIED_FILTER,
  applyCatalogDiscovery,
  catalogFacets,
  catalogFiltersActive,
  catalogFiltersFromSearch,
  catalogSearchFromFilters,
  catalogSearchKeysEqual,
  discoveryEligibility,
  recommendedEligibleSchemes,
  recommendedIncompleteSchemes,
  type CatalogSearchState,
  type DiscoveryEligibility,
} from "../utils/catalogSearch";
import { profileFieldLabel } from "../utils/displayLabels";

const MAX_COMPARE = 3;

function scopeLabel(scope: string, t: Messages): string {
  if (scope === "CORE") return t.coreBadge;
  if (scope === "ADVANCED") return t.catalogScopeAdvanced;
  if (scope === "HOLD") return t.catalogScopeHold;
  return scope;
}

function eligibilityLabel(status: DiscoveryEligibility, t: Messages): string {
  if (status === "eligible") return t.catalogEligibilityEligible;
  if (status === "not_eligible") return t.catalogEligibilityNotEligible;
  return t.catalogEligibilityIncomplete;
}

function eligibilityTone(status: DiscoveryEligibility): "success" | "danger" | "warning" {
  if (status === "eligible") return "success";
  if (status === "not_eligible") return "danger";
  return "warning";
}

function resultCountLabel(visible: number, total: number, filters: CatalogSearchState, t: Messages): string {
  if (visible === 0) return t.catalogEmptyTitle;
  if (filters.eligibility === "eligible") return t.catalogShowingEligible(visible);
  if (filters.eligibility === "not_eligible") return t.catalogShowingNotEligible(visible);
  if (filters.eligibility === "incomplete") return t.catalogShowingIncomplete(visible);
  return t.catalogResultCount(visible, total);
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  allLabel,
  options,
  includeUnspecified,
  unspecifiedLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: string[];
  includeUnspecified?: boolean;
  unspecifiedLabel?: string;
}) {
  return (
    <label className="block text-[16px]" htmlFor={id}>
      <span className="field-label mb-2 block">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
      >
        <option value="all">{allLabel}</option>
        {includeUnspecified ? <option value={UNSPECIFIED_FILTER}>{unspecifiedLabel}</option> : null}
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterForm({
  idPrefix,
  filters,
  facets,
  onChange,
  onClear,
  t,
}: {
  idPrefix: string;
  filters: CatalogSearchState;
  facets: ReturnType<typeof catalogFacets>;
  onChange: (next: CatalogSearchState) => void;
  onClear: () => void;
  t: Messages;
}) {
  return (
    <div className="space-y-5">
      <label className="block text-[16px]" htmlFor={`${idPrefix}-search`}>
        <span className="field-label mb-2 block">{t.search}</span>
        <input
          id={`${idPrefix}-search`}
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          className="field-input"
          placeholder={t.searchPlaceholder}
          type="search"
          autoComplete="off"
        />
      </label>
      <FilterSelect
        id={`${idPrefix}-category`}
        label={t.category}
        value={filters.category}
        onChange={(category) => onChange({ ...filters, category })}
        allLabel={t.allCategories}
        options={facets.categories}
      />
      <FilterSelect
        id={`${idPrefix}-department`}
        label={t.catalogDepartment}
        value={filters.department}
        onChange={(department) => onChange({ ...filters, department })}
        allLabel={t.catalogAllDepartments}
        options={facets.departments}
      />
      <label className="block text-[16px]" htmlFor={`${idPrefix}-eligibility`}>
        <span className="field-label mb-2 block">{t.catalogEligibilityFilter}</span>
        <select
          id={`${idPrefix}-eligibility`}
          value={filters.eligibility}
          onChange={(event) =>
            onChange({
              ...filters,
              eligibility: event.target.value as CatalogSearchState["eligibility"],
            })
          }
          className="field-input"
        >
          <option value="all">{t.catalogAllEligibility}</option>
          <option value="eligible">{t.catalogEligibleFilter}</option>
          <option value="not_eligible">{t.catalogNotEligibleFilter}</option>
          <option value="incomplete">{t.catalogIncompleteFilter}</option>
        </select>
      </label>
      <label className="block text-[16px]" htmlFor={`${idPrefix}-sort`}>
        <span className="field-label mb-2 block">{t.catalogSort}</span>
        <select
          id={`${idPrefix}-sort`}
          value={filters.sort}
          onChange={(event) => onChange({ ...filters, sort: event.target.value as CatalogSearchState["sort"] })}
          className="field-input"
        >
          <option value="relevance">{t.catalogSortRelevance}</option>
          <option value="name_asc">{t.catalogSortNameAsc}</option>
          <option value="name_desc">{t.catalogSortNameDesc}</option>
          <option value="eligible_first">{t.catalogSortEligibleFirst}</option>
        </select>
      </label>
      <FilterSelect
        id={`${idPrefix}-core-status`}
        label={t.catalogCoreStatus}
        value={filters.mlScope}
        onChange={(mlScope) => onChange({ ...filters, mlScope })}
        allLabel={t.catalogAllCoreStatuses}
        options={facets.mlScopes}
      />
      <FilterSelect
        id={`${idPrefix}-gender`}
        label={t.catalogGender}
        value={filters.gender}
        onChange={(gender) => onChange({ ...filters, gender })}
        allLabel={t.catalogAllGenders}
        options={facets.genders}
        includeUnspecified
        unspecifiedLabel={t.catalogUnspecified}
      />
      <FilterSelect
        id={`${idPrefix}-student`}
        label={t.catalogStudentStatus}
        value={filters.student}
        onChange={(student) => onChange({ ...filters, student })}
        allLabel={t.catalogAllStudentStatuses}
        options={facets.studentStatuses}
        includeUnspecified
        unspecifiedLabel={t.catalogUnspecified}
      />
      {catalogFiltersActive(filters) ? (
        <Button type="button" variant="secondary" onClick={onClear}>
          {t.catalogClearFilters}
        </Button>
      ) : null}
    </div>
  );
}

function activeFilterChips(filters: CatalogSearchState, t: Messages): string[] {
  const chips: string[] = [];
  if (filters.query.trim()) chips.push(`${t.search}: ${filters.query.trim()}`);
  if (filters.category !== "all") chips.push(`${t.category}: ${filters.category}`);
  if (filters.department !== "all") chips.push(`${t.catalogDepartment}: ${filters.department}`);
  if (filters.eligibility === "eligible") chips.push(`${t.catalogEligibilityFilter}: ${t.catalogEligibleFilter}`);
  if (filters.eligibility === "not_eligible") chips.push(`${t.catalogEligibilityFilter}: ${t.catalogNotEligibleFilter}`);
  if (filters.eligibility === "incomplete") chips.push(`${t.catalogEligibilityFilter}: ${t.catalogIncompleteFilter}`);
  if (filters.sort !== "relevance") {
    const sortLabel =
      filters.sort === "name_asc"
        ? t.catalogSortNameAsc
        : filters.sort === "name_desc"
          ? t.catalogSortNameDesc
          : t.catalogSortEligibleFirst;
    chips.push(`${t.catalogSort}: ${sortLabel}`);
  }
  if (filters.mlScope !== "all") chips.push(`${t.catalogCoreStatus}: ${filters.mlScope}`);
  if (filters.gender !== "all") chips.push(`${t.catalogGender}: ${filters.gender}`);
  if (filters.student !== "all") chips.push(`${t.catalogStudentStatus}: ${filters.student}`);
  return chips;
}

export function SchemesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { result, setSubmission } = useRecommendation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [schemes, setSchemes] = useState<CatalogSearchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<RecommendResponse | null>(result);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const recommendLoadedRef = useRef(Boolean(result));
  const completenessLoadedRef = useRef(false);

  const filters = useMemo(() => catalogFiltersFromSearch(searchParams), [searchParams]);

  function updateFilters(next: CatalogSearchState) {
    const params = catalogSearchFromFilters(next);
    if (!catalogSearchKeysEqual(params, searchParams)) {
      setSearchParams(params, { replace: true });
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSchemeCatalog();
      setSchemes(response.schemes);
    } catch (caught) {
      setSchemes(null);
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Initial catalog load; language only affects labels, not the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) {
      setDiscoveryResult(result);
      recommendLoadedRef.current = true;
    }
  }, [result]);

  useEffect(() => {
    if (!isAuthenticated || completenessLoadedRef.current) return;
    completenessLoadedRef.current = true;
    void fetchProfileCompleteness()
      .then(setCompleteness)
      .catch(() => setCompleteness(null));
  }, [isAuthenticated]);

  useEffect(() => {
    if (result || !isAuthenticated || recommendLoadedRef.current) return;
    recommendLoadedRef.current = true;
    void (async () => {
      try {
        const wallet = await getMyWallet();
        const next = await recommendFromWallet(wallet.citizen_id);
        setDiscoveryResult(next);
        setSubmission(walletToProfile(wallet), next);
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 404) {
          setDiscoveryResult(null);
        }
      }
    })();
  }, [isAuthenticated, result, setSubmission]);

  const facets = useMemo(() => catalogFacets(schemes ?? []), [schemes]);
  const visible = useMemo(
    () => applyCatalogDiscovery(schemes ?? [], filters, discoveryResult),
    [schemes, filters, discoveryResult],
  );
  const chips = useMemo(() => activeFilterChips(filters, t), [filters, t]);
  const eligibleRecommended = recommendedEligibleSchemes(discoveryResult);
  const incompleteRecommended = recommendedIncompleteSchemes(schemes ?? [], discoveryResult);

  function clearFilters() {
    updateFilters(EMPTY_CATALOG_FILTERS);
  }

  function toggleCompare(schemeId: string) {
    setSelected((current) => {
      if (current.includes(schemeId)) {
        return current.filter((id) => id !== schemeId);
      }
      if (current.length >= MAX_COMPARE) {
        return current;
      }
      return [...current, schemeId];
    });
  }

  function handleCompareSelected() {
    if (selected.length >= 2 && selected.length <= MAX_COMPARE) {
      navigate("/compare", { state: { schemeIds: selected } });
    }
  }

  const checkPath = isAuthenticated ? "/wallet" : "/check";
  const missingFieldLabels = (completeness?.incomplete_fields ?? []).map((field) => profileFieldLabel(field, t));

  return (
    <div className="page-stack">
      <PageHeader title={t.schemesTitle} description={t.schemesDescription} />
      <ResearchNotice compact />

      <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
        <Button type="button" variant="secondary" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}>
          {t.catalogOpenFilters}
        </Button>
        {schemes ? (
          <p className="text-[16px] font-semibold text-ink-700" aria-live="polite">
            {resultCountLabel(visible.length, schemes.length, filters, t)}
          </p>
        ) : null}
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/50"
            aria-label={t.catalogCloseFilters}
            onClick={() => setFiltersOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,320px)] flex-col bg-surface shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[18px] font-semibold text-ink-900">{t.catalogFiltersTitle}</h2>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-line"
                aria-label={t.catalogCloseFilters}
                onClick={() => setFiltersOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterForm
                idPrefix="catalog-mobile"
                filters={filters}
                facets={facets}
                onChange={updateFilters}
                onClear={clearFilters}
                t={t}
              />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="card-surface hidden h-fit p-5 lg:block lg:sticky lg:top-24">
          <h2 className="mb-5 text-[18px] font-semibold text-ink-900">{t.catalogFiltersTitle}</h2>
          <FilterForm
            idPrefix="catalog-desktop"
            filters={filters}
            facets={facets}
            onChange={updateFilters}
            onClear={clearFilters}
            t={t}
          />
        </aside>

        <div className="space-y-6">
          {schemes ? (
            <p
              className="hidden text-[16px] font-semibold text-ink-700 lg:block"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="sr-only">{t.catalogResultLive}. </span>
              {resultCountLabel(visible.length, schemes.length, filters, t)}
            </p>
          ) : null}

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label={t.catalogActiveFilters}>
              {chips.map((chip) => (
                <Badge key={chip} tone="muted">
                  {chip}
                </Badge>
              ))}
            </div>
          ) : null}

          {discoveryResult ? (
            <section className="card-surface space-y-4 p-6" aria-labelledby="catalog-recommended-title">
              <div>
                <h2 id="catalog-recommended-title" className="text-[20px] font-semibold text-ink-900">
                  {t.catalogRecommendedTitle}
                </h2>
                <p className="mt-1 text-[16px] text-ink-500">{t.catalogRecommendedLead}</p>
              </div>
              {eligibleRecommended.length > 0 ? (
                <div>
                  <h3 className="text-[16px] font-semibold text-ink-900">{t.catalogRecommendedEligible}</h3>
                  <ul className="mt-2 space-y-1">
                    {eligibleRecommended.map((scheme) => (
                      <li key={scheme.scheme_id}>
                        <Link
                          to={`/schemes/${scheme.scheme_id}`}
                          className="text-[16px] font-semibold text-action hover:underline"
                        >
                          {scheme.scheme_name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {incompleteRecommended.length > 0 || missingFieldLabels.length > 0 ? (
                <div>
                  <h3 className="text-[16px] font-semibold text-ink-900">{t.catalogRecommendedIncomplete}</h3>
                  {missingFieldLabels.length > 0 ? (
                    <p className="mt-2 text-[16px] leading-relaxed text-ink-500">
                      {t.voiceCompletenessCannotEvaluate(missingFieldLabels.join(", "))}
                    </p>
                  ) : null}
                  {incompleteRecommended.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {incompleteRecommended.map((scheme) => (
                        <li key={scheme.scheme_id}>
                          <Link
                            to={`/schemes/${scheme.scheme_id}`}
                            className="text-[16px] font-semibold text-action hover:underline"
                          >
                            {scheme.scheme_name}
                          </Link>
                          <span className="ml-2 text-[15px] text-ink-500">{t.catalogEligibilityIncomplete}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <p className="text-[15px] leading-relaxed text-ink-500">{t.catalogRecommendedDisclaimer}</p>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCompareSelected}
              disabled={!isAuthenticated || selected.length < 2}
            >
              {t.catalogCompareSelected}
            </Button>
            {isAuthenticated ? (
              <p className="text-[16px] text-ink-500">
                {selected.length === 0
                  ? t.catalogSelectToCompare
                  : selected.length === 1
                    ? t.compareHint
                    : selected.length >= MAX_COMPARE
                      ? t.catalogCompareLimit
                      : t.compareHint}
              </p>
            ) : (
              <p className="text-[16px] text-ink-500">
                {t.compareSignIn}{" "}
                <Link to="/login" className="font-semibold text-action hover:underline">
                  {t.signIn}
                </Link>
              </p>
            )}
          </div>

          {loading ? <LoadingState message={t.loadingSchemes} /> : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

          {schemes && visible.length === 0 ? (
            <EmptyState title={t.catalogEmptyTitle} description={t.catalogEmptyLead}>
              <Button type="button" onClick={clearFilters}>
                {t.catalogClearFilters}
              </Button>
            </EmptyState>
          ) : null}

          {schemes && visible.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2" role="list" aria-label={t.catalogResultLive}>
              {visible.map((scheme) => {
                const status = discoveryEligibility(scheme.scheme_id, discoveryResult);
                const checked = selected.includes(scheme.scheme_id);
                const selectionLocked = selected.length >= MAX_COMPARE && !checked;
                return (
                  <article key={scheme.scheme_id} className="card-surface flex flex-col p-7" role="listitem">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={scheme.ml_scope === "CORE" ? "brand" : "muted"}>{scopeLabel(scheme.ml_scope, t)}</Badge>
                      {scheme.scheme_category ? <Badge tone="muted">{scheme.scheme_category}</Badge> : null}
                      {status ? (
                        <Badge tone={eligibilityTone(status)}>
                          <span className="sr-only">{t.catalogEligibilityStatus}: </span>
                          {eligibilityLabel(status, t)}
                        </Badge>
                      ) : null}
                    </div>
                    <h2 className="card-title mt-5">{scheme.scheme_name}</h2>
                    <p className="mt-2 text-[15px] font-medium text-ink-500">{scheme.scheme_id}</p>
                    {scheme.department ? <p className="mt-2 text-[16px] text-ink-500">{scheme.department}</p> : null}
                    <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
                      {displayCatalogText(scheme.description, t.catalogMissing)}
                    </p>
                    {isUnverified(scheme.benefit_description) ? (
                      <p className="mt-1 text-[15px] font-semibold text-warning">{t.needsVerificationField}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                      <Link
                        to={`/schemes/${scheme.scheme_id}`}
                        className="rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold transition duration-150 hover:bg-sage"
                      >
                        {t.viewDetailsShort}
                      </Link>
                      <Link
                        to={checkPath}
                        className="rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold transition duration-150 hover:bg-sage"
                      >
                        {t.catalogCheckEligibility}
                      </Link>
                      <label className="inline-flex min-h-12 items-center gap-2 text-[16px] font-semibold text-ink-900">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-line text-action focus:ring-action"
                          checked={checked}
                          disabled={selectionLocked}
                          onChange={() => toggleCompare(scheme.scheme_id)}
                          aria-label={t.catalogCompareScheme(scheme.scheme_name)}
                        />
                        {t.navCompare}
                      </label>
                      {scheme.official_source_url ? (
                        <a
                          href={scheme.official_source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[12px] bg-navy-900 px-4 py-2.5 text-[16px] font-semibold text-white transition duration-150 hover:bg-navy-800"
                        >
                          {t.officialSource}
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {schemes ? <p className="text-[16px] leading-relaxed text-ink-500">{t.catalogDisclaimer}</p> : null}
        </div>
      </div>
    </div>
  );
}
