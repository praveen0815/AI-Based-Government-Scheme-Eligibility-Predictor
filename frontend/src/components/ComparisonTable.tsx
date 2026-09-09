import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import type { ComparedScheme } from "../types/api";
import { displayCatalogText } from "../utils/catalogText";
import { Badge } from "./ui/Badge";

function percent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function ComparisonTable({ schemes }: { schemes: ComparedScheme[] }) {
  const { language, t } = useI18n();
  const statusText = (scheme: ComparedScheme) =>
    language === "ta"
      ? scheme.recommended
        ? t.predictedEligible
        : t.notRecommended
      : scheme.status_label || (scheme.recommended ? t.predictedEligible : t.notRecommended);
  const rows: { key: string; label: string; render: (scheme: ComparedScheme) => string }[] = [
    { key: "name", label: t.compareName, render: (scheme) => scheme.scheme_name },
    { key: "id", label: t.compareId, render: (scheme) => scheme.scheme_id },
    {
      key: "department",
      label: t.compareDepartment,
      render: (scheme) => displayCatalogText(scheme.department, t.catalogMissing),
    },
    {
      key: "category",
      label: t.compareCategory,
      render: (scheme) => displayCatalogText(scheme.scheme_category, t.catalogMissing),
    },
    {
      key: "status",
      label: t.compareStatus,
      render: (scheme) => statusText(scheme),
    },
    { key: "probability", label: t.probabilityLabel, render: (scheme) => percent(scheme.eligible_probability) },
    {
      key: "reasons",
      label: t.compareReasons,
      render: (scheme) =>
        (scheme.rule_reasons ?? scheme.rule_result?.reasons ?? []).join("; ") ||
        displayCatalogText(scheme.reason, t.catalogMissing),
    },
    {
      key: "eligibility",
      label: t.compareEligibility,
      render: (scheme) => displayCatalogText(scheme.eligibility_notes, t.catalogMissing),
    },
    {
      key: "benefit",
      label: t.compareBenefit,
      render: (scheme) => displayCatalogText(scheme.benefit, t.catalogMissing),
    },
    {
      key: "documents",
      label: t.compareDocuments,
      render: (scheme) => displayCatalogText(scheme.required_documents, t.catalogMissing),
    },
    {
      key: "application",
      label: t.compareApplication,
      render: (scheme) => displayCatalogText(scheme.application_method, t.catalogMissing),
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-[16px] text-ink-500">{t.notOfficialRejection}</p>
      <div className="hidden overflow-x-auto rounded-[14px] border border-line bg-surface shadow-card md:block">
        <table className="min-w-full border-collapse text-left text-[16px]">
          <thead>
            <tr>
              <th className="w-52 border-b border-line bg-sage px-5 py-4 font-semibold text-ink-900">
                {t.compareField}
              </th>
              {schemes.map((scheme) => (
                <th key={scheme.scheme_id} className="border-b border-l border-line bg-sage px-5 py-4 align-top">
                  <p className="text-[18px] font-semibold text-ink-900">
                    <Link to={`/schemes/${scheme.scheme_id}`} className="hover:text-action hover:underline">
                      {scheme.scheme_name}
                    </Link>
                  </p>
                  <div className="mt-2">
                    <Badge tone={scheme.recommended ? "success" : "muted"}>{statusText(scheme)}</Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th className="border-b border-line bg-surface px-5 py-4 font-medium text-ink-500">{row.label}</th>
                {schemes.map((scheme) => (
                  <td key={`${scheme.scheme_id}-${row.key}`} className="border-b border-l border-line bg-surface px-5 py-4 text-ink-700">
                    {row.render(scheme)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="bg-surface px-5 py-4 font-medium text-ink-500">
                {t.officialSourceField}
              </th>
              {schemes.map((scheme) => (
                <td key={`${scheme.scheme_id}-source`} className="border-l border-line bg-surface px-5 py-4">
                  {scheme.official_source_url ? (
                    <a
                      href={scheme.official_source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-800 hover:underline"
                    >
                      {t.viewOfficialSourceShort}
                    </a>
                  ) : (
                    displayCatalogText(null, t.catalogMissing)
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 md:hidden">
        {schemes.map((scheme) => (
          <article key={scheme.scheme_id} className="card-surface p-6">
            <Badge tone={scheme.recommended ? "success" : "muted"}>{statusText(scheme)}</Badge>
            <h3 className="card-title mt-4">
              <Link to={`/schemes/${scheme.scheme_id}`} className="hover:text-action hover:underline">
                {scheme.scheme_name}
              </Link>
            </h3>
            <dl className="mt-5 space-y-4">
              {rows.map((row) => (
                <div key={row.key}>
                  <dt className="text-[16px] text-ink-500">{row.label}</dt>
                  <dd className="text-ink-900">{row.render(scheme)}</dd>
                </div>
              ))}
              <div>
                <dt className="text-[16px] text-ink-500">{t.officialSourceField}</dt>
                <dd>
                  {scheme.official_source_url ? (
                    <a
                      href={scheme.official_source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-800 hover:underline"
                    >
                      {t.viewOfficialSourceShort}
                    </a>
                  ) : (
                    displayCatalogText(null, t.catalogMissing)
                  )}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
