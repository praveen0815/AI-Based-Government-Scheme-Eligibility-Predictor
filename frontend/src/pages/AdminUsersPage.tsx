import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, AdminPanel } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchAdminUsers } from "../services/api";
import type { AdminUserSummary } from "../types/api";

export function AdminUsersPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(search = query) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminUsers(search);
      setUsers(response.users);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(query);
  }

  return (
    <div className="admin-stack">
      <AdminPageHeader eyebrow={t.adminSectionManagement} title={t.adminUsers} description={t.adminUsersLead} />
      <AdminPanel>
        <form className="admin-toolbar" onSubmit={handleSearch}>
          <label className="sr-only" htmlFor="admin-user-search">
            {t.adminSearchUsers}
          </label>
          <input
            id="admin-user-search"
            className="admin-input min-w-[220px] flex-1"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.adminSearchUsers}
          />
          <button type="submit" className="admin-btn-primary">
            {t.adminSearch}
          </button>
        </form>
        {loading ? <LoadingState message={t.adminLoading} /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && users.length === 0 ? <p className="admin-empty">{t.adminUsersEmpty}</p> : null}
        {users.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.adminName}</th>
                  <th>{t.adminEmail}</th>
                  <th>{t.adminWallet}</th>
                  <th>{t.adminView}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td className="font-medium text-slate-900">{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`admin-badge ${user.has_wallet ? "admin-badge-verified" : "admin-badge-muted"}`}>
                        {user.has_wallet ? t.adminHasWallet : t.adminNoWallet}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/users/${user.user_id}`} className="admin-link">
                        {t.adminView}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}
