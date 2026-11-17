/* ═══════════════════════════════════════════════════════
   SBAC BASE TEN IAB · THE LESSON VIDEOS — WRITTEN BY tools/sync_videos.js (do not edit by hand; the table is in it).
   Marcos 11/14: "make the videos focus on the setup that will prepare them for the IAB questions" · "these videos
   should be specific to how these problems need to be solved". Short animated videos in Ava's voice (videos/chNN/,
   made with Papermorph in base-ten-iab-videos/), one per kind of question. Each works the SAME KIND of problem with
   OTHER numbers (tools/check_videos.js: none is a question on this site, a real test item or an HMH lesson problem).
   Where they are (his Module 4 picks, 11/13): Warm-Up — each 👀 Watch card IS the video (watched to the end);
   Practice — 🎬 Show me beside every hint and 🎬 Watch how after a wrong answer. Never on Test Form A / B.
   Only the videos that exist are listed (11 of 11).
═══════════════════════════════════════════════════════ */
window.MM4_VIDEOS = {
  version: '1b184cee',     // goes on every video address: a new number when a video changes (Cloudflare keeps files 4 h)
  titles: { 1: "Add big numbers", 2: "The missing digit", 3: "Which place tells", 4: "Same number, new look", 5: "Round", 6: "Area model", 7: "Partial products", 8: "Area model: two 2-digit numbers", 9: "Fix the claim", 10: "Divide and times go together", 11: "What can you buy?" },
  // the Warm-Up's 👀 Watch cards, by their title (the same in every version)
  watch: { "Add big numbers": 1, "Compare numbers": 3, "Same number, new look": 4, "Round": 5, "Area model": 6, "Partial products": 7, "Area model: two 2-digit numbers": 8, "Divide and multiply": 10, "What can you buy?": 11 },
  // each Practice spot (the same kind of question at the same spot on every part) → its video
  spot: { 1: 1, 2: 2, 3: 10, 4: 1, 5: 5, 6: 8, 7: 7, 8: 3, 9: 10, 10: 11, 11: 5, 12: 4, 13: 9, 14: 8, 15: 4 },
};
