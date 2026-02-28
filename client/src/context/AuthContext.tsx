import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

// Telegram WebApp typings
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
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: 'light' | 'dark';
      };
    };
  }
}

/** Detect Telegram WebApp: check initData OR initDataUnsafe.user */
function detectTelegramWebApp(): boolean {
  const wa = window.Telegram?.WebApp;
  if (!wa) return false;
  return !!wa.initData || !!wa.initDataUnsafe?.user;
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
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(detectTelegramWebApp());

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    const isTgApp = detectTelegramWebApp();
    setIsTelegramWebApp(isTgApp);

    if (isTgApp) {
      // Telegram Mini App — authenticate via initData
      loginViaWebApp();
    } else if (window.Telegram?.WebApp) {
      // Telegram SDK loaded but initData empty — retry after short delay
      // (Telegram Desktop sometimes injects initData late)
      setTimeout(() => {
        if (detectTelegramWebApp()) {
          setIsTelegramWebApp(true);
          loginViaWebApp();
        } else {
          // Still no initData — fall back to token-based auth
          tryTokenAuth();
        }
      }, 500);
    } else {
      // Regular browser — try token
      tryTokenAuth();
    }
  }, []);

  const tryTokenAuth = () => {
    const token = api.getToken();
    if (token) {
      api.get<{ user: User }>('/auth/me')
        .then(data => {
          setUser(data.user);
          setLoading(false);
        })
        .catch(() => {
          api.setToken(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  };

  const loginViaWebApp = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        // initData empty but user exists in initDataUnsafe — try token fallback
        tryTokenAuth();
        return;
      }

      const data = await api.post<{ token: string; user: User }>('/auth/webapp', { initData });
      api.setToken(data.token);
      setUser(data.user);
    } catch (err) {
      console.error('WebApp auth failed:', err);
      // Fallback to token
      tryTokenAuth();
      return;
    } finally {
      setLoading(false);
    }
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
