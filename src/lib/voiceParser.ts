import { ParsedVoiceResult, PaymentMethod } from '@/types';
import { getDateStringIST, getTodayIST } from './constants';

// Map of Hindi number words to their numeric values
const HINDI_NUMBERS: Record<string, number> = {
  'शून्य': 0, 'जीरो': 0,
  'एक': 1, 'वन': 1, 'ek': 1, 'one': 1,
  'दो': 2, 'टू': 2, 'do': 2, 'two': 2,
  'तीन': 3, 'थ्री': 3, 'teen': 3, 'three': 3,
  'चार': 4, 'फोर': 4, 'char': 4, 'chaar': 4, 'four': 4,
  'पांच': 5, 'पाँच': 5, 'फाइव': 5, 'paanch': 5, 'panch': 5, 'five': 5,
  'छह': 6, 'छः': 6, 'सिक्स': 6, 'chhe': 6, 'six': 6,
  'सात': 7, 'सेवन': 7, 'saat': 7, 'seven': 7,
  'आठ': 8, 'एट': 8, 'aath': 8, 'eight': 8,
  'नौ': 9, 'नाइन': 9, 'nau': 9, 'nine': 9,
  'दस': 10, 'टेन': 10, 'das': 10, 'dus': 10, 'ten': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
  'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20, 'bees': 20,
  'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पैंतालीस': 45,
  'पचास': 50, 'pachas': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
};

const MULTIPLIERS: Record<string, number> = {
  'सौ': 100, 'हंड्रेड': 100, 'hundred': 100, 'sau': 100,
  'हजार': 1000, 'हज़ार': 1000, 'थाउजेंड': 1000, 'thousand': 1000, 'k': 1000, 'hazar': 1000,
  'लाख': 100000, 'lakh': 100000, 'lac': 100000,
  'करोड़': 10000000, 'crore': 10000000,
};

// Word to number mapping used for Apple iOS STT hybrid numbers (e.g. Paanch000 -> 5000, das000 -> 10000, do00 -> 200)
export const HINDI_WORD_TO_DIGIT: Record<string, number> = {
  'ek': 1, 'one': 1, 'एक': 1,
  'do': 2, 'two': 2, 'दो': 2,
  'teen': 3, 'three': 3, 'तीन': 3,
  'char': 4, 'chaar': 4, 'four': 4, 'चार': 4,
  'paanch': 5, 'panch': 5, 'five': 5, 'पांच': 5, 'पाँच': 5,
  'chhe': 6, 'chheh': 6, 'six': 6, 'छह': 6, 'छः': 6,
  'saat': 7, 'seven': 7, 'सात': 7,
  'aath': 8, 'eight': 8, 'आठ': 8,
  'nau': 9, 'nine': 9, 'नौ': 9,
  'das': 10, 'dus': 10, 'ten': 10, 'दस': 10,
  'gyarah': 11, 'ग्यारह': 11,
  'barah': 12, 'बारह': 12,
  'terah': 13, 'तेरह': 13,
  'chaudah': 14, 'चौदह': 14,
  'pandrah': 15, 'पंद्रह': 15,
  'solah': 16, 'सोलह': 16,
  'satrah': 17, 'सत्रह': 17,
  'atharah': 18, 'अठारह': 18,
  'unnis': 19, 'उन्नीस': 19,
  'bees': 20, 'बीस': 20,
  'pachees': 25, 'पच्चीस': 25,
  'tees': 30, 'तीस': 30,
  'paintis': 35, 'पैंतीस': 35,
  'chalis': 40, 'चालीस': 40,
  'paintalis': 45, 'पैंतालीस': 45,
  'pachas': 50, 'pachaas': 50, 'पचास': 50,
  'sau': 100, 'सौ': 100,
};

/**
 * Normalizes speech-to-text transcripts, specifically auto-healing Apple iOS STT quirks
 * where conversational Hindi numbers are outputted as Romanized phonetic word + zeros
 * (e.g. "Paanch000" -> "5000", "das000" -> "10000", "do00" -> "200").
 * This is 100% transparent and safe for Android, because Android outputs standard numbers ("5000").
 */
export function normalizeVoiceTranscript(transcript: string): string {
  if (!transcript) return '';
  return transcript.replace(/([a-zA-Z\u0900-\u097F]+)(0{2,})/gi, (match, prefix, zeros) => {
    const key = prefix.toLowerCase();
    if (HINDI_WORD_TO_DIGIT[key] !== undefined) {
      const num = HINDI_WORD_TO_DIGIT[key];
      const multiplier = Math.pow(10, zeros.length);
      return String(num * multiplier);
    }
    return match;
  });
}

// Known material / expense purpose patterns
const PURPOSE_DICTIONARY: { keywords: string[]; displayLabel: string; categoryId: string; categoryNameHi: string }[] = [
  {
    keywords: ['सीमेंट', 'सीमेन्ट', 'cement', 'सीमेंट की बोरी', 'सीमेंट का कट्टा'],
    displayLabel: 'सीमेंट',
    categoryId: 'cat-bricks-cement',
    categoryNameHi: 'ईंट, सीमेंट, सरिया, गिट्टी',
  },
  {
    keywords: ['सरिया', 'लोहा', 'स्टील', 'steel', 'iron', 'तार'],
    displayLabel: 'सरिया / लोहा',
    categoryId: 'cat-bricks-cement',
    categoryNameHi: 'ईंट, सीमेंट, सरिया, गिट्टी',
  },
  {
    keywords: ['ईंट', 'ईट', 'bricks', 'भट्ठा'],
    displayLabel: 'ईंट',
    categoryId: 'cat-bricks-cement',
    categoryNameHi: 'ईंट, सीमेंट, सरिया, गिट्टी',
  },
  {
    keywords: ['रेत', 'बालू', 'गिट्टी', 'बदरपुर', 'क्रशर', 'sand', 'aggregate'],
    displayLabel: 'रेत / गिट्टी / बालू',
    categoryId: 'cat-bricks-cement',
    categoryNameHi: 'ईंट, सीमेंट, सरिया, गिट्टी',
  },
  {
    keywords: ['मजदूर', 'मजदूरी', 'लेबर', 'हाजिरी', 'कारीगर', 'मिस्त्री', 'बेलदार', 'labour'],
    displayLabel: 'मजदूरी (Labour)',
    categoryId: 'cat-labour',
    categoryNameHi: 'मजदूरी और ठेकेदार',
  },
  {
    keywords: ['प्लंबिंग', 'पाइप', 'नल', 'फिटिंग', 'वाल', 'सीवर', 'टैंक', 'plumbing', 'pipe'],
    displayLabel: 'प्लंबिंग / पाइप',
    categoryId: 'cat-plumbing',
    categoryNameHi: 'प्लंबिंग और पाइपलाइन',
  },
  {
    keywords: ['बिजली', 'केबल', 'जनरेटर', 'लाइट', 'स्विच', 'पैनल', 'एमसीबी', 'वायरिंग', 'electrical'],
    displayLabel: 'बिजली फिटिंग / केबल',
    categoryId: 'cat-electrical',
    categoryNameHi: 'बिजली फिटिंग और जनरेटर',
  },
  {
    keywords: ['डीजल', 'पेट्रोल', 'petrol', 'diesel', 'fuel'],
    displayLabel: 'डीजल / पेट्रोल',
    categoryId: 'cat-fuel',
    categoryNameHi: 'डीजल और गाड़ी खर्च',
  },
  {
    keywords: ['गाड़ी', 'भाड़ा', 'किराया', 'लोडिंग', 'ट्रैक्टर', 'ट्रांसपोर्ट', 'transport', 'ऑटो', 'auto', 'रिक्शा', 'rickshaw', 'टैक्सी', 'taxi'],
    displayLabel: 'ट्रांसपोर्ट / भाड़ा',
    categoryId: 'cat-transport',
    categoryNameHi: 'ट्रांसपोर्ट और भाड़ा',
  },
  {
    keywords: ['झूला', 'राइड', 'स्लाइड', 'पूल', 'वाटरपार्क'],
    displayLabel: 'झूले / राइड्स',
    categoryId: 'cat-slides',
    categoryNameHi: 'झूले एवं राइड्स',
  },
  {
    keywords: ['फिल्टर', 'क्लोरीन', 'ट्रीटमेंट', 'केमिकल', 'दवा'],
    displayLabel: 'केमिकल्स / वाटर ट्रीटमेंट',
    categoryId: 'cat-chemicals',
    categoryNameHi: 'केमिकल्स और वाटर ट्रीटमेंट',
  },
  {
    keywords: ['चाय', 'नाश्ता', 'नाश्ते', 'खाना', 'खाने', 'भोजन', 'लंच', 'डिनर', 'पानी बोतल', 'बिस्कुट', 'food', 'snacks', 'lunch', 'dinner', 'khane'],
    displayLabel: 'चाय-नाश्ता / खाना',
    categoryId: 'cat-fnb',
    categoryNameHi: 'खान-पान सामान (F&B)',
  },
  {
    keywords: ['एडवांस', 'अग्रिम', 'पेशगी'],
    displayLabel: 'अग्रिम राशि (एडवांस)',
    categoryId: 'cat-advances',
    categoryNameHi: 'अग्रिम राशि (एडवांस)',
  },
];

// Words to strip out when determining the purpose
const STOP_WORDS = new Set([
  'आज', 'कल', 'परसों', 'को', 'से', 'के', 'लिए', 'लिये', 'का', 'की', 'रस', 'रुपये', 'रुपए', 'रु', 'पे',
  'दिए', 'दिया', 'पेमेंट', 'किया', 'कर', 'दें', 'भेजा', 'भेजे', 'है', 'था', 'थी', 'थे',
  'हजार', 'लाख', 'सौ', 'k', 'rs', 'rupees', 'diye', 'diya', 'ko', 'se', 'aaj', 'kal',
  'लेकिन', 'lekin', 'आई', 'आए', 'तो', 'और', 'aur', 'भी', 'bhi'
]);

const PAYMENT_TERMS = new Set([
  'upi', 'यूपीआई', 'गूगल पे', 'गूगलपे', 'gpay', 'फोनपे', 'फोन पे', 'phonepe',
  'पेटीएम', 'paytm', 'कैश', 'नकद', 'रोकड़ा', 'cash', 'बैंक', 'bank', 'खाते',
  'transfer', 'ट्रांसफर', 'neft', 'rtgs', 'चेक', 'cheque', 'कार्ड', 'card'
]);

/**
 * Extracts a numeric amount from spoken Hindi/English transcript.
 */
export function extractAmount(transcript: string): number | null {
  const normalized = normalizeVoiceTranscript(transcript);
  const clean = normalized.toLowerCase();

  // 1. Direct digit matching like "5000", "₹5000", "5,000"
  const directDigitMatch = clean.match(/(?:₹|रुपये|रु|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:रुपये|रुपए|rupees|rs)?/i);
  if (directDigitMatch && directDigitMatch[1]) {
    const rawNum = directDigitMatch[1].replace(/,/g, '');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) {
      // Check if followed by lakh/thousand/k
      const afterPart = clean.slice(clean.indexOf(directDigitMatch[1]) + directDigitMatch[1].length).trim();
      if (afterPart.startsWith('हजार') || afterPart.startsWith('thousand') || afterPart.startsWith('k')) {
        return parsed * 1000;
      }
      if (afterPart.startsWith('लाख') || afterPart.startsWith('lakh')) {
        return parsed * 100000;
      }
      return parsed;
    }
  }

  // 2. Hindi phrase special cases
  if (clean.includes('डेढ़ हजार') || clean.includes('1.5k')) return 1500;
  if (clean.includes('ढाई हजार') || clean.includes('2.5k')) return 2500;
  if (clean.includes('साढ़े तीन हजार')) return 3500;
  if (clean.includes('डेढ़ लाख')) return 150000;
  if (clean.includes('ढाई लाख')) return 250000;

  // 3. Word-based parsing: e.g. "पाँच हजार", "दो सौ", "पचास हजार"
  const tokens = clean.split(/\s+/);
  let total = 0;
  let currentGroup = 0;
  let foundNumber = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].replace(/[.,]/g, '');

    // Check if token is directly a number
    if (/^\d+$/.test(token)) {
      currentGroup = parseInt(token, 10);
      foundNumber = true;
      continue;
    }

    if (HINDI_NUMBERS[token] !== undefined) {
      currentGroup += HINDI_NUMBERS[token];
      foundNumber = true;
      continue;
    }

    if (MULTIPLIERS[token] !== undefined) {
      const mult = MULTIPLIERS[token];
      if (currentGroup === 0) currentGroup = 1;
      currentGroup *= mult;
      total += currentGroup;
      currentGroup = 0;
      foundNumber = true;
      continue;
    }
  }

  total += currentGroup;
  return foundNumber && total > 0 ? total : null;
}

/**
 * Extracts payment method from transcript
 */
export function extractPaymentMethod(transcript: string): PaymentMethod {
  const text = transcript.toLowerCase();
  if (
    text.includes('upi') ||
    text.includes('यूपीआई') ||
    text.includes('गूगल पे') ||
    text.includes('गूगलपे') ||
    text.includes('फोनपे') ||
    text.includes('फोन पे') ||
    text.includes('phonepe') ||
    text.includes('gpay') ||
    text.includes('जीपे') ||
    text.includes('पेटीएम') ||
    text.includes('paytm')
  ) {
    return 'upi';
  }
  if (text.includes('नकद') || text.includes('कैश') || text.includes('रोकड़ा') || text.includes('cash')) {
    return 'cash';
  }
  if (text.includes('बैंक') || text.includes('खाते') || text.includes('transfer') || text.includes('neft') || text.includes('rtgs')) {
    return 'bank_transfer';
  }
  if (text.includes('चेक') || text.includes('cheque')) {
    return 'cheque';
  }
  if (text.includes('कार्ड') || text.includes('card')) {
    return 'card';
  }
  return 'cash'; // Default fallback
}

/**
 * Extracts date from transcript (defaulting to today in IST)
 */
export function extractDate(transcript: string): string {
  const text = transcript.toLowerCase();

  if (text.includes('कल दिए थे') || text.includes('कल का') || text.includes('कल ')) {
    return getDateStringIST(-1);
  }

  if (text.includes('परसों')) {
    return getDateStringIST(-2);
  }

  return getTodayIST();
}

/**
 * Extracts vendor name if spoken (e.g. "शर्मा जी को", "पटेल को", "मजदूर को")
 */
export function extractVendor(transcript: string): string | undefined {
  const koMatch = transcript.match(/([^\s]+(?:\s+(?:जी|ji|ट्रेडर्स|traders|भट्ठा|ब्रदर्स|brothers))?)\s+(?:को|ko(?:\s|$))/i);
  if (koMatch && koMatch[1]) {
    const candidate = koMatch[1].trim();
    if (!['आज', 'कल', 'पैसे', 'रुपये', 'रुपए', 'सब', 'aaj', 'kal', 'paise', 'rupaye'].includes(candidate.toLowerCase())) {
      if (candidate.includes('शर्मा')) return 'शर्मा जी (Sharma Traders)';
      if (candidate.includes('पटेल')) return 'पटेल इलेक्ट्रिकल्स (Patel Electricals)';
      if (candidate.includes('यादव')) return 'यादव ईंट भट्ठा (Yadav Bricks)';
      return candidate;
    }
  }

  if (transcript.includes('शर्मा')) return 'शर्मा जी (Sharma Traders)';
  if (transcript.includes('पटेल')) return 'पटेल इलेक्ट्रिकल्स (Patel Electricals)';
  if (transcript.includes('यादव')) return 'यादव ईंट भट्ठा (Yadav Bricks)';

  return undefined;
}

/**
 * Intelligently extracts the purpose/description while strictly excluding
 * amounts, payment methods, vendors, and filler words.
 */
export function extractDescription(transcript: string, matchedVendor?: string): { description: string; categoryId: string; categoryNameHi: string } {
  const lower = transcript.toLowerCase();

  // 1. Priority A: Check for explicit "[purpose] के लिए" or "[purpose] ke liye" clause
  const keLiyeRegex = /(?:के\s*(?:लिए|लिये)|ke\s*(?:liye|lie)|k\s*liye)(?:\s|$|[.,!])/gi;
  let match;
  while ((match = keLiyeRegex.exec(transcript)) !== null) {
    const marker = match[0].trim();
    const prefix = transcript.slice(0, match.index).trim();
    // If there is vendor "को" before this, only take what is after "को"
    const prefixAfterKo = prefix.split(/(?:\s+को|\s+ko(?:\s|$))\s*/i).pop() || prefix;
    // Strip amounts, currency symbols, and commas so amounts like "₹500000" never become candidate tokens
    const sanitizedPrefix = prefixAfterKo.replace(/(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?/gi, ' ').trim();
    const tokens = sanitizedPrefix
      .split(/\s+/)
      .map((t) => t.trim().replace(/[.,!₹]/g, ''))
      .filter(Boolean);

    // Collect candidate words before "के लिए" (up to 3 words)
    const candidateTokens: string[] = [];
    for (let i = tokens.length - 1; i >= 0 && candidateTokens.length < 3; i--) {
      const tok = tokens[i].toLowerCase();
      if (/^\d+$/.test(tok)) break;
      if (STOP_WORDS.has(tok)) break;
      candidateTokens.unshift(tokens[i]);
    }

    if (candidateTokens.length > 0) {
      const candidateStr = candidateTokens.join(' ');
      const candidateLower = candidateStr.toLowerCase();

      // Check if candidate is just a payment term (e.g. "यूपीआई के लिए")
      const isPaymentTerm = candidateTokens.some((tok) => PAYMENT_TERMS.has(tok.toLowerCase()));
      if (isPaymentTerm) {
        continue;
      }

      // Raw bulk construction materials return their specific material label (e.g. "सीमेंट के लिए" -> "सीमेंट")
      const RAW_MATERIALS = new Set([
        'सीमेंट', 'सीमेन्ट', 'cement', 'सरिया', 'लोहा', 'स्टील', 'steel', 'iron', 'तार',
        'ईंट', 'ईट', 'bricks', 'भट्ठा', 'रेत', 'बालू', 'गिट्टी', 'बदरपुर', 'क्रशर', 'sand', 'aggregate'
      ]);

      if (RAW_MATERIALS.has(candidateLower)) {
        for (const item of PURPOSE_DICTIONARY) {
          for (const kw of item.keywords) {
            if (candidateLower === kw) {
              return {
                description: item.displayLabel,
                categoryId: item.categoryId,
                categoryNameHi: item.categoryNameHi,
              };
            }
          }
        }
      }

      // Check if there is an item/material specified AFTER "के लिए" (e.g. "स्कूटी के लिए ₹300 का पेट्रोल")
      const suffix = transcript.slice(match.index + match[0].length).trim();
      const sanitizedSuffix = suffix
        .replace(/(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?/gi, ' ')
        .replace(/[.,!₹]/g, ' ')
        .trim();
      const suffixTokens = sanitizedSuffix
        .split(/\s+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t && !STOP_WORDS.has(t) && !PAYMENT_TERMS.has(t));

      let suffixMatchedItem: { displayLabel: string; categoryId: string; categoryNameHi: string; matchedWord: string } | null = null;
      for (const tok of suffixTokens) {
        // Skip matched vendor name
        if (matchedVendor && (matchedVendor.toLowerCase().includes(tok) || tok.includes(matchedVendor.toLowerCase()))) {
          continue;
        }
        for (const item of PURPOSE_DICTIONARY) {
          for (const kw of item.keywords) {
            if (tok === kw || tok.includes(kw)) {
              suffixMatchedItem = { ...item, matchedWord: tok };
              break;
            }
          }
          if (suffixMatchedItem) break;
        }
        if (suffixMatchedItem) break;
      }

      if (suffixMatchedItem) {
        return {
          description: `${candidateStr} ${marker} ${suffixMatchedItem.matchedWord}`,
          categoryId: suffixMatchedItem.categoryId,
          categoryNameHi: suffixMatchedItem.categoryNameHi,
        };
      }

      // Purpose/action phrase (e.g. "सामान लाने के लिए", "खाने के लिए", "saman laney ke liye")
      const fullPhrase = `${candidateStr} ${marker}`;

      // Determine category based on candidate keywords or context
      let categoryId = 'cat-other-construction';
      let categoryNameHi = 'अन्य निर्माण खर्च';

      // Check PURPOSE_DICTIONARY for matching category
      for (const item of PURPOSE_DICTIONARY) {
        for (const kw of item.keywords) {
          if (candidateLower === kw || candidateLower.includes(kw)) {
            categoryId = item.categoryId;
            categoryNameHi = item.categoryNameHi;
            break;
          }
        }
      }

      if (
        /खाना|खाने|नाश्ता|नाश्ते|चाय|लंच|डिनर|भोजन|food|snacks|lunch|dinner|breakfast|khane/i.test(candidateLower)
      ) {
        categoryId = 'cat-fnb';
        categoryNameHi = 'खान-पान सामान (F&B)';
      } else if (
        (matchedVendor && /मजदूर|लेबर|labour|mazdoor/i.test(matchedVendor)) ||
        /मजदूर|लेबर|मिस्त्री|कारीगर|labour|mazdoor/i.test(transcript)
      ) {
        categoryId = 'cat-labour';
        categoryNameHi = 'मजदूरी और ठेकेदार';
      } else if (
        /सामान|गाड़ी|भाड़ा|डीजल|लोडिंग|transport|saman/i.test(candidateLower) ||
        /गाड़ी|भाड़ा|टेम्पो/i.test(transcript)
      ) {
        categoryId = 'cat-transport';
        categoryNameHi = 'ट्रांसपोर्ट और भाड़ा';
      }

      return {
        description: fullPhrase,
        categoryId,
        categoryNameHi,
      };
    }
  }

  // 2. Priority B: Check if a known material or service keyword is present
  for (const item of PURPOSE_DICTIONARY) {
    for (const kw of item.keywords) {
      if (lower.includes(kw)) {
        return {
          description: item.displayLabel,
          categoryId: item.categoryId,
          categoryNameHi: item.categoryNameHi,
        };
      }
    }
  }

  // 3. Priority C: Remove vendor, amounts, payment terms, and stop words, then pick remaining words
  const words = transcript.split(/\s+/);
  const filteredWords = words.filter((w) => {
    const cleanWord = w.toLowerCase().replace(/[.,!]/g, '');
    if (STOP_WORDS.has(cleanWord)) return false;
    if (PAYMENT_TERMS.has(cleanWord)) return false;
    if (/^\d+$/.test(cleanWord)) return false;
    if (matchedVendor && matchedVendor.toLowerCase().includes(cleanWord)) return false;
    return true;
  });

  if (filteredWords.length > 0) {
    const candidate = filteredWords.slice(0, 3).join(' ');
    return {
      description: candidate,
      categoryId: 'cat-other-construction',
      categoryNameHi: 'अन्य निर्माण खर्च',
    };
  }

  // Fallback
  return {
    description: matchedVendor ? `${matchedVendor} - खर्च` : 'सामान्य खर्च',
    categoryId: 'cat-other-construction',
    categoryNameHi: 'अन्य निर्माण खर्च',
  };
}

/**
 * Main Voice Parser: converts Hindi voice transcript into structured expense fields
 */
export function parseVoiceTranscript(transcript: string): ParsedVoiceResult {
  const trimmed = transcript.trim();
  const normalized = normalizeVoiceTranscript(trimmed);
  const amountRupees = extractAmount(normalized);
  const paymentMethod = extractPaymentMethod(normalized);
  const paymentDate = extractDate(normalized);
  const vendorName = extractVendor(normalized);

  // Extract clean purpose & category
  const { description, categoryId, categoryNameHi } = extractDescription(normalized, vendorName);

  const confidence = amountRupees ? 0.95 : 0.4;

  return {
    rawTranscript: normalized,
    amountRupees: amountRupees || undefined,
    amountPaise: amountRupees ? Math.round(amountRupees * 100) : undefined,
    description,
    vendorName,
    categoryId,
    categoryName: categoryNameHi,
    paymentMethod,
    paymentDate,
    confidence,
  };
}
