import { NextResponse } from 'next/server';

export function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export const Errors = {
  unauthenticated: () => jsonError('Sign in required.', 'UNAUTHENTICATED', 401),
  forbidden: (message = 'You do not have permission to do that.') => jsonError(message, 'FORBIDDEN', 403),
  badRequest: (message: string) => jsonError(message, 'BAD_REQUEST', 400),
  notFound: (message = 'Not found.') => jsonError(message, 'NOT_FOUND', 404),
  internal: (message = 'Something went wrong. Try again.') => jsonError(message, 'INTERNAL', 500),
};
