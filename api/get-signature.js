const crypto = require("crypto");
const { verifyAuth, assertCanAccessVisit } = require("../_lib/firebaseAdmin");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const decoded = await verifyAuth(req);
    const { visitId, schoolId, category } = req.body || {};
    if (!visitId || !schoolId || !category) {
      return res.status(400).json({ error: "visitId, schoolId, category are required." });
    }

    await assertCanAccessVisit(decoded.uid, visitId);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: "Cloudinary credentials not configured on server." });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `visits/${visitId}/${schoolId}/${category}`;
    const publicId = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    // Only these params may be part of the signed request — must match
    // exactly what the Android client sends alongside the signature.
    const paramsToSign = { folder, public_id: publicId, timestamp };
    const sortedString = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");
    const signature = crypto
      .createHash("sha1")
      .update(sortedString + apiSecret)
      .digest("hex");

    return res.status(200).json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      publicId,
      signature,
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message || "Internal error" });
  }
};
