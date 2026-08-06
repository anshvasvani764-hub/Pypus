"use client";

import { useState } from "react";
import { X, Download, MessageCircle, Loader2 } from "lucide-react";
import { generateReceiptImage, type ReceiptData } from "@/lib/utils/receipt-generator";
import { shareReceiptViaWhatsApp, downloadReceipt } from "@/lib/utils/whatsapp-share";

export type PaymentMethod = "Cash" | "UPI";

const METHODS: PaymentMethod[] = ["Cash", "UPI"];

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: PaymentMethod) => Promise<{ success: boolean; fee?: any; error?: string }>;
  memberName: string;
  memberPhone: string;
  workspaceName: string;
  planName: string | null;
  defaultAmount: number;
  dueDate: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MarkPaidModal({ isOpen, ...rest }: MarkPaidModalProps) {
  if (!isOpen) return null;
  // Remounts per open so the amount field re-seeds from the row being settled.
  return <MarkPaidDialog {...rest} />;
}

function MarkPaidDialog({
  onClose,
  onConfirm,
  memberName,
  memberPhone,
  workspaceName,
  planName,
  defaultAmount,
  dueDate,
}: Omit<MarkPaidModalProps, "isOpen">) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = Number(amount) > 0;

  async function handleConfirm() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await onConfirm(Number(amount), method);

      if (result.success && result.fee) {
        // Generate receipt
        setIsGeneratingReceipt(true);

        const receiptData: ReceiptData = {
          receiptNumber: result.fee.id.slice(-8).toUpperCase(),
          workspaceName: workspaceName,
          memberName: memberName,
          memberPhone: memberPhone,
          planName: planName ?? "No Plan",
          amount: Number(amount),
          paymentMethod: method,
          paidDate: new Date().toISOString(),
          dueDate: dueDate ?? new Date().toISOString(),
        };

        const { dataUrl, blob } = await generateReceiptImage(receiptData);

        setReceiptImageUrl(dataUrl);
        setReceiptBlob(blob);
        setReceiptNumber(receiptData.receiptNumber);
        setShowReceipt(true);
        setIsGeneratingReceipt(false);
      } else {
        setError(result.error || "Failed to record payment");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendWhatsApp() {
    if (!receiptBlob || !memberPhone) return;

    let cleanPhone = memberPhone.replace(/[\s\-()]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (!cleanPhone.startsWith('91')) {
        cleanPhone = '91' + cleanPhone;
      }
    } else {
      cleanPhone = cleanPhone.slice(1);
    }

    const message = `Payment Receipt\nAmount: ₹${Number(amount).toLocaleString('en-IN')}\nReceipt #${receiptNumber}\n\nThank you for your payment!`;

    // Mobile: try Web Share API first (image directly into WhatsApp)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([receiptBlob], `receipt-${receiptNumber}.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Payment Receipt', text: message });
        handleClose();
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          handleClose();
          return;
        }
        console.log('Native share failed, trying whatsapp:// scheme:', error);
      }
    }

    // Mobile fallback: open WhatsApp app directly via whatsapp:// scheme
    if (isMobile) {
      try {
        const whatsappAppUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.location.href = whatsappAppUrl;

        // Also download receipt as backup
        setTimeout(() => {
          downloadReceipt(receiptBlob, receiptNumber);
        }, 500);

        handleClose();
        return;
      } catch (error) {
        console.log('whatsapp:// scheme failed, falling back to wa.me:', error);
      }
    }

    // Desktop / final fallback: open WhatsApp Web via anchor tag
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Download receipt
    try {
      downloadReceipt(receiptBlob, receiptNumber);
    } catch {
      // ignore
    }

    handleClose();
  }

  function handleDownload() {
    if (!receiptBlob) return;
    downloadReceipt(receiptBlob, receiptNumber);
  }

  function handleClose() {
    setShowReceipt(false);
    setReceiptImageUrl(null);
    setReceiptBlob(null);
    setReceiptNumber("");
    setError(null);
    onClose();
  }

  // Show receipt view after successful payment
  if (showReceipt && receiptImageUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Payment Receipt</h2>
              <p className="text-xs text-gray-400 mt-0.5">Receipt #{receiptNumber}</p>
            </div>
            <button
              onClick={handleClose}
              className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Image Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img
                src={receiptImageUrl}
                alt="Payment Receipt"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Sticky Action Buttons */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white space-y-3">
            <button
              onClick={handleSendWhatsApp}
              disabled={!memberPhone}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              title={!memberPhone ? "Member phone number not available" : ""}
            >
              <MessageCircle className="h-4 w-4" />
              Send via WhatsApp
            </button>

            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>

            <button
              onClick={handleClose}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while generating receipt
  if (isGeneratingReceipt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 max-h-screen overflow-y-auto p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-gray-900">Generating receipt...</p>
            <p className="text-xs text-gray-500">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Show payment form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mark Paid</h2>
            <p className="text-xs text-gray-400 mt-0.5">{memberName}</p>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {(planName || dueDate) && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
              {planName && <p className="font-medium text-gray-900">{planName}</p>}
              {dueDate && <p className="mt-0.5">Due {formatDate(dueDate)}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount Received (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Payment Mode
            </label>
            <div className="flex items-center gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    method === m
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !valid}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting ? "Processing..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
