// Angemeldeter Benutzer aus localStorage("user") (= Login-Response) + Live-Update ohne Re-Login.

export const USER_UPDATED_EVENT = "gs:user-updated";

export interface StoredUser {
  token?: string;
  email?: string;
  fullName?: string;
  roles?: string[];
  userId?: string;
  avatarUrl?: string | null;
  [key: string]: any;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Merged patch in localStorage("user") und benachrichtigt Header & Co. im selben Tab. */
export function updateStoredUser(patch: Partial<StoredUser>) {
  if (typeof window === "undefined") return;
  const current = getStoredUser() ?? {};
  const next = { ...current, ...patch };
  localStorage.setItem("user", JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail: next }));
}
