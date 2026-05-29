/**
 * Registry of "known" app-config keys. Each entry describes the value's
 * shape so the admin UI can render a typed editor (number / bool / string
 * / json) instead of a raw JSON textarea, and so the API can validate
 * mutations.
 *
 * Adding a new tunable knob: register it here + reference it from the
 * runtime code via the same key. Unregistered keys are still readable
 * but the admin UI will show them in a "raw / advanced" section.
 */

export type ConfigType = 'number' | 'boolean' | 'string' | 'json';

export type ConfigDescriptor = {
  key: string;
  group: string; // grouping shown in admin UI
  label: string;
  description: string;
  type: ConfigType;
  defaultValue: unknown;
  /** Optional bounds for numeric values */
  min?: number;
  max?: number;
  /** Optional unit for numeric values, shown next to input */
  unit?: string;
  /** If true, value is readable via the public /config endpoint (no auth) */
  isPublic?: boolean;
};

export const CONFIG_REGISTRY: ConfigDescriptor[] = [
  // ─── Pricing & commission ──────────────────────────────────────────
  {
    key: 'safety_fee_tiers',
    group: 'Pricing',
    label: 'Platform safety fee tiers (paise)',
    description:
      'Fee added on every booking, in paise. Funds support, insurance, fraud protection. Per-tier (standard/premium/emergency).',
    type: 'json',
    defaultValue: { standard: 1900, premium: 4900, emergency: 9900 },
  },
  {
    key: 'default_commission_pct',
    group: 'Pricing',
    label: 'Default commission %',
    description:
      "Fallback commission when a category doesn't set its own. Each category can override in the Categories editor.",
    type: 'number',
    defaultValue: 15,
    min: 0,
    max: 50,
    unit: '%',
  },
  {
    key: 'gst_rate_pct',
    group: 'Pricing',
    label: 'GST rate %',
    description:
      'Goods + services tax rate applied at invoicing. India default is 18% for services.',
    type: 'number',
    defaultValue: 18,
    min: 0,
    max: 50,
    unit: '%',
  },
  {
    key: 'min_booking_value_paise',
    group: 'Pricing',
    label: 'Minimum booking value (paise)',
    description: 'Reject bookings whose total comes below this amount. Use 0 to disable.',
    type: 'number',
    defaultValue: 9900,
    min: 0,
  },
  {
    key: 'surge_multiplier',
    group: 'Pricing',
    label: 'Surge multiplier (peak hours)',
    description:
      'Multiplied to base price when matcher detects a surge window (1.0 = no surge). Set to 1 to disable.',
    type: 'number',
    defaultValue: 1.0,
    min: 1,
    max: 3,
  },

  // ─── Matching & dispatch ───────────────────────────────────────────
  {
    key: 'match_radius_km',
    group: 'Matching',
    label: 'Default match radius (km)',
    description: 'Distance within which the matcher searches for available pros.',
    type: 'number',
    defaultValue: 8,
    min: 1,
    max: 50,
    unit: 'km',
  },
  {
    key: 'pro_alert_timeout_seconds',
    group: 'Matching',
    label: 'Pro alert timeout (seconds)',
    description:
      'Pro has this long to accept/decline an incoming job alert before auto-reassign. 0 = no timeout (current behavior).',
    type: 'number',
    defaultValue: 0,
    min: 0,
    max: 300,
    unit: 's',
  },
  {
    key: 'free_cancel_window_minutes',
    group: 'Matching',
    label: 'Free cancellation window (minutes)',
    description: 'Customers can cancel free if pro is more than this far away (by ETA).',
    type: 'number',
    defaultValue: 5,
    min: 0,
    max: 30,
    unit: 'min',
  },

  // ─── Payments ──────────────────────────────────────────────────────
  {
    key: 'payment_provider',
    group: 'Payments',
    label: 'Active payment provider',
    description:
      'Which payment gateway processes bookings. Switching takes effect on the next booking — existing pending orders use the original provider.',
    type: 'string',
    defaultValue: 'cashfree',
  },
  {
    key: 'wallet_topup_min_paise',
    group: 'Payments',
    label: 'Minimum wallet top-up (paise)',
    description: 'Smallest top-up amount the wallet UI will allow.',
    type: 'number',
    defaultValue: 10000,
    min: 100,
  },

  // ─── Feature flags ─────────────────────────────────────────────────
  {
    key: 'feature.voice_booking',
    group: 'Features',
    label: 'Voice booking (Hindi)',
    description:
      'Show the "tap to speak" booking flow on the customer home. Requires Voice Service.',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'feature.referrals',
    group: 'Features',
    label: 'Referral programme',
    description: 'Show the Refer & Earn screen in customer settings.',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'feature.subscriptions',
    group: 'Features',
    label: 'Pro subscriptions',
    description: 'Allow pros to subscribe to premium tiers for higher placement.',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'feature.live_chat',
    group: 'Features',
    label: 'In-booking chat',
    description: 'Customer ↔ pro chat thread inside a booking.',
    type: 'boolean',
    defaultValue: true,
  },

  // ─── Public app constants (exposed via /config public endpoint) ────
  {
    key: 'support_phone',
    group: 'Branding',
    label: 'Support phone number',
    description: 'Phone shown in customer/pro app help screens.',
    type: 'string',
    defaultValue: '+911234567890',
    isPublic: true,
  },
  {
    key: 'support_email',
    group: 'Branding',
    label: 'Support email',
    description: 'Email shown in customer/pro app help screens.',
    type: 'string',
    defaultValue: 'help@trustnear.in',
    isPublic: true,
  },
  {
    key: 'whatsapp_support',
    group: 'Branding',
    label: 'WhatsApp support link',
    description: 'wa.me link or full URL — opens WhatsApp chat from help screen.',
    type: 'string',
    defaultValue: 'https://wa.me/911234567890',
    isPublic: true,
  },

  // ─── SMS / OTP provider ────────────────────────────────────────────
  // Editable end-to-end from /sms admin page. Cached 30s on the API
  // (invalidateSmsProviderCache() on save makes it instant). Falls back
  // to env vars when this key is unset, so dev keeps working.
  {
    key: 'sms_config',
    group: 'SMS / OTP',
    label: 'SMS provider configuration',
    description:
      'Active SMS provider + per-provider credentials and DLT template. Saving here takes effect within ~30 sec — no API redeploy.',
    type: 'json',
    defaultValue: {
      provider: 'mock',
      smartping: {
        username: '',
        password: '',
        sender: '',
        dltContentId: '',
        dltPrincipalEntityId: '',
        template:
          'Sankalp Your verification code is {OTP}. Do not share this OTP with anyone. Valid for 10 minutes.',
      },
      twofactor: {
        apiKey: '',
        templateName: '',
      },
      msg91: {
        authKey: '',
        templateId: '',
        senderId: '',
      },
    },
  },
];

export function findDescriptor(key: string): ConfigDescriptor | undefined {
  return CONFIG_REGISTRY.find((d) => d.key === key);
}
