import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ResearchNotice } from "../components/ResearchNotice";
import { MicIcon } from "../components/icons";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useRecommendation } from "../context/RecommendationContext";
import { useI18n } from "../context/LanguageContext";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { fetchProfileCompleteness, fetchVoiceStatus } from "../services/api";
import {
  buildConfirmationText,
  confirmProfileUpdate,
  documentsNeedSpeech,
  explainRecommendation,
  formatEligibilitySpeech,
  formatExtractedFields,
  formatUnsupportedMentions,
  friendlyVoiceError,
  highestBenefitSpeech,
  loadIncompleteFields,
  navigationPath,
  navigationSpeech,
  runCompletenessSpeech,
  runEligibilityCheck,
  runSchemeQuestion,
  unsupportedSpeech,
  walletToProfile,
  buildIncomeWhatIfMessage,
  type IncomeWhatIfMessage,
} from "../services/voiceAssistantService";
import {
  applyAdminReviewStatus,
  filterReviewDocuments,
  formatAdminConfirm,
  formatAdminDocuments,
  formatAdminMatches,
  formatAdminUserSummary,
  formatPendingReviews,
  formatReviewConfirm,
  formatReviewMatches,
  isAffirmative,
  isNegative,
  loadAdminDocumentsForUser,
  loadAdminPendingReviews,
  loadAdminUserDetail,
  logVoiceAudit,
  matchAdminCandidate,
  matchReviewDocument,
  reviewStatusLabel,
  searchAdminUsers,
} from "../services/voiceAdminService";
import type { AdminDocumentItem, AdminUserSummary, CitizenProfile, DocumentReviewStatus, VoiceStatusResponse } from "../types/api";
import { displayFirstName, isLowSpeechConfidence, isNoiseTranscript } from "../utils/niraIdentity";
import { isSecureSpeechContext } from "../utils/niraSpeech";
import { detectVoiceIntent, type AdminLookupKind } from "../utils/voiceIntent";

type AssistantState = "idle" | "listening" | "processing" | "speaking" | "error";

interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  status?: "processing" | "error" | "complete";
  action?: IncomeWhatIfMessage["action"];
  intent?: IncomeWhatIfMessage["intent"];
}

interface PendingUpdate {
  extracted: Partial<CitizenProfile>;
  unsupportedMentions?: string[];
  followUp?: "CHECK_ELIGIBILITY";
}

interface PendingAdminLookup {
  stage: "confirm" | "choose";
  kind: AdminLookupKind;
  query: string;
  sourceTranscript: string;
  candidates?: AdminUserSummary[];
}

interface PendingAdminReview {
  stage: "confirm1" | "choose-user" | "choose-document" | "confirm2";
  personQuery: string;
  reviewStatus: DocumentReviewStatus;
  sourceTranscript: string;
  category?: string;
  user?: AdminUserSummary;
  users?: AdminUserSummary[];
  documents?: AdminDocumentItem[];
  document?: AdminDocumentItem;
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTurnTime(at: number, language: string): string {
  return new Date(at).toLocaleTimeString(language === "ta" ? "ta-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function VoiceAssistantPage() {
  const { language, t } = useI18n();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { result, setSubmission } = useRecommendation();
  const isAdminSession = pathname.startsWith("/admin") && Boolean(user?.is_admin);
  const firstName = displayFirstName(user?.full_name, user?.email);
  const greeting = isAdminSession ? t.voiceGreetingAdmin(firstName) : t.voiceGreeting(firstName);
  const signedInLine = isAdminSession ? t.voiceSignedInAdmin(firstName) : t.voiceSignedInCitizen(firstName);
  const greetedRef = useRef(false);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<AssistantState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
  const [pendingAdmin, setPendingAdmin] = useState<PendingAdminLookup | null>(null);
  const pendingAdminRef = useRef<PendingAdminLookup | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingAdminReview | null>(null);
  const pendingReviewRef = useRef<PendingAdminReview | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatusResponse | null>(null);
  const [adminRecordHref, setAdminRecordHref] = useState<string | null>(null);
  const [incomeWhatIf, setIncomeWhatIf] = useState<IncomeWhatIfMessage | null>(null);
  const [lastRequest, setLastRequest] = useState("");
  const [failedRequest, setFailedRequest] = useState<string | null>(null);
  const speech = useTextToSpeech();
  const busyRef = useRef(false);

  const speakUtterance = speech.speak;
  const ttsSupported = speech.supported;
  const ttsSpeaking = speech.speaking;

  const replaceProcessingTurn = useCallback(
    (text: string, status: "complete" | "error", extras?: Pick<ConversationTurn, "action" | "intent">) => {
      setHistory((current) => {
        const last = current[current.length - 1];
        if (last?.role === "assistant" && last.status === "processing") {
          return [...current.slice(0, -1), { ...last, text, status, at: Date.now(), ...extras }];
        }
        return [...current, { id: nextId(), role: "assistant", text, status, at: Date.now(), ...extras }];
      });
    },
    [],
  );

  function storePendingAdmin(next: PendingAdminLookup | null) {
    pendingAdminRef.current = next;
    setPendingAdmin(next);
  }

  function storePendingReview(next: PendingAdminReview | null) {
    pendingReviewRef.current = next;
    setPendingReview(next);
  }

  const speakResponse = useCallback(
    (text: string) => {
      setLastResponse(text);
      replaceProcessingTurn(text, "complete");
      setFailedRequest(null);
      const started = speakUtterance(text, language);
      if (started) {
        setState("idle");
        setStatusMessage(t.voiceSpeaking);
        return;
      }
      setState("idle");
      setStatusMessage(ttsSupported ? null : t.voiceTtsUnavailable);
    },
    [language, replaceProcessingTurn, speakUtterance, t, ttsSupported],
  );

  const speakAdminRecord = useCallback(
    async (kind: AdminLookupKind, user: AdminUserSummary, auditTranscript: string) => {
      storePendingAdmin(null);
      if (kind === "documents") {
        const documents = await loadAdminDocumentsForUser(user.user_id);
        setAdminRecordHref("/admin/documents");
        speakResponse(formatAdminDocuments(user.full_name, documents, t));
        void logVoiceAudit({
          intent: "ADMIN_USER_DOCUMENTS",
          outcome: "ok",
          targetUserId: user.user_id,
          transcript: auditTranscript,
        });
        return;
      }
      const detail = await loadAdminUserDetail(user.user_id);
      setAdminRecordHref(`/admin/users/${user.user_id}`);
      speakResponse(formatAdminUserSummary(detail, t));
      void logVoiceAudit({
        intent: kind === "summary" ? "ADMIN_USER_SUMMARY" : "ADMIN_LOOKUP_USER",
        outcome: "ok",
        targetUserId: user.user_id,
        transcript: auditTranscript,
      });
    },
    [speakResponse, t],
  );

  const fulfillAdminLookup = useCallback(
    async (pending: PendingAdminLookup, auditTranscript: string) => {
      const users = await searchAdminUsers(pending.query);
      if (users.length === 0) {
        storePendingAdmin(null);
        speakResponse(t.voiceAdminNotFound(pending.query));
        void logVoiceAudit({
          intent: "ADMIN_LOOKUP_USER",
          outcome: "not_found",
          transcript: auditTranscript,
        });
        return;
      }
      if (users.length > 1) {
        storePendingAdmin({ ...pending, stage: "choose", candidates: users.slice(0, 3) });
        speakResponse(formatAdminMatches(users, t));
        void logVoiceAudit({
          intent: "ADMIN_LOOKUP_USER",
          outcome: "ambiguous",
          transcript: auditTranscript,
        });
        return;
      }
      await speakAdminRecord(pending.kind, users[0], auditTranscript);
    },
    [speakAdminRecord, speakResponse, t],
  );

  const prepareReviewDocument = useCallback(
    async (pending: PendingAdminReview, user: AdminUserSummary) => {
      const documents = filterReviewDocuments(
        await loadAdminDocumentsForUser(user.user_id),
        pending.category,
      );
      if (documents.length === 0) {
        storePendingReview(null);
        speakResponse(t.voiceAdminReviewNotFound(user.full_name));
        void logVoiceAudit({
          intent: "ADMIN_REVIEW_DOCUMENT",
          outcome: "not_found",
          targetUserId: user.user_id,
          transcript: pending.sourceTranscript,
        });
        return;
      }
      if (documents.length > 1) {
        storePendingReview({
          ...pending,
          stage: "choose-document",
          user,
          documents: documents.slice(0, 3),
        });
        speakResponse(formatReviewMatches(documents, t));
        void logVoiceAudit({
          intent: "ADMIN_REVIEW_DOCUMENT",
          outcome: "ambiguous",
          targetUserId: user.user_id,
          transcript: pending.sourceTranscript,
        });
        return;
      }
      const document = documents[0];
      storePendingReview({ ...pending, stage: "confirm2", user, document, documents });
      speakResponse(formatReviewConfirm(user.full_name, pending.reviewStatus, document.category, t, true));
    },
    [speakResponse, t],
  );

  const continueReviewAfterFirstConfirm = useCallback(
    async (pending: PendingAdminReview) => {
      const users = pending.user ? [pending.user] : await searchAdminUsers(pending.personQuery);
      if (users.length === 0) {
        storePendingReview(null);
        speakResponse(t.voiceAdminNotFound(pending.personQuery));
        void logVoiceAudit({
          intent: "ADMIN_REVIEW_DOCUMENT",
          outcome: "not_found",
          transcript: pending.sourceTranscript,
        });
        return;
      }
      if (users.length > 1) {
        storePendingReview({ ...pending, stage: "choose-user", users: users.slice(0, 3) });
        speakResponse(formatAdminMatches(users, t));
        void logVoiceAudit({
          intent: "ADMIN_REVIEW_DOCUMENT",
          outcome: "ambiguous",
          transcript: pending.sourceTranscript,
        });
        return;
      }
      await prepareReviewDocument(pending, users[0]);
    },
    [prepareReviewDocument, speakResponse, t],
  );

  const applyPendingReview = useCallback(
    async (pending: PendingAdminReview) => {
      if (!pending.document || !pending.user) return;
      await applyAdminReviewStatus(pending.document.id, pending.reviewStatus);
      storePendingReview(null);
      setAdminRecordHref("/admin/documents");
      speakResponse(t.voiceAdminReviewUpdated(pending.user.full_name, reviewStatusLabel(pending.reviewStatus, t)));
      void logVoiceAudit({
        intent: "ADMIN_REVIEW_DOCUMENT",
        outcome: "ok",
        targetUserId: pending.user.user_id,
        transcript: pending.sourceTranscript,
      });
    },
    [speakResponse, t],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchVoiceStatus()
      .then((status) => {
        if (!cancelled) setVoiceStatus(status);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    setLastResponse(greeting);
    setHistory([
      { id: nextId(), role: "assistant", text: greeting, at: Date.now(), status: "complete" },
    ]);
    speakUtterance(greeting, language);
  }, [greeting, language, speakUtterance]);

  const handleRequest = useCallback(
    async (text: string, source: "typed" | "speech" = "typed", confidence?: number) => {
      const transcript = text.trim();
      if (!transcript) {
        setState("error");
        setStatusMessage(t.voiceEmptyTranscript);
        return;
      }
      if (isNoiseTranscript(transcript)) {
        setLastTranscript(transcript);
        setLastResponse(t.voiceNoiseIgnored);
        setState("idle");
        setStatusMessage(t.voiceNoiseIgnored);
        return;
      }
      if (source === "speech" && isLowSpeechConfidence(confidence)) {
        setLastTranscript(transcript);
        setLastResponse(t.voiceLowConfidence(transcript));
        setState("idle");
        setStatusMessage(t.voiceLowConfidence(transcript));
        setHistory((current) => [
          ...current,
          { id: nextId(), role: "user", text: transcript, at: Date.now(), status: "complete" },
          {
            id: nextId(),
            role: "assistant",
            text: t.voiceLowConfidence(transcript),
            at: Date.now(),
            status: "complete",
          },
        ]);
        speakUtterance(t.voiceLowConfidence(transcript), language);
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      speech.stop();
      setLastTranscript(transcript);
      setLastRequest(transcript);
      setFailedRequest(null);
      setPendingUpdate(null);
      setIncomeWhatIf(null);
      setAdminRecordHref(null);
      setState("processing");
      setStatusMessage(t.voiceProcessing);
      setHistory((current) => [
        ...current,
        { id: nextId(), role: "user", text: transcript, at: Date.now(), status: "complete" },
        { id: nextId(), role: "assistant", text: t.voiceProcessing, at: Date.now(), status: "processing" },
      ]);

      const intent = detectVoiceIntent(transcript);
      try {
        const existingReview = pendingReviewRef.current;
        if (existingReview && isNegative(transcript)) {
          storePendingReview(null);
          speakResponse(t.voiceAdminReviewCancelled);
          void logVoiceAudit({
            intent: "ADMIN_REVIEW_DOCUMENT",
            outcome: "cancelled",
            transcript: existingReview.sourceTranscript,
          });
          return;
        }
        if (existingReview?.stage === "confirm1" && isAffirmative(transcript)) {
          await continueReviewAfterFirstConfirm(existingReview);
          return;
        }
        if (existingReview?.stage === "confirm2" && isAffirmative(transcript)) {
          await applyPendingReview(existingReview);
          return;
        }
        if (existingReview?.stage === "choose-user") {
          const matches = matchAdminCandidate(transcript, existingReview.users ?? []);
          if (matches.length === 1) {
            await prepareReviewDocument(existingReview, matches[0]);
            return;
          }
          speakResponse(t.voiceAdminNotFound(transcript));
          void logVoiceAudit({
            intent: "ADMIN_REVIEW_DOCUMENT",
            outcome: "not_found",
            transcript,
          });
          return;
        }
        if (existingReview?.stage === "choose-document") {
          const matches = matchReviewDocument(transcript, existingReview.documents ?? []);
          if (matches.length === 1 && existingReview.user) {
            storePendingReview({ ...existingReview, stage: "confirm2", document: matches[0] });
            speakResponse(
              formatReviewConfirm(
                existingReview.user.full_name,
                existingReview.reviewStatus,
                matches[0].category,
                t,
                true,
              ),
            );
            return;
          }
          speakResponse(formatReviewMatches(existingReview.documents ?? [], t));
          void logVoiceAudit({
            intent: "ADMIN_REVIEW_DOCUMENT",
            outcome: "ambiguous",
            transcript,
          });
          return;
        }
        if (existingReview) {
          storePendingReview(null);
        }

        const existingAdmin = pendingAdminRef.current;
        if (existingAdmin && isNegative(transcript)) {
          storePendingAdmin(null);
          speakResponse(t.voiceAdminCancelled);
          void logVoiceAudit({
            intent: "ADMIN_LOOKUP_USER",
            outcome: "cancelled",
            transcript: existingAdmin.sourceTranscript,
          });
          return;
        }
        if (existingAdmin?.stage === "confirm" && isAffirmative(transcript)) {
          await fulfillAdminLookup(existingAdmin, existingAdmin.sourceTranscript);
          return;
        }
        if (existingAdmin?.stage === "choose") {
          const matches = matchAdminCandidate(transcript, existingAdmin.candidates ?? []);
          if (matches.length === 1) {
            await speakAdminRecord(existingAdmin.kind, matches[0], transcript);
            return;
          }
          if (matches.length === 0) {
            speakResponse(t.voiceAdminNotFound(transcript));
            void logVoiceAudit({
              intent: "ADMIN_LOOKUP_USER",
              outcome: "not_found",
              transcript,
            });
            return;
          }
          storePendingAdmin({ ...existingAdmin, candidates: matches });
          speakResponse(formatAdminMatches(matches, t));
          void logVoiceAudit({
            intent: "ADMIN_LOOKUP_USER",
            outcome: "ambiguous",
            transcript,
          });
          return;
        }
        if (existingAdmin) {
          storePendingAdmin(null);
        }

        if (intent.intent === "WHO_ARE_YOU") {
          speakResponse(t.voiceWhoAmI);
          return;
        }
        if (intent.intent === "HELP") {
          speakResponse(isAdminSession ? t.voiceHelpAdmin : t.voiceHelpCitizen);
          return;
        }
        if (intent.intent === "GREET") {
          speakResponse(greeting);
          return;
        }

        if (intent.intent.startsWith("ADMIN_")) {
          if (!isAdminSession) {
            speakResponse(t.voiceAdminRefuseCitizen);
            return;
          }
          if (intent.intent === "ADMIN_PENDING_REVIEWS") {
            speakResponse(formatPendingReviews(await loadAdminPendingReviews(), t));
            void logVoiceAudit({
              intent: "ADMIN_PENDING_REVIEWS",
              outcome: "ok",
              transcript,
            });
            return;
          }
          if (intent.intent === "ADMIN_NAVIGATE" && intent.adminNavigateTo) {
            const href =
              intent.adminNavigateTo === "users"
                ? "/admin/users"
                : intent.adminNavigateTo === "documents"
                  ? "/admin/documents"
                  : intent.adminNavigateTo === "eligibility"
                    ? "/admin/eligibility"
                    : "/admin";
            speakResponse(
              intent.adminNavigateTo === "users"
                ? t.voiceAdminNavigateUsers
                : intent.adminNavigateTo === "documents"
                  ? t.voiceAdminNavigateDocuments
                  : intent.adminNavigateTo === "eligibility"
                    ? t.voiceAdminNavigateEligibility
                    : t.voiceAdminNavigateOverview,
            );
            navigate(href);
            return;
          }
          if (intent.intent === "ADMIN_REVIEW_DOCUMENT") {
            if (!intent.personQuery || !intent.reviewStatus) {
              speakResponse(t.voiceAdminNeedName);
              return;
            }
            storePendingAdmin(null);
            storePendingReview({
              stage: "confirm1",
              personQuery: intent.personQuery,
              reviewStatus: intent.reviewStatus,
              sourceTranscript: transcript,
              category: intent.documentCategory,
            });
            speakResponse(
              formatReviewConfirm(intent.personQuery, intent.reviewStatus, intent.documentCategory, t),
            );
            return;
          }
          if (!intent.personQuery) {
            speakResponse(t.voiceAdminNeedName);
            return;
          }
          const kind = intent.adminKind ?? "lookup";
          storePendingAdmin({
            stage: "confirm",
            kind,
            query: intent.personQuery,
            sourceTranscript: transcript,
          });
          speakResponse(formatAdminConfirm(kind, intent.personQuery, t));
          return;
        }

        if (intent.intent === "NAVIGATE" && intent.navigateTo) {
          if (isAdminSession && intent.navigateTo === "documents") {
            speakResponse(t.voiceAdminNavigateDocuments);
            navigate("/admin/documents");
            return;
          }
          speakResponse(navigationSpeech(intent.navigateTo, t));
          navigate(navigationPath(intent.navigateTo));
          return;
        }

        if (intent.intent === "UPDATE_PROFILE" && intent.extracted && Object.keys(intent.extracted).length > 0) {
          setPendingUpdate({
            extracted: intent.extracted,
            unsupportedMentions: intent.unsupportedMentions,
            followUp: intent.followUp,
          });
          speakResponse(buildConfirmationText(intent.extracted, intent.unsupportedMentions, t));
          return;
        }

        if (intent.intent === "CHECK_ELIGIBILITY") {
          if (intent.extracted && Object.keys(intent.extracted).length > 0) {
            setPendingUpdate({
              extracted: intent.extracted,
              unsupportedMentions: intent.unsupportedMentions,
              followUp: "CHECK_ELIGIBILITY",
            });
            speakResponse(buildConfirmationText(intent.extracted, intent.unsupportedMentions, t));
            return;
          }
          const checked = await runEligibilityCheck();
          setSubmission(walletToProfile(checked.wallet), checked.result);
          speakResponse(formatEligibilitySpeech(checked.result, t, checked.incompleteFields));
          return;
        }

        if (intent.intent === "EXPLAIN_RESULT") {
          speakResponse(explainRecommendation(result, await loadIncompleteFields(), t));
          return;
        }

        if (intent.intent === "PROFILE_COMPLETENESS") {
          speakResponse(await runCompletenessSpeech(t));
          return;
        }

        if (intent.intent === "SCHEME_QUESTION") {
          speakResponse(await runSchemeQuestion(intent.studentFocus, t));
          return;
        }

        if (intent.intent === "WHAT_IF") {
          const message = buildIncomeWhatIfMessage(t);
          setIncomeWhatIf(message);
          setLastResponse(message.text);
          replaceProcessingTurn(message.text, "complete", { action: message.action, intent: message.intent });
          setFailedRequest(null);
          const started = speakUtterance(message.text, language);
          if (started) {
            setState("idle");
            setStatusMessage(t.voiceSpeaking);
          } else {
            setState("idle");
            setStatusMessage(ttsSupported ? null : t.voiceTtsUnavailable);
          }
          return;
        }

        if (intent.intent === "DOCUMENTS_NEEDED") {
          speakResponse(documentsNeedSpeech(result, t));
          return;
        }

        if (intent.intent === "HIGHEST_BENEFIT") {
          speakResponse(highestBenefitSpeech(result, t));
          return;
        }

        speakResponse(unsupportedSpeech(intent, t));
      } catch (error) {
        if (isAdminSession) {
          void logVoiceAudit({
            intent: intent.intent.startsWith("ADMIN_") ? intent.intent : "ADMIN_LOOKUP_USER",
            outcome: "error",
            transcript,
          });
        }
        setState("error");
        const message = friendlyVoiceError(error, t);
        setStatusMessage(message);
        setLastResponse(message);
        setFailedRequest(transcript);
        replaceProcessingTurn(message, "error");
      } finally {
        busyRef.current = false;
      }
    },
    [
      applyPendingReview,
      continueReviewAfterFirstConfirm,
      fulfillAdminLookup,
      greeting,
      isAdminSession,
      language,
      navigate,
      prepareReviewDocument,
      replaceProcessingTurn,
      result,
      setSubmission,
      speakAdminRecord,
      speakResponse,
      speakUtterance,
      speech,
      t,
      ttsSupported,
    ],
  );

  const recognition = useVoiceRecognition({
    language,
    onFinalTranscript: (spoken, meta) => {
      void handleRequest(spoken, "speech", meta?.confidence);
    },
  });

  const uiState: AssistantState = recognition.listening
    ? "listening"
    : ttsSpeaking
      ? "speaking"
      : state;

  const busy = uiState === "processing" || uiState === "listening";

  const statusLabel = useMemo(() => {
    if (recognition.listening) return t.voiceListening;
    if (ttsSpeaking) return `🔊 ${t.voiceStatusSpeaking}...`;
    if (state === "processing") return t.voiceProcessing;
    if (state === "error") return statusMessage ?? t.voiceStatusError;
    return statusMessage ?? t.voiceIdleHint;
  }, [recognition.listening, ttsSpeaking, state, statusMessage, t]);

  async function handleConfirmAdminLookup() {
    if (pendingReview) {
      if (busyRef.current) return;
      busyRef.current = true;
      setState("processing");
      setStatusMessage(t.voiceProcessing);
      try {
        if (pendingReview.stage === "confirm1") {
          await continueReviewAfterFirstConfirm(pendingReview);
        } else if (pendingReview.stage === "confirm2") {
          await applyPendingReview(pendingReview);
        }
      } catch (error) {
        void logVoiceAudit({
          intent: "ADMIN_REVIEW_DOCUMENT",
          outcome: "error",
          transcript: pendingReview.sourceTranscript,
        });
        setState("error");
        setStatusMessage(friendlyVoiceError(error, t));
      } finally {
        busyRef.current = false;
      }
      return;
    }
    if (!pendingAdmin || busyRef.current) return;
    busyRef.current = true;
    setState("processing");
    setStatusMessage(t.voiceProcessing);
    try {
      await fulfillAdminLookup(pendingAdmin, pendingAdmin.sourceTranscript);
    } catch (error) {
      void logVoiceAudit({
        intent: "ADMIN_LOOKUP_USER",
        outcome: "error",
        transcript: pendingAdmin.sourceTranscript,
      });
      setState("error");
      setStatusMessage(friendlyVoiceError(error, t));
    } finally {
      busyRef.current = false;
    }
  }

  function handleCancelAdminLookup() {
    if (busyRef.current) return;
    if (pendingReview) {
      const sourceTranscript = pendingReview.sourceTranscript;
      storePendingReview(null);
      speakResponse(t.voiceAdminReviewCancelled);
      void logVoiceAudit({
        intent: "ADMIN_REVIEW_DOCUMENT",
        outcome: "cancelled",
        transcript: sourceTranscript,
      });
      return;
    }
    const sourceTranscript = pendingAdmin?.sourceTranscript ?? pendingAdmin?.query ?? "cancel";
    storePendingAdmin(null);
    speakResponse(t.voiceAdminCancelled);
    void logVoiceAudit({
      intent: "ADMIN_LOOKUP_USER",
      outcome: "cancelled",
      transcript: sourceTranscript,
    });
  }

  async function handleConfirmUpdate() {
    if (!pendingUpdate || busyRef.current) return;
    busyRef.current = true;
    setState("processing");
    setStatusMessage(t.voiceProcessing);
    try {
      await confirmProfileUpdate(pendingUpdate.extracted);
      await fetchProfileCompleteness().catch(() => undefined);
      let reply = t.voiceUpdatedProfile;
      if (pendingUpdate.followUp === "CHECK_ELIGIBILITY") {
        const checked = await runEligibilityCheck();
        setSubmission(walletToProfile(checked.wallet), checked.result);
        reply = `${t.voiceUpdatedProfile} ${formatEligibilitySpeech(checked.result, t, checked.incompleteFields)}`;
      }
      setPendingUpdate(null);
      speakResponse(reply);
    } catch (error) {
      setState("error");
      setStatusMessage(friendlyVoiceError(error, t));
    } finally {
      busyRef.current = false;
    }
  }

  function handleCancelUpdate() {
    if (busyRef.current) return;
    setPendingUpdate(null);
    speakResponse(t.voiceCancelledUpdate);
  }

  function handleTextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = typed.trim();
    if (!value) {
      setState("error");
      setStatusMessage(t.voiceEmptyTranscript);
      return;
    }
    if (busy) return;
    setTyped("");
    void handleRequest(value);
  }

  function handleStart() {
    if (busy) return;
    speech.stop();
    recognition.clearError();
    setState("idle");
    setStatusMessage(null);
    if (!recognition.supported) {
      setState("error");
      setStatusMessage(t.voiceUnsupportedBrowser);
      return;
    }
    recognition.start();
  }

  function handleClearConversation() {
    speech.stop();
    recognition.stop();
    setHistory([]);
    setLastTranscript("");
    setLastResponse("");
    setPendingUpdate(null);
    storePendingAdmin(null);
    storePendingReview(null);
    setAdminRecordHref(null);
    setIncomeWhatIf(null);
    setFailedRequest(null);
    setLastRequest("");
    setState("idle");
    setStatusMessage(null);
    recognition.clearError();
  }

  const recognitionError = recognition.error
    ? recognition.error === "permission"
      ? t.voicePermissionDenied
      : recognition.error === "unsupported"
        ? t.voiceUnsupportedBrowser
        : recognition.error === "unavailable"
          ? t.voiceMicUnavailable
          : recognition.error === "timeout"
            ? t.voiceRecognitionTimeout
            : recognition.error === "empty"
              ? t.voiceEmptyTranscript
              : t.voiceRecognitionError
    : null;

  const statusText =
    uiState === "listening"
      ? t.voiceStatusListening
      : uiState === "processing"
        ? t.voiceStatusProcessing
        : uiState === "speaking"
          ? t.voiceStatusSpeaking
          : uiState === "error"
            ? t.voiceStatusError
            : t.voiceStatusIdle;

  return (
    <div className="page-stack">
      <PageHeader title={t.voiceTitle} description={t.voiceBanner}>
        <p className="text-[15px] text-ink-500">{signedInLine}</p>
        <p className="text-[14px] text-ink-500">{speech.voiceLabel}</p>
        <p className="text-[14px] text-ink-500">
          {!isSecureSpeechContext()
            ? t.voiceSpeechInsecure
            : voiceStatus?.cloud_stt_available
              ? t.voiceSpeechCloudReady
              : t.voiceSpeechBrowserOnly}
        </p>
      </PageHeader>
      <ResearchNotice compact />

      <section className="card-surface px-5 py-8 text-center sm:px-10 sm:py-10" aria-labelledby="voice-mic-heading">
        <h2 id="voice-mic-heading" className="sr-only">
          {t.voiceMicLabel}
        </h2>
        <p className="text-[20px] font-semibold text-ink-900 sm:text-[22px]">{t.voiceBanner}</p>
        <div
          className={`voice-mic mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full bg-sage text-action shadow-card sm:h-32 sm:w-32 ${
            uiState === "listening" ? "voice-mic-listening" : ""
          }`}
          aria-hidden="true"
        >
          <MicIcon width={40} height={40} />
        </div>
        <p
          className="mt-6 text-[16px] font-semibold uppercase tracking-[0.12em] text-ink-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusText}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-[17px] leading-relaxed text-ink-500" role="status" aria-live="polite">
          {recognitionError ?? statusLabel}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {recognition.listening ? (
            <Button type="button" variant="secondary" onClick={recognition.stop} aria-label={t.voiceStopListening}>
              {t.voiceStopListening}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStart}
              disabled={uiState === "processing"}
              aria-label={t.voiceStartSpeaking}
            >
              {t.voiceStartSpeaking}
            </Button>
          )}
          {speech.speaking ? (
            <Button type="button" variant="secondary" onClick={speech.stop} aria-label={t.voiceStopSpeaking}>
              {t.voiceStopSpeaking}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="voice-transcript">
        <h2 id="voice-transcript" className="section-title">
          {t.voiceYouSaid}
        </h2>
        <p className="text-[18px] leading-relaxed text-ink-900">
          {lastTranscript || recognition.transcript || recognition.interimTranscript || "—"}
        </p>
      </section>

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="voice-response">
        <h2 id="voice-response" className="section-title">
          {t.voiceAssistantResponse}
        </h2>
        <p className="text-[18px] leading-relaxed text-ink-700">{lastResponse || "—"}</p>
        {incomeWhatIf?.action === "open_simulator" ? (
          <Button
            type="button"
            onClick={() => navigate("/eligibility-simulator")}
            disabled={speech.speaking || uiState === "speaking" || uiState === "processing"}
          >
            {t.voiceOpenSimulator}
          </Button>
        ) : null}
        {pendingReview ? (
          <div className="rounded-[16px] border border-line bg-sage p-5 text-left">
            <p className="text-[17px] text-ink-700">
              {pendingReview.stage === "choose-user"
                ? t.voiceAdminWhichUser
                : pendingReview.stage === "choose-document"
                  ? t.voiceAdminWhichDocument
                  : formatReviewConfirm(
                      pendingReview.user?.full_name ?? pendingReview.personQuery,
                      pendingReview.reviewStatus,
                      pendingReview.document?.category ?? pendingReview.category,
                      t,
                      pendingReview.stage === "confirm2",
                    )}
            </p>
            {pendingReview.stage === "confirm1" || pendingReview.stage === "confirm2" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void handleConfirmAdminLookup()}
                  disabled={uiState === "processing"}
                >
                  {t.voiceConfirm}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelAdminLookup}
                  disabled={uiState === "processing"}
                >
                  {t.voiceCancel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {pendingAdmin ? (
          <div className="rounded-[16px] border border-line bg-sage p-5 text-left">
            <p className="text-[17px] text-ink-700">
              {pendingAdmin.stage === "choose"
                ? t.voiceAdminWhichUser
                : formatAdminConfirm(pendingAdmin.kind, pendingAdmin.query, t)}
            </p>
            {pendingAdmin.stage === "confirm" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void handleConfirmAdminLookup()}
                  disabled={uiState === "processing"}
                >
                  {t.voiceConfirm}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelAdminLookup}
                  disabled={uiState === "processing"}
                >
                  {t.voiceCancel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {adminRecordHref ? (
          <Button type="button" variant="secondary" onClick={() => navigate(adminRecordHref)}>
            {t.voiceAdminOpenRecord}
          </Button>
        ) : null}
        {pendingUpdate ? (
          <div className="rounded-[16px] border border-line bg-sage p-5 text-left">
            <p className="text-[16px] font-semibold text-ink-900">{t.voiceUnderstood}</p>
            <ul className="mt-3 space-y-2 text-[17px] text-ink-700">
              {formatExtractedFields(pendingUpdate.extracted, t).map((row) => (
                <li key={row.label}>
                  {row.label}: {row.value}
                </li>
              ))}
            </ul>
            {pendingUpdate.unsupportedMentions?.length ? (
              <p className="mt-3 text-[16px] text-ink-500">
                {t.voiceUnsupportedFields} ({formatUnsupportedMentions(pendingUpdate.unsupportedMentions, t)})
              </p>
            ) : null}
            <p className="mt-4 text-[17px] text-ink-700">{t.voiceConfirmWallet}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleConfirmUpdate()} disabled={uiState === "processing"}>
                {t.voiceConfirm}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancelUpdate} disabled={uiState === "processing"}>
                {t.voiceCancel}
              </Button>
            </div>
          </div>
        ) : null}
        {failedRequest ? (
          <Button type="button" variant="secondary" onClick={() => void handleRequest(failedRequest)}>
            {t.voiceRetry}
          </Button>
        ) : null}
      </section>

      <section className="card-surface space-y-5 p-5 md:p-8" aria-labelledby="voice-text">
        <h2 id="voice-text" className="section-title">
          {t.voiceTextInputLabel}
        </h2>
        <p className="text-[16px] text-ink-500">{t.voiceTextFallbackHint}</p>
        <form onSubmit={handleTextSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="voice-text-input">
            {t.voiceTextInputLabel}
          </label>
          <input
            id="voice-text-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t.voiceTextPlaceholder}
            aria-label={t.voiceTextInputLabel}
            className="field-input"
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {t.voiceSend}
            </Button>
            {lastRequest ? (
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleRequest(lastRequest)}>
                {t.voiceResend}
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-4" aria-labelledby="voice-suggested">
        <h2 id="voice-suggested" className="section-title">
          {t.voiceSuggested}
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            t.voicePromptWho,
            t.voicePromptHelp,
            ...(isAdminSession
              ? [t.voicePromptAdminPending, t.voicePromptAdminFind, t.voicePromptAdminDocuments, t.voicePromptAdminReview]
              : []),
            t.voicePromptCheck,
            t.voicePromptWhyEligible,
            t.voicePromptWhyNot,
            t.voicePromptMissing,
            t.voicePromptRecommended,
            t.voicePromptSchemes,
            t.voicePromptDocuments,
            t.voicePromptWhatIf,
            t.voicePromptCompare,
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={busy}
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-[16px] font-semibold text-ink-900 hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleRequest(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="card-surface space-y-4 p-5 md:p-8" aria-labelledby="voice-history">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="voice-history" className="section-title">
            {t.voiceHistory}
          </h2>
          {history.length > 0 ? (
            <Button type="button" variant="ghost" onClick={handleClearConversation}>
              {t.voiceClearConversation}
            </Button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="text-[17px] text-ink-500">{t.voiceHistoryEmpty}</p>
        ) : (
          <ol className="space-y-4">
            {history.map((turn) => (
              <li key={turn.id} className="rounded-[14px] bg-sage px-4 py-3">
                <p className="text-[15px] font-semibold uppercase tracking-wide text-ink-500">
                  {turn.role === "user" ? t.voiceRoleUser : t.voiceRoleAssistant}
                  {turn.status === "processing" ? ` · ${t.voiceStatusProcessing}` : ""}
                  {turn.status === "error" ? ` · ${t.voiceStatusError}` : ""}
                  <span className="ml-2 font-normal normal-case tracking-normal">{formatTurnTime(turn.at, language)}</span>
                </p>
                <p className="mt-1 text-[17px] leading-relaxed text-ink-900">{turn.text}</p>
                {turn.action === "open_simulator" ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={() => navigate("/eligibility-simulator")}
                      disabled={speech.speaking || uiState === "speaking" || uiState === "processing"}
                    >
                      {t.voiceOpenSimulator}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
