export function getISTDateString(d: Date = new Date()): string {
  // returns 'YYYY-MM-DD' in Asia/Kolkata regardless of server/DB timezone
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

export function formatISTTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export function formatISTDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export function formatReceiptDate(isoDate: string): string {
  // Returns: "05 Aug 2026, 5:44 PM" (IST)
  const date = new Date(isoDate);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

export function formatReceiptShortDate(isoDate: string): string {
  // Returns: "7 July" (no year, no time) — matches the approved
  // "payment_receipt" WhatsApp template's Payment Date / Valid Till vars.
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatReceiptPeriod(dueDate: string, duration: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): string {
  // Calculate start date based on due date and duration
  const due = new Date(dueDate);
  const start = new Date(due);

  // Calculate start date by going back one period
  switch (duration) {
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarterly':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'yearly':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  return `${formatDate(start)} - ${formatDate(due)}`;
}
