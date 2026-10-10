"use client";

import React, { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface RegistrationRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationUrl: string;
  rules: string[];
  closesFormatted?: string;
}

const ARROW_SVG = (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4 ml-1 inline-block"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const RegistrationRulesDialog: React.FC<RegistrationRulesDialogProps> = ({
  open,
  onOpenChange,
  registrationUrl,
  rules,
  closesFormatted,
}) => {
  const [agreed, setAgreed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset agreement and scroll to top each time dialog opens
  useEffect(() => {
    if (open) {
      setAgreed(false);
      if (listRef.current) {
        listRef.current.scrollTop = 0;
      }
    }
  }, [open]);

  const handleContinueClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!agreed) {
      e.preventDefault();
      return;
    }
    // Form opens in new tab via native link. Close dialog after 250ms.
    setTimeout(() => {
      onOpenChange(false);
    }, 250);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay #000000b8 with blur(6px), fading in over .25s */}
        <DialogPrimitive.Overlay className="gcl-reg-dialog-overlay" />

        <DialogPrimitive.Content
          className="gcl-reg-dialog"
          aria-describedby="reg-dialog-desc"
        >
          {/* Header */}
          <div className="gcl-reg-header">
            <div>
              <div className="gcl-reg-eyebrow">Before you register</div>
              <DialogPrimitive.Title asChild>
                <h2 className="gcl-reg-title">Rules & regulations</h2>
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close asChild>
              <button type="button" className="cls" aria-label="Close dialog">
                Close
              </button>
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description id="reg-dialog-desc" className="sr-only">
            Please read and agree to tournament rules and regulations before continuing to the registration form.
          </DialogPrimitive.Description>

          {/* Body: Scrollable numbered rules */}
          <div ref={listRef} className="gcl-reg-list" tabIndex={0}>
            {rules.map((rule, idx) => (
              <div key={idx} className="gcl-reg-row">
                <span className="gcl-reg-num">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="gcl-reg-text">{rule}</span>
              </div>
            ))}
          </div>

          {/* Footer Controls: Checkbox, Buttons, Note */}
          <div className="gcl-reg-footer">
            {/* Custom 22px Checkbox */}
            <label className="gcl-reg-checkbox-row">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <span
                className={`gcl-reg-checkbox ${agreed ? "checked" : ""}`}
                aria-hidden="true"
              >
                {agreed && (
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5 text-white"
                  >
                    <polyline points="2.5 7 5.5 10 11.5 3.5" />
                  </svg>
                )}
              </span>
              <span className="gcl-reg-checkbox-label">
                I have read and agree to the rules and regulations.
              </span>
            </label>

            {/* Action buttons */}
            <div className="gcl-reg-actions">
              <button
                type="button"
                className="btn b-line gcl-reg-btn-cancel"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </button>
              <a
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!agreed}
                tabIndex={agreed ? 0 : -1}
                className={`btn b-red gcl-reg-btn-continue ${!agreed ? "disabled" : ""}`}
                onClick={handleContinueClick}
              >
                Continue to registration form {ARROW_SVG}
              </a>
            </div>

            {/* Explanatory note */}
            <p className="gcl-reg-note">
              The form opens in a new tab on Google Forms. Your registration
              counts only after you submit it there.
              {closesFormatted ? ` Registration closes ${closesFormatted}.` : ""}
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
