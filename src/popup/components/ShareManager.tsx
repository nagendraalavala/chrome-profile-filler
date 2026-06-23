import React, { useState, useEffect, useCallback } from "react";
import { Profile, ProfileField } from "../../models/profile";
import { ShareMetadata } from "../../models/sharedProfile";
import {
  createShare,
  getShareMetadata,
  importSharedProfile,
  revokeShare,
  cleanExpiredShares,
} from "../../storage/shareStorage";
import { generateId } from "../../utils/ids";

interface ShareManagerProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onImportProfile: (name: string, fields: ProfileField[]) => void;
  onStatus: (msg: string, type: "success" | "error") => void;
}

export default function ShareManager({
  profiles,
  activeProfileId,
  onImportProfile,
  onStatus,
}: ShareManagerProps) {
  const [shares, setShares] = useState<ShareMetadata[]>([]);
  const [importCode, setImportCode] = useState("");
  const [shareProfileId, setShareProfileId] = useState<string>(activeProfileId || "");
  const [sharedBy, setSharedBy] = useState("");
  const [expiryHours, setExpiryHours] = useState<string>("0");
  const [lastShareCode, setLastShareCode] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadShares = useCallback(async () => {
    await cleanExpiredShares();
    const metadata = await getShareMetadata();
    setShares(metadata);
  }, []);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  useEffect(() => {
    if (activeProfileId) {
      setShareProfileId(activeProfileId);
    }
  }, [activeProfileId]);

  const handleShare = async () => {
    const profile = profiles.find((p) => p.profileId === shareProfileId);
    if (!profile) {
      onStatus("Select a profile to share", "error");
      return;
    }

    setIsSharing(true);
    try {
      const hours = parseInt(expiryHours, 10);
      const shared = await createShare(
        profile,
        sharedBy.trim() || "Anonymous",
        hours > 0 ? hours : null,
      );
      setLastShareCode(shared.shareCode);
      onStatus(`Profile shared! Code: ${shared.shareCode}`, "success");
      await loadShares();
    } catch {
      onStatus("Failed to share profile", "error");
    }
    setIsSharing(false);
  };

  const handleImport = async () => {
    if (!importCode.trim()) {
      onStatus("Enter a share code", "error");
      return;
    }

    setIsImporting(true);
    try {
      const shared = await importSharedProfile(importCode.trim());
      if (!shared) {
        onStatus("Invalid or expired share code", "error");
        setIsImporting(false);
        return;
      }

      onImportProfile(
        `${shared.profileName} (from ${shared.sharedBy})`,
        shared.fields.map((f) => ({ ...f, id: generateId() })),
      );
      onStatus(`Imported "${shared.profileName}" from ${shared.sharedBy}`, "success");
      setImportCode("");
    } catch {
      onStatus("Failed to import shared profile", "error");
    }
    setIsImporting(false);
  };

  const handleRevoke = async (shareId: string) => {
    if (!confirm("Revoke this share? Recipients will no longer be able to import it.")) return;
    await revokeShare(shareId);
    await loadShares();
    onStatus("Share revoked", "success");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      onStatus("Code copied to clipboard", "success");
    }).catch(() => {
      onStatus(code, "success");
    });
  };

  return (
    <div className="share-manager">
      {/* Share a Profile */}
      <div className="share-section">
        <h3 className="share-section-title">Share a Profile</h3>
        <div className="share-form">
          <select
            className="share-select"
            value={shareProfileId}
            onChange={(e) => setShareProfileId(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.profileId} value={p.profileId}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="share-input"
            placeholder="Your name (optional)"
            value={sharedBy}
            onChange={(e) => setSharedBy(e.target.value)}
          />
          <select
            className="share-select"
            value={expiryHours}
            onChange={(e) => setExpiryHours(e.target.value)}
          >
            <option value="0">No expiry</option>
            <option value="24">Expires in 24 hours</option>
            <option value="168">Expires in 7 days</option>
            <option value="720">Expires in 30 days</option>
          </select>
          <button
            className="share-btn primary"
            onClick={handleShare}
            disabled={isSharing}
          >
            {isSharing ? "Sharing..." : "Generate Share Code"}
          </button>
        </div>

        {lastShareCode && (
          <div className="share-code-display">
            <span className="share-code-value">{lastShareCode}</span>
            <button
              className="share-btn copy"
              onClick={() => handleCopyCode(lastShareCode)}
            >
              Copy
            </button>
            <p className="share-code-hint">
              Share this code with your team or family members.
              They can import the profile using this code.
            </p>
          </div>
        )}
      </div>

      {/* Import a Shared Profile */}
      <div className="share-section">
        <h3 className="share-section-title">Import Shared Profile</h3>
        <div className="share-import-row">
          <input
            type="text"
            className="share-input code"
            placeholder="Enter share code (e.g., ABCD-1234)"
            value={importCode}
            onChange={(e) => setImportCode(e.target.value.toUpperCase())}
            maxLength={9}
          />
          <button
            className="share-btn primary"
            onClick={handleImport}
            disabled={isImporting || !importCode.trim()}
          >
            {isImporting ? "Importing..." : "Import"}
          </button>
        </div>
      </div>

      {/* Active Shares */}
      {shares.length > 0 && (
        <div className="share-section">
          <h3 className="share-section-title">Your Active Shares</h3>
          <div className="share-list">
            {shares.map((s) => (
              <div key={s.shareId} className="share-item">
                <div className="share-item-info">
                  <span className="share-item-name">{s.profileName}</span>
                  <span className="share-item-code">{s.shareCode}</span>
                  {s.expiresAt && (
                    <span className="share-item-expiry">
                      Expires: {new Date(s.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="share-item-actions">
                  <button
                    className="share-btn copy-sm"
                    onClick={() => handleCopyCode(s.shareCode)}
                  >
                    Copy
                  </button>
                  <button
                    className="share-btn revoke"
                    onClick={() => handleRevoke(s.shareId)}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="share-note">
        <p>
          Shared profiles are stored locally. Both sender and receiver must have
          the extension installed. Attachments (documents) are stripped for privacy.
        </p>
      </div>
    </div>
  );
}
