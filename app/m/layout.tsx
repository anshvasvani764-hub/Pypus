/**
 * Layout for member-facing /m/* routes.
 * Deliberately minimal — no staff sidebar, no staff chrome.
 * Members access these pages directly from a scanned QR code on their phones.
 */
export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0c0f]">
      {children}
    </div>
  )
}
