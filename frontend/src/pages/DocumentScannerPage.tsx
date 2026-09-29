import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResearchNotice } from "../components/ResearchNotice";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import {
  ApiError,
  cancelDocumentScan,
  confirmDocumentScan,
  createDocumentScan,
  fetchSupportingUploads,
  getMyWallet,
  uploadSupportingDocument,
} from "../services/api";
import type { CitizenWallet, DocumentScan, ExtractedScanField, SupportingUpload } from "../types/api";

type DraftValue = string | boolean | "";

const SCHOOL_OPTIONS = ["government_6_to_12", "government_or_aided_tamil_medium_6_to_12", "other"] as const;

function schoolLabel(value: string, t: ReturnType<typeof useI18n>["t"]): string {
  if (value === "government_6_to_12") return t.schoolGov;
  if (value === "government_or_aided_tamil_medium_6_to_12") return t.schoolAided;
  if (value === "other") return t.schoolOther;
  return value;
}

function fieldLabel(name: string, t: ReturnType<typeof useI18n>["t"]): string {
  if (name === "age") return t.fieldAge;
  if (name === "is_student") return t.fieldStudent;
  if (name === "first_higher_education_course") return t.fieldFirstCourse;
  if (name === "school_background") return t.fieldSchool;
  return name;
}

function clarityLabel(clarity: ExtractedScanField["clarity"], t: ReturnType<typeof useI18n>["t"]): string {
  if (clarity === "extracted") return t.scannerExtracted;
  if (clarity === "unclear") return t.scannerUnclear;
  return t.scannerMissing;
}

function formatWalletValue(value: ExtractedScanField["current_wallet_value"], name: string, t: ReturnType<typeof useI18n>["t"]): string {
  if (value === null || value === undefined) return t.scannerNoValue;
  if (name === "school_background") return schoolLabel(String(value), t);
  if (typeof value === "boolean") return value ? t.yes : t.no;
  return String(value);
}

function toDraftValue(field: ExtractedScanField): DraftValue {
  if (field.name === "is_student" || field.name === "first_higher_education_course") {
    return typeof field.value === "boolean" ? field.value : "";
  }
  if (field.value === null || field.value === undefined) return "";
  return String(field.value);
}

export function DocumentScannerPage() {
  const { t } = useI18n();
  const [uploads, setUploads] = useState<SupportingUpload[]>([]);
  const [wallet, setWallet] = useState<CitizenWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [existingId, setExistingId] = useState("");
  const [busy, setBusy] = useState<"upload" | "scan" | "confirm" | "cancel" | null>(null);
  const [scan, setScan] = useState<DocumentScan | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const educationUploads = useMemo(
    () => uploads.filter((item) => item.category === "education_certificate"),
    [uploads],
  );

  async function loadPage() {
    setLoading(true);
    setError(null);
    try {
      const [listed, currentWallet] = await Promise.all([
        fetchSupportingUploads(),
        getMyWallet().catch((caught) => {
          if (caught instanceof ApiError && caught.status === 404) return null;
          throw caught;
        }),
      ]);
      setUploads(listed.uploads);
      setWallet(currentWallet);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [t]);

  function startReview(next: DocumentScan) {
    setScan(next);
    setDrafts(Object.fromEntries(next.fields.map((field) => [field.name, toDraftValue(field)])));
    setSelected(Object.fromEntries(next.fields.map((field) => [field.name, false])));
  }

  async function handleScan(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const chosenExisting = existingId && !file ? existingId : "";
    if (!file && !chosenExisting) {
      setError(t.scannerNoFile);
      return;
    }
    setBusy(file ? "upload" : "scan");
    try {
      let uploadId = chosenExisting;
      if (file) {
        const uploaded = await uploadSupportingDocument(file, "education_certificate");
        uploadId = uploaded.id;
        setUploads((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)]);
        setFile(null);
      }
      setBusy("scan");
      const next = await createDocumentScan(uploadId);
      startReview(next);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.scannerFailed);
    } finally {
      setBusy(null);
    }
  }

  function collectConfirmedFields(): Record<string, string | number | boolean> | null {
    if (!scan) return null;
    const fields: Record<string, string | number | boolean> = {};
    for (const item of scan.fields) {
      if (!selected[item.name]) continue;
      const draft = drafts[item.name];
      if (item.name === "age") {
        const age = Number(draft);
        if (!Number.isInteger(age)) {
          setError(t.validationAgeRange);
          return null;
        }
        fields.age = age;
        continue;
      }
      if (item.name === "is_student" || item.name === "first_higher_education_course") {
        if (draft === "") {
          setError(t.scannerNeedField);
          return null;
        }
        fields[item.name] = Boolean(draft);
        continue;
      }
      if (item.name === "school_background") {
        if (!draft) {
          setError(t.scannerNeedField);
          return null;
        }
        fields.school_background = String(draft);
      }
    }
    return fields;
  }

  async function handleConfirm() {
    if (!scan) return;
    const fields = collectConfirmedFields();
    if (fields === null) return;
    if (Object.keys(fields).length === 0) {
      setError(t.scannerNeedField);
      return;
    }
    setBusy("confirm");
    setError(null);
    setNotice(null);
    try {
      const next = await confirmDocumentScan(scan.id, fields);
      setScan(next);
      if (next.wallet) setWallet(next.wallet);
      setNotice(t.scannerSuccess);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.scannerFailed);
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!scan) return;
    setBusy("cancel");
    setError(null);
    setNotice(null);
    try {
      const next = await cancelDocumentScan(scan.id);
      setScan(next);
      setNotice(t.scannerCancelled);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.scannerFailed);
    } finally {
      setBusy(null);
    }
  }

  const reviewing = scan?.status === "pending_review";

  return (
    <div className="mx-auto max-w-5xl page-stack">
      <PageHeader title={t.scannerTitle} description={t.scannerLead} />
      <ResearchNotice compact />
      <p className="rounded-[12px] border border-line bg-[#FFF6E8] px-4 py-3 text-[16px] font-medium text-ink-900" role="alert">
        {t.scannerWarning}
      </p>

      {loading ? <LoadingState message={t.uploadsLoading} /> : null}
      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <p className="notice-success" role="status">
          {notice}
        </p>
      ) : null}

      {!wallet && !loading ? (
        <p className="rounded-[12px] border border-line bg-white px-4 py-3 text-[16px] text-ink-700">
          {t.scannerNoWallet}{" "}
          <Link to="/wallet" className="font-semibold text-action hover:underline">
            {t.scannerWalletLink}
          </Link>
        </p>
      ) : null}

      {!loading ? (
        <form className="card-surface space-y-5 p-6 md:p-8" onSubmit={(event) => void handleScan(event)}>
          <label className="block space-y-2 text-[16px] font-semibold text-ink-900">
            {t.scannerType}
            <select
              value="education_certificate"
              disabled
              className="mt-2 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-[16px] font-medium text-ink-900"
            >
              <option value="education_certificate">{t.uploadsCategoryEducation}</option>
            </select>
          </label>

          <label className="block space-y-2 text-[16px] font-semibold text-ink-900">
            {t.scannerFile}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                if (event.target.files?.[0]) setExistingId("");
              }}
              className="mt-2 block w-full text-[16px] font-medium text-ink-700"
            />
          </label>

          <label className="block space-y-2 text-[16px] font-semibold text-ink-900">
            {t.scannerExisting}
            <select
              value={existingId}
              onChange={(event) => {
                setExistingId(event.target.value);
                if (event.target.value) setFile(null);
              }}
              className="mt-2 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-[16px] font-medium text-ink-900"
            >
              <option value="">{educationUploads.length ? t.scannerNewFile : t.scannerExistingNone}</option>
              {educationUploads.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name}
                </option>
              ))}
            </select>
          </label>

          {busy === "upload" ? <LoadingState message={t.scannerUploading} /> : null}
          {busy === "scan" ? <LoadingState message={t.scannerScanning} /> : null}

          <button
            type="submit"
            disabled={busy !== null}
            className="inline-flex items-center justify-center rounded-[12px] bg-action px-5 py-3 font-semibold text-white hover:bg-action-hover disabled:opacity-60"
          >
            {t.scannerSubmit}
          </button>
        </form>
      ) : null}

      {scan ? (
        <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="scanner-review">
          <h2 id="scanner-review" className="section-title">
            {t.scannerReviewTitle}
          </h2>
          <ul className="space-y-5">
            {scan.fields.map((field) => (
              <li key={field.name} className="rounded-[12px] border border-line p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[17px] font-semibold text-ink-900">{fieldLabel(field.name, t)}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                      field.clarity === "extracted"
                        ? "bg-emerald-50 text-emerald-800"
                        : field.clarity === "unclear"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-slate-100 text-ink-600"
                    }`}
                  >
                    {clarityLabel(field.clarity, t)}
                  </span>
                </div>
                <p className="mb-3 text-[15px] text-ink-500">
                  {t.scannerCurrentValue}: {formatWalletValue(field.current_wallet_value, field.name, t)}
                </p>
                {field.name === "age" ? (
                  <input
                    id={`scan-${field.name}`}
                    type="number"
                    min={0}
                    max={120}
                    disabled={!reviewing || busy !== null}
                    value={drafts[field.name] === "" ? "" : String(drafts[field.name] ?? "")}
                    onChange={(event) => setDrafts((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="field-input w-full"
                  />
                ) : null}
                {field.name === "school_background" ? (
                  <select
                    id={`scan-${field.name}`}
                    disabled={!reviewing || busy !== null}
                    value={String(drafts[field.name] ?? "")}
                    onChange={(event) => setDrafts((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-[16px] font-medium"
                  >
                    <option value="">{t.fieldSchoolPlaceholder}</option>
                    {SCHOOL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {schoolLabel(option, t)}
                      </option>
                    ))}
                  </select>
                ) : null}
                {field.name === "is_student" || field.name === "first_higher_education_course" ? (
                  <select
                    id={`scan-${field.name}`}
                    disabled={!reviewing || busy !== null}
                    value={drafts[field.name] === "" ? "" : drafts[field.name] ? "true" : "false"}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [field.name]: event.target.value === "" ? "" : event.target.value === "true",
                      }))
                    }
                    className="mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-[16px] font-medium"
                  >
                    <option value="">{t.scannerNoValue}</option>
                    <option value="true">{t.yes}</option>
                    <option value="false">{t.no}</option>
                  </select>
                ) : null}
                <label className="mt-3 flex items-center gap-2 text-[16px] font-medium text-ink-800">
                  <input
                    type="checkbox"
                    disabled={!reviewing || busy !== null}
                    checked={Boolean(selected[field.name])}
                    onChange={(event) => setSelected((current) => ({ ...current, [field.name]: event.target.checked }))}
                  />
                  {t.scannerApplyField}
                </label>
              </li>
            ))}
          </ul>

          {busy === "confirm" ? <LoadingState message={t.scannerConfirming} /> : null}
          {busy === "cancel" ? <LoadingState message={t.scannerCancelling} /> : null}

          {reviewing ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy !== null || !wallet}
                onClick={() => void handleConfirm()}
                className="inline-flex items-center justify-center rounded-[12px] bg-action px-5 py-3 font-semibold text-white hover:bg-action-hover disabled:opacity-60"
              >
                {t.scannerConfirm}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleCancel()}
                className="inline-flex items-center justify-center rounded-[12px] border border-line px-5 py-3 font-semibold text-ink-900 hover:bg-sage disabled:opacity-60"
              >
                {t.scannerCancel}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="text-[16px] text-ink-500">
        <Link to="/uploads" className="font-semibold text-action hover:underline">
          {t.scannerUploadsLink}
        </Link>
      </p>
    </div>
  );
}
