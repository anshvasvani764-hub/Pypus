// Automatic WhatsApp sending is live — the business number is reconnected
// and WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are set. This stays
// as a single kill switch: flip to false to pause all outbound WhatsApp
// sends workspace-wide (e.g. if the number gets flagged again) without
// touching call sites.
export const AUTO_WHATSAPP_ENABLED = true;
