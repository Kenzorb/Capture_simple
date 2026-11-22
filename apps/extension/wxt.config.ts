import { createPublicKey } from "node:crypto";
import { defineConfig } from "wxt";
import { extensionAuthConfig } from "./auth/config";

function publicManifestKey(value: string | undefined) {
  if (!value) return undefined;

  try {
    const key = createPublicKey({
      key: Buffer.from(value, "base64"),
      type: "spki",
      format: "der",
    });
    if (
      key.asymmetricKeyType === "rsa" &&
      key.export({ type: "spki", format: "der" }).toString("base64") === value
    ) {
      return value;
    }
  } catch {
    // Report a safe configuration error without echoing the supplied value.
  }
  throw new Error(
    "WXT_CAPTURE_EXTENSION_KEY must be a base64 DER RSA public key (SPKI).",
  );
}

export default defineConfig({
  manifest: ({ command }) => {
    const auth = extensionAuthConfig();
    const origins = auth ? [auth.web, auth.auth] : [];
    return {
      name: "Capture",
      minimum_chrome_version: "126",
      permissions: ["identity", "storage", "activeTab", "scripting"],
      host_permissions: origins.map((origin) => `${origin}/*`),
      content_security_policy: {
        // The WXT dev server connects to its own live reload endpoint.
        extension_pages:
          "script-src 'self'; object-src 'none'; base-uri 'none';" +
          (command === "build"
            ? ` connect-src ${origins.join(" ") || "'none'"};`
            : ""),
      },
      key: publicManifestKey(import.meta.env.WXT_CAPTURE_EXTENSION_KEY),
    };
  },
});
