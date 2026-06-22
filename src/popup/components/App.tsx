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
import FieldEditor from "./FieldEditor";
import PreviewTable from "./PreviewTable";
import ImportExport from "./ImportExport";
import LockScreen from "./LockScreen";
import "../styles/popup.css";

type TabId = "edit" | "preview" | "import";

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
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [isScanning, setIsScanning] = useState(false);

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

  // Load profiles on mount
  useEffect(() => {
    (async () => {
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

  // Update flat fields when active profile changes
  useEffect(() => {
    if (activeProfile) {
      setFlatFields(flattenFields(activeProfile.fields));
    }
  }, [activeProfile]);

  const showStatus = useCallback((msg: string, type: "success" | "error") => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => setStatusMsg(""), 3000);
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

      const matchResults = matchFields(
        formFieldInfos,
        currentFlatFields,
        siteMappings,
        domain
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

  const handleScanForm = () => performScan("GET_FORM_FIELDS");
  const handleScanSelection = () => performScan("GET_SELECTION_FIELDS");

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
        selected: !!newProfileKey && !!(pf?.value || (pf?.isAttachment && pf?.attachment?.dataUrl)),
        group: newProfileKey.includes(".") ? newProfileKey.split(".")[0] : undefined,
        isAttachment: pf?.isAttachment,
        attachment: pf?.attachment,
      };
      return updated;
    });
  };

  const handleFillFields = async () => {
    const selectedMatches = matches.filter((m) => m.selected && (m.value || (m.isAttachment && m.attachment?.dataUrl)));
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
            isAttachment: m.isAttachment,
            dataUrl: m.attachment?.dataUrl,
            fileName: m.attachment?.fileName,
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
        <h1>Profile Filler</h1>
        <div className="header-actions">
          {!isFullTab && (
            <button
              className="header-btn open-tab-btn"
              onClick={handleOpenInTab}
              title="Open in full tab (required for document uploads)"
            >
              Open in Tab
            </button>
          )}
          <button
            className="header-btn"
            onClick={handleScanSelection}
            disabled={isScanning}
            title="Scan only the highlighted/selected area"
          >
            {isScanning ? "..." : "Scan Selection"}
          </button>
          <button
            className="header-btn"
            onClick={handleScanForm}
            disabled={isScanning}
          >
            {isScanning ? "..." : "Scan Form"}
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
          Edit Profile
        </button>
        <button
          className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          Preview{matches.length > 0 ? ` (${matches.filter((m) => m.selected).length}/${matches.length})` : ""}
        </button>
        <button
          className={`tab-btn ${activeTab === "import" ? "active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          Import/Export
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
                + Group
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
      </div>

      {activeTab === "preview" && matches.length > 0 && (
        <div className="fill-bar">
          <button
            className="fill-btn"
            onClick={handleFillFields}
            disabled={!matches.some((m) => m.selected)}
          >
            Fill Selected Fields ({matches.filter((m) => m.selected).length})
          </button>
          <button className="save-mapping-btn" onClick={handleSaveMappings}>
            Save Mappings
          </button>
        </div>
      )}

      {statusMsg && (
        <div className={`status-bar ${statusType}`}>{statusMsg}</div>
      )}
    </div>
  );
}
