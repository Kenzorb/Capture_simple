import { defineConfig } from "wxt";
import { extensionAuthConfig } from "./auth/config";

export default defineConfig({
  manifest: () => {
    const auth = extensionAuthConfig();
    return {
      name: "Capture",
      minimum_chrome_version: "126",
      permissions: ["identity", "storage", "activeTab"],
      host_permissions: auth ? [`${auth.web}/*`, `${auth.auth}/*`] : [],
      key: import.meta.env.WXT_CAPTURE_EXTENSION_KEY || undefined,
    };
  },
});
