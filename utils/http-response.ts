import { NextResponse } from "next/server";
import type { AppError } from "@/src/errors/app-error";
import { ERROR_CODES } from "@/src/errors/codes";
import type { ErrorResponse, SuccessResponse } from "@/types/http-response";

/** Resposta de sucesso padronizada. */
export function successResponse<T>(
  data: T,
  statusCode = 200,
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    { success: true, statusCode, data },
    { status: statusCode },
  );
}

/** Converte um `AppError` de domínio na resposta HTTP correspondente. */
export function handleError(error: AppError): NextResponse<ErrorResponse> {
  const statusCode = ERROR_CODES[error.code]?.status ?? 500;

  return NextResponse.json(
    {
      success: false,
      statusCode,
      message: error.message,
      error: { code: error.code, details: error.details },
    },
    { status: statusCode },
  );
}
