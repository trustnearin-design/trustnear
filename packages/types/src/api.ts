import { z } from 'zod';
import { ErrorCode } from './errors.js';

/**
 * Standard API response envelope — every endpoint returns one of these shapes.
 */
export const ApiSuccessSchema = <TData extends z.ZodTypeAny>(data: TData) =>
  z.object({
    success: z.literal(true),
    data,
    meta: z
      .object({
        requestId: z.string(),
        timestamp: z.string(),
        page: z.number().int().optional(),
        total: z.number().int().optional(),
        cursor: z.string().optional(),
      })
      .optional(),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(Object.values(ErrorCode) as [string, ...string[]]),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      timestamp: z.string(),
    })
    .optional(),
});

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    page?: number;
    total?: number;
    cursor?: string;
  };
};

export type ApiError = z.infer<typeof ApiErrorSchema>;

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Pagination params — cursor-based for infinite scroll, offset for admin.
 */
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const OffsetPaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CursorPagination = z.infer<typeof CursorPaginationSchema>;
export type OffsetPagination = z.infer<typeof OffsetPaginationSchema>;
