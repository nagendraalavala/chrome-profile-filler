chrome.runtime.onInstalled.addListener(() => {
  console.log("Profile Filler extension installed");
});

chrome.action.onClicked.addListener((_tab) => {
  // Popup is configured in manifest, so this won't fire unless popup is removed
});

// Handle attachment download requests from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "DOWNLOAD_ATTACHMENT") {
    const { dataUrl, fileName } = message;
    chrome.downloads.download(
      { url: dataUrl, filename: fileName, saveAs: false },
      (downloadId) => {
        sendResponse({ success: !!downloadId, downloadId });
      }
    );
    return true; // async response
  }
});
