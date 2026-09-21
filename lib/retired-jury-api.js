// Membership reviews now use the authenticated Supabase jury interfaces.
// Do not read CRM data or process mutations through these legacy routes.
module.exports = function retiredJuryApi(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(410).json({
    error: "Legacy jury API retired",
    message: "Use the authenticated WAOW Jury Room or Jury Scores application."
  });
};
