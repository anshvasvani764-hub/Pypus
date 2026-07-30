'use client'

import { useState } from 'react'
import { QrCode, Printer } from 'lucide-react'

interface PrintQrButtonProps {
  workspaceId: string
  workspaceName: string
}

export function PrintQrButton({ workspaceId, workspaceName }: PrintQrButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      // Dynamically import qrcode to keep it out of the initial bundle
      const QRCode = (await import('qrcode')).default
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      const qrUrl = `${appUrl}/m/${workspaceId}`

      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })

      const printWindow = window.open('', '_blank', 'width=600,height=700')
      if (!printWindow) return

      printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gym QR Code – ${workspaceName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #ffffff;
      color: #111111;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px 24px;
    }
    .card {
      border: 2px solid #111111;
      border-radius: 16px;
      padding: 40px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      max-width: 440px;
      width: 100%;
    }
    .gym-name {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-align: center;
    }
    .divider {
      width: 48px;
      height: 3px;
      background: #111111;
      border-radius: 2px;
    }
    .qr-img { display: block; width: 280px; height: 280px; }
    .caption {
      font-size: 15px;
      color: #444444;
      text-align: center;
      line-height: 1.5;
      max-width: 280px;
    }
    .caption strong { color: #111111; }
    @media print {
      body { padding: 0; justify-content: flex-start; padding-top: 60px; }
    }
  </style>
</head>
<body>
  <div class="card">
    <p class="gym-name">${workspaceName}</p>
    <div class="divider"></div>
    <img class="qr-img" src="${dataUrl}" alt="Check-in QR Code" />
    <p class="caption">
      <strong>Scan to mark your attendance</strong><br/>
      Open your phone camera and point it at this code.
    </p>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`)
      printWindow.document.close()
    } catch (err) {
      console.error('QR generation failed:', err)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <button
      onClick={handlePrint}
      disabled={isPrinting}
      className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isPrinting ? (
        <>
          <Printer className="h-4 w-4 animate-pulse" />
          Preparing...
        </>
      ) : (
        <>
          <QrCode className="h-4 w-4" />
          Print QR Code
        </>
      )}
    </button>
  )
}
