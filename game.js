// Shared game content: bilingual question packs per subject + rule-based fallback verdict.
// Loaded by server.js (CommonJS) and served to the browser as /game.js (attaches to window.YD).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.YD = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const QUESTIONS = [
    { id: "distance", en: { q: "How far are you willing to drag yourself?", s: "Be honest. We all know you." }, ar: { q: "قديش مستعد تجرّ حالك؟", s: "كون صريح. كلنا منعرفك." },
      opts: [{ v: "5", ic: "🐌", en: "5 min, max", ar: "٥ دقايق، أكتر لأ" }, { v: "15", ic: "🚶", en: "15 min", ar: "١٥ دقيقة" }, { v: "30", ic: "🚗", en: "30 min", ar: "٣٠ دقيقة" }, { v: "any", ic: "✈️", en: "I'd fly for it", ar: "بطير مشان هيك" }] },
    { id: "status", en: { q: "Your status tonight?", s: "This decides who gets the car keys." }, ar: { q: "شو وضعك الليلة؟", s: "هالشي بيحدد مين بياخد المفاتيح." },
      opts: [{ v: "driving", ic: "🔑", en: "Driving", ar: "سايق" }, { v: "drinking", ic: "🍹", en: "Drinking", ar: "شارب", alc: true }, { v: "sugar", ic: "🧋", en: "Sugar high", ar: "عالسكّر", alc: false }, { v: "floating", ic: "☁️", en: "Floating", ar: "طاير" }, { v: "sober", ic: "🧃", en: "Sober & judging", ar: "صاحي وعم يحكم" }] },
    { id: "budget", en: { q: "Budget?", s: "Nobody will know it was you." }, ar: { q: "الميزانية؟", s: "ما حدا رح يعرف إنو إنت." },
      opts: [{ v: "broke", ic: "🪙", en: "Broke", ar: "مفلّس" }, { v: "normal", ic: "💳", en: "Normal", ar: "عادي" }, { v: "birthday", ic: "🎂", en: "Someone's birthday", ar: "عيد ميلاد حدا" }, { v: "unlimited", ic: "💸", en: "Money isn't real", ar: "المصاري مش حقيقية" }] },
    { id: "mood", en: { q: "What's the mood?", s: "The one you'd enjoy, not the one for the group." }, ar: { q: "شو المود؟", s: "اللي بتنبسط فيه إنت، مش اللي مشان الشلة." },
      opts: [{ v: "loud", ic: "🔊", en: "Loud & buzzing", ar: "صوت وحياة" }, { v: "chill", ic: "🛋️", en: "Chill & talk", ar: "هدوء وحكي" }, { v: "outdoor", ic: "🌴", en: "Outdoors", ar: "برّا" }, { v: "dance", ic: "🪩", en: "Dancing", ar: "رقص" }] },
    { id: "hunger", en: { q: "Hunger level?", s: "Scientifically measured." }, ar: { q: "مستوى الجوع؟", s: "مقاس علمياً." },
      opts: [{ v: "starving", ic: "🦁", en: "Starving", ar: "ميت جوع" }, { v: "snack", ic: "🍟", en: "Snack-ish", ar: "شي خفيف" }, { v: "ate", ic: "😮‍💨", en: "Already ate", ar: "أكلت خلص" }, { v: "dessert", ic: "🍰", en: "Dessert only", ar: "بس حلو" }] },
    { id: "food", en: { q: "If food, which kind?", s: "The one you'd pick alone." }, ar: { q: "إذا أكل، شو نوع؟", s: "اللي بتختارو لو لحالك." },
      opts: [{ v: "levant", ic: "🥙", en: "Levantine / grills", ar: "شامي / مشاوي" }, { v: "asian", ic: "🍜", en: "Asian", ar: "آسيوي" }, { v: "burger", ic: "🍔", en: "Burgers / fast", ar: "برغر / سريع" }, { v: "italian", ic: "🍕", en: "Italian", ar: "إيطالي" }, { v: "any", ic: "🎲", en: "Surprise me", ar: "فاجئني", wide: true }] },
    { id: "energy", en: { q: "Energy right now?", s: "Not what you wish it was." }, ar: { q: "طاقتك هلق؟", s: "مش اللي بتتمناها." },
      opts: [{ v: "dead", ic: "🪦", en: "Dead inside", ar: "ميت من جوّا" }, { v: "fine", ic: "🙂", en: "Fine", ar: "ماشي الحال" }, { v: "wired", ic: "⚡", en: "Wired", ar: "مشحون" }, { v: "chaos", ic: "🔥", en: "Chaos mode", ar: "وضع الفوضى" }] },
    { id: "dealbreaker", en: { q: "One deal-breaker?", s: "The thing that makes you leave early." }, ar: { q: "شي واحد ما بتتحمّلو؟", s: "الشي اللي بيخليك تمشي بكير." },
      opts: [{ v: "wait", ic: "⏳", en: "Waiting in line", ar: "الانتظار بالدور" }, { v: "noise", ic: "🙉", en: "Can't hear anyone", ar: "ما بسمع حدا" }, { v: "shisha", ic: "💨", en: "Shisha smoke", ar: "دخان الأرجيلة" }, { v: "dress", ic: "👔", en: "Dress code", ar: "دريس كود" }, { v: "none", ic: "😇", en: "Nothing, I'm easy", ar: "ولا شي، أنا سهل", wide: true }] },
    { id: "time", en: { q: "How long is this night?", s: "Realistically." }, ar: { q: "قديش بدها تطوّل الليلة؟", s: "بالواقع." },
      opts: [{ v: "1h", ic: "⏱️", en: "1 hour then home", ar: "ساعة وبعدين عالبيت" }, { v: "3h", ic: "🌙", en: "A proper evening", ar: "سهرة محترمة" }, { v: "late", ic: "🌃", en: "Until it's late", ar: "لحد ما يتأخر" }, { v: "sunrise", ic: "🌅", en: "Sunrise", ar: "لطلوع الشمس" }] },
    { id: "drink", alc: true, en: { q: "What are you drinking?", s: "Your order, not the table's." }, ar: { q: "شو عم تشرب؟", s: "طلبك إنت، مش طلب الطاولة." },
      opts: [{ v: "cocktails", ic: "🍸", en: "Cocktails", ar: "كوكتيل" }, { v: "beer", ic: "🍺", en: "Beer", ar: "بيرة" }, { v: "wine", ic: "🍷", en: "Wine", ar: "نبيذ" }, { v: "shots", ic: "🥃", en: "Shots. Many.", ar: "شوتات. كتير." }] },
    { id: "drink", alc: false, en: { q: "What are you drinking?", s: "Caffeine counts as a personality." }, ar: { q: "شو عم تشرب؟", s: "الكافيين بينحسب شخصية." },
      opts: [{ v: "coffee", ic: "☕", en: "Coffee", ar: "قهوة" }, { v: "tea", ic: "🫖", en: "Tea / karak", ar: "شاي / كرك" }, { v: "mocktail", ic: "🍹", en: "Mocktails", ar: "موكتيل" }, { v: "juice", ic: "🧃", en: "Fresh juice", ar: "عصير طازة" }] },
    { id: "setting", subj: ["drinks", "night"], en: { q: "Where do you see yourself?", s: "Close your eyes. Open them. Pick." }, ar: { q: "وين شايف حالك؟", s: "سكّر عيونك. افتحهن. اختار." },
      opts: [{ v: "rooftop", ic: "🌆", en: "Rooftop", ar: "روف توب" }, { v: "beach", ic: "🏖️", en: "Beach club", ar: "بيتش كلوب" }, { v: "lounge", ic: "🛋️", en: "Lounge", ar: "لاونج" }, { v: "pub", ic: "🎸", en: "Pub / live music", ar: "بَب / موسيقى حية" }] },
    { id: "setting", subj: ["talk"], en: { q: "The perfect spot for talking?", s: "Where the conversation flows." }, ar: { q: "أحسن مكان للحكي؟", s: "وين الحكي بيمشي لحالو." },
      opts: [{ v: "cafe", ic: "☕", en: "Café", ar: "كافيه" }, { v: "shisha", ic: "💨", en: "Shisha lounge", ar: "أرجيلة" }, { v: "home", ic: "🏠", en: "Someone's place", ar: "بيت حدا" }, { v: "park", ic: "🌳", en: "Park / beach walk", ar: "حديقة / مشي عالبحر" }] },
    { id: "style", en: { q: "Brunch style?", s: "This is the whole decision, honestly." }, ar: { q: "نوع البرانش؟", s: "هيدا كل القرار بصراحة." },
      opts: [{ v: "buffet", ic: "🍽️", en: "Big buffet", ar: "بوفيه كبير" }, { v: "alacarte", ic: "🥞", en: "À la carte", ar: "آ لا كارت" }, { v: "bottomless", ic: "🥂", en: "Bottomless", ar: "بوتوملس", alc: true }, { v: "healthy", ic: "🥑", en: "Healthy-ish", ar: "صحي نوعاً ما" }] },
    { id: "slot", en: { q: "When do you actually wake up?", s: "No lying on a weekend." }, ar: { q: "إيمتى بتفيق بالحقيقة؟", s: "ممنوع الكذب بالويكند." },
      opts: [{ v: "early", ic: "🌤️", en: "Early bird (11)", ar: "بكير (١١)" }, { v: "noon", ic: "☀️", en: "Noon-ish", ar: "حوالي الظهر" }, { v: "late", ic: "🕑", en: "Late brunch (2+)", ar: "برانش متأخر (٢+)" }, { v: "evening", ic: "🌇", en: "Evening brunch", ar: "برانش مسائي" }] },
    { id: "type", en: { q: "What kind of thing?", s: "What you'd do, not what sounds cool." }, ar: { q: "شو نوع الشي؟", s: "اللي بتعملو، مش اللي بيبين حلو." },
      opts: [{ v: "cinema", ic: "🎬", en: "Cinema", ar: "سينما" }, { v: "games", ic: "🎳", en: "Games / bowling / karaoke", ar: "ألعاب / بولينغ / كاريوكي" }, { v: "sport", ic: "🏓", en: "Padel / sports", ar: "بادل / رياضة" }, { v: "outdoor", ic: "🏜️", en: "Desert / beach / kayak", ar: "صحرا / بحر / كاياك" }, { v: "live", ic: "🎤", en: "Live show / comedy", ar: "عرض حي / كوميديا", wide: true }] },
    { id: "sweat", en: { q: "How much sweating is acceptable?", s: "Be realistic about your outfit." }, ar: { q: "قديش تعرّق مقبول؟", s: "كون واقعي بلبسك." },
      opts: [{ v: "none", ic: "🧊", en: "Zero", ar: "صفر" }, { v: "little", ic: "😅", en: "A little", ar: "شوي" }, { v: "lot", ic: "💦", en: "Bring it", ar: "هات ما عندك" }, { v: "any", ic: "🤷", en: "Don't care", ar: "ما بفرق" }] },
  ];
  const PACKS = {
    food: ["distance", "status", "budget", "mood", "hunger", "food", "energy", "dealbreaker", "time"],
    drinks: ["distance", "status", "budget", "mood", "drink", "setting", "energy", "dealbreaker", "time"],
    talk: ["distance", "status", "budget", "drink", "setting", "hunger", "energy", "dealbreaker", "time"],
    brunch: ["distance", "status", "budget", "style", "slot", "food", "mood", "dealbreaker"],
    activity: ["distance", "status", "budget", "type", "sweat", "mood", "energy", "hunger", "time"],
    night: ["distance", "status", "budget", "drink", "setting", "mood", "energy", "dealbreaker", "time"],
  };
  function packFor(subject, alcohol) {
    return (PACKS[subject] || PACKS.food).map(id => {
      const q = QUESTIONS.find(q => q.id === id && (!q.subj || q.subj.includes(subject)) && (q.alc === undefined || q.alc === !!alcohol)) || QUESTIONS.find(q => q.id === id);
      return { ...q, opts: q.opts.filter(o => o.alc === undefined || o.alc === !!alcohol) };
    });
  }
  function ruleVerdict(room) {
    const P = room.players, n = P.length, count = (id, v) => P.filter(p => p.answers[id] === v).length;
    const maxMin = Math.min(...P.map(p => ({ "5": 5, "15": 15, "30": 30, any: 60 }[p.answers.distance] || 30)));
    const broke = count("budget", "broke") > 0, hungry = count("hunger", "starving") + count("hunger", "snack") >= n / 2;
    const chill = count("mood", "chill") >= count("mood", "loud") + count("mood", "dance"), noShisha = count("dealbreaker", "shisha") > 0;
    const food = ["levant", "asian", "burger", "italian"].map(v => [v, count("food", v)]).sort((a, b) => b[1] - a[1])[0][0];
    const area = room.area || "Dubai";
    const cat = { levant: { en: "Levantine grill house", ar: "مطعم مشاوي شامي" }, asian: { en: "Casual Asian spot", ar: "مطعم آسيوي بسيط" }, burger: { en: "Burger joint", ar: "محل برغر" }, italian: { en: "Pizza & pasta", ar: "بيتزا وباستا" } }[food];
    const picks = [];
    const bySubject = {
      food: () => picks.push({ name: `${cat.en} near ${area}`, type: cat, why: { en: `${hungry ? "Most of you are hungry and " : ""}${food} won the secret vote.${broke ? " Budget-friendly, nobody has to pretend." : ""}`, ar: `${hungry ? "أكتركم جوعان و" : ""}${cat.ar} ربح التصويت السري.${broke ? " عالميزانية، ما حدا بدو يتصنّع." : ""}` }, minutes: Math.min(maxMin, 15), price: broke ? "$" : "$$" }),
      drinks: () => picks.push({ name: `${room.alcohol ? "Rooftop bar" : "Mocktail lounge"} within ${maxMin} min of ${area}`, type: { en: room.alcohol ? "Rooftop" : "Lounge", ar: room.alcohol ? "روف توب" : "لاونج" }, why: { en: "Fits everyone's distance limit and the loudest mood in the room.", ar: "مناسب لمسافة الكل وللمود الأعلى صوت بالغرفة." }, minutes: maxMin, price: "$$$" }),
      talk: () => picks.push({ name: noShisha ? `Quiet café in ${area}` : `Shisha lounge terrace near ${area}`, type: { en: "Sit & talk", ar: "قعدة وحكي" }, why: { en: "Low volume, long conversation, nobody shouting.", ar: "صوت واطي، حكي طويل، ما حدا عم يصرّخ." }, minutes: Math.min(maxMin, 10), price: "$" }),
      brunch: () => picks.push({ name: `${count("style", "buffet") ? "Big buffet brunch" : "À la carte brunch"} near ${area}`, type: { en: "Brunch", ar: "برانش" }, why: { en: "Matches the most popular style and the group's real wake-up time.", ar: "بيناسب النوع الأكتر شعبية ووقت الفيقة الحقيقي للشلة." }, minutes: Math.min(maxMin, 20), price: "$$" }),
      activity: () => picks.push({ name: { cinema: "Cinema + dinner", games: "Bowling / karaoke night", sport: "Padel court session", outdoor: "Desert or kayak trip", live: "Comedy night" }[["cinema", "games", "sport", "outdoor", "live"].map(v => [v, count("type", v)]).sort((a, b) => b[1] - a[1])[0][0]] + ` near ${area}`, type: { en: "Activity", ar: "نشاط" }, why: { en: "The activity most of you secretly picked.", ar: "النشاط اللي أكتركم اختارو بالسر." }, minutes: maxMin, price: "$$" }),
      night: () => picks.push({ name: `Lively ${room.alcohol ? "bar" : "lounge"} with music near ${area}`, type: { en: "Night out", ar: "سهرة" }, why: { en: "The group wants noise. Someone wants to dance. Both covered.", ar: "الشلة بدها صوت. حدا بدو يرقص. التنين مغطيين." }, minutes: maxMin, price: "$$$" }),
    };
    (bySubject[room.subject] || bySubject.food)();
    picks.push(chill ? { name: noShisha ? `Quiet café / dessert place in ${area}` : `Shisha lounge terrace near ${area}`, type: { en: "Chill & talk", ar: "هدوء وحكي" }, why: { en: "The chill crowd outnumbers the loud crowd tonight.", ar: "جماعة الهدوء أكتر من جماعة الصوت الليلة." }, minutes: Math.min(maxMin, 10), price: "$" }
      : { name: `Lively rooftop / live-music spot within ${maxMin} min of ${area}`, type: { en: "Loud & buzzing", ar: "صوت وحياة" }, why: { en: "The group wants noise. Someone wants to dance. Give them both.", ar: "الشلة بدها صوت. حدا بدو يرقص. اعطيهم التنين." }, minutes: maxMin, price: "$$$" });
    picks.push({ name: count("mood", "outdoor") ? "Beach walk or JBR / Marina promenade" : "Board-game café or karaoke room", type: { en: "Wildcard", ar: "خيار مجنون" }, why: { en: "The option nobody suggested but nobody can veto with a straight face.", ar: "الخيار اللي ما حدا اقترحو بس ما حدا بيقدر يرفضو بوجه جدّي." }, minutes: Math.min(maxMin, 20), price: "$" });
    const roasts = P.map(p => { const a = p.answers;
      const r = a.distance === "5" ? { en: "would cancel if the venue is on the other side of the street.", ar: "بيلغي إذا المكان عالطرف التاني من الشارع." }
        : a.budget === "unlimited" ? { en: "is paying tonight. Pass it on.", ar: "عم يدفع الليلة. خبّروا الكل." }
        : a.energy === "dead" ? { en: "came only because leaving the house was already too much effort.", ar: "إجا بس لأنو الطلعة من البيت كانت أصلاً مجهود." }
        : a.time === "sunrise" ? { en: "has no plans tomorrow and wants you to know it.", ar: "ما عندو شي بكرا وبدو الكل يعرف." }
        : a.hunger === "dessert" ? { en: "skipped dinner to be emotionally available for dessert.", ar: "تخطّى العشا ليكون جاهز عاطفياً للحلو." }
        : { en: "answered like a diplomat. Suspicious.", ar: "جاوب متل الدبلوماسيين. مريب." };
      return { player: p.name, ...r }; });
    const dr = P.find(p => p.answers.status === "driving");
    return { headline: null, picks: picks.slice(0, 3), roasts, driver: dr ? dr.name : null };
  }
  return { QUESTIONS, PACKS, packFor, ruleVerdict };
});
