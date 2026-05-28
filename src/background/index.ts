chrome.runtime.onInstalled.addListener(() => {
  console.log("Profile Filler extension installed");
});

chrome.action.onClicked.addListener((_tab) => {
  // Popup is configured in manifest, so this won't fire unless popup is removed
});
