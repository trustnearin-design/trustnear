/**
 * SEVALINK error codes — every API error has a stable SL_xxx code.
 * Frontend uses these for i18n + UI handling; never depend on `message` text.
 */
export const ErrorCode = {
  // 1xx — auth & session
  SL_101_INVALID_OTP: 'SL_101_INVALID_OTP',
  SL_102_OTP_EXPIRED: 'SL_102_OTP_EXPIRED',
  SL_103_OTP_RATE_LIMITED: 'SL_103_OTP_RATE_LIMITED',
  SL_104_INVALID_TOKEN: 'SL_104_INVALID_TOKEN',
  SL_105_TOKEN_EXPIRED: 'SL_105_TOKEN_EXPIRED',
  SL_106_INVALID_PHONE: 'SL_106_INVALID_PHONE',
  SL_107_USER_NOT_FOUND: 'SL_107_USER_NOT_FOUND',
  SL_108_FORBIDDEN: 'SL_108_FORBIDDEN',
  SL_109_ACCOUNT_DISABLED: 'SL_109_ACCOUNT_DISABLED',

  // 2xx — discovery & matching
  SL_201_PRO_UNAVAILABLE: 'SL_201_PRO_UNAVAILABLE',
  SL_202_AREA_NOT_SERVED: 'SL_202_AREA_NOT_SERVED',
  SL_203_CATEGORY_NOT_FOUND: 'SL_203_CATEGORY_NOT_FOUND',
  SL_204_NO_PROS_AVAILABLE: 'SL_204_NO_PROS_AVAILABLE',

  // 3xx — bookings
  SL_301_BOOKING_NOT_FOUND: 'SL_301_BOOKING_NOT_FOUND',
  SL_302_INVALID_STATUS_TRANSITION: 'SL_302_INVALID_STATUS_TRANSITION',
  SL_303_BOOKING_TIME_PAST: 'SL_303_BOOKING_TIME_PAST',
  SL_304_BOOKING_TOO_FAR: 'SL_304_BOOKING_TOO_FAR',
  SL_305_CANCELLATION_NOT_ALLOWED: 'SL_305_CANCELLATION_NOT_ALLOWED',
  SL_306_DUPLICATE_BOOKING: 'SL_306_DUPLICATE_BOOKING',

  // 4xx — payments
  SL_401_PAYMENT_FAILED: 'SL_401_PAYMENT_FAILED',
  SL_402_INVALID_SIGNATURE: 'SL_402_INVALID_SIGNATURE',
  SL_403_INSUFFICIENT_BALANCE: 'SL_403_INSUFFICIENT_BALANCE',
  SL_404_PROMO_INVALID: 'SL_404_PROMO_INVALID',
  SL_405_PROMO_EXPIRED: 'SL_405_PROMO_EXPIRED',
  SL_406_PROMO_LIMIT_REACHED: 'SL_406_PROMO_LIMIT_REACHED',

  // 5xx — KYC & verification
  SL_501_KYC_REQUIRED: 'SL_501_KYC_REQUIRED',
  SL_502_AADHAAR_VERIFICATION_FAILED: 'SL_502_AADHAAR_VERIFICATION_FAILED',
  SL_503_FACE_MATCH_FAILED: 'SL_503_FACE_MATCH_FAILED',

  // 9xx — generic
  SL_900_VALIDATION_ERROR: 'SL_900_VALIDATION_ERROR',
  SL_901_RATE_LIMITED: 'SL_901_RATE_LIMITED',
  SL_902_NOT_FOUND: 'SL_902_NOT_FOUND',
  SL_903_CONFLICT: 'SL_903_CONFLICT',
  SL_904_INTERNAL_ERROR: 'SL_904_INTERNAL_ERROR',
  SL_905_SERVICE_UNAVAILABLE: 'SL_905_SERVICE_UNAVAILABLE',
  SL_906_BAD_REQUEST: 'SL_906_BAD_REQUEST',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Domain error — all thrown errors should extend this so the API error
 * middleware can map them to consistent HTTP responses with SL_xxx codes.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthError extends DomainError {
  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, message, 401, details);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(ErrorCode.SL_108_FORBIDDEN, message, 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Not found', details?: Record<string, unknown>) {
    super(ErrorCode.SL_902_NOT_FOUND, message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(ErrorCode.SL_903_CONFLICT, message, 409, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends DomainError {
  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(ErrorCode.SL_901_RATE_LIMITED, message, 429, details);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.SL_900_VALIDATION_ERROR, message, 422, details);
    this.name = 'ValidationError';
  }
}
