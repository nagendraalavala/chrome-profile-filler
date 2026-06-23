import { Profile, FlattenedField } from "../models/profile";
import { flattenFields } from "../utils/flatten";

const PROFILES_KEY = "pf_profiles";
const ACTIVE_PROFILE_KEY = "pf_active_profile";
const CONTEXT_MENU_PREFIX = "pf-fill-profile-";

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function getStoredProfiles(): Promise<Profile[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(PROFILES_KEY, (result) => {
      resolve((result[PROFILES_KEY] as Profile[]) || []);
    });
  });
}

async function getStoredActiveProfileId(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(ACTIVE_PROFILE_KEY, (result) => {
      resolve((result[ACTIVE_PROFILE_KEY] as string) || null);
    });
  });
}

// ---------------------------------------------------------------------------
// Ensure content script is injected
// ---------------------------------------------------------------------------

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "PING" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// ---------------------------------------------------------------------------
// Fill a tab with a specific profile
// ---------------------------------------------------------------------------

async function fillTabWithProfile(tabId: number, profile: Profile): Promise<void> {
  const flatFields: FlattenedField[] = flattenFields(profile.fields);
  await ensureContentScript(tabId);
  chrome.tabs.sendMessage(tabId, {
    action: "CONTEXT_MENU_FILL",
    data: { flatFields, profileName: profile.name },
  });
}

// ---------------------------------------------------------------------------
// Keyboard shortcut handler
// ---------------------------------------------------------------------------

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "fill-active-profile") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const profiles = await getStoredProfiles();
  if (profiles.length === 0) return;

  const activeId = await getStoredActiveProfileId();
  const profile = profiles.find((p) => p.profileId === activeId) || profiles[0];

  await fillTabWithProfile(tab.id, profile);
});

// ---------------------------------------------------------------------------
// Context menu setup
// ---------------------------------------------------------------------------

async function rebuildContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();

  const profiles = await getStoredProfiles();
  if (profiles.length === 0) return;

  chrome.contextMenus.create({
    id: "pf-fill-parent",
    title: "Fill with Profile Filler",
    contexts: ["editable", "page"],
  });

  for (const profile of profiles) {
    chrome.contextMenus.create({
      id: `${CONTEXT_MENU_PREFIX}${profile.profileId}`,
      parentId: "pf-fill-parent",
      title: profile.name,
      contexts: ["editable", "page"],
    });
  }
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Profile Filler extension installed");
  await rebuildContextMenus();
});

// Rebuild context menus when storage changes (profiles added/renamed/deleted)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[PROFILES_KEY]) {
    rebuildContextMenus();
  }
});

// ---------------------------------------------------------------------------
// Context menu click handler
// ---------------------------------------------------------------------------

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const menuId = String(info.menuItemId);
  if (!menuId.startsWith(CONTEXT_MENU_PREFIX)) return;

  const profileId = menuId.slice(CONTEXT_MENU_PREFIX.length);
  const profiles = await getStoredProfiles();
  const profile = profiles.find((p) => p.profileId === profileId);
  if (!profile) return;

  await fillTabWithProfile(tab.id, profile);
});

// ---------------------------------------------------------------------------
// Action click (popup is configured, so this won't fire normally)
// ---------------------------------------------------------------------------

chrome.action.onClicked.addListener((_tab) => {
  // Popup is configured in manifest, so this won't fire unless popup is removed
});

// ---------------------------------------------------------------------------
// Message handlers from content script
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "OPEN_POPUP_AND_SCAN") {
    const popupUrl = chrome.runtime.getURL("popup.html?tab=true&autoScan=true");
    chrome.tabs.create({ url: popupUrl });
    sendResponse({ success: true });
  } else if (message.action === "DOWNLOAD_ATTACHMENT" && message.data) {
    const { dataUrl, fileName } = message.data as { dataUrl: string; fileName: string };
    chrome.downloads.download(
      { url: dataUrl, filename: fileName, saveAs: false },
      (downloadId) => {
        if (downloadId) {
          chrome.notifications?.create?.({
            type: "basic",
            iconUrl: "icon128.png",
            title: "Attachment Downloaded",
            message: `"${fileName}" saved to Downloads. Please attach it using the paperclip button in your email.`,
          });
        }
        sendResponse({ success: !!downloadId });
      }
    );
    return true; // async response
  }
});
