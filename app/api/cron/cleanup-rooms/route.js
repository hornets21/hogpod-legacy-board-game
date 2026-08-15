import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin Database is not initialized." },
      { status: 500 }
    );
  }

  try {
    const roomsRef = adminDb.ref("rooms");
    const snapshot = await roomsRef.once("value");

    if (!snapshot.exists()) {
      return NextResponse.json({
        cleanedCount: 0,
        message: "No active rooms found.",
      });
    }

    const rooms = snapshot.val();
    const now = Date.now();
    const maxTtlMs = 3 * 60 * 60 * 1000; // 3 hours
    const deletedRooms = [];

    const deletePromises = [];

    for (const [roomCode, roomData] of Object.entries(rooms)) {
      const meta = roomData?.meta || {};
      const createdAt = Number(meta.createdAt) || 0;
      const expiresAt = Number(meta.expiresAt) || createdAt + maxTtlMs;

      const isExpired =
        now >= expiresAt || (createdAt > 0 && now - createdAt >= maxTtlMs);

      if (isExpired) {
        deletedRooms.push(roomCode);
        deletePromises.push(adminDb.ref(`rooms/${roomCode}`).remove());
      }
    }

    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      cleanedCount: deletedRooms.length,
      deletedRooms,
      timestamp: new Date(now).toISOString(),
    });
  } catch (error) {
    console.error("Cron room cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to perform room cleanup." },
      { status: 500 }
    );
  }
}
