export async function shareReceiptViaWhatsApp(
  blob: Blob,
  receiptNumber: string,
  memberPhone: string,
  memberName: string,
  amount: number
): Promise<{ success: boolean; method: 'native' | 'fallback' }> {
  let cleanPhone = memberPhone.replace(/[\s\-()]/g, '');

  if (!cleanPhone.startsWith('+')) {
    if (!cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    }
  } else {
    cleanPhone = cleanPhone.slice(1);
  }

  const message = `Payment Receipt\nAmount: ₹${amount.toLocaleString('en-IN')}\nReceipt #${receiptNumber}\n\nThank you for your payment!`;

  // Mobile: Web Share API sends image directly into WhatsApp chat
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], `receipt-${receiptNumber}.png`, { type: 'image/png' });
      const shareData = { files: [file], title: 'Payment Receipt', text: message };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
      console.log('Native share failed, falling back:', error);
    }
  }

  // Desktop fallback: download image (chat already opened by caller)
  try {
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `receipt-${receiptNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);

    return { success: true, method: 'fallback' };
  } catch (error) {
    console.error('Receipt download failed:', error);
    return { success: false, method: 'fallback' };
  }
}

export function downloadReceipt(blob: Blob, receiptNumber: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${receiptNumber}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
