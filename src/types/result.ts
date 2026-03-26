export type SuccessResult<T> = { success: true; data: T };
export type ErrorResult = { success: false; error: string; statusCode?: number };
export type Result<T> = SuccessResult<T> | ErrorResult;

export function success<T>(data: T): SuccessResult<T> {
  return { success: true, data };
}

export function failure(error: string | Error, statusCode?: number): ErrorResult {
  const message = error instanceof Error ? error.message : error;
  return { success: false, error: message, statusCode };
}
