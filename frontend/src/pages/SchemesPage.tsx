import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchCoreSchemes } from "../services/api";
import type { SchemeCatalogItem } from "../types/api";
import { displayCatalogText, isUnverified } from "../utils/catalogText";

export function SchemesPage() {
  const { t } = useI18n();
  const [schemes, setSchemes] = useState<SchemeCatalogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCoreSchemes();
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

  const categories = useMemo(() => {
    const values = new Set((schemes ?? []).map((item) => item.scheme_category).filter(Boolean));
    return ["all", ...values] as string[];
  }, [schemes]);

  const visible = (schemes ?? []).filter((scheme) => {
    const haystack = `${scheme.scheme_name} ${scheme.description ?? ""}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesCategory = category === "all" || scheme.scheme_category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-10">
      <PageHeader title={t.schemesTitle} description={t.schemesDescription} />
      <ResearchNotice compact />

      <div className="card-surface grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <label className="text-[16px]">
          <span className="field-label mb-2 block">{t.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field-input"
            placeholder={t.searchPlaceholder}
          />
        </label>
        <label className="text-[16px]">
          <span className="field-label mb-2 block">{t.category}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="field-input"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? t.allCategories : item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <LoadingState message={t.loadingSchemes} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {schemes ? (
        <div className="grid gap-6 md:grid-cols-2">
          {visible.map((scheme) => (
            <article key={scheme.scheme_id} className="card-surface flex flex-col p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{t.coreBadge}</Badge>
                {scheme.scheme_category ? <Badge tone="muted">{scheme.scheme_category}</Badge> : null}
              </div>
              <h2 className="card-title mt-5">{scheme.scheme_name}</h2>
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
                    className="rounded-[12px] bg-brand-900 px-4 py-2.5 text-[16px] font-semibold text-white transition duration-150 hover:bg-brand-800"
                  >
                    {t.officialSource}
                  </a>
                ) : null}
                <Link to="/check" className="rounded-[12px] px-4 py-2.5 text-[16px] font-semibold text-action">
                  {t.navCheck}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
