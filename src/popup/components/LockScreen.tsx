import React, { useState, useEffect, useRef } from "react";
import {
  isPinSet,
  setupPin,
  verifyPin,
  isSessionExpired,
  updateLastActivity,
} from "../../storage/pinStorage";
import { t } from "../../i18n";

interface LockScreenProps {
  onUnlock: () => void;
}

type LockState = "loading" | "setup" | "locked" | "unlocked";

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [state, setState] = useState<LockState>("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const hasPin = await isPinSet();
      if (!hasPin) {
        setState("setup");
        return;
      }
      const expired = await isSessionExpired();
      if (expired) {
        setState("locked");
      } else {
        await updateLastActivity();
        setState("unlocked");
        onUnlock();
      }
    })();
  }, [onUnlock]);

  useEffect(() => {
    if (state === "locked" || state === "setup") {
      pinInputRef.current?.focus();
    }
  }, [state]);

  const handleSetup = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setError("PIN must contain only digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    await setupPin(pin);
    await updateLastActivity();
    setState("unlocked");
    onUnlock();
  };

  const handleUnlock = async () => {
    if (!pin) {
      setError("Enter your PIN");
      return;
    }
    const valid = await verifyPin(pin);
    if (valid) {
      await updateLastActivity();
      setError("");
      setState("unlocked");
      onUnlock();
    } else {
      setError("Incorrect PIN");
      setPin("");
      pinInputRef.current?.focus();
    }
  };

  const handleSkipSetup = () => {
    setState("unlocked");
    onUnlock();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (state === "setup") {
        if (!isSetupMode) {
          setIsSetupMode(true);
        } else {
          handleSetup();
        }
      } else {
        handleUnlock();
      }
    }
  };

  if (state === "loading") {
    return (
      <div className="lock-screen">
        <div className="lock-icon">&#x1F512;</div>
        <p className="lock-loading">Loading...</p>
      </div>
    );
  }

  if (state === "unlocked") {
    return null;
  }

  if (state === "setup") {
    return (
      <div className="lock-screen">
        <div className="lock-icon">&#x1F511;</div>
        <h2 className="lock-title">{t("pinSetBtn")}</h2>
        <p className="lock-subtitle">
          {t("pinSetup")}
        </p>

        <div className="lock-form">
          <input
            ref={pinInputRef}
            className="pin-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            placeholder={t("pinPlaceholder")}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {isSetupMode && (
            <input
              className="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder={t("pinConfirmPlaceholder")}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
          {error && <p className="lock-error">{error}</p>}
          {!isSetupMode ? (
            <button
              className="lock-btn lock-btn-primary"
              onClick={() => {
                if (pin.length < 4) {
                  setError("PIN must be at least 4 digits");
                  return;
                }
                if (!/^\d+$/.test(pin)) {
                  setError("PIN must contain only digits");
                  return;
                }
                setIsSetupMode(true);
              }}
            >
              Next
            </button>
          ) : (
            <button className="lock-btn lock-btn-primary" onClick={handleSetup}>
              {t("pinSetBtn")}
            </button>
          )}
          <button className="lock-btn lock-btn-skip" onClick={handleSkipSetup}>
            {t("pinSkip")}
          </button>
        </div>
      </div>
    );
  }

  // state === "locked"
  return (
    <div className="lock-screen">
      <div className="lock-icon">&#x1F512;</div>
      <h2 className="lock-title">{t("appTitle")}</h2>
      <p className="lock-subtitle">{t("pinEnter")}</p>

      <div className="lock-form">
        <input
          ref={pinInputRef}
          className="pin-input"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          placeholder={t("pinPlaceholder")}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {error && <p className="lock-error">{error}</p>}
        <button className="lock-btn lock-btn-primary" onClick={handleUnlock}>
          {t("pinUnlockBtn")}
        </button>
      </div>
    </div>
  );
}
