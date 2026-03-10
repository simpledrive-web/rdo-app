import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.isaias.rdoapp",
  appName: "RDO APP",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  plugins: {
    App: {
      urlScheme: "rdoapp"
    }
  }
};

export default config;