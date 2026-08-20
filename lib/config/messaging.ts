// Automatic WhatsApp sending is OFF for now (business number got banned).
// Every message goes out manually — the app just notifies the owner on
// Telegram (see lib/telegram/client.ts) when something needs sending.
// Flip this back on once a working WhatsApp Business number/API is in place.
export const AUTO_WHATSAPP_ENABLED = false;
