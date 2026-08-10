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

const defaultTheme: TelegramTheme = {
  bg: "#f4f7f2",
  text: "#14231a",
  hint: "#5c6b61",
  button: "#1f6f4a",
  buttonText: "#ffffff",
  secondary: "#e4eee7",
};

const TelegramContext = createContext<TelegramContextValue>({
  ready: false,
  theme: defaultTheme,
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
  const [theme, setTheme] = useState<TelegramTheme>(defaultTheme);

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) {
      wa.ready();
      wa.expand();
      const tp = wa.themeParams || {};
      setTheme({
        bg: tp.bg_color || defaultTheme.bg,
        text: tp.text_color || defaultTheme.text,
        hint: tp.hint_color || defaultTheme.hint,
        button: tp.button_color || defaultTheme.button,
        buttonText: tp.button_text_color || defaultTheme.buttonText,
        secondary: tp.secondary_bg_color || defaultTheme.secondary,
      });
      if (wa.setHeaderColor && tp.bg_color) wa.setHeaderColor(tp.bg_color);
      if (wa.setBackgroundColor && tp.bg_color)
        wa.setBackgroundColor(tp.bg_color);
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
        className="min-h-screen bg-[var(--tg-bg)] text-[var(--tg-text)]"
      >
        {children}
      </div>
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
