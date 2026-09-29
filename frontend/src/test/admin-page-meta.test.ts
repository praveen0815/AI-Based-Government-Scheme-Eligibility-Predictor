import { describe, expect, it } from "vitest";
import { adminPageMeta } from "../components/admin/adminPageMeta";
import { en } from "../i18n/en";

describe("admin page header metadata", () => {
  it("maps existing admin routes to existing copy", () => {
    expect(adminPageMeta("/admin", en)).toEqual({ title: en.adminTitle, description: en.adminLead });
    expect(adminPageMeta("/admin/users", en).title).toBe(en.adminUsers);
    expect(adminPageMeta("/admin/users/abc", en).title).toBe(en.adminUserDetail);
    expect(adminPageMeta("/admin/documents", en).title).toBe(en.adminDocumentVerification);
    expect(adminPageMeta("/admin/applications", en).title).toBe(en.navApplications);
    expect(adminPageMeta("/admin/schemes", en).title).toBe(en.adminSchemeManagement);
    expect(adminPageMeta("/admin/eligibility", en).title).toBe(en.adminEligibilityMonitoring);
    expect(adminPageMeta("/admin/evaluation", en).title).toBe(en.adminSchemeEvaluation);
    expect(adminPageMeta("/admin/system-evaluation", en).title).toBe(en.navSystemEvaluation);
    expect(adminPageMeta("/admin/research-dashboard", en).title).toBe(en.navResearchDashboard);
    expect(adminPageMeta("/admin/notifications", en).title).toBe(en.navNotifications);
    expect(adminPageMeta("/admin/voice-assistant", en).title).toBe(en.navVoiceAssistant);
    expect(adminPageMeta("/admin/uploads", en).title).toBe(en.navUploads);
    expect(adminPageMeta("/admin/settings", en).title).toBe(en.navSettings);
  });
});
