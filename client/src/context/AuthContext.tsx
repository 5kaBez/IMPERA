import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
        themeParams: Record<string, string | undefined>;
        colorScheme: 'light' | 'dark';
      };
    };
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isTelegramWebApp: boolean;
  login: (telegramData: Record<string, unknown>) => Promise<void>;
  devLogin: (firstName?: string, role?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isTelegramWebApp: false,
  login: async () => {},
  devLogin: async () => {},
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isTelegramWebApp = !!window.Telegram?.WebApp?.initData;

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    initAuth();
  }, []);

  const initAuth = async () => {
    // Step 1: If initData available (Telegram Mobile) — use it, most reliable
    if (window.Telegram?.WebApp?.initData) {
      try {
        const data = await api.post<{ token: string; user: User }>('/auth/webapp', {
          initData: window.Telegram.WebApp.initData,
        });
        api.setToken(data.token);
        setUser(data.user);
        setLoading(false);
        return;
      } catch (err) {
        console.error('WebApp auth failed:', err);
        // Fall through to token auth
      }
    }

    // Step 2: Try existing token (Telegram Desktop, regular browser)
    const token = api.getToken();
    if (token) {
      try {
        const data = await api.get<{ user: User }>('/auth/me');
        setUser(data.user);
        setLoading(false);
        return;
      } catch {
        api.setToken(null);
      }
    }

    // Step 3: Nothing worked — show login page
    setLoading(false);
  };

  const login = async (telegramData: Record<string, unknown>) => {
    const data = await api.post<{ token: string; user: User }>('/auth/telegram', telegramData);
    api.setToken(data.token);
    setUser(data.user);
  };

  const devLogin = async (firstName = 'Dev User', role = 'student') => {
    const data = await api.post<{ token: string; user: User }>('/auth/dev-login', {
      telegramId: Date.now().toString(),
      firstName,
      role,
    });
    api.setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    if (isTelegramWebApp) {
      window.Telegram?.WebApp?.close();
    }
  };

  const updateUser = (u: User) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, isTelegramWebApp, login, devLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
