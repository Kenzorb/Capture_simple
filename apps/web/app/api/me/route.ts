import { readOwnAccount } from "../../../lib/supabase/account";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const result = await readOwnAccount();
  if (result.status !== "ok") {
    return Response.json(
      { error: result.status },
      { status: result.status === "unauthorized" ? 401 : 503, headers },
    );
  }

  return Response.json(result.account, { headers });
}
