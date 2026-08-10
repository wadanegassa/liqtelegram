"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TelegramContextValue = {
  ready: boolean;
  startParam: string | null;
  userName: string | null;
};

const TelegramContext = createContext<TelegramContextValue>({
  ready: false,
  startParam: null,
  userName: null,
});

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        BackButton?: { hide: () => void; show: () => void };
        initDataUnsafe?: {
          start_param?: string;
          user?: { first_name?: string; username?: string };
        };
        themeParams?: Record<string, string>;
        colorScheme?: "light" | "dark";
      };
    };
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [startParam, setStartParam] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) {
      wa.ready();
      wa.expand();
      try {
        wa.BackButton?.hide?.();
      } catch {
        /* ignore */
      }
      setStartParam(wa.initDataUnsafe?.start_param || null);
      const user = wa.initDataUnsafe?.user;
      setUserName(user?.first_name || user?.username || null);
    } else {
      const params = new URLSearchParams(window.location.search);
      setStartParam(params.get("startapp") || params.get("tgWebAppStartParam"));
    }
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({ ready, startParam, userName }),
    [ready, startParam, userName]
  );

  return (
    <TelegramContext.Provider value={value}>
      <div className="min-h-screen bg-[var(--tg-bg)] text-[var(--tg-text)]">
        {children}
      </div>
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
