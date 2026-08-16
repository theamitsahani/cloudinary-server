const crypto = require("crypto");
const { verifyAuth, assertCanAccessVisit } = require("../_lib/firebaseAdmin");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const decoded = await verifyAuth(req);
    const { visitId, publicId, resourceType } = req.body || {};
    if (!visitId || !publicId) {
      return res.status(400).json({ error: "visitId and publicId are required." });
    }

    await assertCanAccessVisit(decoded.uid, visitId);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: "Cloudinary credentials not configured on server." });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = { public_id: publicId, timestamp };
    const sortedString = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");
    const signature = crypto
      .createHash("sha1")
      .update(sortedString + apiSecret)
      .digest("hex");

    const type = resourceType === "video" ? "video" : "image";
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    });

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${type}/destroy`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
    );

    if (!cloudinaryRes.ok) {
      const text = await cloudinaryRes.text();
      return res.status(502).json({ error: `Cloudinary destroy failed: ${text}` });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message || "Internal error" });
  }
};
