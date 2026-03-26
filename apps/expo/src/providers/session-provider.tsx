import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Session, User } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { createSupabaseClient, hasSupabaseConfig } from "../services/supabase";

WebBrowser.maybeCompleteAuthSession();

function getRedirectUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  return makeRedirectUri({
    scheme: "splittrip",
    path: "auth/callback"
  });
}

type SessionContextValue = {
  authMode: "supabase" | "demo";
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SESSION_CONTEXT_KEY = "__splittrip_session_context__";
const sessionContextStore = globalThis as typeof globalThis & {
  [SESSION_CONTEXT_KEY]?: ReturnType<typeof createContext<SessionContextValue | null>>;
};

const SessionContext =
  sessionContextStore[SESSION_CONTEXT_KEY] ?? createContext<SessionContextValue | null>(null);

sessionContextStore[SESSION_CONTEXT_KEY] = SessionContext;

export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [demoSignedIn, setDemoSignedIn] = useState(false);
  const authMode = hasSupabaseConfig ? "supabase" : "demo";

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setIsLoading(false);
      return;
    }

    const supabase = createSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const isAuthenticated = hasSupabaseConfig ? Boolean(session?.user) : demoSignedIn;

    return {
      authMode,
      isLoading,
      isAuthenticated,
      user: session?.user ?? null,
      signIn: async () => {
        if (!hasSupabaseConfig) {
          setDemoSignedIn(true);
          setIsLoading(false);
          return;
        }

        const supabase = createSupabaseClient();
        const redirectTo = getRedirectUrl();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: true
          }
        });

        if (error) {
          throw error;
        }

        if (data.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

          if (result.type === "success" && result.url) {
            const url = new URL(result.url);
            const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
            const queryParams = new URLSearchParams(url.search);
            const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");

            if (accessToken && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
            }
          }
        }
      },
      signOut: async () => {
        if (hasSupabaseConfig) {
          const supabase = createSupabaseClient();
          await supabase.auth.signOut();
        } else {
          setDemoSignedIn(false);
        }
      }
    };
  }, [authMode, demoSignedIn, isLoading, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
