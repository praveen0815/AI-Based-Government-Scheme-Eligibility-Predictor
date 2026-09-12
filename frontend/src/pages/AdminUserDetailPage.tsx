import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchAdminUser } from "../services/api";
import type { AdminUserDetailResponse } from "../types/api";

function predictionStatus(status: string): "eligible" | "not_eligible" | "cannot_fully_evaluate" | "not_evaluated" {
  if (status === "eligible" || status === "not_eligible" || status === "cannot_fully_evaluate") {
    return status;
  }
  return "not_evaluated";
}

export function AdminUserDetailPage() {
  const { userId = "" } = useParams();
  const { t } = useI18n();
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminUser(userId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, t]);

  return (
    <div className="admin-stack">
      <AdminPageHeader eyebrow={t.adminSectionManagement} title={t.adminUserDetail} description={t.adminUsersLead} />
      <Link to="/admin/users" className="admin-link">
        {t.adminUsers}
      </Link>
      {loading ? <LoadingState message={t.adminLoading} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {data ? (
        <>
          <AdminPanel title={data.user.full_name}>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
              <p className="text-[14px] text-slate-600">{data.user.email}</p>
              <p className="text-[14px] text-slate-600">{data.user.has_wallet ? t.adminHasWallet : t.adminNoWallet}</p>
            </div>
          </AdminPanel>
          {data.wallet ? (
            <AdminPanel title={t.adminWallet}>
              <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                <p className="text-[14px] text-slate-700">
                  {t.fieldAge}: {data.wallet.age}
                </p>
                <p className="text-[14px] text-slate-700">
                  {t.fieldGender}: {data.wallet.gender}
                </p>
                {data.completeness ? (
                  <p className="text-[14px] text-slate-700 sm:col-span-2">
                    {t.completenessTitle}: {data.completeness.percentage}%
                  </p>
                ) : null}
              </div>
            </AdminPanel>
          ) : (
            <p className="text-[14px] text-slate-500">{t.adminNoWallet}</p>
          )}
          <AdminPanel title={t.adminEligibilityMonitoring}>
            <div className="space-y-3 px-5 py-4">
              <AdminStatusBadge status={predictionStatus(data.eligibility.prediction_label)} />
              <p className="text-[14px] text-slate-600">{t.adminPredictionNotice}</p>
              {data.eligibility.incomplete_fields.length > 0 ? (
                <p className="text-[14px] text-slate-700">
                  {t.whyRequiredToEvaluate}: {data.eligibility.incomplete_fields.join(", ")}
                </p>
              ) : null}
            </div>
            {data.eligibility.evaluated_schemes.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t.adminScheme}</th>
                      <th>{t.adminStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.eligibility.evaluated_schemes.map((scheme) => (
                      <tr key={scheme.scheme_id}>
                        <td className="font-medium text-slate-900">{scheme.scheme_name}</td>
                        <td>
                          <AdminStatusBadge status={scheme.prediction} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </AdminPanel>
          <AdminPanel title={t.navApplications}>
            {data.applications.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-slate-500">{t.adminApplicationsEmpty}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t.adminScheme}</th>
                      <th>{t.adminStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applications.map((item) => (
                      <tr key={item.application_id}>
                        <td>{item.scheme_name}</td>
                        <td>
                          <AdminStatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>
          <AdminPanel title={t.navHistory}>
            {data.history.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-slate-500">{t.adminHistoryEmpty}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t.adminSchemeCount}</th>
                      <th>{t.adminLastActivity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((item) => (
                      <tr key={item.id}>
                        <td>{item.recommendation_count}</td>
                        <td>{item.checked_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminPanel>
        </>
      ) : null}
    </div>
  );
}
