export default async function handler(req, res) {
  // your logic here
  res.status(200).json({ ok: true, stories: [] });
}
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    source: "studio-stories-feed",
    status: "ok",
    stories: [
      {
        id: "test-story-1",
        artistName: "Test Artist",
        storyTitle: "Inside the Working Studio",
        location: "Santa Fe, New Mexico",
        medium: "Painting",
        shortBio: "Test record for WAOW Studio Stories feed.",
        excerpt: "This is a test story used to confirm the Vercel feed is live.",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
        website: "https://womenartistsofthewest.org/studio-stories",
        publishedAt: "2026-06-02"
      }
    ]
  });
}
