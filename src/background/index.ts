chrome.runtime.onInstalled.addListener(() => {
  console.log("Profile Filler extension installed");
});

chrome.action.onClicked.addListener((_tab) => {
  // Popup is configured in manifest, so this won't fire unless popup is removed
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "OPEN_POPUP_AND_SCAN") {
    // MV3 can't programmatically open the popup from content scripts.
    // Open the popup page in a new tab with scan flag.
    const popupUrl = chrome.runtime.getURL("popup.html?tab=true&autoScan=true");
    chrome.tabs.create({ url: popupUrl });
    sendResponse({ success: true });
  } else if (message.action === "DOWNLOAD_ATTACHMENT" && message.data) {
    const { dataUrl, fileName } = message.data as { dataUrl: string; fileName: string };
    chrome.downloads.download(
      { url: dataUrl, filename: fileName, saveAs: false },
      (downloadId) => {
        if (downloadId) {
          // Show a notification so the user knows to attach the downloaded file
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
