export interface ReceiptData {
  receiptNumber: string;
  workspaceName: string;
  memberName: string;
  memberPhone: string;
  planName: string;
  /** Amount paid in this specific transaction. */
  amount: number;
  /** Full price of the plan/cycle this payment is against. */
  planAmount: number;
  /** Balance still owed after this payment. 0 (or omitted) renders a "Fully paid" state. */
  remainingAmount?: number;
  paymentMethod: "Cash" | "UPI";
  paidDate: string; // ISO format
  dueDate: string; // ISO format — next due date
}

// "10 June 2025" — no time, matches the receipt card design.
function formatCardDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function solidLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

// Simple calendar glyph — rounded square outline with a header bar and two hangers.
function drawCalendarIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const x = cx - size / 2;
  const y = cy - size / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, x, y, size, size, size * 0.18);
  ctx.stroke();
  solidLine(ctx, x, y + size * 0.32, x + size, y + size * 0.32, color);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y - size * 0.08);
  ctx.lineTo(x + size * 0.28, y + size * 0.14);
  ctx.moveTo(x + size * 0.72, y - size * 0.08);
  ctx.lineTo(x + size * 0.72, y + size * 0.14);
  ctx.stroke();
  ctx.restore();
}

// Simple wallet glyph — rounded rect with a small button/clasp circle.
function drawWalletIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const x = cx - size / 2;
  const y = cy - size / 2.6;
  const h = size / 1.3;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  roundRectPath(ctx, x, y, size, h, size * 0.22);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size * 0.76, y + h * 0.55, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function generateReceiptImage(
  data: ReceiptData
): Promise<{ dataUrl: string; blob: Blob }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  const width = 720;
  canvas.width = width;

  // Palette — matches the card design: white surface, emerald brand, amber
  // for pending balances, neutral grays for supporting text.
  const cardBg = "#FFFFFF";
  const pageBg = "#F4F4F3";
  const border = "#E5E7EB";
  const ink = "#171717";
  const muted = "#6B7280";
  const emerald = "#0F6E56";
  const amber = "#B45309";
  const boxBg = "#F7F7F6";

  const pad = 48;
  const contentW = width - pad * 2;
  const remaining = Math.max(data.remainingAmount ?? 0, 0);
  const fullyPaid = remaining <= 0;

  // ---- Pass 1: measure content height ----
  let y = 76;
  y += 34; // gym name
  y += 24; // powered by pypus
  y += 34; // dashed divider gap
  y += 96; // avatar row (name + plan)
  y += 28; // gap before box

  const boxTop = y;
  let boxInnerY = 34;
  boxInnerY += 44; // plan amount row
  boxInnerY += 22; // divider gap
  boxInnerY += 44; // paid amount row
  boxInnerY += 26; // paid-on subtitle
  if (!fullyPaid) {
    boxInnerY += 22; // divider gap
    boxInnerY += 44; // remaining row
  } else {
    boxInnerY += 10;
  }
  boxInnerY += 30;
  const boxHeight = boxInnerY;
  y = boxTop + boxHeight + 40;

  y += 56; // next due date row
  y += 30; // divider gap
  y += 68; // payment mode pill
  y += 40; // dashed divider gap
  y += 44; // powered by pypus footer
  y += 40; // thank you
  y += 30; // trust line
  y += 40; // bottom padding

  const height = y;
  canvas.height = height;

  // ---- Background + card ----
  ctx.fillStyle = pageBg;
  ctx.fillRect(0, 0, width, height);

  roundRectPath(ctx, 0, 0, width, height, 28);
  ctx.fillStyle = cardBg;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ---- Header ----
  let cy = 70;
  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillText(data.workspaceName, pad, cy);

  ctx.textAlign = "right";
  ctx.fillStyle = ink;
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText(`Receipt #${data.receiptNumber}`, width - pad, cy - 6);

  cy += 28;
  ctx.textAlign = "left";
  ctx.fillStyle = muted;
  ctx.font = "400 17px Arial, sans-serif";
  ctx.fillText("Powered by Pypus", pad, cy);

  ctx.textAlign = "right";
  ctx.fillStyle = muted;
  ctx.font = "400 17px Arial, sans-serif";
  ctx.fillText(formatCardDate(data.paidDate), width - pad, cy);

  cy += 30;
  dashedLine(ctx, pad, cy, width - pad, border);

  // ---- Member row ----
  cy += 60;
  const avatarR = 40;
  const avatarCx = pad + avatarR;
  ctx.beginPath();
  ctx.arc(avatarCx, cy, avatarR, 0, Math.PI * 2);
  ctx.fillStyle = emerald;
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initialsOf(data.memberName), avatarCx, cy + 2);
  ctx.textBaseline = "alphabetic";

  const nameX = pad + avatarR * 2 + 22;
  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.font = "700 27px Arial, sans-serif";
  ctx.fillText(data.memberName, nameX, cy - 4);
  ctx.fillStyle = muted;
  ctx.font = "400 19px Arial, sans-serif";
  ctx.fillText(data.planName, nameX, cy + 24);

  cy += avatarR + 28;

  // ---- Amount breakdown box ----
  roundRectPath(ctx, pad, cy, contentW, boxHeight, 18);
  ctx.fillStyle = boxBg;
  ctx.fill();

  let by = cy + 42;
  const boxPadX = 30;
  const rowLeft = pad + boxPadX;
  const rowRight = width - pad - boxPadX;

  // Plan amount
  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.font = "700 19px Arial, sans-serif";
  ctx.fillText("Plan amount", rowLeft, by);
  ctx.textAlign = "right";
  ctx.fillStyle = muted;
  ctx.font = "700 22px Arial, sans-serif";
  ctx.fillText(formatINR(data.planAmount), rowRight, by);

  by += 22;
  solidLine(ctx, rowLeft, by, rowRight, border);
  by += 34;

  // Paid amount
  ctx.textAlign = "left";
  ctx.fillStyle = emerald;
  ctx.font = "700 19px Arial, sans-serif";
  ctx.fillText("Paid amount", rowLeft, by);
  ctx.textAlign = "right";
  ctx.fillStyle = emerald;
  ctx.font = "700 22px Arial, sans-serif";
  ctx.fillText(formatINR(data.amount), rowRight, by);

  by += 26;
  ctx.textAlign = "left";
  ctx.fillStyle = muted;
  ctx.font = "400 16px Arial, sans-serif";
  ctx.fillText(`Paid on ${formatCardDate(data.paidDate)}`, rowLeft, by);

  if (!fullyPaid) {
    by += 22;
    solidLine(ctx, rowLeft, by, rowRight, border);
    by += 34;

    ctx.textAlign = "left";
    ctx.fillStyle = amber;
    ctx.font = "700 19px Arial, sans-serif";
    ctx.fillText("Remaining amount", rowLeft, by);
    ctx.textAlign = "right";
    ctx.fillStyle = amber;
    ctx.font = "700 22px Arial, sans-serif";
    ctx.fillText(formatINR(remaining), rowRight, by);
  } else {
    by += 14;
    ctx.textAlign = "left";
    ctx.fillStyle = emerald;
    ctx.font = "700 16px Arial, sans-serif";
    ctx.fillText("Fully paid", rowLeft, by);
  }

  cy += boxHeight + 40;

  // ---- Next due date ----
  drawCalendarIcon(ctx, pad + 18, cy - 6, 30, emerald);
  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText("Next due date", pad + 48, cy);
  ctx.textAlign = "right";
  ctx.fillStyle = emerald;
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText(formatCardDate(data.dueDate), width - pad, cy);

  cy += 30;
  solidLine(ctx, pad, cy, width - pad, border);

  // ---- Payment mode pill ----
  cy += 38;
  const pillH = 52;
  const pillW = 260;
  roundRectPath(ctx, pad, cy, pillW, pillH, pillH / 2);
  ctx.strokeStyle = emerald;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawWalletIcon(ctx, pad + 34, cy + pillH / 2, 22, emerald);
  ctx.textAlign = "left";
  ctx.fillStyle = emerald;
  ctx.font = "700 17px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(`Payment mode: ${data.paymentMethod}`, pad + 56, cy + pillH / 2 + 1);
  ctx.textBaseline = "alphabetic";

  cy += pillH + 34;
  dashedLine(ctx, pad, cy, width - pad, border);

  // ---- Footer ----
  cy += 44;
  const logoSize = 26;
  const footerText = "Powered by Pypus";
  ctx.font = "600 17px Arial, sans-serif";
  const footerTextW = ctx.measureText(footerText).width;
  const footerGroupW = logoSize + 10 + footerTextW;
  const footerX = width / 2 - footerGroupW / 2;

  roundRectPath(ctx, footerX, cy - logoSize / 2 - 2, logoSize, logoSize, 7);
  ctx.fillStyle = emerald;
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 15px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("P", footerX + logoSize / 2, cy - 2);
  ctx.textBaseline = "alphabetic";

  ctx.textAlign = "left";
  ctx.fillStyle = muted;
  ctx.font = "600 17px Arial, sans-serif";
  ctx.fillText(footerText, footerX + logoSize + 10, cy + 4);

  cy += 44;
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText("Thank you for your payment!", width / 2, cy);

  cy += 30;
  ctx.fillStyle = muted;
  ctx.font = "400 17px Arial, sans-serif";
  ctx.fillText("We appreciate your trust in us.", width / 2, cy);

  // JPEG keeps storage small (~30-40KB vs ~120KB+ for PNG) with no visible
  // quality loss for a receipt.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate receipt image"));
          return;
        }
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve({ dataUrl, blob });
      },
      "image/jpeg",
      0.9
    );
  });
}