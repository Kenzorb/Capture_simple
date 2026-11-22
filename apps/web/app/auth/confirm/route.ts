import { handleEmailCallback } from "../../../lib/supabase/email-callback";

export function GET(request: Request) {
  return handleEmailCallback(request);
}
