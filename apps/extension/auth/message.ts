export type ExtensionCommand = "status" | "connect" | "disconnect";
export type Account = {
  id: string;
  email: string | null;
  displayName: string | null;
};
export type ExtensionStatus =
  | { state: "connected"; account: Account }
  | {
      state:
        | "ready"
        | "unconfigured"
        | "connecting"
        | "connect-unavailable"
        | "reconnect"
        | "unavailable"
        | "disconnected";
    };
