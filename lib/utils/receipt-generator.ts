import { formatReceiptDate } from './date';

export interface ReceiptData {
  receiptNumber: string;
  workspaceName: string;
  memberName: string;
  memberPhone: string;
  planName: string;
  amount: number;
  paymentMethod: "Cash" | "UPI";
  paidDate: string; // ISO format
  dueDate: string;
}

export async function generateReceiptImage(
  data: ReceiptData
): Promise<{ dataUrl: string; blob: Blob }> {
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Canvas dimensions
  const width = 600;
  const height = 850;
  canvas.width = width;
  canvas.height = height;

  // Colors
  const white = '#FFFFFF';
  const black = '#000000';
  const blue = '#0052ff';
  const gray = '#666666';
  const lightGray = '#F5F5F5';

  // Fill white background
  ctx.fillStyle = white;
  ctx.fillRect(0, 0, width, height);

  // Helper function to draw text with word wrap
  const drawText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  };

  // Add border
  ctx.strokeStyle = lightGray;
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  let yPos = 60;

  // Header - Workspace Name
  ctx.fillStyle = blue;
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  yPos = drawText(data.workspaceName, width / 2, yPos, width - 80, 35);

  // "PAYMENT RECEIPT" title
  ctx.fillStyle = black;
  ctx.font = 'bold 24px Arial, sans-serif';
  yPos = drawText('PAYMENT RECEIPT', width / 2, yPos + 10, width - 80, 30);

  // Divider line
  yPos += 20;
  ctx.strokeStyle = lightGray;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, yPos);
  ctx.lineTo(width - 40, yPos);
  ctx.stroke();

  yPos += 30;

  // Receipt Number and Date
  ctx.textAlign = 'left';
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Receipt #:', 40, yPos);
  ctx.fillStyle = black;
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText(data.receiptNumber, 120, yPos);

  yPos += 25;
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Date:', 40, yPos);
  ctx.fillStyle = black;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(formatReceiptDate(data.paidDate), 120, yPos);

  // Divider
  yPos += 25;
  ctx.strokeStyle = lightGray;
  ctx.beginPath();
  ctx.moveTo(40, yPos);
  ctx.lineTo(width - 40, yPos);
  ctx.stroke();

  yPos += 30;

  // Member Details Section
  ctx.fillStyle = blue;
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('Member Details', 40, yPos);

  yPos += 30;
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Name:', 40, yPos);
  ctx.fillStyle = black;
  ctx.font = '14px Arial, sans-serif';
  yPos = drawText(data.memberName, 120, yPos, width - 160, 22);

  yPos += 10;
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Phone:', 40, yPos);
  ctx.fillStyle = black;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(data.memberPhone, 120, yPos);

  yPos += 25;
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Plan:', 40, yPos);
  ctx.fillStyle = black;
  ctx.font = '14px Arial, sans-serif';
  yPos = drawText(data.planName, 120, yPos, width - 160, 22);

  // Divider
  yPos += 20;
  ctx.strokeStyle = lightGray;
  ctx.beginPath();
  ctx.moveTo(40, yPos);
  ctx.lineTo(width - 40, yPos);
  ctx.stroke();

  yPos += 30;

  // Payment Details Section
  ctx.fillStyle = blue;
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('Payment Details', 40, yPos);

  yPos += 30;
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Amount Paid:', 40, yPos);
  ctx.fillStyle = black;
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText(`₹ ${data.amount.toLocaleString('en-IN')}`, 180, yPos + 5);

  yPos += 40;
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Payment Mode:', 40, yPos);
  ctx.fillStyle = black;
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText(data.paymentMethod, 180, yPos);

  // Divider
  yPos += 25;
  ctx.strokeStyle = lightGray;
  ctx.beginPath();
  ctx.moveTo(40, yPos);
  ctx.lineTo(width - 40, yPos);
  ctx.stroke();

  // Footer section
  yPos = height - 120;

  // Thank you message
  ctx.fillStyle = black;
  ctx.font = '16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Thank you for your payment!', width / 2, yPos);

  yPos += 30;
  ctx.fillStyle = gray;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Powered by Pypus', width / 2, yPos);

  // Convert canvas to blob and data URL — JPEG keeps storage small (~30-40KB
  // vs ~120KB+ for PNG) with no visible quality loss for a receipt.
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate receipt image'));
        return;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ dataUrl, blob });
    }, 'image/jpeg', 0.85);
  });
}
