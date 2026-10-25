// Yalla Decide — live rooms server.
// Flow: everyone suggests one plan → AI writes questions about those suggestions → each player answers 5 random ones
// → reveal → AI decides which suggestion suits the majority. Rooms live in memory. Set OPENAI_API_KEY for the AI parts.
const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { fallbackPool, fallbackVerdict } = require("./game");

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const PER_PLAYER = 5;

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.get("/game.js", (_req, res) => res.sendFile(path.join(__dirname, "game.js")));
app.get("/r/:code", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/health", (_req, res) => res.json({ ok: true, ai: !!OPENAI_API_KEY, places: !!GOOGLE_KEY }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => { let c; do { c = Array.from(crypto.randomBytes(4)).map(b => ALPHABET[b % ALPHABET.length]).join(""); } while (rooms.has(c)); return c; };
const newId = () => crypto.randomBytes(8).toString("hex");
const hash = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const COLORS = ["#ff4fa0", "#28dcff", "#ffe34d", "#4dffb0", "#ff7a3d", "#b48cff", "#7fe3ff", "#ffa366", "#ff4d6d", "#8affc1"];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function makeRoom({ name, subject, alcohol, password, area, loc }) {
  return {
    code: newCode(), name: String(name || "").slice(0, 30) || "The gang",
    subject: ["food", "drinks", "talk", "brunch", "activity", "night", "any"].includes(subject) ? subject : "any",
    alcohol: !!alcohol, pass: password ? hash(password) : null, area: String(area || "").slice(0, 40),
    loc: (loc && isFinite(loc.lat) && isFinite(loc.lng)) ? { lat: +loc.lat, lng: +loc.lng } : null,
    hostId: null, players: [], phase: "lobby", pool: [], picks: [], roasts: [], headline: null, driver: null,
    vetoes: {}, winner: null, blamed: null, aiUsed: false, touched: Date.now(),
  };
}
function addPlayer(room, name) {
  const p = { id: newId(), name: String(name).trim().slice(0, 18) || "Someone", suggestion: null, qids: [], answers: {}, locked: false, sockets: new Set(), color: COLORS[room.players.length % COLORS.length] };
  room.players.push(p); if (!room.hostId) room.hostId = p.id; return p;
}
function publicState(room) {
  const revealed = room.phase === "reveal" || room.phase === "thinking" || room.phase === "verdict";
  return {
    code: room.code, name: room.name, subject: room.subject, alcohol: room.alcohol, area: room.area, locked: !!room.pass,
    hostId: room.hostId, phase: room.phase, pool: room.pool, perPlayer: PER_PLAYER,
    players: room.players.map(p => ({ id: p.id, name: p.name, online: p.sockets.size > 0, locked: p.locked, color: p.color, suggestion: p.suggestion, qids: p.qids, answers: revealed ? p.answers : undefined })),
    picks: room.picks, roasts: room.roasts, headline: room.headline, driver: room.driver, vetoes: room.vetoes, winner: room.winner, blamed: room.blamed, aiUsed: room.aiUsed,
  };
}
function broadcast(room) { const msg = JSON.stringify({ type: "state", state: publicState(room) }); for (const p of room.players) for (const ws of p.sockets) if (ws.readyState === 1) ws.send(msg); }
const send = (ws, obj) => ws.readyState === 1 && ws.send(JSON.stringify(obj));

// ---------- OpenAI helpers ----------
async function gpt(prompt, temperature = 0.9) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: OPENAI_MODEL, temperature, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error("openai " + r.status);
  const j = await r.json(); return JSON.parse(j.choices[0].message.content);
}
const sugList = room => room.players.filter(p => p.suggestion).map(p => `- [${p.id.slice(0, 4)}] ${p.name}: "${p.suggestion}"`).join("\n");
const ctx = room => `Group of ${room.players.length} friends in Dubai (UAE), starting area: ${room.area || "unknown"}. Theme: ${room.subject}. Alcohol: ${room.alcohol ? "allowed" : "not allowed"}. Local time ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}.`;

async function aiPool(room) {
  const n = Math.max(10, room.players.length * 3);
  const data = await gpt(`You write questions for "Yalla Decide", a party game that helps an indecisive group pick ONE plan from the suggestions they made.
${ctx(room)}
Suggestions on the table:
${sugList(room)}

Write ${n} short, funny, SPECIFIC multiple-choice questions whose answers will reveal which suggestion suits the majority. Every question must reference one or more of the actual suggestions by name (e.g. "Ahmed wants shisha at X. Your lungs say:"), or probe a practical constraint that separates them (distance, budget, hunger, dress code, energy, who drives, how late). Each question has exactly 4 options, each option with a short emoji "ic". Humor: playful, affectionate, Dubai-flavoured; nothing about religion, ethnicity or bodies. Provide English and casual spoken Levantine/Gulf Arabic for everything.
Return ONLY JSON: {"questions":[{"id":"q1","about":["<suggestion id like a1b2 or empty>"],"en":{"q":"...","s":"one-line subtitle"},"ar":{"q":"...","s":"..."},"opts":[{"v":"a","ic":"🔥","en":"...","ar":"..."},{"v":"b",...},{"v":"c",...},{"v":"d",...}]}]}`);
  if (!Array.isArray(data.questions) || data.questions.length < 5) throw new Error("bad pool");
  return data.questions.slice(0, 16).map((q, i) => ({ id: "q" + (i + 1), about: q.about || [], en: q.en, ar: q.ar || q.en, opts: (q.opts || []).slice(0, 4).map((o, k) => ({ v: o.v || "abcd"[k], ic: o.ic || "•", en: o.en, ar: o.ar || o.en })) }));
}
async function aiVerdict(room) {
  const lbl = (qid, v) => { const q = room.pool.find(q => q.id === qid); const o = q && q.opts.find(o => o.v === v); return q && o ? `${q.en.q} → ${o.en}` : null; };
  const answers = room.players.map(p => `${p.name} (suggested: ${p.suggestion || "nothing"}):\n` + p.qids.map(id => "  " + (lbl(id, p.answers[id]) || `${id} → (no answer)`)).join("\n")).join("\n");
  return gpt(`You are the judge in "Yalla Decide". The group must pick ONE of their own suggestions.
${ctx(room)}
Suggestions:
${sugList(room)}

Each player answered 5 random questions about those suggestions:
${answers}

Rank ALL the suggestions from best fit for the MAJORITY to worst. Be smart: weigh constraints (distance, budget, hunger, driving, deal-breakers) above pure enthusiasm, and never let the suggester's own vote decide alone. Give a sharp one-line reason per suggestion (why it won or lost, in the group's own words), a score 0-100 for group fit, one funny affectionate roast per player based on their answers, and a designated driver if any answer implies someone is driving (else null).
Return ONLY JSON: {"headline":{"en":"...","ar":"..."},"picks":[{"suggestion_id":"<4-char id>","name":"<suggestion text>","score":87,"why":{"en":"...","ar":"..."}}],"roasts":[{"player":"name","en":"...","ar":"..."}],"driver":"name or null"}
Arabic: casual spoken Levantine/Gulf, short and funny.`, 0.7);
}

// ---------- Google Places: enrich a suggestion with a real venue ----------
async function findPlace(text, room) {
  if (!GOOGLE_KEY) return null;
  const bias = room.loc ? `&location=${room.loc.lat},${room.loc.lng}&radius=30000` : "";
  const u = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(text + (room.area ? " " + room.area : "") + " Dubai")}${bias}&key=${GOOGLE_KEY}`;
  const j = await (await fetch(u)).json(); const r = j.results && j.results[0]; if (!r) return null;
  return { place: r.name, area: r.formatted_address, rating: r.rating, reviews: r.user_ratings_total, price: r.price_level ? "$".repeat(r.price_level) : undefined, open: r.opening_hours ? r.opening_hours.open_now : undefined, maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}&query_place_id=${r.place_id}` };
}

// ---------- phase transitions ----------
async function startGame(room) {
  room.phase = "generating"; room.pool = []; room.picks = []; room.roasts = []; room.vetoes = {}; room.winner = null; room.blamed = null; room.aiUsed = false;
  for (const p of room.players) { p.answers = {}; p.locked = false; p.qids = []; }
  broadcast(room);
  let pool = null;
  if (OPENAI_API_KEY) { try { pool = await aiPool(room); room.aiUsed = true; } catch (e) { console.warn("pool fallback:", e.message); } }
  if (!pool) pool = fallbackPool(room);
  room.pool = pool;
  // deal 5 questions per player: first cover every suggestion on the table, then random fill
  for (const p of room.players) {
    const covered = new Set(), chosen = [];
    for (const q of shuffle(pool.filter(q => (q.about || []).length))) { if (chosen.length >= PER_PLAYER) break; if (q.about.some(a => !covered.has(a))) { chosen.push(q); q.about.forEach(a => covered.add(a)); } }
    for (const q of shuffle(pool.filter(q => !chosen.includes(q)))) { if (chosen.length >= PER_PLAYER) break; chosen.push(q); }
    p.qids = shuffle(chosen).map(q => q.id);
  }
  room.phase = "answer"; broadcast(room);
}
async function computeVerdict(room) {
  room.phase = "thinking"; broadcast(room);
  let data = null;
  if (OPENAI_API_KEY) { try { data = await aiVerdict(room); room.aiUsed = true; } catch (e) { console.warn("verdict fallback:", e.message); } }
  if (!data || !Array.isArray(data.picks) || !data.picks.length) data = fallbackVerdict(room);
  const byId = Object.fromEntries(room.players.map(p => [p.id.slice(0, 4), p]));
  const picks = [];
  for (const pk of data.picks) {
    const owner = byId[pk.suggestion_id] || room.players.find(p => p.suggestion && pk.name && p.suggestion.toLowerCase() === String(pk.name).toLowerCase());
    if (!owner || picks.some(x => x.by === owner.id)) continue;
    let place = null; try { place = await findPlace(owner.suggestion, room); } catch (e) { console.warn("places:", e.message); }
    picks.push({ name: owner.suggestion, by: owner.id, byName: owner.name, score: pk.score, why: pk.why || { en: "", ar: "" }, veto: false, ...(place || {}) });
  }
  for (const p of room.players) if (p.suggestion && !picks.some(x => x.by === p.id)) picks.push({ name: p.suggestion, by: p.id, byName: p.name, score: 0, why: { en: "", ar: "" }, veto: false });
  room.picks = picks; room.roasts = Array.isArray(data.roasts) ? data.roasts : []; room.headline = data.headline || null; room.driver = data.driver || null;
  room.vetoes = {}; room.winner = null; room.blamed = null; room.phase = "verdict"; broadcast(room);
}

wss.on("connection", ws => {
  let room = null, me = null;
  ws.on("close", () => { if (me) me.sockets.delete(ws); if (room) broadcast(room); });
  ws.on("message", async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try {
      if (m.type === "create") {
        room = makeRoom(m); rooms.set(room.code, room); me = addPlayer(room, m.name); me.sockets.add(ws);
        if (m.suggestion) me.suggestion = String(m.suggestion).trim().slice(0, 80) || null;
        send(ws, { type: "joined", code: room.code, playerId: me.id }); broadcast(room); return;
      }
      if (m.type === "join" || m.type === "rejoin") {
        const r = rooms.get(String(m.code || "").toUpperCase());
        if (!r) return send(ws, { type: "error", code: "no_room" });
        if (m.type === "rejoin") {
          const p = r.players.find(p => p.id === m.playerId); if (!p) return send(ws, { type: "error", code: "no_player" });
          room = r; me = p; me.sockets.add(ws); send(ws, { type: "joined", code: room.code, playerId: me.id }); broadcast(room); return;
        }
        if (r.pass && hash(m.password || "") !== r.pass) return send(ws, { type: "error", code: "bad_password", locked: true });
        if (r.players.length >= 12) return send(ws, { type: "error", code: "full" });
        if (r.phase !== "lobby") return send(ws, { type: "error", code: "started" });
        room = r; me = addPlayer(room, m.name); me.sockets.add(ws); room.touched = Date.now();
        if (m.suggestion) me.suggestion = String(m.suggestion).trim().slice(0, 80) || null;
        send(ws, { type: "joined", code: room.code, playerId: me.id }); broadcast(room); return;
      }
      if (!room || !me) return;
      const isHost = me.id === room.hostId;
      if (m.type === "suggest" && room.phase === "lobby") { me.suggestion = String(m.text || "").trim().slice(0, 80) || null; room.touched = Date.now(); broadcast(room); return; }
      if (m.type === "start" && isHost && room.phase === "lobby" && room.players.length >= 2 && room.players.every(p => p.suggestion)) { await startGame(room); return; }
      if (m.type === "answer" && room.phase === "answer") {
        me.answers = Object.fromEntries(Object.entries(m.answers || {}).slice(0, 20).map(([k, v]) => [String(k).slice(0, 8), String(v).slice(0, 8)]));
        if (m.locked) me.locked = true;
        if (room.players.every(p => p.locked)) room.phase = "reveal";
        broadcast(room); return;
      }
      if (m.type === "reveal" && isHost && room.phase === "answer") { room.phase = "reveal"; broadcast(room); return; }
      if (m.type === "verdict" && isHost && room.phase === "reveal") { await computeVerdict(room); return; }
      if (m.type === "veto" && room.phase === "verdict" && !room.vetoes[me.id]) {
        const live = room.picks.filter(p => !p.veto); const pick = room.picks[m.index]; if (!pick || pick.veto || live.length < 2) return;
        pick.veto = true; room.vetoes[me.id] = m.index; broadcast(room); return;
      }
      if (m.type === "spin" && isHost && room.phase === "verdict") {
        const live = room.picks.map((p, i) => ({ p, i })).filter(x => !x.p.veto); const pick = live[Math.floor(Math.random() * live.length)];
        room.winner = { index: pick.i, name: pick.p.name, at: Date.now() }; broadcast(room); return;
      }
      if (m.type === "blame" && room.phase === "verdict") { room.blamed = room.players[Math.floor(Math.random() * room.players.length)].name; broadcast(room); return; }
      if (m.type === "kick" && isHost) { room.players = room.players.filter(p => p.id !== m.playerId); broadcast(room); return; }
      if (m.type === "restart" && isHost) { room.phase = "lobby"; room.pool = []; room.picks = []; for (const p of room.players) { p.answers = {}; p.locked = false; p.qids = []; p.suggestion = null; } broadcast(room); return; }
    } catch (e) { console.error(e); send(ws, { type: "error", code: "server" }); }
  });
});
setInterval(() => { const cut = Date.now() - 6 * 3600e3; for (const [c, r] of rooms) if (r.touched < cut && r.players.every(p => p.sockets.size === 0)) rooms.delete(c); }, 600e3);
server.listen(PORT, () => console.log(`Yalla Decide on :${PORT}  (AI: ${OPENAI_API_KEY ? "on" : "off, built-in questions"}; Places: ${GOOGLE_KEY ? "on" : "off"})`));
