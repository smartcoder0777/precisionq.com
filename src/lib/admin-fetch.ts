"use client";

export const ADMIN_SESSION_EXPIRED_EVENT = "care-hub:session-expired";

export class AdminUnauthorizedError extends Error {
  constructor(message = "Unauthorized.") {
    super(message);
    this.name = "AdminUnauthorizedError";
  }
}

/** Fetch for admin API routes; dispatches session-expired when cookie is gone. */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT));
    throw new AdminUnauthorizedError();
  }

  return res;
}
