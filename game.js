// Shared game content: bilingual question packs per subject + rule-based fallback verdict.
// Loaded by server.js (CommonJS) and served to the browser as /game.js (attaches to window.YD).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.YD = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const QUESTIONS = [
    { id: "distance", en: { q: "The place is perfect. It's 25 minutes away. You:", s: "Nobody's judging. Everybody's judging." }, ar: { q: "المكان خرافي. بس بعيد ٢٥ دقيقة. إنت:", s: "ما حدا عم يحكم. الكل عم يحكم." },
      opts: [{ v: "5", ic: "🐌", en: "Suddenly have a headache", ar: "فجأة صار معي وجع راس" }, { v: "15", ic: "🚶", en: "Only if someone picks me up", ar: "بس إذا حدا بيمرق ياخدني" }, { v: "30", ic: "🚗", en: "Fine, I'll drive, stop crying", ar: "خلص بسوق أنا، بطّلوا بكي" }, { v: "any", ic: "✈️", en: "I'd cross the border for good food", ar: "بقطع الحدود مشان أكلة منيحة" }] },
    { id: "status", en: { q: "Tonight, your body is a…", s: "This decides who holds the car keys." }, ar: { q: "الليلة جسمك عبارة عن…", s: "هالسؤال بيحدد مين بيمسك المفاتيح." },
      opts: [{ v: "driving", ic: "🔑", en: "Temple. I'm the driver.", ar: "معبد. أنا السوّاق." }, { v: "drinking", ic: "🍹", en: "Nightclub. Open bar.", ar: "نايت كلوب. بار مفتوح.", alc: true }, { v: "sugar", ic: "🧋", en: "Candy shop. Sugar only.", ar: "دكان سكاكر. سكّر بس.", alc: false }, { v: "floating", ic: "☁️", en: "Cloud. Don't ask.", ar: "غيمة. لا تسأل." }, { v: "sober", ic: "🧃", en: "Courtroom. Sober & judging.", ar: "محكمة. صاحي وعم يحكم." }] },
    { id: "budget", en: { q: "The bill arrives. Your face:", s: "Anonymous. We promise. Kind of." }, ar: { q: "إجا الحساب. وجهك:", s: "مجهول. وعد. تقريباً." },
      opts: [{ v: "broke", ic: "🪙", en: "Suddenly in the bathroom", ar: "فجأة صرت بالحمام" }, { v: "normal", ic: "💳", en: "Calm. Split it. Adults.", ar: "هادي. نقسمو. ناس كبار." }, { v: "birthday", ic: "🎂", en: "Someone's birthday, they pay", ar: "عيد ميلاد حدا، هو بيدفع" }, { v: "unlimited", ic: "💸", en: "Keep the change. Buy a car.", ar: "خلي الباقي. اشتري سيارة." }] },
    { id: "mood", en: { q: "Pick your soundtrack for tonight:", s: "Not the group's. Yours." }, ar: { q: "اختار موسيقى الليلة:", s: "مش تبع الشلة. تبعك إنت." },
      opts: [{ v: "loud", ic: "🔊", en: "Bass you feel in your teeth", ar: "بيس بتحسو بسنانك" }, { v: "chill", ic: "🛋️", en: "Background jazz & gossip", ar: "جاز خفيف ونميمة" }, { v: "outdoor", ic: "🌴", en: "Waves, wind, no roof", ar: "موج وهوا وبلا سقف" }, { v: "dance", ic: "🪩", en: "Whatever makes me dance badly", ar: "أي شي بيخليني أرقص بشع" }] },
    { id: "hunger", en: { q: "Last time you ate was…", s: "Lying here is a crime against the group." }, ar: { q: "آخر مرة أكلت كانت…", s: "الكذب هون جريمة بحق الشلة." },
      opts: [{ v: "starving", ic: "🦁", en: "I don't remember. Feed me.", ar: "ما بتذكر. أطعموني." }, { v: "snack", ic: "🍟", en: "A sad sandwich at 3pm", ar: "سندويشة حزينة الساعة ٣" }, { v: "ate", ic: "😮‍💨", en: "Just now. I'm here for vibes.", ar: "هلق. جاي عالجو بس." }, { v: "dessert", ic: "🍰", en: "Saving room for dessert only", ar: "حافظ محل للحلو بس" }] },
    { id: "food", en: { q: "Genie grants one cuisine. No takebacks.", s: "The one you'd order alone at 2am." }, ar: { q: "الجني بيعطيك مطبخ واحد. بلا تراجع.", s: "اللي بتطلبو لحالك الساعة ٢ الصبح." },
      opts: [{ v: "levant", ic: "🥙", en: "Grills & hummus like teta's", ar: "مشاوي وحمص متل تيتا" }, { v: "asian", ic: "🍜", en: "Noodles, sushi, soy sauce chaos", ar: "نودلز وسوشي وفوضى صويا" }, { v: "burger", ic: "🍔", en: "Burger the size of my face", ar: "برغر قد وجهي" }, { v: "italian", ic: "🍕", en: "Pizza. Pasta. Carbs. Peace.", ar: "بيتزا. باستا. نشويات. سلام." }, { v: "any", ic: "🎲", en: "Surprise me, I trust the universe", ar: "فاجئني، واثق بالكون", wide: true }] },
    { id: "energy", en: { q: "Your battery right now:", s: "Phone battery doesn't count." }, ar: { q: "بطاريتك هلق:", s: "بطارية الموبايل ما بتنحسب." },
      opts: [{ v: "dead", ic: "🪦", en: "1%. Came out of guilt.", ar: "١٪. طلعت من الذنب." }, { v: "fine", ic: "🙂", en: "60%. Functional human.", ar: "٦٠٪. إنسان شغّال." }, { v: "wired", ic: "⚡", en: "100%. Had 3 coffees.", ar: "١٠٠٪. شربت ٣ قهوات." }, { v: "chaos", ic: "🔥", en: "Overcharged. Someone stop me.", ar: "فايض شحن. حدا يوقفني." }] },
    { id: "dealbreaker", en: { q: "You'd walk out of a place if…", s: "The hill you'll die on tonight." }, ar: { q: "بتطلع من المكان فوراً إذا…", s: "المبدأ اللي بتموت عليه الليلة." },
      opts: [{ v: "wait", ic: "⏳", en: "There's a queue. Any queue.", ar: "في دور. أي دور." }, { v: "noise", ic: "🙉", en: "I have to shout to be heard", ar: "لازم أصرّخ ليسمعوني" }, { v: "shisha", ic: "💨", en: "Shisha smoke hits my face", ar: "دخان الأرجيلة بوجهي" }, { v: "dress", ic: "👔", en: "They judge my sneakers", ar: "بيحكموا على سنيكرزاتي" }, { v: "none", ic: "😇", en: "Nothing. I'm easy. Suspicious.", ar: "ولا شي. أنا سهل. مريب.", wide: true }] },
    { id: "time", en: { q: "Be honest. You're home by…", s: "Your mom is not reading this." }, ar: { q: "كون صريح. برجع عالبيت الساعة…", s: "إمك مش عم تقرا هاد." },
      opts: [{ v: "1h", ic: "⏱️", en: "One hour. I have a life.", ar: "ساعة. عندي حياة." }, { v: "3h", ic: "🌙", en: "Midnight, like a civilized person", ar: "نص الليل، متل الناس المحترمة" }, { v: "late", ic: "🌃", en: "When they stack the chairs", ar: "لما يرفعوا الكراسي" }, { v: "sunrise", ic: "🌅", en: "Sunrise. Breakfast is on me.", ar: "طلوع الشمس. الفطور عليّ." }] },
    { id: "drink", alc: true, en: { q: "First order at the bar:", s: "Your order, not the table's." }, ar: { q: "أول طلب عالبار:", s: "طلبك إنت، مش طلب الطاولة." },
      opts: [{ v: "cocktails", ic: "🍸", en: "Something pink with an umbrella", ar: "شي زهر مع شمسية" }, { v: "beer", ic: "🍺", en: "Cold beer, zero drama", ar: "بيرة باردة وبلا دراما" }, { v: "wine", ic: "🍷", en: "Wine. I'm classy tonight.", ar: "نبيذ. أنا كلاسي الليلة." }, { v: "shots", ic: "🥃", en: "Shots. Round for the table.", ar: "شوتات. جولة للطاولة." }] },
    { id: "drink", alc: false, en: { q: "What's in your cup tonight?", s: "Caffeine is a personality trait." }, ar: { q: "شو بكاستك الليلة؟", s: "الكافيين سمة شخصية." },
      opts: [{ v: "coffee", ic: "☕", en: "Coffee. At 10pm. Fight me.", ar: "قهوة. الساعة ١٠ بالليل. تعا نتخانق." }, { v: "tea", ic: "🫖", en: "Karak and deep talks", ar: "كرك وحكي عميق" }, { v: "mocktail", ic: "🍹", en: "Fancy mocktail with a fancy name", ar: "موكتيل فخم باسم فخم" }, { v: "juice", ic: "🧃", en: "Fresh juice, I'm healthy now", ar: "عصير طازة، صرت صحي" }] },
    { id: "setting", subj: ["drinks", "night"], en: { q: "Close your eyes. Where are you standing?", s: "Open them. Pick." }, ar: { q: "سكّر عيونك. وين واقف؟", s: "افتحهن. اختار." },
      opts: [{ v: "rooftop", ic: "🌆", en: "Rooftop, skyline, overpriced", ar: "روف توب، منظر، وغالي ع الفاضي" }, { v: "beach", ic: "🏖️", en: "Beach club, sand in my shoes", ar: "بيتش كلوب، رمل بصباطي" }, { v: "lounge", ic: "🛋️", en: "Dark lounge, deep sofa", ar: "لاونج معتم وكنباية غرقانة" }, { v: "pub", ic: "🎸", en: "Pub with a band that's… trying", ar: "بَب مع فرقة… عم تحاول" }] },
    { id: "setting", subj: ["talk"], en: { q: "Perfect spot for a 3-hour conversation:", s: "Where nobody tells you to leave." }, ar: { q: "أحسن مكان لحكي ٣ ساعات:", s: "وين ما حدا بيقلك فل." },
      opts: [{ v: "cafe", ic: "☕", en: "Café, one coffee, three refills", ar: "كافيه، قهوة وحدة، تلات ريفيلات" }, { v: "shisha", ic: "💨", en: "Shisha lounge, gossip in the smoke", ar: "أرجيلة ونميمة بالدخان" }, { v: "home", ic: "🏠", en: "Someone's couch, someone's snacks", ar: "كنباية حدا، سناكات حدا" }, { v: "park", ic: "🌳", en: "Beach walk, pretend we exercise", ar: "مشي عالبحر، نتظاهر إنو رياضة" }] },
    { id: "style", en: { q: "Brunch style?", s: "This is 90% of the decision." }, ar: { q: "نوع البرانش؟", s: "هيدا ٩٠٪ من القرار." },
      opts: [{ v: "buffet", ic: "🍽️", en: "Buffet. Plate number 4.", ar: "بوفيه. الصحن الرابع." }, { v: "alacarte", ic: "🥞", en: "À la carte, like a grown-up", ar: "آ لا كارت، متل الكبار" }, { v: "bottomless", ic: "🥂", en: "Bottomless. Cancel tomorrow.", ar: "بوتوملس. لغّي بكرا.", alc: true }, { v: "healthy", ic: "🥑", en: "Avocado toast & self-respect", ar: "أفوكادو توست واحترام ذات" }] },
    { id: "slot", en: { q: "Weekend wake-up time. Honestly.", s: "Your alarm is not a witness." }, ar: { q: "إيمتى بتفيق بالويكند؟ بصراحة.", s: "المنبه مش شاهد." },
      opts: [{ v: "early", ic: "🌤️", en: "Early. I'm a psychopath.", ar: "بكير. أنا مريض نفسي." }, { v: "noon", ic: "☀️", en: "Noon-ish. Normal.", ar: "حوالي الظهر. طبيعي." }, { v: "late", ic: "🕑", en: "2pm, in pajamas, no regrets", ar: "٢ الظهر، ببيجاما، بلا ندم" }, { v: "evening", ic: "🌇", en: "Evening brunch is still brunch", ar: "برانش المسا برضو برانش" }] },
    { id: "type", en: { q: "Pick your Saturday superpower:", s: "What you'd DO, not what sounds cool." }, ar: { q: "اختار قوتك الخارقة للسبت:", s: "اللي بتعملو، مش اللي بيبين حلو." },
      opts: [{ v: "cinema", ic: "🎬", en: "Sit in the dark with popcorn", ar: "قعدة بالعتمة مع بوشار" }, { v: "games", ic: "🎳", en: "Bowling / karaoke, humiliation", ar: "بولينغ / كاريوكي، إذلال" }, { v: "sport", ic: "🏓", en: "Padel, then complain about padel", ar: "بادل، وبعدين نتذمر من البادل" }, { v: "outdoor", ic: "🏜️", en: "Desert / kayak, pretend adventurer", ar: "صحرا / كاياك، مغامر مزيف" }, { v: "live", ic: "🎤", en: "Comedy show, laugh at strangers", ar: "كوميديا، نضحك على غرباء", wide: true }] },
    { id: "sweat", en: { q: "Acceptable sweat level tonight:", s: "Be realistic about your outfit." }, ar: { q: "مستوى التعرّق المقبول الليلة:", s: "كون واقعي بلبسك." },
      opts: [{ v: "none", ic: "🧊", en: "Zero. I did my hair.", ar: "صفر. عملت شعري." }, { v: "little", ic: "😅", en: "A glow, not a swamp", ar: "لمعة خفيفة، مش مستنقع" }, { v: "lot", ic: "💦", en: "Soak me. I'm here to suffer.", ar: "غرّقني. جاي أتعذب." }, { v: "any", ic: "🤷", en: "Don't care, didn't shower anyway", ar: "ما بفرق، ما تحممت أصلاً" }] },
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
