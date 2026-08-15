import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const returnTo = searchParams.get("state") || "/lobby";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

  if (error || !code) {
    const errorUrl = new URL(returnTo, baseUrl);
    errorUrl.searchParams.set("auth_error", error || "missing_code");
    return NextResponse.redirect(errorUrl.toString());
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    const errorUrl = new URL(returnTo, baseUrl);
    errorUrl.searchParams.set("auth_error", "server_misconfiguration");
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // 1. Exchange code for Discord access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Discord token exchange failed:", errText);
      const errorUrl = new URL(returnTo, baseUrl);
      errorUrl.searchParams.set("auth_error", "token_exchange_failed");
      return NextResponse.redirect(errorUrl.toString());
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch Discord user profile
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Discord user fetch failed");
      const errorUrl = new URL(returnTo, baseUrl);
      errorUrl.searchParams.set("auth_error", "user_fetch_failed");
      return NextResponse.redirect(errorUrl.toString());
    }

    const discordUser = await userResponse.json();
    const discordUid = `discord:${discordUser.id}`;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    if (!adminAuth) {
      console.error("Firebase Admin Auth is not initialized");
      const errorUrl = new URL(returnTo, baseUrl);
      errorUrl.searchParams.set("auth_error", "firebase_admin_uninitialized");
      return NextResponse.redirect(errorUrl.toString());
    }

    // 3. Mint Firebase Custom Token
    const customToken = await adminAuth.createCustomToken(discordUid, {
      discordId: discordUser.id,
      username: discordUser.username,
      displayName: discordUser.global_name || discordUser.username,
      avatar: avatarUrl,
    });

    // 4. Redirect with custom token & user profile
    const redirectUrl = new URL(returnTo, baseUrl);
    redirectUrl.searchParams.set("firebase_token", customToken);
    redirectUrl.searchParams.set("discord_id", discordUser.id);
    redirectUrl.searchParams.set(
      "display_name",
      discordUser.global_name || discordUser.username
    );
    if (avatarUrl) {
      redirectUrl.searchParams.set("avatar_url", avatarUrl);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("Authentication callback internal error:", err);
    const errorUrl = new URL(returnTo, baseUrl);
    errorUrl.searchParams.set("auth_error", "internal_error");
    return NextResponse.redirect(errorUrl.toString());
  }
}
