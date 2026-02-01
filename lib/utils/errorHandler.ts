export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): {
  statusCode: number;
  message: string;
  code?: string;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code
    };
  }

  if (error instanceof Error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      message: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    };
  }

  return {
    statusCode: 500,
    message: '未知错误',
    code: 'UNKNOWN_ERROR'
  };
}

export function createErrorResponse(error: unknown): Response {
  const { statusCode, message, code } = handleError(error);
  return new Response(
    JSON.stringify({ error: message, code }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
