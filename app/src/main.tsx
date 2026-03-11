import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import App from "./App";
import { supabase } from "./supabase/client";
import "./index.css";
import "./styles.css";

function getTokensFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const params = new URLSearchParams(hash);

    return {
      accessToken: params.get("access_token"),
      refreshToken: params.get("refresh_token"),
      href: parsed.href,
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      href: url,
    };
  }
}

async function handleDeepLink(url: string) {
  try {
    const { accessToken, refreshToken, href } = getTokensFromUrl(url);

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error("Erro ao setar sessão:", error.message);
      }
    }

    try {
      await Browser.close();
    } catch {
      // ignora se o browser não estiver aberto
    }

    if (href.includes("reset-password")) {
      window.location.replace("/reset-password");
      return;
    }

    if (href.includes("auth/callback")) {
      window.location.replace("/dashboard");
    }
  } catch (error) {
    console.error("Erro ao processar deep link:", error);
  }
}

async function setupNativeDeepLinks() {
  if (!Capacitor.isNativePlatform()) return;

  CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
    if (url) {
      await handleDeepLink(url);
    }
  });

  const result = await CapacitorApp.getLaunchUrl();
  const launchUrl = result?.url;

  if (launchUrl) {
    await handleDeepLink(launchUrl);
  }
}

setupNativeDeepLinks().catch((error) => {
  console.error("Erro ao iniciar deep links:", error);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);