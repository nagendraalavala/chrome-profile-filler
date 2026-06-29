import React, { useState, useEffect, useCallback } from "react";
import { Profile, ProfileField, MatchResult, FlattenedField, SiteMapping, FormFieldInfo } from "../../models/profile";
import { flattenFields } from "../../utils/flatten";
import { generateId } from "../../utils/ids";
import { matchFields } from "../../matching/engine";
import {
  getProfiles,
  saveProfiles,
  getActiveProfileId,
  setActiveProfileId,
  getSiteMappings,
  saveSiteMappings,
  createDefaultProfile,
} from "../../storage/profileStorage";
import { updateLastActivity } from "../../storage/pinStorage";
import { t } from "../../i18n";
import { isSyncEnabled, setSyncEnabled, pullFromSync, onSyncChanged } from "../../storage/syncStorage";
import { getRules } from "../../storage/rulesStorage";
import FieldEditor from "./FieldEditor";
import PreviewTable from "./PreviewTable";
import ImportExport from "./ImportExport";
import ShareManager from "./ShareManager";
import TemplateManager from "./TemplateManager";
import FillHistory from "./FillHistory";
import ClipboardCopy from "./ClipboardCopy";
import AutoFillRules from "./AutoFillRules";
import ExpiryTracker from "./ExpiryTracker";
import LockScreen from "./LockScreen";
import "../styles/popup.css";

type TabId = "edit" | "preview" | "import" | "templates" | "share" | "history" | "clipboard" | "rules" | "expiry";

/**
 * Ensure the content script is injected into the given tab.
 * If sendMessage fails with a connection error, programmatically inject
 * the content script via chrome.scripting.executeScript and retry.
 */
async function sendMessageWithInjection(
  tabId: number,
  message: { action: string; data?: unknown },
): Promise<{ action: string; data?: unknown }> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isConnectionError =
      errMsg.includes("Could not establish connection") ||
      errMsg.includes("Receiving end does not exist");

    if (!isConnectionError) throw err;

    // Inject content script programmatically
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

    // Brief delay for script initialization
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Retry the message
    return chrome.tabs.sendMessage(tabId, message);
  }
}

interface SerializedFormField {
  index: number;
  name: string;
  id: string;
  label: string;
  type: string;
  placeholder: string;
  sectionHeading: string;
  autocomplete: string;
  isContentEditable?: boolean;
  isFileInput?: boolean;
  acceptTypes?: string;
  isTemplateField?: boolean;
  templateLabel?: string;
  templateFormat?: string;
}

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("edit");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [scannedFields, setScannedFields] = useState<SerializedFormField[]>([]);
  const [flatFields, setFlatFields] = useState<FlattenedField[]>([]);
  const [statusToasts, setStatusToasts] = useState<
    Array<{ id: number; msg: string; type: "success" | "error" }>
  >([]);
  const [isScanning, setIsScanning] = useState(false);
  const [syncOn, setSyncOn] = useState(false);

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  // Track user activity to refresh the auto-lock timer
  useEffect(() => {
    if (!isUnlocked) return;
    const onActivity = () => { updateLastActivity(); };
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [isUnlocked]);

  // Detect if running in a full tab (vs popup)
  const isFullTab = window.location.search.includes("tab=true") ||
    (window.innerWidth > 500 && window.innerHeight > 600);

  // Add full-tab-mode class to body when in tab
  useEffect(() => {
    if (isFullTab) {
      document.body.classList.add("full-tab-mode");
    }
    return () => {
      document.body.classList.remove("full-tab-mode");
    };
  }, [isFullTab]);

  const handleOpenInTab = () => {
    const popupUrl = chrome.runtime.getURL("popup.html?tab=true");
    chrome.tabs.create({ url: popupUrl });
    window.close();
  };

  const activeProfile = profiles.find((p) => p.profileId === activeProfileId) || null;

  // Load profiles on mount; pull from sync if enabled
  useEffect(() => {
    (async () => {
      const syncEnabled = await isSyncEnabled();
      setSyncOn(syncEnabled);

      if (syncEnabled) {
        await pullFromSync();
      }

      let loaded = await getProfiles();
      if (loaded.length === 0) {
        const defaultProfile = createDefaultProfile();
        loaded = [defaultProfile];
        await saveProfiles(loaded);
      }
      setProfiles(loaded);

      const savedActiveId = await getActiveProfileId();
      if (savedActiveId && loaded.find((p) => p.profileId === savedActiveId)) {
        setActiveId(savedActiveId);
      } else {
        setActiveId(loaded[0].profileId);
      }
    })();
  }, []);

  // Listen for sync changes from other devices
  useEffect(() => {
    onSyncChanged(async () => {
      const updated = await pullFromSync();
      if (updated) {
        const loaded = await getProfiles();
        setProfiles(loaded);
      }
    });
  }, []);

  // Update flat fields when active profile changes
  useEffect(() => {
    if (activeProfile) {
      setFlatFields(flattenFields(activeProfile.fields));
    }
  }, [activeProfile]);

  const showStatus = useCallback((msg: string, type: "success" | "error") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setStatusToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setStatusToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const handleProfileChange = async (profileId: string) => {
    setActiveId(profileId);
    await setActiveProfileId(profileId);
    setMatches([]);
  };

  const handleFieldsChange = async (newFields: ProfileField[]) => {
    if (!activeProfile) return;
    const updated: Profile = { ...activeProfile, fields: newFields };
    const newProfiles = profiles.map((p) =>
      p.profileId === updated.profileId ? updated : p
    );
    setProfiles(newProfiles);
    await saveProfiles(newProfiles);
  };

  const handleAddProfile = async () => {
    const newProfile = createDefaultProfile();
    newProfile.name = `Profile ${profiles.length + 1}`;
    const newProfiles = [...profiles, newProfile];
    setProfiles(newProfiles);
    await saveProfiles(newProfiles);
    setActiveId(newProfile.profileId);
    await setActiveProfileId(newProfile.profileId);
    showStatus("New profile created", "success");
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile || profiles.length <= 1) {
      showStatus("Cannot delete the only profile", "error");
      return;
    }
    const newProfiles = profiles.filter(
      (p) => p.profileId !== activeProfile.profileId
    );
    setProfiles(newProfiles);
    await saveProfiles(newProfiles);
    setActiveId(newProfiles[0].profileId);
    await setActiveProfileId(newProfiles[0].profileId);
    showStatus("Profile deleted", "success");
  };

  const handleRenameProfile = async () => {
    if (!activeProfile) return;
    const newName = prompt("Enter new profile name:", activeProfile.name);
    if (!newName || !newName.trim()) return;
    const updated = { ...activeProfile, name: newName.trim() };
    const newProfiles = profiles.map((p) =>
      p.profileId === updated.profileId ? updated : p
    );
    setProfiles(newProfiles);
    await saveProfiles(newProfiles);
    showStatus("Profile renamed", "success");
  };

  const performScan = async (action: "GET_FORM_FIELDS" | "GET_SELECTION_FIELDS") => {
    setIsScanning(true);
    const isSelection = action === "GET_SELECTION_FIELDS";
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        showStatus("No active tab found", "error");
        setIsScanning(false);
        return;
      }

      const response = await sendMessageWithInjection(tab.id, { action });

      if (!response || !response.data) {
        showStatus(
          isSelection
            ? "No fields found in selection. Select text on the page first."
            : "No form fields found on this page",
          "error"
        );
        setIsScanning(false);
        return;
      }

      const fields = response.data as SerializedFormField[];
      setScannedFields(fields);

      if (fields.length === 0) {
        showStatus(
          isSelection
            ? "No fillable fields in selection. Try selecting a larger area."
            : "No fillable form fields found",
          "error"
        );
        setIsScanning(false);
        return;
      }

      // Get site mappings
      const siteMappings = await getSiteMappings();
      const url = new URL(tab.url || "");
      const domain = url.hostname;

      // Convert serialized fields to FormFieldInfo shape for matching
      const formFieldInfos = fields.map((f) => ({
        element: null as unknown as HTMLInputElement,
        name: f.name,
        id: f.id,
        label: f.label,
        type: f.type,
        placeholder: f.placeholder,
        sectionHeading: f.sectionHeading,
        autocomplete: f.autocomplete,
        isContentEditable: f.isContentEditable,
        isFileInput: f.isFileInput,
        acceptTypes: f.acceptTypes,
        isTemplateField: f.isTemplateField,
        templateLabel: f.templateLabel,
        templateFormat: f.templateFormat as FormFieldInfo["templateFormat"],
      }));

      const currentFlatFields = activeProfile
        ? flattenFields(activeProfile.fields)
        : [];

      const autoFillRules = await getRules();
      const matchResults = matchFields(
        formFieldInfos,
        currentFlatFields,
        siteMappings,
        domain,
        autoFillRules,
      );

      setMatches(matchResults);
      setActiveTab("preview");
      const label = isSelection ? "selection" : "page";
      showStatus(`Found ${fields.length} fields in ${label}, ${matchResults.filter((m) => m.selected).length} matched`, "success");
    } catch (err) {
      showStatus(
        `Scan failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    }
    setIsScanning(false);
  };

  const handleScanForm = useCallback(() => performScan("GET_FORM_FIELDS"), [activeProfile, flatFields]);
  const handleScanSelection = () => performScan("GET_SELECTION_FIELDS");

  // Auto-scan when opened via the floating badge (?autoScan=true)
  const autoScanTriggered = React.useRef(false);
  useEffect(() => {
    if (
      !autoScanTriggered.current &&
      isUnlocked &&
      activeProfile &&
      window.location.search.includes("autoScan=true")
    ) {
      autoScanTriggered.current = true;
      setActiveTab("preview");
      handleScanForm();
    }
  }, [isUnlocked, activeProfile, handleScanForm]);

  const handleToggleMatch = (index: number) => {
    setMatches((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  };

  const handleChangeMapping = (index: number, newProfileKey: string) => {
    setMatches((prev) => {
      const updated = [...prev];
      const pf = flatFields.find((f) => f.dotKey === newProfileKey);
      updated[index] = {
        ...updated[index],
        profileKey: newProfileKey,
        value: pf?.value || "",
        confidence: newProfileKey ? 1.0 : 0,
        selected: !!newProfileKey && !!pf?.value,
        group: newProfileKey.includes(".") ? newProfileKey.split(".")[0] : undefined,
      };
      return updated;
    });
  };

  const handleFillFields = async () => {
    const selectedMatches = matches.filter((m) => m.selected && m.value);
    if (selectedMatches.length === 0) {
      showStatus("No fields selected for filling", "error");
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        showStatus("No active tab found", "error");
        return;
      }

      // Build fill data with indices from scannedFields
      const fillData = selectedMatches
        .map((m) => {
          const fieldIndex = scannedFields.findIndex(
            (sf) =>
              (sf.name && sf.name === m.formFieldName) ||
              (sf.id && sf.id === m.formFieldName) ||
              (sf.isTemplateField && sf.templateLabel === m.formFieldLabel)
          );
          return {
            index: fieldIndex,
            value: m.value,
          };
        })
        .filter((d) => d.index >= 0);

      const response = await sendMessageWithInjection(tab.id, {
        action: "FILL_FIELDS",
        data: fillData,
      });

      const responseData = response?.data as { filledCount?: number } | undefined;
      const filledCount = responseData?.filledCount ?? fillData.length;
      showStatus(`Filled ${filledCount} fields`, "success");
    } catch (err) {
      showStatus(
        `Fill failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    }
  };

  const handleSaveMappings = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const domain = tab?.url ? new URL(tab.url).hostname : "unknown";

      const mappingsToSave: SiteMapping[] = matches
        .filter((m) => m.profileKey && m.selected)
        .map((m) => ({
          domain,
          fieldSignature: m.formFieldElement,
          profileKey: m.profileKey,
        }));

      await saveSiteMappings(mappingsToSave);
      showStatus(`Saved ${mappingsToSave.length} mappings for ${domain}`, "success");
    } catch (err) {
      showStatus("Failed to save mappings", "error");
    }
  };

  const handleAddFieldsToProfile = async () => {
    if (!activeProfile) {
      showStatus("No active profile", "error");
      return;
    }

    // Collect unmatched or unmapped fields from scan results
    const unmatchedLabels = matches
      .filter((m) => !m.profileKey || m.confidence === 0)
      .map((m) => m.formFieldLabel)
      .filter((label) => label && label.length >= 1);

    if (unmatchedLabels.length === 0) {
      showStatus("All fields are already matched", "success");
      return;
    }

    // Prompt for group name
    const groupName = prompt(
      `Add ${unmatchedLabels.length} unmatched field(s) to profile.\nEnter group name:`,
      "Scanned Fields"
    );
    if (!groupName || !groupName.trim()) return;

    const groupKey = groupName.trim().replace(/\s+/g, "_").replace(/^./, (c) => c.toLowerCase());

    // Create children fields from unmatched labels
    const children: ProfileField[] = unmatchedLabels.map((label) => ({
      id: generateId(),
      key: label.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_").replace(/^./, (c) => c.toLowerCase()),
      label,
      value: "",
      type: "FIELD" as const,
    }));

    const newGroup: ProfileField = {
      id: generateId(),
      key: groupKey,
      label: groupName.trim(),
      type: "GROUP",
      children,
      collapsed: false,
    };

    await handleFieldsChange([...activeProfile.fields, newGroup]);
    setActiveTab("edit");
    showStatus(`Added ${children.length} fields to "${groupName.trim()}" group`, "success");
  };

  const handleImport = async (imported: Profile) => {
    // Check if profile with same ID already exists
    const existing = profiles.find((p) => p.profileId === imported.profileId);
    let newProfiles: Profile[];
    if (existing) {
      newProfiles = profiles.map((p) =>
        p.profileId === imported.profileId ? imported : p
      );
    } else {
      newProfiles = [...profiles, imported];
    }
    setProfiles(newProfiles);
    await saveProfiles(newProfiles);
    setActiveId(imported.profileId);
    await setActiveProfileId(imported.profileId);
  };

  const handleAddTopLevelGroup = async () => {
    if (!activeProfile) return;
    const newGroup: ProfileField = {
      id: generateId(),
      key: "newGroup",
      label: "New Group",
      type: "GROUP",
      children: [],
      collapsed: false,
    };
    await handleFieldsChange([...activeProfile.fields, newGroup]);
  };

  const handleImportSharedProfile = async (name: string, fields: ProfileField[]) => {
    const newProfile: Profile = {
      profileId: generateId(),
      name,
      fields,
    };
    const newProfiles = [...profiles, newProfile];
    setProfiles(newProfiles);
    await saveProfiles(newProfiles);
    setActiveId(newProfile.profileId);
    await setActiveProfileId(newProfile.profileId);
  };

  const handleInsertTemplate = async (content: string) => {
    let interpolated = content;
    if (activeProfile) {
      const flat = flattenFields(activeProfile.fields);
      interpolated = content.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
        const field = flat.find(
          (f) => f.dotKey.toLowerCase() === key.toLowerCase() || f.label.toLowerCase() === key.toLowerCase(),
        );
        return field?.value || `{{${key}}}`;
      });
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        showStatus("No active tab found", "error");
        return;
      }
      await sendMessageWithInjection(tab.id, {
        action: "INSERT_TEMPLATE",
        data: { text: interpolated },
      });
      showStatus("Template inserted", "success");
    } catch {
      showStatus("Failed to insert template", "error");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="app-container">
        <LockScreen onUnlock={handleUnlock} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>{t("appTitle")}</h1>
        <div className="header-actions">
          {!isFullTab && (
            <button
              className="header-btn open-tab-btn"
              onClick={handleOpenInTab}
              title="Open in full tab"
            >
              {t("openInTab")}
            </button>
          )}
          <button
            className={`header-btn sync-btn ${syncOn ? "sync-on" : ""}`}
            onClick={async () => {
              const next = !syncOn;
              await setSyncEnabled(next);
              setSyncOn(next);
              showStatus(next ? "Sync enabled — profiles will sync across devices" : "Sync disabled", "success");
            }}
            title={syncOn ? "Cloud sync is ON — click to disable" : "Enable cloud sync across devices"}
          >
            {syncOn ? "Sync ON" : "Sync"}
          </button>
          <button
            className="header-btn"
            onClick={handleScanSelection}
            disabled={isScanning}
            title="Scan only the highlighted/selected area"
          >
            {isScanning ? t("scanning") : t("scanSelection")}
          </button>
          <button
            className="header-btn"
            onClick={handleScanForm}
            disabled={isScanning}
          >
            {isScanning ? t("scanning") : t("scanForm")}
          </button>
        </div>
      </div>

      <div className="profile-bar">
        <select
          value={activeProfileId || ""}
          onChange={(e) => handleProfileChange(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.profileId} value={p.profileId}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={handleAddProfile} title="Add new profile">
          +
        </button>
        <button onClick={handleRenameProfile} title="Rename profile">
          ✎
        </button>
        <button onClick={handleDeleteProfile} title="Delete profile">
          🗑
        </button>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === "edit" ? "active" : ""}`}
          onClick={() => setActiveTab("edit")}
        >
          {t("editTab")}
        </button>
        <button
          className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          {t("previewTab")}{matches.length > 0 ? ` (${matches.filter((m) => m.selected).length}/${matches.length})` : ""}
        </button>
        <button
          className={`tab-btn ${activeTab === "import" ? "active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          {t("importTab")}
        </button>
        <button
          className={`tab-btn ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          Templates
        </button>
        <button
          className={`tab-btn ${activeTab === "share" ? "active" : ""}`}
          onClick={() => setActiveTab("share")}
        >
          Share
        </button>
        <button
          className={`tab-btn ${activeTab === "clipboard" ? "active" : ""}`}
          onClick={() => setActiveTab("clipboard")}
        >
          Copy
        </button>
        <button
          className={`tab-btn ${activeTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveTab("rules")}
        >
          Rules
        </button>
        <button
          className={`tab-btn ${activeTab === "expiry" ? "active" : ""}`}
          onClick={() => setActiveTab("expiry")}
        >
          Expiry
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "edit" && activeProfile && (
          <div className="fields-editor">
            <FieldEditor
              fields={activeProfile.fields}
              onChange={handleFieldsChange}
            />
            <div className="add-btn-row" style={{ padding: "0 4px" }}>
              <button className="add-btn" onClick={handleAddTopLevelGroup}>
                {t("addGroup")}
              </button>
            </div>
          </div>
        )}

        {activeTab === "preview" && (
          <>
            {matches.length === 0 ? (
              <div className="no-results">
                <p>No scan results yet.</p>
                <div className="scan-btn-row">
                  <button className="scan-btn" onClick={handleScanSelection}>
                    Scan Selection
                  </button>
                  <button className="scan-btn" onClick={handleScanForm}>
                    Scan Full Page
                  </button>
                </div>
              </div>
            ) : (
              <PreviewTable
                matches={matches}
                profileFields={flatFields}
                onToggle={handleToggleMatch}
                onChangeMapping={handleChangeMapping}
              />
            )}
          </>
        )}

        {activeTab === "import" && activeProfile && (
          <ImportExport
            profile={activeProfile}
            onImport={handleImport}
            onStatusMessage={showStatus}
          />
        )}

        {activeTab === "templates" && (
          <TemplateManager onInsert={handleInsertTemplate} />
        )}

        {activeTab === "share" && (
          <ShareManager
            profiles={profiles}
            activeProfileId={activeProfileId}
            onImportProfile={handleImportSharedProfile}
            onStatus={showStatus}
          />
        )}

        {activeTab === "history" && (
          <FillHistory />
        )}

        {activeTab === "clipboard" && activeProfile && (
          <ClipboardCopy profile={activeProfile} />
        )}

        {activeTab === "rules" && (
          <AutoFillRules />
        )}

        {activeTab === "expiry" && (
          <ExpiryTracker
            profiles={profiles}
            activeProfileId={activeProfileId}
          />
        )}
      </div>

      {activeTab === "preview" && matches.length > 0 && (
        <div className="fill-bar">
          <button
            className="fill-btn"
            onClick={handleFillFields}
            disabled={!matches.some((m) => m.selected)}
          >
            {t("fillSelected")} ({matches.filter((m) => m.selected).length})
          </button>
          <button className="save-mapping-btn" onClick={handleSaveMappings}>
            Save Mappings
          </button>
          {matches.some((m) => !m.profileKey || m.confidence === 0) && (
            <button className="save-mapping-btn" onClick={handleAddFieldsToProfile}>
              + Add to Profile
            </button>
          )}
        </div>
      )}

      <div className="status-toast-stack">
        {statusToasts.map((toast) => (
          <div key={toast.id} className={`status-toast ${toast.type}`}>
            {toast.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
