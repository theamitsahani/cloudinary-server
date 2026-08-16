const admin = require("firebase-admin");

function getAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel env vars store \n as literal text, so convert back to real newlines
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin;
}

// Reads the "Authorization: Bearer <idToken>" header, verifies it with
// Firebase Admin, and returns the decoded token (contains uid).
async function verifyAuth(req) {
  const header = req.headers.authorization || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!idToken) {
    const err = new Error("Missing Authorization: Bearer <idToken> header.");
    err.statusCode = 401;
    throw err;
  }
  try {
    return await getAdmin().auth().verifyIdToken(idToken);
  } catch (e) {
    const err = new Error("Invalid or expired auth token.");
    err.statusCode = 401;
    throw err;
  }
}

// Loads the caller's Firestore user profile and rejects inactive/deleted accounts.
// Mirrors the same status/isDeleted checks used in firestore.rules.
async function loadActiveUserProfile(uid) {
  const db = getAdmin().firestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    const err = new Error("User profile not found.");
    err.statusCode = 403;
    throw err;
  }
  const data = userSnap.data() || {};
  if (data.status === "INACTIVE") {
    const err = new Error("Your account has been deactivated.");
    err.statusCode = 403;
    throw err;
  }
  if (data.isDeleted === true) {
    const err = new Error("Your account no longer exists.");
    err.statusCode = 403;
    throw err;
  }
  return data;
}

// Same access rule as the old Cloud Function: Admins can access anything,
// employees can only access visits they own. Deactivated/deleted accounts
// are rejected even if their Firebase ID token is still technically valid.
async function assertCanAccessVisit(uid, visitId) {
  const db = getAdmin().firestore();
  const profile = await loadActiveUserProfile(uid);
  if (profile.role === "ADMIN") return;

  const visitSnap = await db.collection("visits").doc(visitId).get();
  if (!visitSnap.exists || visitSnap.get("employeeId") !== uid) {
    const err = new Error("You do not have access to this visit.");
    err.statusCode = 403;
    throw err;
  }
}

module.exports = { getAdmin, verifyAuth, assertCanAccessVisit };
