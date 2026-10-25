// Yalla Decide — live rooms server. Express serves the client, ws carries the game.
// Rooms live in memory (they are ephemeral by nature). Set OPENAI_API_KEY for the GPT verdict.
const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { QUESTIONS, packFor, ruleVerdict } = require("./game");

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

// ---- Google Places: real candidate venues around the group's starting point ----
async function geocode(area) {
  if (!GOOGLE_KEY || !area) return null;
  const u = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(area + ", Dubai")}&region=ae&key=${GOOGLE_KEY}`;
  const j = await (await fetch(u)).json();
  const g = j.results && j.results[0]; return g ? { lat: g.geometry.location.lat, lng: g.geometry.location.lng } : null;
}
const KEYWORD = { food: () => "restaurant", drinks: a => a ? "bar cocktail" : "cafe mocktail lounge", talk: () => "cafe lounge", brunch: () => "brunch", activity: () => "entertainment bowling cinema padel", night: a => a ? "bar nightclub rooftop" : "lounge shisha" };
const TYPE = { food: "restaurant", drinks: "bar", talk: "cafe", brunch: "restaurant", activity: "", night: "night_club" };
function haversineKm(a, b) { const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180; const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
async function nearby(room) {
  if (!GOOGLE_KEY) return [];
  const origin = room.loc || await geocode(room.area); if (!origin) return [];
  const minutes = Math.min(...room.players.map(p => ({ "5": 5, "15": 15, "30": 30, any: 60 }[p.answers.distance] || 30)));
  const radius = Math.min(50000, { 5: 3000, 15: 8000, 30: 15000, 60: 30000 }[minutes] || 10000);
  const kw = KEYWORD[room.subject](room.alcohol), type = room.alcohol === false && room.subject === "drinks" ? "cafe" : TYPE[room.subject];
  const u = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${origin.lat},${origin.lng}&radius=${radius}&keyword=${encodeURIComponent(kw)}${type ? "&type=" + type : ""}&opennow=true&key=${GOOGLE_KEY}`;
  const j = await (await fetch(u)).json();
  return (j.results || []).filter(r => r.business_status !== "CLOSED_PERMANENTLY").map(r => ({
    name: r.name, rating: r.rating, reviews: r.user_ratings_total, price: r.price_level ? "$".repeat(r.price_level) : undefined,
    area: r.vicinity, km: +haversineKm(origin, r.geometry.location).toFixed(1), place_id: r.place_id,
    maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}&query_place_id=${r.place_id}`,
  })).sort((a, b) => (b.rating || 0) * Math.log10((b.reviews || 1) + 9) - (a.rating || 0) * Math.log10((a.reviews || 1) + 9)).slice(0, 18);
}

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.get("/game.js", (_req, res) => res.sendFile(path.join(__dirname, "game.js")));
app.get("/r/:code", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/health", (_req, res) => res.json({ ok: true, ai: !!OPENAI_API_KEY, places: !!GOOGLE_KEY }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/** @type {Map<string, Room>} */
const rooms = new Map();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => { let c; do { c = Array.from(crypto.randomBytes(4)).map(b => ALPHABET[b % ALPHABET.length]).join(""); } while (rooms.has(c)); return c; };
const newId = () => crypto.randomBytes(8).toString("hex");
const hash = s => crypto.createHash("sha256").update(String(s)).digest("hex");

function makeRoom({ name, subject, alcohol, password, area, loc }) {
  return {
    code: newCode(), name: String(name || "").slice(0, 30) || "The gang",
    subject: ["food", "drinks", "talk", "brunch", "activity", "night"].includes(subject) ? subject : "food",
    alcohol: !!alcohol, pass: password ? hash(password) : null, area: String(area || "").slice(0, 40),
    loc: (loc && isFinite(loc.lat) && isFinite(loc.lng)) ? { lat: +loc.lat, lng: +loc.lng } : null,
    hostId: null, players: [], phase: "lobby", picks: [], roasts: [], headline: null, driver: null,
    vetoes: {}, winner: null, blamed: null, aiUsed: false, createdAt: Date.now(), touched: Date.now(),
  };
}

// What everyone sees. Answers are hidden until the reveal.
function publicState(room) {
  const revealed = room.phase === "reveal" || room.phase === "verdict";
  return {
    code: room.code, name: room.name, subject: room.subject, alcohol: room.alcohol, area: room.area, locked: !!room.pass,
    hostId: room.hostId, phase: room.phase, questions: packFor(room.subject, room.alcohol),
    players: room.players.map(p => ({ id: p.id, name: p.name, online: p.sockets.size > 0, locked: p.locked, color: p.color, answers: revealed ? p.answers : undefined, suggestion: revealed ? (p.suggestion || null) : undefined })),
    picks: room.picks, roasts: room.roasts, headline: room.headline, driver: room.driver, vetoes: room.vetoes, winner: room.winner, blamed: room.blamed, aiUsed: room.aiUsed,
  };
}
function broadcast(room) {
  const msg = JSON.stringify({ type: "state", state: publicState(room) });
  for (const p of room.players) for (const ws of p.sockets) if (ws.readyState === 1) ws.send(msg);
}
const send = (ws, obj) => ws.readyState === 1 && ws.send(JSON.stringify(obj));
const COLORS = ["#ff6a3d", "#ffd23f", "#3ddc97", "#6aa8ff", "#ff7ad9", "#b48cff", "#7fe3ff", "#ffa366", "#ff4d6d", "#8affc1"];

function addPlayer(room, name) {
  const p = { id: newId(), name: String(name).trim().slice(0, 18) || "Someone", answers: {}, locked: false, suggestion: null, sockets: new Set(), color: COLORS[room.players.length % COLORS.length] };
  room.players.push(p);
  if (!room.hostId) room.hostId = p.id;
  return p;
}

async function gptVerdict(room, candidates) {
  if (!OPENAI_API_KEY) return null;
  const qs = packFor(room.subject, room.alcohol);
  const lbl = (q, v) => (q.opts.find(o => o.v === v) || {}).en || "-";
  const summary = room.players.map(p => `${p.name}: ` + qs.map(q => `${q.id}=${lbl(q, p.answers[q.id])}`).join(", ")).join("\n");
  const subj = { food: "where to eat", drinks: "where to go for drinks", talk: "a place to sit and talk", brunch: "which brunch", activity: "an activity to do together", night: "a night out" }[room.subject];
  const prompt = `You are the judge in a party game called "Yalla Decide" for an indecisive group of friends in Dubai (UAE).
Subject chosen by the host: ${subj}. Alcohol: ${room.alcohol ? "allowed" : "NOT allowed, suggest only alcohol-free venues"}. Starting area: ${room.area || "unknown, assume central Dubai"}. Local time: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}.
Each friend answered privately:
${summary}
${room.players.some(p => p.suggestion) ? "\nPlayers also suggested places (treat these as strong candidates, keep the player's wording for the name, and if a suggestion fits the group it should be one of the 3 picks):\n" + room.players.filter(p => p.suggestion).map(p => `- ${p.name} suggests: ${p.suggestion}`).join("\n") + "\n" : ""}
${candidates.length ? `Real venues currently OPEN near them (from Google Places):\n${candidates.map(c => `- ${c.name} | ${c.area} | ${c.km} km | rating ${c.rating || "?"} (${c.reviews || 0} reviews)${c.price ? " | " + c.price : ""}`).join("\n")}\n\nPick the 3 best venues FROM THIS LIST that satisfy the overlap of this group (distance tolerance, budget, deal-breakers, who is driving, hunger). Use the exact venue names from the list.` : "Pick the 3 best REAL, specific venues or plans in Dubai for that subject that satisfy the overlap of this group (respect distance tolerance, budget, deal-breakers, who is driving, hunger). Prefer real, well-known places and include the area in the name."} Write one funny, affectionate one-line roast per player based on their answers (never cruel; nothing about religion, ethnicity, body). Decide the designated driver: a player with status Driving; if several, the most sober; if none, null.
Return ONLY JSON: {"headline":{"en":"...","ar":"..."},"picks":[{"name":"...","type":{"en":"...","ar":"..."},"why":{"en":"...","ar":"..."},"minutes":15,"price":"$$"}],"roasts":[{"player":"name","en":"...","ar":"..."}],"driver":"name or null"}
Arabic must be casual spoken Levantine/Gulf Arabic, short and funny. Keep each "why" under 25 words.`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: OPENAI_MODEL, temperature: 0.9, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error("openai " + r.status);
  const j = await r.json();
  const data = JSON.parse(j.choices[0].message.content);
  if (!Array.isArray(data.picks) || !data.picks.length) throw new Error("bad shape");
  return data;
}

async function computeVerdict(room) {
  room.phase = "thinking"; broadcast(room);
  let data = null, candidates = [];
  try { candidates = await nearby(room); } catch (e) { console.warn("places:", e.message); }
  try { data = await gptVerdict(room, candidates); room.aiUsed = !!data; } catch (e) { console.warn("verdict fallback:", e.message); }
  if (!data) { data = ruleVerdict(room); const sg = room.players.filter(p => p.suggestion); if (sg.length) { const p = sg[Math.floor(Math.random() * sg.length)]; data.picks.unshift({ name: p.suggestion, type: { en: `${p.name}'s suggestion`, ar: `اقتراح ${p.name}` }, why: { en: `Someone actually had an idea. Respect.`, ar: `حدا فعلاً عندو فكرة. احترام.` } }); } }
  if (!data.picks.length && candidates.length) data.picks = candidates.slice(0, 3).map(c => ({ name: c.name, type: { en: c.area, ar: c.area }, why: { en: `Top rated nearby (${c.rating}★).`, ar: `الأعلى تقييم بالقرب (${c.rating}★).` } }));
  // attach Google data (distance, rating, maps link) to picks that match a candidate
  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
  room.picks = data.picks.slice(0, 3).map(p => {
    const c = candidates.find(c => norm(c.name) === norm(p.name)) || candidates.find(c => norm(p.name).includes(norm(c.name)) || norm(c.name).includes(norm(p.name)));
    return { ...p, veto: false, ...(c ? { km: c.km, rating: c.rating, reviews: c.reviews, maps: c.maps, price: p.price || c.price, area: c.area } : {}) };
  });
  room.roasts = data.roasts || []; room.headline = data.headline || null; room.driver = data.driver || null;
  room.vetoes = {}; room.winner = null; room.blamed = null; room.phase = "verdict"; broadcast(room);
}

wss.on("connection", ws => {
  let room = null, me = null;
  const leave = () => { if (me) me.sockets.delete(ws); if (room) broadcast(room); };
  ws.on("close", leave);
  ws.on("message", async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try {
      if (m.type === "create") {
        room = makeRoom(m); rooms.set(room.code, room);
        me = addPlayer(room, m.name); me.sockets.add(ws);
        send(ws, { type: "joined", code: room.code, playerId: me.id }); broadcast(room); return;
      }
      if (m.type === "join" || m.type === "rejoin") {
        const r = rooms.get(String(m.code || "").toUpperCase());
        if (!r) return send(ws, { type: "error", code: "no_room" });
        if (m.type === "rejoin") {
          const p = r.players.find(p => p.id === m.playerId);
          if (!p) return send(ws, { type: "error", code: "no_player" });
          room = r; me = p; me.sockets.add(ws); send(ws, { type: "joined", code: room.code, playerId: me.id }); broadcast(room); return;
        }
        if (r.pass && hash(m.password || "") !== r.pass) return send(ws, { type: "error", code: "bad_password", locked: true });
        if (r.players.length >= 12) return send(ws, { type: "error", code: "full" });
        room = r; me = addPlayer(room, m.name); me.sockets.add(ws); room.touched = Date.now();
        send(ws, { type: "joined", code: room.code, playerId: me.id }); broadcast(room); return;
      }
      if (!room || !me) return;
      const isHost = me.id === room.hostId;
      if (m.type === "peek") { // lets the join screen show room name/lock state before joining
        return;
      }
      if (m.type === "start" && isHost && room.players.length >= 2) {
        for (const p of room.players) { p.answers = {}; p.locked = false; p.suggestion = null; }
        room.picks = []; room.roasts = []; room.vetoes = {}; room.winner = null; room.blamed = null; room.phase = "answer"; broadcast(room); return;
      }
      if (m.type === "suggest" && (room.phase === "answer" || room.phase === "lobby")) {
        me.suggestion = String(m.text || "").trim().slice(0, 60) || null; broadcast(room); return;
      }
      if (m.type === "answer" && room.phase === "answer") {
        me.answers = Object.fromEntries(Object.entries(m.answers || {}).slice(0, 20).map(([k, v]) => [String(k).slice(0, 20), String(v).slice(0, 20)]));
        if (m.locked) me.locked = true;
        if (room.players.every(p => p.locked)) room.phase = "reveal";
        broadcast(room); return;
      }
      if (m.type === "reveal" && isHost && room.phase === "answer") { room.phase = "reveal"; broadcast(room); return; }
      if (m.type === "verdict" && isHost && room.phase === "reveal") { await computeVerdict(room); return; }
      if (m.type === "veto" && room.phase === "verdict" && !room.vetoes[me.id]) {
        const live = room.picks.filter(p => !p.veto);
        const pick = room.picks[m.index]; if (!pick || pick.veto || live.length < 2) return;
        pick.veto = true; room.vetoes[me.id] = m.index; broadcast(room); return;
      }
      if (m.type === "spin" && isHost && room.phase === "verdict") {
        const live = room.picks.map((p, i) => ({ p, i })).filter(x => !x.p.veto);
        const pick = live[Math.floor(Math.random() * live.length)];
        room.winner = { index: pick.i, name: pick.p.name, at: Date.now() }; broadcast(room); return;
      }
      if (m.type === "blame" && room.phase === "verdict") { room.blamed = room.players[Math.floor(Math.random() * room.players.length)].name; broadcast(room); return; }
      if (m.type === "kick" && isHost) { room.players = room.players.filter(p => p.id !== m.playerId); broadcast(room); return; }
      if (m.type === "restart" && isHost) { room.phase = "lobby"; for (const p of room.players) { p.answers = {}; p.locked = false; } broadcast(room); return; }
    } catch (e) { console.error(e); send(ws, { type: "error", code: "server" }); }
  });
});

// Forget rooms untouched for 6 hours.
setInterval(() => { const cut = Date.now() - 6 * 3600e3; for (const [c, r] of rooms) if (r.touched < cut && r.players.every(p => p.sockets.size === 0)) rooms.delete(c); }, 600e3);

server.listen(PORT, () => console.log(`Yalla Decide on :${PORT}  (GPT verdict: ${OPENAI_API_KEY ? "on" : "off, using built-in rules"})`));
