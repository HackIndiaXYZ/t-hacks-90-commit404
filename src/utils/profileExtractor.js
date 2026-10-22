// Smart profile field extractor supporting English, Hindi (Devanagari), and Hinglish.
// Works offline directly in the browser or on the backend as a robust fallback.
import { STATES } from '../data/states.js';

// Hindi, Hinglish, and English number words for common ages/quantities
const HINDI_NUMBER_WORDS = {
  'अठारह': 18, 'उन्नीस': 19, 'बीस': 20, 'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25,
  'छब्बीस': 26, 'सत्ताईस': 27, 'अट्ठाइस': 28, 'उनतीस': 29, 'तीस': 30, 'इकतीस': 31, 'बत्तीस': 32, 'पैंतीस': 35,
  'चालीस': 40, 'पैंतालीस': 45, 'पचास': 50, 'पचपन': 55, 'साठ': 60, 'पैंसठ': 65, 'सत्तर': 70, 'पचहत्तर': 75, 'अस्सी': 80,
  // Hinglish
  'atharah': 18, 'unnees': 19, 'bees': 20, 'ikkees': 21, 'baees': 22, 'paintees': 35, 'chalis': 40, 'pentalis': 45, 'pachaas': 50, 'saath': 60, 'painsath': 65,
  // English
  'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'twenty-one': 21, 'twenty-two': 22, 'twenty-five': 25,
  'thirty': 30, 'thirty-two': 32, 'thirty-five': 35, 'forty': 40, 'forty-five': 45,
  'fifty': 50, 'fifty-five': 55, 'sixty': 60, 'sixty-five': 65, 'seventy': 70, 'eighty': 80,
  'twenty one': 21, 'twenty two': 22, 'twenty five': 25, 'thirty five': 35, 'forty five': 45, 'fifty five': 55, 'sixty five': 65,
};

// Hindi state name mapping
const HINDI_STATE_MAP = {
  'बिहार': 'Bihar',
  'उत्तर प्रदेश': 'Uttar Pradesh',
  'यूपी': 'Uttar Pradesh',
  'मध्य प्रदेश': 'Madhya Pradesh',
  'एमपी': 'Madhya Pradesh',
  'राजस्थान': 'Rajasthan',
  'महाराष्ट्र': 'Maharashtra',
  'झारखंड': 'Jharkhand',
  'पश्चिम बंगाल': 'West Bengal',
  'बंगाल': 'West Bengal',
  'दिल्ली': 'Delhi',
  'पंजाब': 'Punjab',
  'हरियाणा': 'Haryana',
  'गुजरात': 'Gujarat',
  'ओडिशा': 'Odisha',
  'उड़ीसा': 'Odisha',
  'छत्तीसगढ़': 'Chhattisgarh',
  'उत्तराखंड': 'Uttarakhand',
  'असम': 'Assam',
  'तमिलनाडु': 'Tamil Nadu',
  'कर्नाटक': 'Karnataka',
  'केरल': 'Kerala',
  'आंध्र प्रदेश': 'Andhra Pradesh',
  'तेलंगाना': 'Telangana',
  'हिमाचल प्रदेश': 'Himachal Pradesh',
  'जम्मू और कश्मीर': 'Jammu and Kashmir',
  'जम्मू कश्मीर': 'Jammu and Kashmir',
  'गोवा': 'Goa',
  'त्रिपुरा': 'Tripura',
  'मणिपुर': 'Manipur',
  'मेघालय': 'Meghalaya',
  'नागालैंड': 'Nagaland',
  'मिजोरम': 'Mizoram',
  'सिक्किम': 'Sikkim',
};

// Pre-sorted number phrases by length descending to match composite phrases (e.g. "thirty five" before "thirty")
const SORTED_NUMBER_PHRASES = Object.keys(HINDI_NUMBER_WORDS).sort((a, b) => b.length - a.length);

/**
 * Extract an age integer from text.
 * Handles digits ("45", "45 years", "उम्र 45 साल") and Hindi number words.
 */
export function extractAge(text) {
  if (!text) return null;
  const str = String(text).trim();

  // Pure 1-3 digits
  if (/^\d{1,3}$/.test(str)) {
    const num = parseInt(str, 10);
    if (num >= 0 && num <= 120) return num;
  }

  // Check direct number words or multi-word phrases (longest first)
  const lower = str.toLowerCase();
  for (const phrase of SORTED_NUMBER_PHRASES) {
    if (lower.includes(phrase)) {
      return HINDI_NUMBER_WORDS[phrase];
    }
  }

  // Regex patterns with keywords
  const patterns = [
    /(?:उम्र|आयु|age|years?|yrs?|yr|साल|वर्ष)\s*[:=-]?\s*(\d{1,3})/i,
    /(\d{1,3})\s*(?:years?|yrs?|yr|साल|वर्ष|का|की)/i,
    /\b(\d{1,2})\b/,
  ];

  for (const pat of patterns) {
    const m = str.match(pat);
    if (m && m[1]) {
      const num = parseInt(m[1], 10);
      if (num >= 0 && num <= 120) return num;
    }
  }

  return null;
}

/**
 * Extract Indian state from text.
 */
export function extractState(text) {
  if (!text) return null;
  const str = String(text).trim();

  // Check direct Hindi mapping
  for (const [hiName, enName] of Object.entries(HINDI_STATE_MAP)) {
    if (str.includes(hiName)) return enName;
  }

  // Check exact or partial match with English state names
  const lower = str.toLowerCase();
  for (const st of STATES) {
    if (lower.includes(st.toLowerCase())) {
      return st;
    }
  }

  // Check common abbreviations
  if (/\b(up|u\.p\.)\b/i.test(str)) return 'Uttar Pradesh';
  if (/\b(mp|m\.p\.)\b/i.test(str)) return 'Madhya Pradesh';
  if (/\b(wb|w\.b\.)\b/i.test(str)) return 'West Bengal';
  if (/\b(uk|u\.k\.)\b/i.test(str)) return 'Uttarakhand';

  return null;
}

/**
 * Extract occupation.
 */
export function extractOccupation(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();

  // Farmer / Agriculture
  if (
    lower.includes('farmer') ||
    lower.includes('किसान') ||
    lower.includes('kisan') ||
    lower.includes('खेती') ||
    lower.includes('कृषि') ||
    lower.includes('काश्तकार')
  ) {
    return 'farmer';
  }

  // Student
  if (
    lower.includes('student') ||
    lower.includes('छात्र') ||
    lower.includes('छात्रा') ||
    lower.includes('विद्यार्थी') ||
    lower.includes('padhai') ||
    lower.includes('कॉलेज') ||
    lower.includes('स्कूल')
  ) {
    return 'student';
  }

  // Unemployed / Jobseeker
  if (
    lower.includes('unemployed') ||
    lower.includes('बेरोजगार') ||
    lower.includes('berojgar') ||
    lower.includes('नौकरी ढूंढ') ||
    lower.includes('jobless')
  ) {
    return 'unemployed';
  }

  // Self-Employed / Business / Vendor
  if (
    lower.includes('self-employed') ||
    lower.includes('self employed') ||
    lower.includes('व्यवसाय') ||
    lower.includes('व्यापारी') ||
    lower.includes('दुकान') ||
    lower.includes('दुकानदार') ||
    lower.includes('vendor') ||
    lower.includes('street vendor') ||
    lower.includes('रेहड़ी') ||
    lower.includes('पटरी') ||
    lower.includes('बिजनेस') ||
    lower.includes('कारीगर') ||
    lower.includes('artisan')
  ) {
    return 'selfEmployed';
  }

  // Employed / Salaried
  if (
    lower.includes('employed') ||
    lower.includes('नौकरी') ||
    lower.includes('job') ||
    lower.includes('salaried') ||
    lower.includes('कर्मचारी') ||
    lower.includes('service')
  ) {
    return 'employed';
  }

  return null;
}

/**
 * Extract land ownership.
 */
export function extractLandOwnership(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();

  if (
    lower.includes('नहीं') ||
    lower.includes('no') ||
    lower.includes('landless') ||
    lower.includes('भूमिहीन') ||
    lower.includes('na')
  ) {
    return 'no';
  }

  if (
    lower.includes('हाँ') ||
    lower.includes('हां') ||
    lower.includes('yes') ||
    lower.includes('ज़मीन है') ||
    lower.includes('जमीन है') ||
    lower.includes('खेती की जमीन') ||
    lower.includes('acre') ||
    lower.includes('एकड़') ||
    lower.includes('bigha') ||
    lower.includes('बीघा') ||
    lower.includes('land') ||
    lower.includes('खेत')
  ) {
    return 'yes';
  }

  if (lower.includes('unsure') || lower.includes('पता नहीं')) return 'unsure';

  return null;
}

/**
 * Extract annual family income.
 * Handles "1.5 लाख", "80000", "2 lakh", "50 हजार", "unsure"
 */
export function extractIncome(text) {
  if (!text) return null;
  const str = String(text).trim();
  const lower = str.toLowerCase();

  if (lower.includes('unsure') || lower.includes('पता नहीं') || lower.includes('याद नहीं') || lower.includes('not sure')) {
    return 'unsure';
  }

  // Clean currency symbols and commas
  const cleaned = str.replace(/[₹,]/g, '').trim();

  // Pattern: "1.5 लाख" or "1.5 lakh"
  const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:लाख|lakhs?|lac|lacs?)(?:[^\w]|$)/i);
  if (lakhMatch && lakhMatch[1]) {
    const val = parseFloat(lakhMatch[1]) * 100000;
    return Math.round(val);
  }

  // Pattern: "50 हजार" or "50 thousand" or "50k"
  const thousandMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:हजार|हज़ार|thousand|k)(?:[^\w]|$)/i);
  if (thousandMatch && thousandMatch[1]) {
    const val = parseFloat(thousandMatch[1]) * 1000;
    return Math.round(val);
  }

  // Pattern: Direct large number (e.g. 80000 or 150000)
  const numMatch = cleaned.match(/\b(\d{4,8})\b/);
  if (numMatch && numMatch[1]) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * Extract gender.
 */
export function extractGender(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();

  if (
    lower.includes('female') ||
    lower.includes('महिला') ||
    lower.includes('woman') ||
    lower.includes('girl') ||
    lower.includes('लड़की') ||
    lower.includes('स्त्री') ||
    lower.includes('aurat')
  ) {
    return 'female';
  }

  if (
    lower.includes('male') ||
    lower.includes('पुरुष') ||
    lower.includes('man') ||
    lower.includes('boy') ||
    lower.includes('लड़का') ||
    lower.includes('aadmi') ||
    lower.includes('mard')
  ) {
    return 'male';
  }

  return null;
}

/**
 * Extract complete profile from any natural sentence or speech transcript.
 */
export function extractFullProfile(text) {
  if (!text) return {};
  const res = {};

  const age = extractAge(text);
  if (age !== null) res.age = age;

  const state = extractState(text);
  if (state !== null) {
    res.state = state;
    // If state is mentioned and no separate domicile specified, default domicile to residence state
    res.domicile = state;
  }

  const occ = extractOccupation(text);
  if (occ !== null) {
    res.occupation = occ;
    if (occ === 'student') res.isStudent = 'yes';
  }

  const land = extractLandOwnership(text);
  if (land !== null) res.ownsLand = land;

  const inc = extractIncome(text);
  if (inc !== null) res.annualIncome = inc;

  const gen = extractGender(text);
  if (gen !== null) res.gender = gen;

  const lower = String(text).toLowerCase();
  if (lower.includes('दिव्यांग') || lower.includes('विकलांग') || lower.includes('disability') || lower.includes('handicap')) {
    res.hasDisabilityCertificate = 'yes';
  }

  return res;
}
