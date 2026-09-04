import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { CloseIcon } from "../components/icons";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import type { Messages } from "../i18n/types";
import { ApiError, fetchSchemeCatalog } from "../services/api";
import type { CatalogSearchItem } from "../types/api";
import { displayCatalogText, isUnverified } from "../utils/catalogText";
import {
  EMPTY_CATALOG_FILTERS,
  UNSPECIFIED_FILTER,
  catalogFacets,
  catalogFiltersActive,
  filterCatalog,
  type CatalogSearchState,
} from "../utils/catalogSearch";

function scopeLabel(scope: string, t: Messages): string {
  if (scope === "CORE") return t.coreBadge;
  if (scope === "ADVANCED") return t.catalogScopeAdvanced;
  if (scope === "HOLD") return t.catalogScopeHold;
  return scope;
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
  filters,
  facets,
  onChange,
  onClear,
  t,
}: {
  filters: CatalogSearchState;
  facets: ReturnType<typeof catalogFacets>;
  onChange: (next: CatalogSearchState) => void;
  onClear: () => void;
  t: Messages;
}) {
  return (
    <div className="space-y-5">
      <label className="block text-[16px]" htmlFor="catalog-search">
        <span className="field-label mb-2 block">{t.search}</span>
        <input
          id="catalog-search"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          className="field-input"
          placeholder={t.searchPlaceholder}
        />
      </label>
      <FilterSelect
        id="catalog-core-status"
        label={t.catalogCoreStatus}
        value={filters.mlScope}
        onChange={(mlScope) => onChange({ ...filters, mlScope })}
        allLabel={t.catalogAllCoreStatuses}
        options={facets.mlScopes}
      />
      <FilterSelect
        id="catalog-department"
        label={t.catalogDepartment}
        value={filters.department}
        onChange={(department) => onChange({ ...filters, department })}
        allLabel={t.catalogAllDepartments}
        options={facets.departments}
      />
      <FilterSelect
        id="catalog-gender"
        label={t.catalogGender}
        value={filters.gender}
        onChange={(gender) => onChange({ ...filters, gender })}
        allLabel={t.catalogAllGenders}
        options={facets.genders}
        includeUnspecified
        unspecifiedLabel={t.catalogUnspecified}
      />
      <FilterSelect
        id="catalog-student"
        label={t.catalogStudentStatus}
        value={filters.student}
        onChange={(student) => onChange({ ...filters, student })}
        allLabel={t.catalogAllStudentStatuses}
        options={facets.studentStatuses}
        includeUnspecified
        unspecifiedLabel={t.catalogUnspecified}
      />
      <FilterSelect
        id="catalog-benefit"
        label={t.catalogBenefitType}
        value={filters.category}
        onChange={(category) => onChange({ ...filters, category })}
        allLabel={t.allCategories}
        options={facets.categories}
      />
      <Button type="button" variant="secondary" onClick={onClear} disabled={!catalogFiltersActive(filters)}>
        {t.catalogClearFilters}
      </Button>
    </div>
  );
}

export function SchemesPage() {
  const { t } = useI18n();
  const [schemes, setSchemes] = useState<CatalogSearchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<CatalogSearchState>(EMPTY_CATALOG_FILTERS);

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

  const facets = useMemo(() => catalogFacets(schemes ?? []), [schemes]);
  const visible = useMemo(() => filterCatalog(schemes ?? [], filters), [schemes, filters]);

  function clearFilters() {
    setFilters(EMPTY_CATALOG_FILTERS);
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t.schemesTitle} description={t.schemesDescription} />
      <ResearchNotice compact />

      <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
        <Button type="button" variant="secondary" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}>
          {t.catalogOpenFilters}
        </Button>
        {schemes ? <p className="text-[16px] font-semibold text-ink-700">{t.catalogResultCount(visible.length, schemes.length)}</p> : null}
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
              <FilterForm filters={filters} facets={facets} onChange={setFilters} onClear={clearFilters} t={t} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="card-surface hidden h-fit p-5 lg:block lg:sticky lg:top-24">
          <h2 className="mb-5 text-[18px] font-semibold text-ink-900">{t.catalogFiltersTitle}</h2>
          <FilterForm filters={filters} facets={facets} onChange={setFilters} onClear={clearFilters} t={t} />
        </aside>

        <div className="space-y-6">
          {schemes ? (
            <p className="hidden text-[16px] font-semibold text-ink-700 lg:block">
              {t.catalogResultCount(visible.length, schemes.length)}
            </p>
          ) : null}

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
            <div className="grid gap-6 md:grid-cols-2">
              {visible.map((scheme) => (
                <article key={scheme.scheme_id} className="card-surface flex flex-col p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={scheme.ml_scope === "CORE" ? "brand" : "muted"}>{scopeLabel(scheme.ml_scope, t)}</Badge>
                    {scheme.scheme_category ? <Badge tone="muted">{scheme.scheme_category}</Badge> : null}
                  </div>
                  <h2 className="card-title mt-5">{scheme.scheme_name}</h2>
                  <p className="mt-2 text-[15px] font-medium text-ink-500">{scheme.scheme_id}</p>
                  {scheme.department ? <p className="mt-2 text-[16px] text-ink-500">{scheme.department}</p> : null}
                  <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
                    {displayCatalogText(scheme.description, t.catalogMissing)}
                  </p>
                  <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
                    <span className="font-semibold text-ink-900">{t.benefitLabel} </span>
                    {displayCatalogText(scheme.benefit_description, t.catalogMissing)}
                  </p>
                  {isUnverified(scheme.benefit_description) ? (
                    <p className="mt-1 text-[15px] font-semibold text-warning">{t.needsVerificationField}</p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <Link
                      to={`/schemes/${scheme.scheme_id}`}
                      className="rounded-[12px] border border-line px-4 py-2.5 text-[16px] font-semibold transition duration-150 hover:bg-canvas"
                    >
                      {t.viewDetailsShort}
                    </Link>
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
              ))}
            </div>
          ) : null}

          {schemes ? <p className="text-[16px] leading-relaxed text-ink-500">{t.catalogDisclaimer}</p> : null}
        </div>
      </div>
    </div>
  );
}
