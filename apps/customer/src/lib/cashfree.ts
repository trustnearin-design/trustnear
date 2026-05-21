import { CFPaymentGatewayService, type CFErrorResponse } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';

/**
 * Thin Cashfree wrapper. Backend mints the session ID — we just open the
 * SDK with it and surface success/failure to the caller as a Promise.
 *
 * The Cashfree SDK is a native module, so it ONLY works in our EAS dev
 * client / production builds. Trying to open a payment in Expo Go throws
 * a "native module not found" error.
 *
 * Known iOS bug (Cashfree #97, May 2026): `onError` sometimes fails to
 * fire. Always re-verify status via the backend's /payments/verify call
 * after the SDK resolves, regardless of what callback fired.
 */

export interface CashfreeResult {
  ok: boolean;
  orderId: string;
  /** Filled only when ok === false. */
  error?: { code: string; message: string };
}

/**
 * Open Cashfree's hosted web checkout (UPI / card / netbanking all work).
 * Resolves when the user dismisses the sheet — either after onVerify or
 * onError. The caller should ALWAYS re-confirm via /payments/verify; the
 * SDK callback is hint, not authority.
 */
export function startCashfreeWebPayment(args: {
  sessionId: string;
  orderId: string;
  sandbox: boolean;
}): Promise<CashfreeResult> {
  return new Promise((resolve) => {
    const env = args.sandbox ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
    const session = new CFSession(args.sessionId, args.orderId, env);

    const cleanup = () => {
      CFPaymentGatewayService.removeCallback();
    };

    CFPaymentGatewayService.setCallback({
      onVerify: (orderId: string) => {
        cleanup();
        resolve({ ok: true, orderId });
      },
      onError: (err: CFErrorResponse, orderId: string) => {
        cleanup();
        resolve({
          ok: false,
          orderId,
          error: {
            code: err.getCode?.() ?? 'UNKNOWN',
            message: err.getMessage?.() ?? 'Payment failed',
          },
        });
      },
    });

    CFPaymentGatewayService.doWebPayment(session);
  });
}
