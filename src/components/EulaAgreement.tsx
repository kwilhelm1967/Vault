import React, { useState } from "react";
import { CheckCircle, AlertCircle, Shield, Loader } from "lucide-react";

interface EulaAgreementProps {
  onAccept: () => void;
  onDecline: () => void;
  error: string | null;
  isLoading?: boolean;
}

export const EulaAgreement: React.FC<EulaAgreementProps> = ({
  onAccept,
  onDecline,
  error,
  isLoading = false,
}) => {
  // User must scroll to bottom before they can check the agreement box
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="form-modal-backdrop">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              End User License Agreement
            </h2>
          </div>
          <div className="text-sm text-slate-400">
            Effective Date: {currentDate}
          </div>
        </div>

        <div
          className="p-6 overflow-y-auto flex-1 text-slate-300 text-sm leading-relaxed"
          onScroll={handleScroll}
        >
          <p className="mb-4">
            This End User License Agreement ("Agreement") is a legal contract
            between you ("You" or "User") and Local Password Vault, the owner
            and developer of Local Password Vault ("Software"). By installing,
            copying, or using the Software, you agree to the terms of this
            Agreement.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            1. License Grant
          </h3>
          <p className="mb-4">
            Upon purchase, Local Password Vault grants you a limited,
            non-transferable, non-exclusive license to install and use the
            Software on the number of devices allowed by the license tier you
            purchased:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Personal Vault: 1 device</li>
            <li>Family Vault: up to 5 devices</li>
          </ul>
          <p className="mb-4">
            This license is for personal or internal business use only. You may
            not redistribute, resell, rent, or sublicense the Software.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            2. Hardware-Bound Licensing
          </h3>
          <p className="mb-4">
            Your license key is hardware-bound. Attempts to clone, spoof, or
            circumvent device checks will be considered a breach of this
            Agreement and may result in license termination.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            2.1 License Transfers
          </h3>
          <p className="mb-4">
            You may transfer your license to a new device, subject to the following limitations:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li><strong>Transfer Limit:</strong> You are allowed up to <strong>three (3) transfers per year</strong></li>
            <li><strong>Transfer Process:</strong> Each transfer deactivates the license on the previous device</li>
            <li><strong>Internet Required:</strong> Transfers require an internet connection for validation</li>
            <li><strong>Limit Exceeded:</strong> If you exceed 3 transfers in a 12-month period, contact support for assistance</li>
            <li><strong>Annual Reset:</strong> Transfer count resets 12 months after your first transfer</li>
          </ul>
          <p className="mb-4 text-amber-300">
            ⚠️ <strong>Important:</strong> The 3 transfers/year limit is strictly enforced. Plan your device changes accordingly.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            3. Restrictions
          </h3>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Reverse-engineer, decompile, disassemble, or attempt to derive the source code of the Software</li>
            <li>Modify, adapt, translate, or create derivative works based on the Software</li>
            <li>Copy, reproduce, or duplicate the Software except for backup purposes</li>
            <li>Sell, resell, license, sublicense, rent, lease, or lend the Software to any third party</li>
            <li>Redistribute the Software in any form, whether for commercial or non-commercial purposes</li>
            <li>Remove, alter, or obscure any proprietary notices or labels on the Software</li>
            <li>Bypass, disable, or tamper with license validation or security mechanisms</li>
            <li>Use the Software in violation of any applicable law or regulation</li>
            <li>Share your license key with anyone outside your licensed device count</li>
          </ul>

          <h3 className="text-white font-semibold mt-6 mb-2">
            4. Intellectual Property
          </h3>
          <p className="mb-4">
            The Software, including all code, graphics, user interface, and documentation, 
            is the exclusive property of Local Password Vault and is protected by copyright, 
            trade secret, and other intellectual property laws. This license grants you no 
            rights to the source code. You acknowledge that the Software contains proprietary 
            and confidential information that is protected by applicable intellectual property 
            and other laws.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            5. No Cloud Connectivity
          </h3>
          <p className="mb-4">
            This Software is strictly offline and does not transmit or store
            your data on any external servers. All data is stored locally on
            your device.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            6. Disclaimer of Warranties
          </h3>
          <p className="mb-4">
            The Software is provided "as is," without warranty of any kind.
            Local Password Vault disclaims all warranties, express or implied,
            including but not limited to merchantability and fitness for a
            particular purpose.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            7. Limitation of Liability
          </h3>
          <p className="mb-4">
            To the maximum extent permitted by law, Local Password Vault shall
            not be liable for any indirect, incidental, special, or
            consequential damages, including but not limited to loss of data,
            passwords, business interruption, or financial loss.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">8. Termination</h3>
          <p className="mb-4">
            Violation of any term in this Agreement may result in immediate
            termination of your license, with no refund. Upon termination, you
            must delete all copies of the Software.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">
            9. Governing Law
          </h3>
          <p className="mb-4">
            This Agreement is governed by the laws of the State of Texas, United
            States, without regard to conflict of laws principles.
          </p>

          <h3 className="text-white font-semibold mt-6 mb-2">Terms of Sale</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>All purchases are final unless otherwise stated.</li>
            <li>
              We offer a 7-day free trial. After this period, no refunds will be
              issued.
            </li>
            <li>Prices are one-time unless explicitly marked as recurring.</li>
            <li>You are responsible for keeping your license key secure.</li>
          </ul>

          <h3 className="text-white font-semibold mt-6 mb-2">
            Privacy Statement
          </h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>This Software does not connect to the internet.</li>
            <li>
              No user data, passwords, or vault contents are transmitted to
              Local Password Vault or third parties.
            </li>
            <li>You are solely responsible for backing up your local data.</li>
          </ul>
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-800/80 flex-shrink-0">
          {/* Warning message - use visibility instead of conditional render to prevent layout shift */}
          <div 
            className={`mb-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg flex items-center space-x-2 transition-opacity duration-200 ${
              hasScrolledToBottom ? 'opacity-0 h-0 mb-0 p-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300 text-sm">
              Please scroll through the entire agreement before proceeding
            </span>
          </div>

          <div className={`flex items-start mb-4 ${!hasScrolledToBottom ? 'opacity-50' : ''}`}>
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                id="agree-checkbox"
                checked={isAgreed}
                onChange={() => hasScrolledToBottom && setIsAgreed(!isAgreed)}
                disabled={!hasScrolledToBottom}
                className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500/30 bg-slate-700 disabled:cursor-not-allowed"
              />
            </div>
            <label
              htmlFor="agree-checkbox"
              className={`ml-3 text-sm ${hasScrolledToBottom ? 'text-slate-300' : 'text-slate-500 cursor-not-allowed'}`}
            >
              I have read and agree to the End User License Agreement
            </label>
          </div>


          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-800/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-300 text-sm font-medium mb-1">Activation Error</p>
                  <p className="text-red-400 text-sm">{error}</p>
                  {error.includes("Unable to connect") && (
                    <div className="mt-3 p-2 bg-red-950/50 rounded border border-red-800/30">
                      <p className="text-red-400 text-xs">
                        <strong>Troubleshooting:</strong><br/>
                        • Check your internet connection<br/>
                        • Try again in a few moments
                      </p>
                    </div>
                  )}
                  {error.includes("already activated") && (
                    <div className="mt-3 p-2 bg-amber-950/50 rounded border border-amber-800/30">
                      <p className="text-amber-400 text-xs">
                        <strong>Note:</strong> This license is already in use on another device.
                        Please contact support if you need to transfer your license.
                      </p>
                    </div>
                  )}
                  {error.includes("not found") && (
                    <div className="mt-3 p-2 bg-amber-950/50 rounded border border-amber-800/30">
                      <p className="text-amber-400 text-xs">
                        <strong>Check:</strong> Verify your license key is correct and try again.
                        License keys are case-insensitive and should be in format: XXXX-XXXX-XXXX-XXXX
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={onDecline}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!isAgreed || !hasScrolledToBottom || isLoading}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                isAgreed && hasScrolledToBottom && !isLoading
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-600 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Activating License...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>I Accept</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
