"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type TelegramTheme = {
  bg: string;
  text: string;
  hint: string;
  button: string;
  buttonText: string;
  secondary: string;
};

type TelegramContextValue = {
  ready: boolean;
  theme: TelegramTheme;
  startParam: string | null;
  userName: string | null;
};

const bwTheme: TelegramTheme = {
  bg: "#ffffff",
  text: "#000000",
  hint: "#525252",
  button: "#000000",
  buttonText: "#ffffff",
  secondary: "#f5f5f5",
};

const TelegramContext = createContext<TelegramContextValue>({
  ready: false,
  theme: bwTheme,
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
  const theme = bwTheme;

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) {
      wa.ready();
      wa.expand();
      try {
        wa.BackButton?.hide?.();
        wa.setHeaderColor?.("#ffffff");
        wa.setBackgroundColor?.("#ffffff");
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
    () => ({ ready, theme, startParam, userName }),
    [ready, theme, startParam, userName]
  );

  return (
    <TelegramContext.Provider value={value}>
      <div
        style={
          {
            "--tg-bg": theme.bg,
            "--tg-text": theme.text,
            "--tg-hint": theme.hint,
            "--tg-button": theme.button,
            "--tg-button-text": theme.buttonText,
            "--tg-secondary": theme.secondary,
          } as CSSProperties
        }
        className="min-h-screen bg-white text-black"
      >
        {children}
      </div>
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
