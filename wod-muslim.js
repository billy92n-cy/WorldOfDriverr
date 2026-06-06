/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WORLD OF DRIVER — MODULE MUSLIM  v1.0                      ║
 * ║  Qibla · Prières · Hadith Nawawi · Design Premium           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
"use strict";

// ══════════════════════════════════════════════════════════════
//  CONSTANTES
// ══════════════════════════════════════════════════════════════
const KAABA = { lat: 21.4225, lon: 39.8262 };
const PRAYER_NAMES = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const PRAYER_ICONS = ['🌙','☀️','🌤️','🌅','🌑'];

// ══════════════════════════════════════════════════════════════
//  ADHAN.JS — Calcul des horaires de prière (implémentation locale)
//  Méthode Muslim World League (MWL) — angle Fajr 18°, Isha 17°
// ══════════════════════════════════════════════════════════════
const AdhanCalc = (() => {
  const DEG = Math.PI / 180;

  function julianDay(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    const D  = jd - 2451545.0;
    const g  = (357.529 + 0.98560028 * D) % 360;
    const q  = (280.459 + 0.98564736 * D) % 360;
    const L  = (q + 1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG)) % 360;
    const e  = 23.439 - 0.00000036 * D;
    const RA = Math.atan2(Math.cos(e * DEG) * Math.sin(L * DEG), Math.cos(L * DEG)) / DEG;
    const d  = Math.asin(Math.sin(e * DEG) * Math.sin(L * DEG)) / DEG;
    const EqT= q / 15 - ((RA < 0 ? RA + 360 : RA) / 15);
    return { dec: d, eqt: EqT };
  }

  // ─── Angle horaire ─────────────────────────────────────────────
  // Formule correcte : cos(H) = (sin(a) - sin(lat)·sin(dec)) / (cos(lat)·cos(dec))
  // a = altitude (négatif = sous l'horizon, ex: -0.833° pour lever/coucher)
  function hourAngle(lat, dec, angle) {
    const num = Math.sin(angle * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG);
    const den = Math.cos(lat * DEG) * Math.cos(dec * DEG);
    if (Math.abs(num / den) > 1) return null;
    return Math.acos(num / den) / DEG;
  }

  // ─── Angle pour Asr ────────────────────────────────────────────
  function asrAngle(lat, dec, shadow) {
    const target = Math.atan(1 / (shadow + Math.tan(Math.abs(lat - dec) * DEG)));
    const num = Math.sin(target) - Math.sin(lat * DEG) * Math.sin(dec * DEG);
    const den = Math.cos(lat * DEG) * Math.cos(dec * DEG);
    if (Math.abs(num / den) > 1) return null;
    return Math.acos(num / den) / DEG;
  }

  // ─── Conversion heure solaire UTC → objet Date ─────────────────
  // hourUTC est en heures décimales depuis minuit UTC du jour julien jd
  function toDate(jd, hourUTC) {
    const ms = (jd - 2440587.5) * 86400000 + hourUTC * 3600000;
    return new Date(ms);
  }

  return {
    // Calcule les horaires pour lat/lon à la date locale donnée
    calculate(lat, lon, date) {
      const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
      const jd = julianDay(y, m, d);
      const { dec, eqt } = sunPosition(jd);

      // Heure UTC du midi solaire
      const noon = 12 - lon / 15 - eqt;

      const ha_fajr = hourAngle(lat, dec, -18);
      const ha_rise = hourAngle(lat, dec, -0.833);
      const ha_asr  = asrAngle(lat, dec, 1);
      const ha_sset = hourAngle(lat, dec, -0.833);
      const ha_isha = hourAngle(lat, dec, -17);

      // Fallback 1/7 de nuit pour latitudes élevées en été (Fajr/Isha indéfinis)
      let fajrDate, ishaDate;
      if (ha_fajr && ha_isha) {
        fajrDate = toDate(jd, noon - ha_fajr / 15);
        ishaDate = toDate(jd, noon + ha_isha / 15);
      } else {
        // Calculer la durée de la nuit (coucher → lever) pour le fallback
        const sunriseUTC = ha_rise ? noon - ha_rise / 15 : noon - 6;
        const sunsetUTC  = ha_sset ? noon + ha_sset / 15 : noon + 6;
        const nightDur   = 24 - (sunsetUTC - sunriseUTC);
        fajrDate = toDate(jd, sunriseUTC - nightDur / 7);
        ishaDate = toDate(jd, sunsetUTC  + nightDur / 7);
      }

      return {
        Fajr:    fajrDate,
        Sunrise: ha_rise ? toDate(jd, noon - ha_rise / 15) : null,
        Dhuhr:   toDate(jd, noon + 0.05),
        Asr:     ha_asr  ? toDate(jd, noon + ha_asr  / 15) : null,
        Maghrib: ha_sset ? toDate(jd, noon + ha_sset / 15) : null,
        Isha:    ishaDate,
      };
    }
  };
})();

// ══════════════════════════════════════════════════════════════
//  HADITHS NAWAWI — 42 textes complets
// ══════════════════════════════════════════════════════════════
const HADITHS_NAWAWI = [
  {
    num: 1,
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    french: "Les actes ne valent que par les intentions, et chaque homme n'obtient que ce qu'il a eu comme intention.",
    narrator: "Omar ibn al-Khattab (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Ce hadith fondateur rappelle que la valeur de chaque action dépend de l'intention qui l'anime. Travailler pour nourrir sa famille avec sincérité est un acte d'adoration."
  },
  {
    num: 2,
    arabic: "الإِسْلَامُ أَنْ تَشْهَدَ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَنَّ مُحَمَّداً رَسُولُ اللَّهِ",
    french: "L'islam, c'est témoigner qu'il n'y a de Dieu qu'Allah et que Muhammad est Son messager, accomplir la prière, acquitter la Zakat, faire le pèlerinage à la Maison et jeûner le Ramadan.",
    narrator: "Omar ibn al-Khattab (ra)",
    source: "Muslim",
    tafsir: "Ce hadith décrit les cinq piliers de l'islam. Il distingue également l'islam (soumission extérieure), l'iman (foi intérieure) et l'ihsan (excellence spirituelle)."
  },
  {
    num: 3,
    arabic: "بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ",
    french: "L'islam est bâti sur cinq piliers : le témoignage de foi, la prière, la Zakat, le pèlerinage et le jeûne du Ramadan.",
    narrator: "Ibn Omar (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Les cinq piliers constituent la charpente de la vie du musulman. Comme les piliers d'une maison, chacun est indispensable à l'équilibre de l'ensemble."
  },
  {
    num: 4,
    arabic: "إِنَّ أَحَدَكُمْ يُجْمَعُ خَلْقُهُ فِي بَطْنِ أُمِّهِ أَرْبَعِينَ يَوْماً نُطْفَةً",
    french: "Chacun de vous est rassemblé dans le ventre de sa mère en tant que goutte pendant 40 jours, puis en caillot de sang pendant autant, puis en amas de chair pendant autant, puis l'ange lui insuffle l'esprit.",
    narrator: "Abdallah ibn Masoud (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Ce hadith décrit l'origine de l'être humain et rappelle que la destinée est écrite avant la naissance. Cela invite à la confiance en Allah et à la sérénité face aux épreuves."
  },
  {
    num: 5,
    arabic: "مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ مِنْهُ فَهُوَ رَدٌّ",
    french: "Quiconque introduit dans notre affaire (la religion) quelque chose qui n'en fait pas partie, cela lui est rejeté.",
    narrator: "Aïcha (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Ce hadith met en garde contre les innovations non fondées (bid'a). Il rappelle que la religion est complète et parfaite, et que toute déformation altère son essence."
  },
  {
    num: 6,
    arabic: "إِنَّ الحَلَالَ بَيِّنٌ، وَإِنَّ الحَرَامَ بَيِّنٌ، وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ",
    french: "Le licite est clair et l'illicite est clair. Entre les deux, il y a des affaires douteuses que beaucoup de gens ne connaissent pas. Celui qui se préserve de ces doutes préserve sa religion et son honneur.",
    narrator: "An-Nu'man ibn Bachir (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Le croyant sage évite non seulement l'interdit mais aussi ce qui est proche du doute, comme le berger qui ne fait pas paître son troupeau près d'un enclos privé."
  },
  {
    num: 7,
    arabic: "الدِّينُ النَّصِيحَةُ",
    french: "La religion c'est la sincérité.",
    narrator: "Tamim ad-Dari (ra)",
    source: "Muslim",
    tafsir: "En trois mots, le Prophète ﷺ résume l'essence de la foi : la sincérité envers Allah, Son Livre, Son Messager, les dirigeants musulmans et l'ensemble des croyants."
  },
  {
    num: 8,
    arabic: "أُمِرْتُ أَنْ أُقَاتِلَ النَّاسَ حَتَّى يَشْهَدُوا أَنْ لَا إِلَهَ إِلَّا اللَّهُ",
    french: "J'ai reçu l'ordre de combattre les gens jusqu'à ce qu'ils témoignent qu'il n'y a de Dieu qu'Allah et que Muhammad est Son messager, accomplissent la prière et acquittent la Zakat.",
    narrator: "Ibn Omar (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Ce hadith concerne le contexte militaire des débuts de l'islam. Il souligne que la foi se manifeste par des actes concrets : prière et aumône légale."
  },
  {
    num: 9,
    arabic: "مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ، وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ",
    french: "Ce que je vous ai interdit, évitez-le. Ce que je vous ai commandé, faites-en ce que vous pouvez.",
    narrator: "Abu Hurayra (ra)",
    source: "Bukhari & Muslim",
    tafsir: "L'islam est une religion de facilité. Les interdictions sont absolues, mais les obligations s'accomplissent selon les capacités. Allah ne charge personne au-delà de ses forces."
  },
  {
    num: 10,
    arabic: "إِنَّ اللَّهَ طَيِّبٌ لَا يَقْبَلُ إِلَّا طَيِّباً",
    french: "Allah est bon et n'accepte que ce qui est bon. Allah a ordonné aux croyants ce qu'Il a ordonné aux messagers : 'Ô messagers, mangez de ce qui est licite et agissez avec droiture.'",
    narrator: "Abu Hurayra (ra)",
    source: "Muslim",
    tafsir: "Ce hadith invite à ne consommer que du licite (halal et pur). L'homme dont la nourriture, le vêtement et la subsistance sont illicites verra ses supications non exaucées."
  },
  {
    num: 11,
    arabic: "دَعْ مَا يَرِيبُكَ إِلَى مَا لَا يَرِيبُكَ",
    french: "Laisse ce qui te doute au profit de ce qui ne te doute pas.",
    narrator: "Al-Hassan ibn Ali (ra)",
    source: "Tirmidhi & Nasai",
    tafsir: "La conscience du croyant est un guide précieux. Face au doute, le sage choisit la certitude. Cette règle s'applique aux transactions, aux nourritures et aux relations."
  },
  {
    num: 12,
    arabic: "مِنْ حُسْنِ إِسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ",
    french: "Parmi les qualités de l'excellence en islam de quelqu'un, il y a le fait de délaisser ce qui ne le concerne pas.",
    narrator: "Abu Hurayra (ra)",
    source: "Tirmidhi",
    tafsir: "Éviter les futilités — discussions inutiles, curiosité malsaine, commérages — est un signe de maturité spirituelle. Le temps est une amanah (dépôt)."
  },
  {
    num: 13,
    arabic: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    french: "Aucun d'entre vous ne croit vraiment tant qu'il n'aime pas pour son frère ce qu'il aime pour lui-même.",
    narrator: "Anas ibn Malik (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Ce hadith place la fraternité au cœur de la foi. L'envie et la jalousie sont incompatibles avec un iman authentique. La générosité de cœur est une marque de perfection."
  },
  {
    num: 14,
    arabic: "لَا يَحِلُّ دَمُ امْرِئٍ مُسْلِمٍ إِلَّا بِإِحْدَى ثَلَاثٍ",
    french: "Le sang d'un musulman n'est licite que dans trois cas : le meurtrier, le marié adultère, et celui qui abandonne sa religion en se séparant de la communauté.",
    narrator: "Ibn Masoud (ra)",
    source: "Bukhari & Muslim",
    tafsir: "Ce hadith protège la vie humaine. Il restreint la peine capitale à des cas extrêmes jugés par une autorité légale, et rappelle la sacralité de la vie en islam."
  },
  {
    num: 15,
    arabic: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْراً أَوْ لِيَصْمُتْ",
    french: "Que celui qui croit en Allah et au Jour Dernier dise du bien ou se taise. Que celui qui croit en Allah et au Jour Dernier honore son voisin. Que celui qui croit en Allah et au Jour Dernier honore son hôte.",
    narrator: "Abu Hurayra (ra)",
    source: "Bukhari & Muslim",
    tafsir: "La parole est une responsabilité. Chaque mot prononcé est noté. Le silence face au mal est parfois un acte de sagesse, mais le bien doit être dit avec douceur et courage."
  },
  {
    num: 16,
    arabic: "لَا تَغْضَبْ",
    french: "Ne te mets pas en colère.",
    narrator: "Abu Hurayra (ra)",
    source: "Bukhari",
    tafsir: "Le Prophète ﷺ a résumé toute une éthique en deux mots. La colère est la porte de nombreux péchés. Le fort n'est pas celui qui est robuste physiquement, mais celui qui se maîtrise dans la colère."
  },
  {
    num: 17,
    arabic: "إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ",
    french: "Allah a prescrit l'excellence en toute chose. Donc, lorsque vous tuez, tuez bien, et lorsque vous égorgez, égorgez bien.",
    narrator: "Chadad ibn Aws (ra)",
    source: "Muslim",
    tafsir: "L'ihsan — l'excellence — n'est pas réservée aux pratiques religieuses. Elle s'applique à tout : son travail, son conduite, ses relations. Conduire avec excellence est un ibada."
  },
  {
    num: 18,
    arabic: "اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الحَسَنَةَ تَمْحُهَا",
    french: "Crains Allah où que tu sois. Fais suivre la mauvaise action d'une bonne qui l'effacera. Et traite les gens avec une belle moralité.",
    narrator: "Abu Dharr (ra)",
    source: "Tirmidhi",
    tafsir: "La taqwa (conscience d'Allah) est un bouclier permanent. Après une faute, l'islam encourage non pas le désespoir mais le repentir suivi d'une bonne action réparatrice."
  },
  {
    num: 19,
    arabic: "احْفَظِ اللَّهَ يَحْفَظْكَ",
    french: "Préserve (les droits d') Allah, Il te préservera. Préserve (les droits d') Allah, tu Le trouveras devant toi.",
    narrator: "Ibn Abbas (ra)",
    source: "Tirmidhi",
    tafsir: "Ce hadith magnifique décrit une relation de protection mutuelle. Qui respecte les limites d'Allah trouvera Allah à ses côtés dans l'épreuve. La confiance en Allah (tawakkul) est une force."
  },
  {
    num: 20,
    arabic: "اسْتَحْيِ مِنَ اللَّهِ تَعَالَى كَمَا تَسْتَحْيِي مِنْ رَجُلٍ صَالِحٍ مِنْ قَوْمِكَ",
    french: "Si tu n'as pas de honte, fais ce que tu veux.",
    narrator: "Abu Masoud (ra)",
    source: "Bukhari",
    tafsir: "La pudeur et la honte (hayaa) sont le frein naturel de l'âme. Quand la honte disparaît, toutes les transgressions deviennent possibles. La hayaa est une branche de la foi."
  },
  {
    num: 21,
    arabic: "قُلْ آمَنْتُ بِاللَّهِ ثُمَّ اسْتَقِمْ",
    french: "Dis : 'J'ai cru en Allah', puis reste droit.",
    narrator: "Sufyan ibn Abdallah (ra)",
    source: "Muslim",
    tafsir: "La istiqama (droiture constante) est plus difficile que les grands exploits spirituels. Persévérer dans les obligations quotidiennes, sans relâche ni excès, est la voie du salut."
  },
  {
    num: 22,
    arabic: "لَا يَحِلُّ لِمُسْلِمٍ أَنْ يَهْجُرَ أَخَاهُ فَوْقَ ثَلَاثٍ",
    french: "Il n'est pas licite pour un musulman d'abandonner son frère plus de trois jours, chacun se détournant quand ils se rencontrent. Le meilleur des deux est celui qui commence à saluer.",
    narrator: "Abu Hurayra (ra)",
    source: "Bukhari & Muslim",
    tafsir: "La rupture des liens fraternels affaiblit la communauté. L'islam prescrit la réconciliation rapide. Celui qui tend la main en premier est le plus proche de la grâce divine."
  },
  {
    num: 23,
    arabic: "الطَّهُورُ شَطْرُ الإِيمَانِ",
    french: "La purification est la moitié de la foi. 'Al-Hamdulillah' remplit la balance. 'Subhana Allah' et 'Al-Hamdulillah' remplissent ensemble ce qui est entre les cieux et la terre.",
    narrator: "Abu Malik al-Ach'ari (ra)",
    source: "Muslim",
    tafsir: "La pureté physique (tahara) est liée à la pureté spirituelle. Le dhikr — glorification d'Allah — a un poids immense dans la balance des œuvres le Jour du Jugement."
  },
  {
    num: 24,
    arabic: "يَا عِبَادِي إِنِّي حَرَّمْتُ الظُّلْمَ عَلَى نَفْسِي وَجَعَلْتُهُ بَيْنَكُمْ مُحَرَّماً",
    french: "Ô Mes serviteurs, J'ai interdit l'injustice à Moi-Même et Je l'ai interdite entre vous. Ne vous faites donc pas d'injustice mutuellement.",
    narrator: "Abu Dharr (ra)",
    source: "Muslim",
    tafsir: "Hadith Qudsi fondamental. Allah Lui-même a écarté l'injustice de Ses attributs. Le dhalim (injuste) devra rendre compte intégralement à son créateur au Jour dernier."
  },
  {
    num: 25,
    arabic: "الصَّدَقَةُ عَلَى الْمِسْكِينِ صَدَقَةٌ، وَعَلَى ذِي الرَّحِمِ اثْنَتَانِ: صَدَقَةٌ وَصِلَةٌ",
    french: "La charité envers le pauvre vaut une aumône. Envers un proche, elle vaut deux : l'aumône et le maintien des liens du sang.",
    narrator: "Salman ibn Amir (ra)",
    source: "Tirmidhi",
    tafsir: "La sila ar-rahim (maintien des liens familiaux) est une obligation renforcée par la générosité. Donner à sa famille combine deux actes d'adoration en un seul geste."
  },
  {
    num: 26,
    arabic: "كُلُّ سُلَامَى مِنَ النَّاسِ عَلَيْهِ صَدَقَةٌ كُلَّ يَوْمٍ",
    french: "Chaque articulation du corps humain doit une aumône chaque jour où le soleil se lève. Rendre justice entre deux personnes est une aumône. Aider quelqu'un avec sa monture est une aumône.",
    narrator: "Abu Hurayra (ra)",
    source: "Bukhari & Muslim",
    tafsir: "La sadaqa ne se limite pas à l'argent. Chaque bienfait rendu — un sourire, un mot gentil, une aide physique — est une forme d'aumône qui exprime la gratitude envers Allah."
  },
  {
    num: 27,
    arabic: "الْبِرُّ حُسْنُ الْخُلُقِ، وَالإِثْمُ مَا حَاكَ فِي صَدْرِكَ وَكَرِهْتَ أَنْ يَطَّلِعَ عَلَيْهِ النَّاسُ",
    french: "La piété, c'est la bonne moralité. Le péché, c'est ce qui trouble ta poitrine et que tu n'aimerais pas que les gens voient.",
    narrator: "An-Nawwas ibn Sam'an (ra)",
    source: "Muslim",
    tafsir: "La conscience intérieure est le premier juge. Ce qui trouble l'âme et que l'on cache aux autres est le signe du péché. La belle moralité est la définition la plus simple de la birr (piété)."
  },
  {
    num: 28,
    arabic: "عَلَيْكَ بِالسَّمْعِ وَالطَّاعَةِ فِي عُسْرِكَ وَيُسْرِكَ",
    french: "Il t'appartient d'écouter et d'obéir dans ta difficulté et ta facilité, dans ce que tu aimes et dans ce que tu n'aimes pas.",
    narrator: "Abu Dharr (ra)",
    source: "Muslim",
    tafsir: "L'obéissance aux dirigeants musulmans légitimes est prescrite, même dans les moments difficiles, tant qu'elle n'implique pas de désobéissance à Allah. La cohésion communautaire est un devoir."
  },
  {
    num: 29,
    arabic: "لَوْ أَنَّكُمْ كُنْتُمْ تَوَكَّلُونَ عَلَى اللَّهِ حَقَّ تَوَكُّلِهِ لَرَزَقَكُمْ كَمَا يَرْزُقُ الطَّيْرَ",
    french: "Si vous placiez vraiment votre confiance en Allah comme il convient, Il vous accorderait la subsistance comme Il accorde sa nourriture à l'oiseau : il part le ventre vide le matin et rentre le soir le ventre plein.",
    narrator: "Omar (ra)",
    source: "Tirmidhi",
    tafsir: "Le tawakkul (confiance en Allah) ne signifie pas l'inaction. L'oiseau sort chercher sa nourriture. Le croyant agit avec effort et remet le résultat à Allah, sans anxiété excessive."
  },
  {
    num: 30,
    arabic: "إِنَّ اللَّهَ تَجَاوَزَ عَنْ أُمَّتِي الخَطَأَ وَالنِّسْيَانَ وَمَا اسْتُكْرِهُوا عَلَيْهِ",
    french: "Allah a accordé à ma communauté la grâce de ne pas être comptabilisée pour ses erreurs, ses oublis et ce à quoi elle est contrainte.",
    narrator: "Ibn Abbas (ra)",
    source: "Ibn Majah",
    tafsir: "La miséricorde divine allège le fardeau du croyant. L'erreur involontaire, l'oubli et la contrainte sont pardonnés. Cette miséricorde invite à la droiture sincère plutôt qu'à la rigidité."
  },
  {
    num: 31,
    arabic: "الزُّهْدُ فِي الدُّنْيَا لَيْسَ بِتَحْرِيمِ الْحَلَالِ وَلَا إِضَاعَةِ الْمَالِ",
    french: "Le zuhd (détachement) dans cette vie ne signifie pas interdire le licite ni dilapider le patrimoine. Le zuhd, c'est être plus confiant en ce qu'Allah possède qu'en ce que tu possèdes.",
    narrator: "Abu Dharr (ra)",
    source: "Tirmidhi",
    tafsir: "Le détachement islamique n'est pas l'ascétisme total. Jouir des bienfaits d'Allah avec gratitude et sans attachement excessif est la juste mesure que l'islam préconise."
  },
  {
    num: 32,
    arabic: "لَا ضَرَرَ وَلَا ضِرَارَ",
    french: "Il ne doit y avoir ni dommage causé ni tort rendu en retour.",
    narrator: "Ibn Abbas (ra)",
    source: "Ibn Majah",
    tafsir: "Cinq mots qui fondent une grande partie du droit islamique. Nuire à autrui est interdit, tout comme se venger en causant un nouveau tort. La réparation doit rétablir l'équité."
  },
  {
    num: 33,
    arabic: "لَوْ كَانَتِ الدُّنْيَا تَعْدِلُ عِنْدَ اللَّهِ جَنَاحَ بَعُوضَةٍ مَا سَقَى كَافِراً مِنْهَا شَرْبَةَ مَاءٍ",
    french: "Si cette vie basse valait auprès d'Allah l'équivalent d'une aile de moustique, Il n'en donnerait pas une gorgée d'eau à un mécréant.",
    narrator: "Sahl ibn Sa'd (ra)",
    source: "Tirmidhi",
    tafsir: "Ce hadith met en perspective la valeur réelle de la dunya. Les richesses matérielles ne sont pas un signe de faveur divine. La vraie récompense est l'au-delà."
  },
  {
    num: 34,
    arabic: "مَنْ رَأَى مِنْكُمْ مُنْكَراً فَلْيُغَيِّرْهُ بِيَدِهِ، فَإِنْ لَمْ يَسْتَطِعْ فَبِلِسَانِهِ",
    french: "Que celui d'entre vous qui voit un acte blâmable le change de sa main ; s'il ne peut, qu'il le change avec sa langue ; s'il ne peut, qu'il le désapprouve en son cœur, et c'est là le minimum de la foi.",
    narrator: "Abu Said al-Khudri (ra)",
    source: "Muslim",
    tafsir: "L'enjoinement au bien et l'interdiction du mal (al-amr bil-ma'ruf) est une obligation collective. Les trois niveaux d'action s'adaptent aux capacités de chacun et préservent la conscience."
  },
  {
    num: 35,
    arabic: "لَا تَحَاسَدُوا، وَلَا تَنَاجَشُوا، وَلَا تَبَاغَضُوا، وَلَا تَدَابَرُوا",
    french: "Ne vous enviez pas, ne vous surenchérissez pas (dans la vente), ne vous haïssez pas, ne vous tournez pas le dos. Soyez frères serviteurs d'Allah.",
    narrator: "Abu Hurayra (ra)",
    source: "Muslim",
    tafsir: "Ces quatre interdictions protègent la cohésion de la oumma. L'envie ronge le cœur et divise la communauté. La fraternité en Allah est le liant de la société musulmane."
  },
  {
    num: 36,
    arabic: "مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ",
    french: "Celui qui soulage un croyant d'une détresse de cette vie, Allah le soulagera d'une détresse du Jour du Jugement. Allah vient en aide au serviteur tant que ce serviteur vient en aide à son frère.",
    narrator: "Abu Hurayra (ra)",
    source: "Muslim",
    tafsir: "L'entraide entre croyants est une forme d'adoration collective. Aider ses collègues, sa famille, ou même des inconnus dans le besoin — chaque service rendu est investi pour l'au-delà."
  },
  {
    num: 37,
    arabic: "إِنَّ اللَّهَ يُحِبُّ إِذَا عَمِلَ أَحَدُكُمْ عَمَلاً أَنْ يُتْقِنَهُ",
    french: "Allah aime que lorsque l'un d'entre vous accomplit un travail, il le fasse avec excellence (itqan).",
    narrator: "Aïcha (ra)",
    source: "Tabarani",
    tafsir: "Ce hadith est le fondement de l'éthique professionnelle islamique. Conduire avec soin, servir ses clients avec excellence, entretenir son véhicule : tout cela est un acte d'adoration."
  },
  {
    num: 38,
    arabic: "كَتَبَ رَبُّكُمْ عَلَى نَفْسِهِ الرَّحْمَةَ",
    french: "Votre Seigneur S'est imposé à Lui-même la miséricorde. Celui d'entre vous qui commet un péché par ignorance puis se repent, Allah est Pardonneur et Miséricordieux.",
    narrator: "Abu Hurayra (ra)",
    source: "Bukhari",
    tafsir: "La miséricorde est l'attribut central d'Allah. Elle précède Sa colère. Le repentir sincère (tawba) efface les fautes, même les plus graves, tant que le dernier souffle n'est pas arrivé."
  },
  {
    num: 39,
    arabic: "إِنَّ اللَّهَ عَزَّ وَجَلَّ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ، وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ",
    french: "Allah ne regarde pas vos apparences ni vos richesses, mais Il regarde vos cœurs et vos actions.",
    narrator: "Abu Hurayra (ra)",
    source: "Muslim",
    tafsir: "La beauté physique et la richesse matérielle ne sont pas des critères devant Allah. Ce qui compte, c'est la sincérité du cœur et la qualité des actes. Le croyant travaille son intérieur."
  },
  {
    num: 40,
    arabic: "كُنْ فِي الدُّنْيَا كَأَنَّكَ غَرِيبٌ أَوْ عَابِرُ سَبِيلٍ",
    french: "Sois dans cette vie comme un étranger ou comme un voyageur de passage.",
    narrator: "Ibn Omar (ra)",
    source: "Bukhari",
    tafsir: "Le voyage de la vie est court. Le croyant ne s'encombre pas trop de biens matériels et garde les yeux fixés sur la destination finale. La mort rappelle cette réalité chaque jour."
  },
  {
    num: 41,
    arabic: "لَا يُؤْمِنُ عَبْدٌ حَتَّى يُؤْمِنَ بِالْقَدَرِ خَيْرِهِ وَشَرِّهِ",
    french: "Un serviteur ne croit pas (pleinement) jusqu'à ce qu'il croie en la destinée, dans ce qu'elle a de bon et de mauvais.",
    narrator: "Jabir (ra)",
    source: "Tirmidhi",
    tafsir: "Le Qadar (destinée divine) est le sixième pilier de la foi. Accepter les décrets d'Allah — qu'ils nous plaisent ou non — avec sérénité et confiance est un signe de foi mature."
  },
  {
    num: 42,
    arabic: "مَا مِنْ أَيَّامٍ الْعَمَلُ الصَّالِحُ فِيهَا أَحَبُّ إِلَى اللَّهِ مِنْ هَذِهِ الأَيَّامِ الْعَشْرِ",
    french: "Il n'y a pas de jours où les bonnes actions sont plus aimées d'Allah que ces dix jours (de Dhul Hijja). Les compagnons dirent : 'Même le jihad ?' Il dit : 'Oui, sauf l'homme qui sort avec son âme et ses biens et n'en revient avec rien.'",
    narrator: "Ibn Abbas (ra)",
    source: "Bukhari",
    tafsir: "Les dix premiers jours de Dhul-Hijja sont parmi les jours les plus sacrés. Le croyant redouble d'efforts spirituels — prière, jeûne, dhikr et sadaqa — pendant cette période bénie."
  }
];

// ══════════════════════════════════════════════════════════════
//  QIBLA COMPASS
// ══════════════════════════════════════════════════════════════
const QIBLA = {
  bearing: null,
  compass: 0,
  deviceHeading: 0,
  aligned: false,
  alignmentTimer: null,
  watchId: null,

  // Calcul de la direction de la Qibla depuis une position
  calcBearing(lat, lon) {
    const dLon = (KAABA.lon - lon) * Math.PI / 180;
    const lat1  = lat * Math.PI / 180;
    const lat2  = KAABA.lat * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let b = Math.atan2(y, x) * 180 / Math.PI;
    return (b + 360) % 360;
  },

  // Distance haversine jusqu'à La Mecque (km)
  distanceToMecca(lat, lon) {
    const R = 6371;
    const dLat = (KAABA.lat - lat) * Math.PI / 180;
    const dLon = (KAABA.lon - lon) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat*Math.PI/180) * Math.cos(KAABA.lat*Math.PI/180) * Math.sin(dLon/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  },

  init() {
    this._render();
    this._startCompass();
    this._startGPS();
  },

  _startGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      this.bearing = this.calcBearing(pos.coords.latitude, pos.coords.longitude);
      const dist   = this.distanceToMecca(pos.coords.latitude, pos.coords.longitude);
      this._updateDistance(dist);
      this._updateNeedle();
    }, () => {
      // Fallback sur position stockée de l'app
      if (window.state?.pos) {
        this.bearing = this.calcBearing(state.pos.lat, state.pos.lon);
        const dist   = this.distanceToMecca(state.pos.lat, state.pos.lon);
        this._updateDistance(dist);
        this._updateNeedle();
      }
    });
  },

  _startCompass() {
    // La permission boussole est gérée par WOD_PERMISSIONS (onglet Profil)
    // Si déjà accordée (localStorage), l'écouteur sera démarré par restoreOnStartup()
    // Sinon : rien à faire ici, l'utilisateur doit activer depuis Profil
    const btn = document.getElementById('qibla-permission-btn');
    if (btn) btn.style.display = 'none'; // bouton géré depuis Profil uniquement

    // Android/navigateurs sans requestPermission : démarrer directement
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission !== 'function') {
      // Pas de permission requise — démarrer et mémoriser
      if (window.WOD_PERMISSIONS) {
        localStorage.setItem('wod_perm_compass', '1');
        window.WOD_PERMISSIONS._compassListening = false;
        window.WOD_PERMISSIONS._startCompassListener();
      } else {
        // Fallback si WOD_PERMISSIONS pas encore prêt
        window.addEventListener('deviceorientation', (e) => {
          const h = e.webkitCompassHeading ?? (e.alpha ? (360 - e.alpha) : null);
          if (h !== null) { this.deviceHeading = h; this._updateNeedle(); }
        }, true);
      }
    }
  },

  _updateNeedle() {
    const needle     = document.getElementById('qibla-needle');
    const compassRing= document.getElementById('qibla-compass-ring');
    const halo       = document.getElementById('qibla-halo');
    const badge      = document.getElementById('qibla-badge');
    if (!needle || this.bearing === null) return;

    // ── LOGIQUE BOUSSOLE CORRECTE ──────────────────────────
    // La rose des vents (ring) tourne à l'OPPOSÉ du heading de l'appareil
    // pour que N soit toujours en haut de l'écran
    // La flèche (needle) pointe vers la Qibla dans le repère de l'écran
    // Angle Qibla dans repère écran = bearing - heading_appareil
    const qiblaAngle = (this.bearing - this.deviceHeading + 360) % 360;

    // Rotation de la rose des vents (sens inverse du heading)
    if (compassRing) {
      const ringAngle = (-this.deviceHeading + 360) % 360;
      compassRing.style.transform = `rotate(${ringAngle}deg)`;
      // Les labels N/E/S/O ne doivent pas tourner avec la ring
      const marks = compassRing.querySelector('.qibla-compass-marks');
      if (marks) marks.style.transform = `rotate(${-ringAngle}deg)`;
    }

    // Rotation de l'aiguille vers la Qibla
    needle.style.transform = `rotate(${qiblaAngle}deg)`;

    // Affichage degrés (angle absolu de la Qibla)
    const degEl = document.getElementById('qibla-degrees');
    if (degEl) degEl.textContent = `${Math.round(this.bearing)}°`;

    // Alignement parfait (±5°)
    const diff      = Math.abs(((qiblaAngle + 180) % 360) - 180);
    const isAligned = diff < 5;
    if (isAligned && !this.aligned) {
      this.aligned = true;
      halo?.classList.add('aligned');
      badge?.classList.add('aligned');
      if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 80]);
      if (typeof WOD_SOUND !== 'undefined') WOD_SOUND.success();
      clearTimeout(this.alignmentTimer);
      this.alignmentTimer = setTimeout(() => {
        this.aligned = false;
        halo?.classList.remove('aligned');
        badge?.classList.remove('aligned');
      }, 3000);
    } else if (!isAligned && this.aligned) {
      this.aligned = false;
      halo?.classList.remove('aligned');
      badge?.classList.remove('aligned');
    }
  },

  _updateDistance(km) {
    const el = document.getElementById('qibla-distance');
    if (el) el.textContent = `${km.toLocaleString('fr-FR')} km`;
  },

  _render() {
    const screen = document.getElementById('screen-muslim');
    if (!screen) return;
    const scroll = screen.querySelector('.screen-scroll');
    if (!scroll) return;

    const card = document.createElement('div');
    card.className = 'msl-card qibla-card';
    card.innerHTML = `
      <div class="msl-card-hd">
        <div class="msl-card-icon">🕋</div>
        <div>
          <div class="msl-card-title">Direction de la Qibla</div>
          <div class="msl-card-sub">Boussole vers La Mecque</div>
        </div>
        <div class="qibla-badge" id="qibla-badge">
          <span id="qibla-degrees">—°</span>
        </div>
      </div>

      <!-- Compass -->
      <div class="qibla-compass-wrap">
        <div class="qibla-halo" id="qibla-halo"></div>
        <div class="qibla-compass-ring" id="qibla-compass-ring">
          <div class="qibla-compass-marks">
            <span class="q-mark q-n">N</span>
            <span class="q-mark q-e">E</span>
            <span class="q-mark q-s">S</span>
            <span class="q-mark q-w">O</span>
          </div>
          <div class="qibla-needle-wrap" id="qibla-needle">
            <div class="qibla-needle-body">
              <div class="qibla-kaaba-tip">🕋</div>
              <div class="qibla-needle-shaft"></div>
              <div class="qibla-needle-tail"></div>
            </div>
          </div>
          <div class="qibla-center-dot"></div>
        </div>
      </div>

      <!-- Distance + Permission btn -->
      <div class="qibla-info-row">
        <div class="qibla-info-item">
          <span class="qibla-info-lbl">Distance</span>
          <span class="qibla-info-val" id="qibla-distance">Calcul…</span>
        </div>
        <div class="qibla-info-item">
          <span class="qibla-info-lbl">Destination</span>
          <span class="qibla-info-val">La Mecque</span>
        </div>
      </div>

      <button class="msl-perm-btn" id="qibla-permission-btn" style="display:none">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        Autoriser la boussole
      </button>
    `;
    scroll.appendChild(card);
  }
};

// ══════════════════════════════════════════════════════════════
//  PRAYER TIMES WIDGET
// ══════════════════════════════════════════════════════════════
const PRAYERS = {
  times: {},
  countdownTimer: null,

  init() {
    this._render();
    this._calculate();
    this._startCountdown();
  },

  _getTimezone() {
    // Récupère le vrai décalage UTC actuel (gère DST automatiquement)
    // Paris hiver = +1, Paris été = +2
    const now = new Date();
    return -now.getTimezoneOffset() / 60;
  },

  _calculate() {
    const lat = window.state?.pos?.lat || 48.8566;
    const lon = window.state?.pos?.lon || 2.3522;
    const now = new Date();
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.times = AdhanCalc.calculate(lat, lon, localDate);
    this._renderTimes();
  },

  _formatTime(d) {
    if (!d) return '--:--';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },

  _nextPrayer() {
    const now = new Date();
    const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    for (const name of order) {
      if (this.times[name] && this.times[name] > now) return { name, time: this.times[name] };
    }
    // Toutes passées → prochaine Fajr demain
    return null;
  },

  _countdown(to) {
    const now  = new Date();
    const diff = Math.max(0, to - now);
    const h    = Math.floor(diff / 3600000);
    const m    = Math.floor((diff % 3600000) / 60000);
    const s    = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  _renderTimes() {
    const grid = document.getElementById('prayer-grid');
    if (!grid) return;
    const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    const icons = { Fajr:'🌙', Dhuhr:'☀️', Asr:'🌤️', Maghrib:'🌅', Isha:'🌑' };
    const now = new Date();

    grid.innerHTML = order.map(name => {
      const t = this.times[name];
      const past = t && t < now;
      const next = this._nextPrayer();
      const isNext = next?.name === name;
      return `
        <div class="prayer-item ${past ? 'past' : ''} ${isNext ? 'next' : ''}">
          <span class="prayer-icon">${icons[name]}</span>
          <span class="prayer-name">${name}</span>
          <span class="prayer-time">${this._formatTime(t)}</span>
          ${isNext ? '<span class="prayer-next-dot"></span>' : ''}
        </div>
      `;
    }).join('');
  },

  _startCountdown() {
    clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      const next = this._nextPrayer();
      const el   = document.getElementById('prayer-countdown');
      const lbl  = document.getElementById('prayer-next-name');
      if (!el) return;
      if (next) {
        el.textContent  = this._countdown(next.time);
        if (lbl) lbl.textContent = `Prochaine : ${next.name}`;
        // Alerte 5 min avant
        const diff = next.time - new Date();
        if (diff > 0 && diff < 300000 && diff > 299000) {
          this._notify(next.name, next.time);
        }
      } else {
        el.textContent  = '--:--:--';
        if (lbl) lbl.textContent = 'Prochaine : Fajr';
      }
    }, 1000);
  },

  _notify(name, time) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(`⏰ Prière ${name} dans 5 minutes`, {
        body: `Il est l'heure de se préparer pour ${name} — ${this._formatTime(time)}`,
        icon: './icon-192.png',
        silent: false
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') this._notify(name, time);
      });
    }
  },

  _render() {
    const screen = document.getElementById('screen-muslim');
    if (!screen) return;
    const scroll = screen.querySelector('.screen-scroll');
    if (!scroll) return;

    const card = document.createElement('div');
    card.className = 'msl-card prayer-card';
    card.innerHTML = `
      <div class="msl-card-hd">
        <div class="msl-card-icon">🕌</div>
        <div>
          <div class="msl-card-title">Horaires des Prières</div>
          <div class="msl-card-sub" id="prayer-next-name">Prochaine : —</div>
        </div>
        <div class="prayer-countdown-wrap">
          <div class="prayer-countdown" id="prayer-countdown">--:--:--</div>
        </div>
      </div>

      <div class="prayer-grid" id="prayer-grid"></div>

      <div class="prayer-notif-row">
        <button class="msl-perm-btn" id="prayer-notif-btn" onclick="PRAYERS._requestNotif()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Activer les rappels
        </button>
        <div class="prayer-method-lbl">Méthode Muslim World League · Paris</div>
      </div>
    `;
    scroll.appendChild(card);
  },

  _requestNotif() {
    if (!('Notification' in window)) { alert("Notifications non supportées."); return; }
    Notification.requestPermission().then(p => {
      const btn = document.getElementById('prayer-notif-btn');
      if (p === 'granted' && btn) {
        btn.textContent = '✓ Rappels activés';
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
    });
  }
};
window.PRAYERS = PRAYERS;

// ══════════════════════════════════════════════════════════════
//  HADITH DU JOUR — verrouillé 24h, séquence 30j sans répétition
// ══════════════════════════════════════════════════════════════
const HADITH = {
  // ── Séquence de 42 indices mélangés sur 30 jours, jamais le même ──
  // Chaque cycle de 30 jours utilise un bloc de 30 hadith distincts.
  // Le bloc tourne à l'infini, sans chevauchement sur une fenêtre de 30j.
  _SEQUENCE: (() => {
    // Mélange déterministe (Fisher-Yates avec seed fixe) pour 42 éléments
    const arr = Array.from({ length: 42 }, (_, i) => i);
    let seed = 20240101;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // On prend les 30 premiers pour garantir 30j sans répétition dans un cycle
    return arr.slice(0, 30);
  })(),

  _LS_KEY: 'wod_hadith_v2',

  // ── Retourne le timestamp minuit du jour courant (local)
  _todayStamp() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  },

  // ── Lit l'état depuis localStorage
  _loadState() {
    try {
      const raw = localStorage.getItem(this._LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  },

  // ── Sauvegarde l'état
  _saveState(state) {
    try { localStorage.setItem(this._LS_KEY, JSON.stringify(state)); } catch(e) {}
  },

  // ── Calcule quel hadith afficher aujourd'hui
  _todayHadith() {
    const today    = this._todayStamp();
    let   state    = this._loadState();

    // Pas d'état ou date différente → nouveau jour
    if (!state || state.stamp !== today) {
      const prevIdx = state ? state.seqPos : -1;
      // Avancer dans la séquence (cycle de 30)
      const seqPos  = (prevIdx + 1) % this._SEQUENCE.length;
      const hadithIdx = this._SEQUENCE[seqPos];
      state = { stamp: today, seqPos, hadithIdx };
      this._saveState(state);
    }
    return { hadith: HADITHS_NAWAWI[state.hadithIdx], state };
  },

  // ── Calcule le compte à rebours avant le prochain hadith
  _nextHadithIn() {
    const now       = Date.now();
    const tomorrow  = this._todayStamp() + 86400000; // minuit prochain
    const diff      = Math.max(0, tomorrow - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  },

  // ── Démarre le ticker du compte à rebours
  _startTicker() {
    clearInterval(this._ticker);
    this._ticker = setInterval(() => {
      const el = document.getElementById('hadith-unlock-timer');
      if (el) el.textContent = this._nextHadithIn();
    }, 1000);
  },

  init() {
    this._render();
    this._load();
    this._startTicker();
  },

  _load() {
    const { hadith } = this._todayHadith();
    this._display(hadith);
  },

  _display(h) {
    const wrap = document.getElementById('hadith-content');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="hadith-num-badge">Hadith n° ${h.num} · sur 42</div>
      <div class="hadith-arabic">${h.arabic}</div>
      <div class="hadith-french">${h.french}</div>
      <div class="hadith-meta">
        <span class="hadith-narrator">— ${h.narrator}</span>
        <span class="hadith-source">${h.source}</span>
      </div>
      <div class="hadith-tafsir">
        <div class="hadith-tafsir-lbl">Commentaire</div>
        <p>${h.tafsir}</p>
      </div>
    `;
    wrap.classList.remove('hadith-animate');
    void wrap.offsetWidth;
    wrap.classList.add('hadith-animate');
  },

  _render() {
    const screen = document.getElementById('screen-muslim');
    if (!screen) return;
    const scroll = screen.querySelector('.screen-scroll');
    if (!scroll) return;

    const card = document.createElement('div');
    card.className = 'msl-card hadith-card';
    card.innerHTML = `
      <div class="msl-card-hd">
        <div class="msl-card-icon">📖</div>
        <div>
          <div class="msl-card-title">Hadith du Jour</div>
          <div class="msl-card-sub">Les 42 Hadiths Nawawi · 1 par jour</div>
        </div>
        <div class="hadith-lock-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span id="hadith-unlock-timer">--h --m --s</span>
        </div>
      </div>
      <div class="hadith-content" id="hadith-content"></div>
    `;
    scroll.appendChild(card);
  }
};
window.HADITH = HADITH;

// ══════════════════════════════════════════════════════════════
//  DHIKR — Compteur de Dhikr avec sons, animations, historique
//  Intégré dans l'onglet Muslim
// ══════════════════════════════════════════════════════════════
const DHIKR = {
  _PHRASES: [
    { ar: 'سُبْحَانَ اللَّهِ',      fr: 'Gloire à Allah',              target: 33, color: '#2dd4a0' },
    { ar: 'الحَمْدُ لِلَّهِ',       fr: 'Louange à Allah',             target: 33, color: '#d4a843' },
    { ar: 'اللَّهُ أَكْبَرُ',       fr: 'Allah est Le Plus Grand',     target: 34, color: '#f5c257' },
    { ar: 'لَا إِلَهَ إِلَّا اللَّهُ', fr: 'Nulle divinité sinon Allah', target: 100, color: '#c084fc' },
    { ar: 'أَسْتَغْفِرُ اللَّهَ',   fr: 'Je demande pardon à Allah',   target: 100, color: '#60a5fa' },
    { ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّد', fr: 'Prière sur le Prophète ﷺ', target: 100, color: '#fb923c' },
  ],

  _count:    0,
  _phraseIdx:0,
  _history:  [],
  _LS_KEY:   'wod_dhikr_v1',

  init() {
    this._loadState();
    this._render();
  },

  _loadState() {
    try {
      const raw = localStorage.getItem(this._LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        this._count    = s.count    || 0;
        this._phraseIdx= s.phraseIdx|| 0;
        this._history  = s.history  || [];
      }
    } catch(e) {}
  },

  _saveState() {
    try {
      localStorage.setItem(this._LS_KEY, JSON.stringify({
        count: this._count, phraseIdx: this._phraseIdx, history: this._history.slice(0, 30)
      }));
    } catch(e) {}
  },

  _currentPhrase() { return this._PHRASES[this._phraseIdx]; },

  tap() {
    const phrase = this._currentPhrase();
    this._count++;
    this._playTapSound();
    this._animateRipple();
    this._updateDisplay();

    // Vibration légère
    if (navigator.vibrate) navigator.vibrate(12);

    // Atteint la cible
    if (this._count === phrase.target) {
      this._onTargetReached();
    }
    this._saveState();
  },

  _onTargetReached() {
    const phrase = this._currentPhrase();
    if (navigator.vibrate) navigator.vibrate([30, 20, 60, 20, 100]);
    this._playSuccessSound();

    // Sauvegarder dans l'historique
    this._history.unshift({
      phrase:    phrase.fr,
      count:     this._count,
      ts:        Date.now(),
    });

    // Flash célébration
    const btn = document.getElementById('dhikr-btn');
    if (btn) {
      btn.classList.add('dhikr-complete');
      setTimeout(() => btn.classList.remove('dhikr-complete'), 1200);
    }

    // Message de célébration
    const msgEl = document.getElementById('dhikr-msg');
    if (msgEl) {
      msgEl.textContent = `✨ ${phrase.target} fois accompli ! ما شاء الله`;
      msgEl.style.opacity = '1';
      setTimeout(() => { msgEl.style.opacity = '0'; }, 3000);
    }

    // Passer à la phrase suivante après 1.5s
    setTimeout(() => {
      this._count     = 0;
      this._phraseIdx = (this._phraseIdx + 1) % this._PHRASES.length;
      this._updateDisplay();
      this._updatePhrase();
      this._saveState();
    }, 1500);

    this._renderHistory();
  },

  reset() {
    this._count = 0;
    this._updateDisplay();
    this._saveState();
    if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
  },

  switchPhrase(idx) {
    this._count     = 0;
    this._phraseIdx = idx;
    this._updateDisplay();
    this._updatePhrase();
    this._saveState();

    // Mettre à jour les boutons
    document.querySelectorAll('.dhikr-phrase-btn').forEach((b, i) => {
      b.classList.toggle('dhikr-phrase-active', i === idx);
    });
  },

  _updateDisplay() {
    const phrase = this._currentPhrase();
    const countEl= document.getElementById('dhikr-count');
    const progEl = document.getElementById('dhikr-progress-bar');
    const remEl  = document.getElementById('dhikr-remaining');
    const totEl  = document.getElementById('dhikr-total-session');

    if (countEl) {
      countEl.textContent = this._count;
      countEl.style.color = phrase.color;
    }
    if (progEl) {
      const pct = Math.min(100, (this._count / phrase.target) * 100);
      progEl.style.width  = pct + '%';
      progEl.style.background = `linear-gradient(90deg, ${phrase.color}, ${phrase.color}88)`;
    }
    if (remEl) {
      const rem = phrase.target - this._count;
      remEl.textContent = rem > 0 ? `${rem} restant${rem > 1 ? 's' : ''}` : '✅ Complété !';
      remEl.style.color = rem === 0 ? '#2dd4a0' : 'var(--text-dim)';
    }
    if (totEl) {
      const total = this._history.reduce((s, h) => s + h.count, 0) + this._count;
      totEl.textContent = total.toLocaleString('fr-FR');
    }
  },

  _updatePhrase() {
    const phrase  = this._currentPhrase();
    const arEl    = document.getElementById('dhikr-arabic');
    const frEl    = document.getElementById('dhikr-french');
    const targetEl= document.getElementById('dhikr-target');
    if (arEl) { arEl.textContent = phrase.ar; arEl.style.color = phrase.color; }
    if (frEl) frEl.textContent   = phrase.fr;
    if (targetEl) targetEl.textContent = `Objectif : ${phrase.target}×`;
  },

  _animateRipple() {
    const btn = document.getElementById('dhikr-btn');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'dhikr-ripple';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  },

  _playTapSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain= ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.type = 'sine';
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch(e) {}
  },

  _playSuccessSound() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const notes= [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.35);
      });
    } catch(e) {}
  },

  _renderHistory() {
    const el = document.getElementById('dhikr-history-list'); if (!el) return;
    if (!this._history.length) { el.innerHTML = '<div style="font-size:.72rem;color:var(--text-dim)">Aucun dhikr complété</div>'; return; }
    el.innerHTML = this._history.slice(0, 5).map(h => {
      const d = new Date(h.ts);
      const t = d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
      return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.72rem;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <span style="color:var(--text)">${h.phrase}</span>
        <span style="color:var(--gold);font-weight:700;">×${h.count} <span style="color:var(--text-dim);font-weight:400;">${t}</span></span>
      </div>`;
    }).join('');
  },

  _render() {
    const screen = document.getElementById('screen-muslim');
    if (!screen) return;
    const scroll = screen.querySelector('.screen-scroll');
    if (!scroll) return;
    if (document.getElementById('dhikr-card')) return;

    const phrase = this._currentPhrase();

    const card = document.createElement('div');
    card.id = 'dhikr-card';
    card.className = 'msl-card dhikr-card';
    card.innerHTML = `
      <div class="msl-card-hd">
        <div class="msl-card-icon">📿</div>
        <div>
          <div class="msl-card-title">Compteur de Dhikr</div>
          <div class="msl-card-sub">Tasbih numérique · Voix du cœur</div>
        </div>
        <div id="dhikr-total-wrap" style="margin-left:auto;text-align:right;">
          <div style="font-size:.58rem;color:var(--text-dim);letter-spacing:.08em">TOTAL SESSION</div>
          <div id="dhikr-total-session" style="font-family:'DM Mono',monospace;font-size:.82rem;font-weight:700;color:var(--gold)">0</div>
        </div>
      </div>

      <!-- Sélecteur de phrases -->
      <div class="dhikr-phrases-row" id="dhikr-phrases-row">
        ${this._PHRASES.map((p, i) => `
          <button class="dhikr-phrase-btn ${i === this._phraseIdx ? 'dhikr-phrase-active' : ''}"
            onclick="DHIKR.switchPhrase(${i})"
            style="--phrase-color:${p.color}">
            ${p.fr.split(' ').slice(0,2).join(' ')}
          </button>`).join('')}
      </div>

      <!-- Texte arabe + traduction -->
      <div class="dhikr-text-wrap">
        <div class="dhikr-arabic" id="dhikr-arabic" style="color:${phrase.color}">${phrase.ar}</div>
        <div class="dhikr-french" id="dhikr-french">${phrase.fr}</div>
        <div class="dhikr-target-lbl" id="dhikr-target">Objectif : ${phrase.target}×</div>
      </div>

      <!-- Barre de progression -->
      <div class="dhikr-progress-track">
        <div class="dhikr-progress-bar" id="dhikr-progress-bar" style="width:0%;background:${phrase.color}"></div>
      </div>

      <!-- Compteur principal + bouton -->
      <div class="dhikr-counter-wrap">
        <div class="dhikr-count" id="dhikr-count" style="color:${phrase.color}">0</div>
        <div class="dhikr-remaining" id="dhikr-remaining">${phrase.target} restants</div>
      </div>

      <!-- Bouton Tap -->
      <button class="dhikr-btn" id="dhikr-btn" onclick="DHIKR.tap()" style="--dhikr-color:${phrase.color}">
        <span class="dhikr-btn-ico">📿</span>
        <span class="dhikr-btn-lbl">DHIKR</span>
      </button>

      <!-- Message célébration -->
      <div class="dhikr-msg" id="dhikr-msg" style="opacity:0"></div>

      <!-- Bouton reset -->
      <div style="display:flex;justify-content:center;margin-top:10px;">
        <button class="msl-perm-btn" onclick="DHIKR.reset()" style="font-size:.68rem;padding:7px 16px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.93"/></svg>
          Réinitialiser
        </button>
      </div>

      <!-- Historique -->
      <div style="margin-top:14px;">
        <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin-bottom:8px;">Historique du jour</div>
        <div id="dhikr-history-list"></div>
      </div>
    `;

    // Insérer avant le hadith (dernier widget)
    const hadithCard = scroll.querySelector('.hadith-card');
    if (hadithCard) scroll.insertBefore(card, hadithCard);
    else scroll.appendChild(card);

    // Injecter les styles dhikr
    this._injectStyles();

    // Mettre à jour l'affichage
    this._updateDisplay();
    this._updatePhrase();
    this._renderHistory();
  },

  _injectStyles() {
    if (document.getElementById('dhikr-styles')) return;
    const s = document.createElement('style');
    s.id = 'dhikr-styles';
    s.textContent = `
      .dhikr-card { animation: dhikrBreath 5s ease-in-out infinite; }
      @keyframes dhikrBreath {
        0%,100% { box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 20px rgba(212,168,67,0.05); }
        50%      { box-shadow: 0 8px 40px rgba(0,0,0,0.5),  0 0 40px rgba(212,168,67,0.12); }
      }

      /* Sélecteur de phrases */
      .dhikr-phrases-row {
        display: flex; flex-wrap: wrap; gap: 6px;
        margin-bottom: 14px;
      }
      .dhikr-phrase-btn {
        font-size: .62rem; font-weight: 700;
        padding: 5px 10px; border-radius: 20px; cursor: pointer;
        border: 1px solid rgba(255,255,255,.1);
        background: rgba(255,255,255,.04);
        color: var(--text-dim);
        transition: all .2s;
        font-family: 'DM Sans', sans-serif;
      }
      .dhikr-phrase-btn:active { transform: scale(.95); }
      .dhikr-phrase-active {
        background: rgba(var(--phrase-color-rgb), .15) !important;
        border-color: var(--phrase-color) !important;
        color: var(--phrase-color) !important;
      }
      .dhikr-phrase-btn.dhikr-phrase-active {
        background: rgba(212,168,67,.15);
        border-color: var(--phrase-color);
        color: var(--phrase-color);
        box-shadow: 0 0 10px rgba(212,168,67,.2);
      }

      /* Texte arabe */
      .dhikr-text-wrap { text-align: center; margin-bottom: 14px; }
      .dhikr-arabic {
        font-size: 1.4rem; font-weight: 700; direction: rtl;
        font-family: 'Amiri', 'Arial', serif; letter-spacing: .03em;
        line-height: 1.8; margin-bottom: 6px;
        text-shadow: 0 0 20px currentColor;
        transition: color .3s;
      }
      .dhikr-french { font-size: .8rem; color: var(--text); font-style: italic; margin-bottom: 4px; }
      .dhikr-target-lbl { font-size: .62rem; color: var(--text-dim); letter-spacing: .08em; }

      /* Progression */
      .dhikr-progress-track {
        height: 4px; background: rgba(255,255,255,.08); border-radius: 4px;
        overflow: hidden; margin-bottom: 18px;
      }
      .dhikr-progress-bar { height: 100%; border-radius: 4px; transition: width .3s ease; }

      /* Compteur */
      .dhikr-counter-wrap { text-align: center; margin-bottom: 16px; }
      .dhikr-count {
        font-size: 4.5rem; font-weight: 900; line-height: 1;
        font-family: 'DM Mono', monospace; letter-spacing: -.04em;
        transition: color .3s;
        text-shadow: 0 0 30px currentColor;
      }
      .dhikr-remaining {
        font-size: .72rem; color: var(--text-dim); margin-top: 4px;
        transition: color .3s;
      }

      /* Bouton principal */
      .dhikr-btn {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        width: 100%; padding: 22px 0;
        background: radial-gradient(ellipse at 50% 0%, rgba(212,168,67,.12), rgba(0,0,0,0) 60%),
                    rgba(255,255,255,.03);
        border: 1.5px solid rgba(212,168,67,.2);
        border-radius: 20px; cursor: pointer;
        position: relative; overflow: hidden;
        transition: all .15s;
        font-family: 'DM Sans', sans-serif;
        -webkit-tap-highlight-color: transparent;
      }
      .dhikr-btn:active { transform: scale(.97); }
      .dhikr-btn-ico { font-size: 2rem; margin-bottom: 6px; }
      .dhikr-btn-lbl {
        font-size: .6rem; font-weight: 800; letter-spacing: .2em;
        color: var(--gold); text-transform: uppercase;
      }
      .dhikr-btn.dhikr-complete {
        border-color: #2dd4a0 !important;
        background: rgba(45,212,160,.12) !important;
        animation: dhikrComplete .6s ease;
      }
      @keyframes dhikrComplete {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.04); }
        60%  { transform: scale(.98); }
        100% { transform: scale(1); }
      }

      /* Ripple */
      .dhikr-ripple {
        position: absolute;
        border-radius: 50%;
        width: 80px; height: 80px;
        background: rgba(212,168,67,.25);
        transform: scale(0);
        animation: dhikrRipple .6s ease-out;
        pointer-events: none;
        top: 50%; left: 50%; margin: -40px 0 0 -40px;
      }
      @keyframes dhikrRipple {
        to { transform: scale(4); opacity: 0; }
      }

      /* Message */
      .dhikr-msg {
        text-align: center; font-size: .82rem; font-weight: 700;
        color: #2dd4a0; margin-top: 10px;
        transition: opacity .5s ease;
        min-height: 1.2em;
      }
    `;
    document.head.appendChild(s);
  },
};
window.DHIKR = DHIKR;

// ══════════════════════════════════════════════════════════════
//  STYLES CSS DU MODULE MUSLIM
// ══════════════════════════════════════════════════════════════
function injectMuslimStyles() {
  const s = document.createElement('style');
  s.id = 'wod-muslim-styles';
  s.textContent = `
    /* ══════ SCREEN MUSLIM ══════ */
    #screen-muslim .screen-scroll {
      padding-bottom: 100px;
    }

    /* ══════ HEADER ÉCRAN ══════ */
    .msl-screen-header {
      padding: 18px 18px 8px;
      display: flex; align-items: center; gap: 12px;
    }
    .msl-screen-title {
      font-family: 'Cinzel', serif;
      font-size: 1.1rem; font-weight: 900;
      background: linear-gradient(135deg, #d4a843, #f5c257, #d4a843);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      letter-spacing: .08em;
    }
    .msl-screen-crescent {
      font-size: 1.4rem;
      filter: drop-shadow(0 0 8px rgba(212,168,67,0.8));
      animation: crescentFloat 4s ease-in-out infinite;
    }
    @keyframes crescentFloat {
      0%,100% { transform: translateY(0) rotate(-5deg); }
      50%      { transform: translateY(-4px) rotate(5deg); }
    }
    .msl-bismi {
      text-align: center;
      font-size: .85rem;
      color: rgba(212,168,67,0.65);
      letter-spacing: .05em;
      padding: 4px 18px 16px;
      direction: rtl;
    }

    /* ══════ CARDS GÉNÉRIQUES ══════ */
    .msl-card {
      margin: 0 14px 14px;
      background: linear-gradient(145deg, rgba(14,10,0,0.85), rgba(17,13,2,0.9), rgba(10,15,26,0.85));
      border: 1px solid rgba(212,168,67,0.22);
      border-radius: 22px;
      padding: 18px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 40px rgba(212,168,67,0.06);
      overflow: hidden;
      position: relative;
    }
    .msl-card::before {
      content: '';
      position: absolute; top: -50px; right: -50px;
      width: 160px; height: 160px; border-radius: 50%;
      background: radial-gradient(circle, rgba(212,168,67,0.08), transparent 65%);
      pointer-events: none;
    }
    .msl-card-hd {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    }
    .msl-card-icon {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(145deg, #2a1e00, #1a1200);
      border: 1px solid rgba(212,168,67,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      box-shadow: 0 0 12px rgba(212,168,67,0.25);
    }
    .msl-card-title {
      font-size: .84rem; font-weight: 700; color: var(--text); letter-spacing: .02em;
    }
    .msl-card-sub {
      font-size: .62rem; color: var(--gold); opacity: .75; letter-spacing: .06em;
      margin-top: 2px;
    }
    .msl-perm-btn {
      display: flex; align-items: center; gap: 8px;
      background: rgba(212,168,67,0.1);
      border: 1px solid rgba(212,168,67,0.3);
      border-radius: 12px;
      color: var(--gold); font-size: .72rem; font-weight: 600;
      padding: 10px 16px; cursor: pointer;
      transition: all 0.2s; margin-top: 12px;
      font-family: 'DM Sans', sans-serif;
    }
    .msl-perm-btn:active { transform: scale(0.95); }

    /* ══════ QIBLA COMPASS ══════ */
    .qibla-card { animation: qiblaBreath 5s ease-in-out infinite; }
    @keyframes qiblaBreath {
      0%,100% { box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 30px rgba(212,168,67,0.06); }
      50%      { box-shadow: 0 8px 40px rgba(0,0,0,0.5),  0 0 50px rgba(212,168,67,0.12); }
    }
    .qibla-badge {
      margin-left: auto;
      background: rgba(212,168,67,0.12);
      border: 1px solid rgba(212,168,67,0.3);
      border-radius: 20px; padding: 4px 12px;
      font-family: 'DM Mono', monospace;
      font-size: .78rem; font-weight: 700; color: var(--gold2);
      transition: all 0.4s ease;
    }
    .qibla-badge.aligned {
      background: rgba(45,212,160,0.15);
      border-color: rgba(45,212,160,0.5);
      color: #2dd4a0;
      box-shadow: 0 0 16px rgba(45,212,160,0.4);
    }

    .qibla-compass-wrap {
      position: relative;
      width: 220px; height: 220px;
      margin: 0 auto 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .qibla-halo {
      position: absolute; inset: -12px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212,168,67,0.06) 0%, transparent 70%);
      transition: all 0.5s ease;
    }
    .qibla-halo.aligned {
      background: radial-gradient(circle, rgba(45,212,160,0.25) 0%, rgba(45,212,160,0.05) 50%, transparent 70%);
      animation: qiblaAlignedPulse 1s ease-in-out 3;
    }
    @keyframes qiblaAlignedPulse {
      0%,100% { transform: scale(1); opacity: 0.8; }
      50%      { transform: scale(1.08); opacity: 1; }
    }

    .qibla-compass-ring {
      width: 200px; height: 200px; border-radius: 50%;
      border: 1.5px solid rgba(212,168,67,0.25);
      background: radial-gradient(circle at 35% 35%,
        rgba(30,20,5,0.9), rgba(8,12,20,0.95));
      position: relative;
      box-shadow:
        inset 0 0 40px rgba(0,0,0,0.6),
        0 0 0 1px rgba(212,168,67,0.08),
        0 0 30px rgba(212,168,67,0.1);
      transition: transform 0.15s linear;
      will-change: transform;
    }
    .qibla-compass-marks {
      position: absolute; inset: 0;
      pointer-events: none;
      transition: transform 0.15s linear;
      will-change: transform;
    }
    .q-mark {
      position: absolute;
      font-size: .6rem; font-weight: 800; color: rgba(212,168,67,0.5);
      font-family: 'DM Mono', monospace; letter-spacing: .05em;
    }
    .q-n { top: 8px;  left: 50%; transform: translateX(-50%); }
    .q-s { bottom:8px;left: 50%; transform: translateX(-50%); }
    .q-e { right:8px; top: 50%;  transform: translateY(-50%); }
    .q-w { left: 8px; top: 50%;  transform: translateY(-50%); }

    .qibla-needle-wrap {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s linear;
      will-change: transform;
    }
    .qibla-needle-body {
      position: relative;
      display: flex; flex-direction: column; align-items: center;
      height: 160px;
    }
    .qibla-kaaba-tip {
      font-size: 18px; line-height: 1;
      filter: drop-shadow(0 0 8px rgba(212,168,67,0.9));
      margin-bottom: -2px; z-index: 2;
    }
    .qibla-needle-shaft {
      width: 3px; flex: 1;
      background: linear-gradient(to bottom, #f5c257, #d4a843 50%, rgba(212,168,67,0.3));
      border-radius: 2px;
      box-shadow: 0 0 8px rgba(212,168,67,0.6);
    }
    .qibla-needle-tail {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(212,168,67,0.4);
      margin-top: 2px;
    }
    .qibla-center-dot {
      position: absolute; top: 50%; left: 50%;
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--gold2);
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px rgba(212,168,67,0.8);
      z-index: 10;
    }

    .qibla-info-row {
      display: flex; gap: 12px; margin-top: 4px;
    }
    .qibla-info-item {
      flex: 1; background: rgba(212,168,67,0.06);
      border: 1px solid rgba(212,168,67,0.12);
      border-radius: 12px; padding: 10px 12px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .qibla-info-lbl { font-size: .58rem; color: var(--text2); letter-spacing: .1em; text-transform: uppercase; }
    .qibla-info-val { font-size: .88rem; font-weight: 700; color: var(--gold2); font-family: 'DM Mono', monospace; }

    /* ══════ PRAYER TIMES ══════ */
    .prayer-countdown-wrap {
      margin-left: auto;
      text-align: right;
    }
    .prayer-countdown {
      font-family: 'DM Mono', monospace;
      font-size: .9rem; font-weight: 700;
      color: var(--gold2);
      background: rgba(212,168,67,0.1);
      border: 1px solid rgba(212,168,67,0.25);
      border-radius: 10px; padding: 5px 10px;
      letter-spacing: .06em;
      animation: countdownPulse 1s ease-in-out infinite;
    }
    @keyframes countdownPulse {
      0%,100% { opacity: 1; }
      50%      { opacity: 0.8; }
    }

    .prayer-grid {
      display: flex; flex-direction: column; gap: 6px;
    }
    .prayer-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      transition: all 0.25s ease; position: relative;
    }
    .prayer-item.past {
      opacity: 0.4;
    }
    .prayer-item.next {
      background: rgba(212,168,67,0.1);
      border-color: rgba(212,168,67,0.35);
      box-shadow: 0 0 20px rgba(212,168,67,0.1);
    }
    .prayer-icon  { font-size: 1rem; width: 20px; text-align: center; }
    .prayer-name  { font-size: .8rem; font-weight: 700; color: var(--text); flex: 1; }
    .prayer-time  { font-family: 'DM Mono', monospace; font-size: .82rem; color: var(--gold2); font-weight: 600; }
    .prayer-next-dot {
      position: absolute; right: -4px; top: 50%; transform: translateY(-50%);
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--gold); box-shadow: 0 0 8px rgba(212,168,67,0.8);
      animation: neonDotPulse 1.5s ease-in-out infinite;
    }

    .prayer-notif-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 12px; flex-wrap: wrap; gap: 8px;
    }
    .prayer-method-lbl {
      font-size: .58rem; color: var(--text2); letter-spacing: .06em;
    }

    /* ══════ HADITH ══════ */
    .hadith-card { animation: hadithBreath 6s ease-in-out infinite; }
    @keyframes hadithBreath {
      0%,100% { box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(212,168,67,0.05); }
      50%      { box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 40px rgba(212,168,67,0.10); }
    }

    /* Badge verrou compte à rebours */
    .hadith-lock-badge {
      margin-left: auto;
      display: flex; align-items: center; gap: 5px;
      background: rgba(212,168,67,0.08);
      border: 1px solid rgba(212,168,67,0.2);
      border-radius: 20px; padding: 4px 10px;
      color: rgba(212,168,67,0.6);
      font-size: .62rem; font-family: 'DM Mono', monospace;
      white-space: nowrap; flex-shrink: 0;
    }
    .hadith-lock-badge svg { flex-shrink: 0; opacity: 0.7; }

    .hadith-content { position: relative; min-height: 80px; }
    .hadith-animate { animation: hadithIn 0.55s cubic-bezier(.34,1.2,.64,1) both; }
    @keyframes hadithIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .hadith-num-badge {
      display: inline-block;
      font-size: .58rem; font-weight: 800; letter-spacing: .14em;
      color: var(--gold); background: rgba(212,168,67,0.1);
      border: 1px solid rgba(212,168,67,0.25);
      border-radius: 20px; padding: 3px 10px;
      margin-bottom: 14px; text-transform: uppercase;
    }

    .hadith-arabic {
      font-size: 1.1rem; line-height: 1.9;
      color: var(--gold2);
      text-shadow: 0 0 18px rgba(212,168,67,0.3);
      direction: rtl; text-align: right;
      margin-bottom: 14px;
      font-family: 'Amiri', 'Arial', serif;
      letter-spacing: .02em;
    }

    .hadith-french {
      font-size: .82rem; line-height: 1.7;
      color: var(--text);
      background: rgba(255,255,255,0.03);
      border-left: 2px solid rgba(212,168,67,0.4);
      padding: 10px 14px;
      border-radius: 0 10px 10px 0;
      margin-bottom: 12px;
      font-style: italic;
    }

    .hadith-meta {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px;
    }
    .hadith-narrator { font-size: .7rem; color: var(--text2); font-style: italic; }
    .hadith-source   { font-size: .65rem; font-weight: 700; color: var(--gold); opacity: .75;
                       background: rgba(212,168,67,0.08); border-radius: 8px; padding: 2px 8px; }

    .hadith-tafsir {
      background: rgba(212,168,67,0.05);
      border: 1px solid rgba(212,168,67,0.12);
      border-radius: 14px; padding: 14px;
    }
    .hadith-tafsir-lbl {
      font-size: .6rem; font-weight: 800; letter-spacing: .12em;
      color: var(--gold); text-transform: uppercase; margin-bottom: 8px;
    }
    .hadith-tafsir p {
      font-size: .78rem; line-height: 1.7; color: var(--text2);
    }

    /* ══════ FAB ITEM MUSLIM ══════ */
    .fab-item-muslim .fab-item-ico {
      background: linear-gradient(145deg, rgba(212,168,67,0.2), rgba(10,15,26,0.8)) !important;
    }
  `;
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════
//  INJECTION DU SCREEN + FAB ITEM
// ══════════════════════════════════════════════════════════════
function injectMuslimScreen() {
  if (document.getElementById('screen-muslim')) return;

  // Section HTML du screen
  const main = document.getElementById('app-main');
  if (!main) return;

  const section = document.createElement('section');
  section.id = 'screen-muslim';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-scroll">
      <div class="msl-screen-header">
        <span class="msl-screen-crescent">☽</span>
        <span class="msl-screen-title">MUSLIM</span>
      </div>
      <div class="msl-bismi">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
    </div>
  `;
  main.appendChild(section);

  // Ajouter "Muslim" à la map des labels de navigation
  if (window.PAGE_LABELS) window.PAGE_LABELS['muslim'] = 'Muslim';
  else {
    const origGoTo = window.goTo;
    window.goTo = function(id) {
      origGoTo(id);
      if (id === 'muslim') {
        const lbl = document.getElementById('page-label');
        if (lbl) lbl.textContent = 'Muslim';
      }
    };
  }
}

function injectMuslimFABItem() {
  const fabMenu = document.getElementById('fab-menu');
  if (!fabMenu || document.getElementById('fab-item-muslim')) return;

  const btn = document.createElement('button');
  btn.id = 'fab-item-muslim';
  btn.className = 'fab-item fab-item-muslim';
  btn.setAttribute('onclick', "fabGo('muslim')");
  btn.innerHTML = `
    <div class="fab-item-ico">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M12 2C8 2 4 5.5 4 10c0 3.5 2 6.5 5 8l3 2 3-2c3-1.5 5-4.5 5-8 0-4.5-4-8-8-8z"/>
        <path d="M9 10a3 3 0 1 0 4-2.8"/>
        <path d="M15 7.5c-1-1-2.5-1.5-4-1"/>
      </svg>
    </div>
    <span>Muslim</span>
    <span class="fab-neon-dot"></span>
  `;
  fabMenu.appendChild(btn);
}

// ══════════════════════════════════════════════════════════════
//  INIT PRINCIPAL DU MODULE
// ══════════════════════════════════════════════════════════════
function initMuslimModule() {
  injectMuslimStyles();
  injectMuslimScreen();
  injectMuslimFABItem();

  // Attendre que l'app soit visible
  const tryInit = () => {
    const app = document.getElementById('app');
    if (!app?.classList.contains('hidden')) {
      setTimeout(() => {
        // 1. Permissions en premier (lit le localStorage)
        WOD_PERMISSIONS.restoreOnStartup();
        // 2. Modules qui dépendent des permissions
        QIBLA.init();
        PRAYERS.init();
        HADITH.init();
        DHIKR.init();
        // 3. Panel profil (peut être injecté après)
        setTimeout(() => WOD_PERMISSIONS.injectProfilPanel(), 300);
      }, 600);
    } else {
      const obs = new MutationObserver(() => {
        if (!app?.classList.contains('hidden')) {
          obs.disconnect();
          setTimeout(() => {
            WOD_PERMISSIONS.restoreOnStartup();
            QIBLA.init();
            PRAYERS.init();
            HADITH.init();
            DHIKR.init();
            setTimeout(() => WOD_PERMISSIONS.injectProfilPanel(), 300);
          }, 600);
        }
      });
      if (app) obs.observe(app, { attributes: true, attributeFilter: ['class'] });
    }
  };
  tryInit();

  // Hook goTo
  const _origGoTo = window.goTo;
  window.goTo = function(id) {
    _origGoTo(id);
    if (id === 'muslim') {
      setTimeout(() => { PRAYERS._calculate(); QIBLA._startGPS(); }, 200);
    }
    if (id === 'profil') {
      setTimeout(() => WOD_PERMISSIONS.updateProfilUI(), 150);
    }
  };
}

// ══════════════════════════════════════════════════════════════
//  WOD PERMISSIONS — Boussole & Rappels prière depuis Profil
//  Persistance via localStorage — pas de redemande à chaque ouverture
// ══════════════════════════════════════════════════════════════
const WOD_PERMISSIONS = {
  LS_COMPASS: 'wod_perm_compass',
  LS_NOTIF:   'wod_perm_notif',

  // Restaure les permissions au démarrage
  restoreOnStartup() {
    // Notifications : si le navigateur a déjà accordé → mémoriser
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      localStorage.setItem(this.LS_NOTIF, '1');
    }
    // Boussole : si déjà accordée → réactiver l'écouteur directement
    if (localStorage.getItem(this.LS_COMPASS) === '1') {
      this._startCompassListener();
    }
  },

  // Démarre l'écouteur orientation (appelé après permission)
  _startCompassListener() {
    if (this._compassListening) return;
    this._compassListening = true;
    const handler = (e) => {
      const h = e.webkitCompassHeading ?? (e.alpha ? (360 - e.alpha) : null);
      if (h === null) return;
      if (window.QIBLA) { window.QIBLA.deviceHeading = h; window.QIBLA._updateNeedle(); }
    };
    window.addEventListener('deviceorientation', handler, true);
    const btn = document.getElementById('qibla-permission-btn');
    if (btn) btn.style.display = 'none';
  },

  async requestCompass() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === 'granted') {
          localStorage.setItem(this.LS_COMPASS, '1');
          this._compassListening = false; // reset pour re-attacher
          this._startCompassListener();
          this.updateProfilUI();
          if (typeof showToast === 'function') showToast('✅ Boussole activée');
        } else {
          if (typeof showToast === 'function') showToast('⚠️ Permission boussole refusée');
        }
      } catch(e) {
        if (typeof showToast === 'function') showToast('⚠️ Erreur permission boussole');
      }
    } else {
      // Android/desktop : accès direct
      localStorage.setItem(this.LS_COMPASS, '1');
      this._compassListening = false;
      this._startCompassListener();
      this.updateProfilUI();
      if (typeof showToast === 'function') showToast('✅ Boussole activée');
    }
  },

  revokeCompass() {
    localStorage.setItem(this.LS_COMPASS, '0');
    this._compassListening = false;
    this.updateProfilUI();
    if (typeof showToast === 'function') showToast('Boussole désactivée');
  },

  async requestNotif() {
    if (!('Notification' in window)) {
      if (typeof showToast === 'function') showToast('⚠️ Notifications non supportées');
      return;
    }
    if (Notification.permission === 'granted') {
      localStorage.setItem(this.LS_NOTIF, '1');
      this.updateProfilUI();
      if (typeof showToast === 'function') showToast('✅ Rappels déjà activés');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      localStorage.setItem(this.LS_NOTIF, '1');
    } else {
      localStorage.setItem(this.LS_NOTIF, '0');
    }
    this.updateProfilUI();
    if (typeof showToast === 'function') showToast(perm === 'granted' ? '✅ Rappels activés' : '⚠️ Refusé dans les réglages');
  },

  revokeNotif() {
    localStorage.setItem(this.LS_NOTIF, '0');
    this.updateProfilUI();
    if (typeof showToast === 'function') showToast('Rappels prière désactivés');
  },

  isCompassOn()  { return localStorage.getItem(this.LS_COMPASS) === '1'; },
  isNotifOn()    { return localStorage.getItem(this.LS_NOTIF) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted'; },

  updateProfilUI() {
    const ct = document.getElementById('perm-compass-toggle');
    const nt = document.getElementById('perm-notif-toggle');
    const cs = document.getElementById('perm-compass-status');
    const ns = document.getElementById('perm-notif-status');
    if (ct) {
      const on = this.isCompassOn();
      ct.classList.toggle('perm-on', on); ct.classList.toggle('perm-off', !on);
      if (cs) cs.textContent = on ? 'Activée' : 'Désactivée';
    }
    if (nt) {
      const on = this.isNotifOn();
      nt.classList.toggle('perm-on', on); nt.classList.toggle('perm-off', !on);
      if (ns) ns.textContent = on ? 'Activés' : 'Désactivés';
    }
  },

  injectProfilPanel() {
    if (document.getElementById('wod-permissions-card')) return;
    const profilScroll = document.querySelector('#screen-profil .screen-scroll');
    if (!profilScroll) return;

    const card = document.createElement('div');
    card.id = 'wod-permissions-card';
    card.className = 'card accordion-card';
    card.innerHTML = `
      <div class="acc-hd" onclick="toggleAccordion('wod-permissions-card')">
        <span class="card-title" style="margin:0">🔐 Autorisations</span>
        <svg class="acc-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="acc-body">
        <div style="display:flex;flex-direction:column;gap:14px;padding-top:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;font-size:.88rem;">🧭 Boussole Qibla</div>
              <div style="font-size:.75rem;color:var(--text-dim);margin-top:2px;">Orientation vers La Mecque · <span id="perm-compass-status">Désactivée</span></div>
            </div>
            <button id="perm-compass-toggle" class="perm-toggle perm-off" onclick="WOD_PERMISSIONS._onCompassToggle()">
              <span class="perm-knob"></span>
            </button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;font-size:.88rem;">🔔 Rappels de prière</div>
              <div style="font-size:.75rem;color:var(--text-dim);margin-top:2px;">Notification 5 min avant · <span id="perm-notif-status">Désactivés</span></div>
            </div>
            <button id="perm-notif-toggle" class="perm-toggle perm-off" onclick="WOD_PERMISSIONS._onNotifToggle()">
              <span class="perm-knob"></span>
            </button>
          </div>
        </div>
      </div>`;

    const dangerCard = profilScroll.querySelector('.card-danger');
    if (dangerCard) profilScroll.insertBefore(card, dangerCard);
    else profilScroll.appendChild(card);

    if (!document.getElementById('perm-toggle-css')) {
      const s = document.createElement('style');
      s.id = 'perm-toggle-css';
      s.textContent = `
        .perm-toggle { position:relative; width:50px; height:28px; border-radius:14px; border:none; cursor:pointer; transition:background .3s; flex-shrink:0; outline:none; }
        .perm-toggle.perm-off { background:rgba(255,255,255,0.12); }
        .perm-toggle.perm-on  { background:linear-gradient(135deg,#d4a843,#f5c257); box-shadow:0 0 12px rgba(212,168,67,0.5); }
        .perm-knob { position:absolute; top:3px; width:22px; height:22px; background:#fff; border-radius:50%; transition:left .3s cubic-bezier(.34,1.56,.64,1); box-shadow:0 2px 6px rgba(0,0,0,.3); }
        .perm-toggle.perm-off .perm-knob { left:3px; }
        .perm-toggle.perm-on  .perm-knob { left:25px; }`;
      document.head.appendChild(s);
    }
    this.updateProfilUI();
  },

  _onCompassToggle() { this.isCompassOn() ? this.revokeCompass() : this.requestCompass(); },
  _onNotifToggle()   { this.isNotifOn()   ? this.revokeNotif()   : this.requestNotif();  },
  _compassListening: false,
};
window.WOD_PERMISSIONS = WOD_PERMISSIONS;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMuslimModule);
} else {
  initMuslimModule();
}
