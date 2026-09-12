import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../components/admin/adminUi";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useI18n } from "../context/LanguageContext";
import { ApiError, fetchAdminDocuments, updateAdminDocumentStatus } from "../services/api";
import type { AdminDocumentItem, DocumentReviewStatus } from "../types/api";

export function AdminDocumentsPage() {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<DocumentReviewStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminDocuments();
      setDocuments(response.documents);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  async function changeStatus(uploadId: string, reviewStatus: DocumentReviewStatus) {
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAdminDocumentStatus(uploadId, reviewStatus);
      setDocuments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(t.adminReviewSaved);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    }
  }

  const visible = useMemo(
    () => (statusFilter === "all" ? documents : documents.filter((item) => item.review_status === statusFilter)),
    [documents, statusFilter],
  );

  return (
    <div className="admin-stack">
      <AdminPageHeader
        eyebrow={t.adminSectionManagement}
        title={t.adminDocumentVerification}
        description={t.adminDocumentsLead}
      />
      <p className="admin-note">{t.adminDocumentSeparate}</p>
      {notice ? (
        <p className="admin-note admin-note-success" role="status">
          {notice}
        </p>
      ) : null}
      <AdminPanel>
        <div className="admin-toolbar">
          <label className="admin-filter-label" htmlFor="admin-doc-filter">
            {t.adminFilterStatus}
          </label>
          <select
            id="admin-doc-filter"
            className="admin-input max-w-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as DocumentReviewStatus | "all")}
          >
            <option value="all">{t.adminFilterAll}</option>
            <option value="pending">{t.adminPending}</option>
            <option value="verified">{t.adminVerified}</option>
            <option value="rejected">{t.adminRejected}</option>
          </select>
        </div>
        {loading ? <LoadingState message={t.adminLoading} /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && visible.length === 0 ? <p className="admin-empty">{t.adminDocumentsEmpty}</p> : null}
        {visible.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.adminOwner}</th>
                  <th>{t.adminDocumentType}</th>
                  <th>{t.adminUploaded}</th>
                  <th>{t.adminStatus}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-medium text-slate-900">{item.owner_name}</div>
                      <div className="text-[13px] text-slate-500">{item.owner_email}</div>
                    </td>
                    <td>
                      <div className="text-slate-800">{item.display_name}</div>
                      <div className="text-[13px] text-slate-500">{item.category}</div>
                    </td>
                    <td>{item.created_at}</td>
                    <td>
                      <div className="flex flex-col gap-2">
                        <AdminStatusBadge status={item.review_status} />
                        <label className="sr-only" htmlFor={`review-${item.id}`}>
                          {t.adminStatus}
                        </label>
                        <select
                          id={`review-${item.id}`}
                          className="admin-input"
                          value={item.review_status}
                          onChange={(event) => void changeStatus(item.id, event.target.value as DocumentReviewStatus)}
                        >
                          <option value="pending">{t.adminPending}</option>
                          <option value="verified">{t.adminVerified}</option>
                          <option value="rejected">{t.adminRejected}</option>
                        </select>
                      </div>
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
