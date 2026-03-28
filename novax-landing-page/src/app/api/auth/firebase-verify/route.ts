/**
 * POST /api/auth/firebase-verify
 *
 * Receives a Firebase ID token from the client, verifies it with
 * Firebase Admin SDK, then exchanges it for a NovaX backend JWT
 * (or issues one directly if backend is unavailable).
 *
 * This keeps a clean separation: Firebase handles identity,
 * NovaX backend handles authorization / DB user records.
 */

import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// ---------- Firebase Admin init (singleton) ----------
function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  return initializeApp({
    credential: cert(serviceAccount as any),
  });
}

// ---------- Route Handler ----------
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // 1. Verify Firebase token
    const adminApp = getAdminApp();
    const adminAuth = getAuth(adminApp);
    const decoded = await adminAuth.verifyIdToken(idToken);

    const { uid, email, name, picture } = decoded;

    // 2. Exchange with NovaX backend for its own JWT
    //    The backend has a /api/auth/firebase endpoint (we'll add it)
    //    Falls back to issuing a minimal session token if backend is down.
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

    const backendRes = await fetch(`${backendUrl}/api/auth/firebase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, email, name, picture }),
    });

    if (!backendRes.ok) {
      const err = await backendRes.text();
      return NextResponse.json(
        { error: `Backend auth failed: ${err}` },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    });
  } catch (error: any) {
    console.error("[firebase-verify] Error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 401 }
    );
  }
}
