const key = "ai-review-session";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

export const sessionStorageService = {
  get(): StoredSession | null {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as StoredSession;
    } catch {
      return null;
    }
  },
  set(session: StoredSession) {
    window.localStorage.setItem(key, JSON.stringify(session));
  },
  clear() {
    window.localStorage.removeItem(key);
  },
};

