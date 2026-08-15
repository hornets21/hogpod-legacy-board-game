import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/lobby";

  const clientId = process.env.DISCORD_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

  if (!clientId) {
    return NextResponse.json(
      { error: "DISCORD_CLIENT_ID is not configured." },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state: returnTo,
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`
  );
}
