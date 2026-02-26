import { type Response } from 'express';
import { HTTP_STATUS } from '../constants.js';

type SuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type ErrorResponse = {
  success: false;
  message: string;
  errors?: unknown;
};

type PaginatedResponse<T> = SuccessResponse<T> & {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = HTTP_STATUS.OK,
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errors?: unknown,
): void {
  const response: ErrorResponse = {
    success: false,
    message,
    ...(errors ? { errors } : {}),
  };
  res.status(statusCode).json(response);
}

export function sendPaginated<T>(
  res: Response,
  data: T,
  pagination: { page: number; limit: number; total: number },
  message?: string,
): void {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
    pagination: {
      ...pagination,
      totalPages,
    },
  };
  res.status(HTTP_STATUS.OK).json(response);
}
