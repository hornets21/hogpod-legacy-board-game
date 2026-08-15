"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  auth,
  ensureFirebaseAuth,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "@/lib/firebase";
import { createRoom, joinRoom, joinAsSpectator } from "@/lib/roomManager";

export const ADMIN_ROLE_IDS = [
  "1243153107630821417",
  "1333162608265658368",
];

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [discordProfile, setDiscordProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [spectatorCodeInput, setSpectatorCodeInput] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [hostMode, setHostMode] = useState("play"); // "play" | "spectate"

  const discordClientId =
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
    process.env.DISCORD_CLIENT_ID ||
    "";

  const railwayApiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    async function handleAuth() {
      if (typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");

        if (accessToken) {
          setAuthLoading(true);
          try {
            const res = await fetch("https://discord.com/api/users/@me", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!res.ok) throw new Error("Failed to fetch Discord user data.");
            const dcUser = await res.json();

            let userRoles = [];
            try {
              const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (guildsRes.ok) {
                const guilds = await guildsRes.json();
                const memberPromises = guilds.slice(0, 20).map(async (g) => {
                  try {
                    const memRes = await fetch(
                      `https://discord.com/api/users/@me/guilds/${g.id}/member`,
                      { headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                    if (memRes.ok) {
                      const memData = await memRes.json();
                      return Array.isArray(memData.roles) ? memData.roles.map(String) : [];
                    }
                  } catch {
                    return [];
                  }
                  return [];
                });
                const roleArrays = await Promise.all(memberPromises);
                userRoles = Array.from(new Set(roleArrays.flat()));
              }
            } catch {}

            if (railwayApiUrl) {
              try {
                const verifyRes = await fetch(`${railwayApiUrl}/api/auth/verify`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ discordId: dcUser.id, accessToken }),
                });
                if (verifyRes.ok) {
                  const verifyData = await verifyRes.json();
                  if (Array.isArray(verifyData.roles)) {
                    userRoles = Array.from(new Set([...userRoles, ...verifyData.roles.map(String)]));
                  }
                }
              } catch {}
            }

            const hasAdminRole = userRoles.some(
              (r) => String(r) === "1243153107630821417" || String(r) === "1333162608265658368"
            );
            const avatarUrl = dcUser.avatar
              ? `https://cdn.discordapp.com/avatars/${dcUser.id}/${dcUser.avatar}.png`
              : null;

            const profile = {
              id: dcUser.id,
              username: dcUser.username,
              displayName: dcUser.global_name || dcUser.username,
              avatar: avatarUrl,
              roles: userRoles,
              isAdmin: hasAdminRole,
            };

            localStorage.setItem("pod_discord_user", JSON.stringify(profile));
            setDiscordProfile(profile);
            window.history.replaceState(null, "", window.location.pathname);

            if (auth) {
              await signInAnonymously(auth);
            }
          } catch (err) {
            setErrorMessage("Discord authentication failed. Please try again.");
          } finally {
            setAuthLoading(false);
          }
          return;
        }
      }

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("pod_discord_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const hasAdminRole =
              Boolean(parsed.isAdmin) ||
              Boolean(
                parsed.roles?.some(
                  (r) => String(r) === "1243153107630821417" || String(r) === "1333162608265658368"
                )
              );
            parsed.isAdmin = hasAdminRole;
            setDiscordProfile(parsed);
            if (auth && !auth.currentUser) {
              await signInAnonymously(auth);
            }
          } catch {
            localStorage.removeItem("pod_discord_user");
          }
        }
      }

      setAuthLoading(false);
    }

    handleAuth();
  }, [railwayApiUrl]);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
    });

    return () => unsub();
  }, []);

  const handleDiscordLogin = () => {
    const redirectUri = window.location.origin + "/lobby";
    const clientId = discordClientId || "1485982724463525951";
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=token&scope=identify%20guilds%20guilds.members.read&prompt=consent&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    window.location.href = discordAuthUrl;
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    localStorage.removeItem("pod_discord_user");
    setDiscordProfile(null);
    setUser(null);
  };

  const isDiscordLoggedIn = Boolean(discordProfile);
  const isAdmin = Boolean(
    discordProfile?.isAdmin ||
    discordProfile?.roles?.some(
      (r) => String(r) === "1243153107630821417" || String(r) === "1333162608265658368"
    )
  );

  const activeDisplayName =
    discordProfile?.displayName ||
    (guestName.trim() ? guestName.trim() : user?.displayName || "Player");
  const activeAvatar = discordProfile?.avatar || user?.photoURL || null;

  const handleCreateRoom = async () => {
    if (!isDiscordLoggedIn) {
      setErrorMessage("Please log in with Discord before creating a room as Host.");
      handleDiscordLogin();
      return;
    }

    setLoadingAction("create");
    setErrorMessage("");

    try {
      let uid = user?.uid;
      if (!uid && auth) {
        const fbUser = await ensureFirebaseAuth();
        uid = fbUser?.uid;
      }

      const code = await createRoom(
        {
          uid: uid || `discord:${discordProfile.id}`,
          discordId: discordProfile?.id || null,
          displayName: activeDisplayName,
          avatar: activeAvatar,
        },
        { hostMode }
      );
      router.push(`/room/${code}`);
    } catch (err) {
      setErrorMessage(err.message || "Failed to create room.");
      setLoadingAction("");
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const code = roomCodeInput.toUpperCase().trim();
    if (code.length !== 6) {
      setErrorMessage("Room code must be 6 characters.");
      return;
    }

    setLoadingAction("join");
    setErrorMessage("");

    try {
      let uid = user?.uid;
      if (!uid && auth) {
        const fbUser = await ensureFirebaseAuth();
        uid = fbUser?.uid;
      }

      await joinRoom(code, {
        uid: uid || (discordProfile ? `discord:${discordProfile.id}` : "guest"),
        displayName: activeDisplayName,
        avatar: activeAvatar,
      });
      router.push(`/room/${code}`);
    } catch (err) {
      setErrorMessage(err.message || "Failed to join room.");
      setLoadingAction("");
    }
  };

  const handleJoinSpectator = async (e) => {
    e.preventDefault();
    if (!isDiscordLoggedIn) {
      setErrorMessage("Please log in with Discord before joining as Spectator Admin.");
      handleDiscordLogin();
      return;
    }

    if (!isAdmin) {
      setErrorMessage(
        "Admin privileges required in Discord to join as Spectator Admin."
      );
      return;
    }

    const code = spectatorCodeInput.toUpperCase().trim();
    if (code.length !== 6) {
      setErrorMessage("Room code must be 6 characters.");
      return;
    }

    setLoadingAction("spectator");
    setErrorMessage("");

    try {
      let uid = user?.uid;
      if (!uid && auth) {
        const fbUser = await ensureFirebaseAuth();
        uid = fbUser?.uid;
      }

      await joinAsSpectator(code, {
        uid: uid || `discord:${discordProfile.id}`,
        discordId: discordProfile?.id || null,
        displayName: activeDisplayName,
        avatar: activeAvatar,
        isAdmin: true,
      });
      router.push(`/room/${code}`);
    } catch (err) {
      setErrorMessage(err.message || "Failed to join as spectator.");
      setLoadingAction("");
    }
  };

  if (authLoading) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#f2c75c] border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-bold text-slate-400">Loading lobby...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white p-4 select-none overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900/80 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="pb-6 border-b border-white/10 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-[#e51b4b]">
            HOGPOD LEGACY · MULTIPLAYER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">Online Lobby</h1>
          <p className="text-xs text-slate-400 mt-1">
            4 Players and 1 Spectator Admin · Rooms automatically expire after 3 hours
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/30 rounded-xl text-red-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 p-4 bg-black/40 border border-white/10 rounded-xl">
          {isDiscordLoggedIn ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeAvatar ? (
                  <img
                    src={activeAvatar}
                    alt={activeDisplayName}
                    className="w-10 h-10 rounded-full border border-[#5865F2]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#5865F2]/30 text-[#5865F2] font-black flex items-center justify-center text-sm border border-[#5865F2]/50">
                    {activeDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-[#5865F2] font-black uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    DISCORD ACCOUNT · HOST ENABLED
                  </div>
                  <div className="text-sm font-black text-white">{activeDisplayName}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-slate-200 font-bold px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">
                Guest Nickname
              </div>
              <input
                type="text"
                placeholder="Enter your nickname..."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-lg text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#f2c75c]"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/50 border border-white/10 rounded-xl flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="font-black text-base text-white flex items-center gap-2">
                  <span>Create Room</span>
                  <span className="text-[10px] bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] font-bold px-1.5 py-0.5 rounded">
                    Requires Discord
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {isDiscordLoggedIn
                    ? `Host as ${activeDisplayName}`
                    : "Log in with Discord to host a room"}
                </div>
              </div>

              {isDiscordLoggedIn ? (
                <button
                  type="button"
                  disabled={loadingAction === "create"}
                  onClick={handleCreateRoom}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#e51b4b] hover:bg-[#c0153e] disabled:opacity-50 text-white font-black text-xs rounded-xl transition-colors shrink-0"
                >
                  {loadingAction === "create" ? "Creating..." : "Create Room"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDiscordLogin}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-xs rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2 shadow-md shadow-indigo-950/40"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span>Log In with Discord to Host</span>
                </button>
              )}
            </div>

            {/* Host role mode selector */}
            {isDiscordLoggedIn && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Host Mode
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHostMode("play")}
                    className={`px-3 py-2 rounded-xl border text-left transition-all ${
                      hostMode === "play"
                        ? "bg-[#e51b4b]/15 border-[#e51b4b] shadow-[0_0_12px_rgba(229,27,75,0.25)]"
                        : "bg-black/30 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="text-xs font-black text-white">Play as House</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Join as 1 of the 4 houses and manage the game
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHostMode("spectate")}
                    className={`px-3 py-2 rounded-xl border text-left transition-all ${
                      hostMode === "spectate"
                        ? "bg-blue-500/15 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                        : "bg-black/30 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="text-xs font-black text-white">Spectator Admin</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Oversee the game via Admin Panel without playing
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleJoinRoom}
            className="p-4 bg-slate-900/50 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div>
              <div className="font-black text-base text-white">Join Game</div>
              <div className="text-xs text-slate-400">Enter 6-character room code to join as a player</div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                maxLength={6}
                placeholder="6 DIGITS"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                className="w-full sm:w-28 px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-center font-mono font-black text-sm uppercase placeholder:text-slate-600 focus:outline-none focus:border-[#f2c75c]"
              />
              <button
                type="submit"
                disabled={loadingAction === "join" || roomCodeInput.length !== 6}
                className="px-5 py-2.5 bg-[#f2c75c] hover:bg-[#d9b14c] disabled:opacity-50 text-black font-black text-xs rounded-xl transition-colors shrink-0"
              >
                {loadingAction === "join" ? "Joining..." : "Join"}
              </button>
            </div>
          </form>

          {isDiscordLoggedIn && isAdmin && (
            <div className="p-4 bg-slate-900/50 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="font-black text-base text-white flex items-center gap-2">
                  <span>Spectator Admin View</span>
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    ADMIN VERIFIED
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Full board view for streamers with admin management tools
                </div>
              </div>

              <form
                onSubmit={handleJoinSpectator}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6 DIGITS"
                  value={spectatorCodeInput}
                  onChange={(e) => setSpectatorCodeInput(e.target.value.toUpperCase())}
                  className="w-full sm:w-28 px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-center font-mono font-black text-sm uppercase placeholder:text-slate-600 focus:outline-none focus:border-blue-400"
                />
                <button
                  type="submit"
                  disabled={loadingAction === "spectator" || spectatorCodeInput.length !== 6}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-colors shrink-0"
                >
                  {loadingAction === "spectator" ? "Joining..." : "Watch as Admin"}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            ← Return to Local Mode
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050407] text-white select-none">
          <div className="text-sm font-bold text-slate-400">Loading...</div>
        </main>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}
