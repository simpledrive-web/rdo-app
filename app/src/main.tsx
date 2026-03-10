import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import App from "./App";
import { supabase } from "./supabase/client";
import "./index.css";

function getTokensFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const params = new URLSearchParams(hash);

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    return {
      access_token,
      refresh_token,
      href: parsed.href,
    };
  } catch {
    return {
      access_token: null,
      refresh_token: null,
      href: url,
    };
  }
}

async function handleDeepLink(url: string) {
  const { access_token, refresh_token, href } = getTokensFromUrl(url);

  try {
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error("Erro ao criar sessão pelo deep link:", error.message);
      }
    }

    await Browser.close();
  } catch (error) {
    console.error("Erro ao processar deep link:", error);
  }

  if (href.includes("reset-password")) {
    window.location.href = "/reset-password";
    return;
  }

  if (href.includes("auth/callback")) {
    window.location.href = "/dashboard";
  }
}

if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
    await handleDeepLink(url);
  });

  CapacitorApp.getLaunchUrl().then(async (result) => {
    const url = result?.url;

    if (url) {
      await handleDeepLink(url);
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);