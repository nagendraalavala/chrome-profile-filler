import React, { useState, useEffect, useRef } from "react";
import {
  isPinSet,
  setupPin,
  verifyPin,
  isSessionExpired,
  updateLastActivity,
  getRecoveryQuestion,
  hasRecoveryQuestion,
  resetPinWithRecovery,
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
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [hasRecovery, setHasRecovery] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
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
        const question = await getRecoveryQuestion();
        const recoveryConfigured = await hasRecoveryQuestion();
        setSecurityQuestion(question);
        setHasRecovery(recoveryConfigured);
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
    if (!securityQuestion.trim()) {
      setError("Security question is required");
      return;
    }
    if (!securityAnswer.trim()) {
      setError("Security answer is required");
      return;
    }
    await setupPin(pin, {
      question: securityQuestion.trim(),
      answer: securityAnswer,
    });
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
        if (isResetMode) {
          handleResetPin();
        } else {
          handleUnlock();
        }
      }
    }
  };

  const handleResetPin = async () => {
    if (!securityQuestion.trim()) {
      setError("Recovery question is not configured");
      return;
    }
    if (!resetAnswer.trim()) {
      setError("Enter your security answer");
      return;
    }
    if (newPin.length < 4 || !/^\d+$/.test(newPin)) {
      setError("New PIN must be at least 4 digits");
      return;
    }
    if (newPin !== confirmNewPin) {
      setError("New PINs do not match");
      return;
    }

    const reset = await resetPinWithRecovery(securityQuestion, resetAnswer, newPin);
    if (!reset) {
      setError("Security answer is incorrect");
      return;
    }

    await updateLastActivity();
    setError("");
    setState("unlocked");
    onUnlock();
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
            <>
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
              <input
                className="lock-text-input"
                type="text"
                placeholder="Security question (e.g. Your first school?)"
                value={securityQuestion}
                onChange={(e) => {
                  setSecurityQuestion(e.target.value);
                  setError("");
                }}
              />
              <input
                className="lock-text-input"
                type="password"
                placeholder="Security answer"
                value={securityAnswer}
                onChange={(e) => {
                  setSecurityAnswer(e.target.value);
                  setError("");
                }}
              />
            </>
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
        {!isResetMode ? (
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
        ) : (
          <>
            <input
              className="lock-text-input"
              type="text"
              value={securityQuestion}
              readOnly
            />
            <input
              className="lock-text-input"
              type="password"
              placeholder="Security answer"
              value={resetAnswer}
              onChange={(e) => {
                setResetAnswer(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
            />
            <input
              className="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="New PIN"
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={handleKeyDown}
            />
            <input
              className="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="Confirm New PIN"
              value={confirmNewPin}
              onChange={(e) => {
                setConfirmNewPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={handleKeyDown}
            />
          </>
        )}
        {error && <p className="lock-error">{error}</p>}
        {!isResetMode ? (
          <>
            <button className="lock-btn lock-btn-primary" onClick={handleUnlock}>
              {t("pinUnlockBtn")}
            </button>
            {hasRecovery && (
              <button
                className="lock-btn lock-btn-skip"
                onClick={() => {
                  setIsResetMode(true);
                  setError("");
                }}
              >
                Forgot PIN?
              </button>
            )}
          </>
        ) : (
          <>
            <button className="lock-btn lock-btn-primary" onClick={handleResetPin}>
              Reset PIN
            </button>
            <button
              className="lock-btn lock-btn-skip"
              onClick={() => {
                setIsResetMode(false);
                setResetAnswer("");
                setNewPin("");
                setConfirmNewPin("");
                setError("");
              }}
            >
              Back to Unlock
            </button>
          </>
        )}
      </div>
    </div>
  );
}
