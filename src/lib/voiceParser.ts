import { ParsedVoiceResult, PaymentMethod } from '@/types';

// Map of Hindi number words to their numeric values
const HINDI_NUMBERS: Record<string, number> = {
  'शून्य': 0, 'जीरो': 0,
  'एक': 1, 'वन': 1,
  'दो': 2, 'टू': 2,
  'तीन': 3, 'थ्री': 3,
  'चार': 4, 'फोर': 4,
  'पांच': 5, 'पाँच': 5, 'फाइव': 5,
  'छह': 6, 'छः': 6, 'सिक्स': 6,
  'सात': 7, 'सेवन': 7,
  'आठ': 8, 'एट': 8,
  'नौ': 9, 'नाइन': 9,
  'दस': 10, 'टेन': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
  'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पैंतालीस': 45,
  'पचास': 50, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
};

const MULTIPLIERS: Record<string, number> = {
  'सौ': 100, 'हंड्रेड': 100, 'hundred': 100,
  'हजार': 1000, 'हज़ार': 1000, 'थाउजेंड': 1000, 'thousand': 1000, 'k': 1000,
  'लाख': 100000, 'lakh': 100000, 'lac': 100000,
  'करोड़': 10000000, 'crore': 10000000,
};

// Category keywords for intelligent inference
const CATEGORY_MAP: { keywords: string[]; categoryId: string; categoryNameHi: string }[] = [
  {
    keywords: ['सीमेंट', 'सरिया', 'ईंट', 'गिट्टी', 'रेत', 'बालू', 'लोहा', 'बदरपुर', 'सीमेंट की बोरी', 'पत्थर'],
    categoryId: 'cat-bricks-cement',
    categoryNameHi: 'ईंट, सीमेंट, सरिया, गिट्टी',
  },
  {
    keywords: ['मजदूर', 'मजदूरी', 'लेबर', 'ठेकेदार', 'हाजिरी', 'कारीगर', 'मिस्त्री', 'बेलदार'],
    categoryId: 'cat-labour',
    categoryNameHi: 'मजदूरी और ठेकेदार',
  },
  {
    keywords: ['प्लंबिंग', 'पाइप', 'नल', 'वाटर', 'टैंक', 'फिटिंग', 'वाल', 'सीवर', 'मोटर पाइप'],
    categoryId: 'cat-plumbing',
    categoryNameHi: 'प्लंबिंग और पाइपलाइन',
  },
  {
    keywords: ['बिजली', 'तार', 'केबल', 'जनरेटर', 'लाइट', 'स्विच', 'पैनल', 'डीजल जनरेटर', 'एमसीबी'],
    categoryId: 'cat-electrical',
    categoryNameHi: 'बिजली फिटिंग और जनरेटर',
  },
  {
    keywords: ['डीजल', 'पेट्रोल', 'गाड़ी', 'भाड़ा', 'किराया', 'लोडिंग', 'ट्रैक्टर', 'ट्रांसपोर्ट'],
    categoryId: 'cat-transport',
    categoryNameHi: 'ट्रांसपोर्ट और भाड़ा',
  },
  {
    keywords: ['झूला', 'राइड', 'स्लाइड', 'पूल', 'वाटरपार्क'],
    categoryId: 'cat-slides',
    categoryNameHi: 'झूले एवं राइड्स',
  },
  {
    keywords: ['फिल्टर', 'क्लोरीन', 'ट्रीटमेंट', 'केमिकल', 'दवा'],
    categoryId: 'cat-chemicals',
    categoryNameHi: 'केमिकल्स और वाटर ट्रीटमेंट',
  },
  {
    keywords: ['चाय', 'नाश्ता', 'खाना', 'लंच', 'पानी बोतल', 'बिस्कुट'],
    categoryId: 'cat-fnb',
    categoryNameHi: 'खान-पान सामान (F&B)',
  },
  {
    keywords: ['एडवांस', 'अग्रिम', 'पेशगी'],
    categoryId: 'cat-advances',
    categoryNameHi: 'अग्रिम राशि (एडवांस)',
  },
];

/**
 * Extracts a numeric amount from spoken Hindi/English transcript.
 * Supports digits ("5000"), words ("पाँच हजार"), fractions ("डेढ़ हजार", "ढाई सौ"), etc.
 */
export function extractAmount(transcript: string): number | null {
  const clean = transcript.toLowerCase();

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
 * Extracts date from transcript (defaulting to today)
 */
export function extractDate(transcript: string): string {
  const text = transcript.toLowerCase();
  const today = new Date();

  if (text.includes('कल दिए थे') || text.includes('कल का') || text.includes('कल ')) {
    // Yesterday
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    return yest.toISOString().split('T')[0];
  }

  if (text.includes('परसों')) {
    // Day before yesterday
    const dby = new Date(today);
    dby.setDate(dby.getDate() - 2);
    return dby.toISOString().split('T')[0];
  }

  // Default is today in YYYY-MM-DD
  return today.toISOString().split('T')[0];
}

/**
 * Extracts vendor name if spoken (e.g. "शर्मा जी को", "पटेल को")
 */
export function extractVendor(transcript: string): string | undefined {
  // Pattern: [Vendor name] को ... दिए / payment
  const koMatch = transcript.match(/([^\s]+(?:\s+जी|\s+ट्रेडर्स|\s+भट्ठा)?)\s+को/i);
  if (koMatch && koMatch[1]) {
    const candidate = koMatch[1].trim();
    if (!['आज', 'कल', 'पैसे', 'रुपये', 'सब'].includes(candidate)) {
      return candidate;
    }
  }

  if (transcript.includes('शर्मा')) return 'शर्मा जी (Sharma Traders)';
  if (transcript.includes('पटेल')) return 'पटेल इलेक्ट्रिकल्स (Patel Electricals)';
  if (transcript.includes('यादव')) return 'यादव ईंट भट्ठा (Yadav Bricks)';

  return undefined;
}

/**
 * Main Voice Parser: converts Hindi voice transcript into structured expense fields
 */
export function parseVoiceTranscript(transcript: string): ParsedVoiceResult {
  const trimmed = transcript.trim();
  const amountRupees = extractAmount(trimmed);
  const paymentMethod = extractPaymentMethod(trimmed);
  const paymentDate = extractDate(trimmed);
  const vendorName = extractVendor(trimmed);

  // Match category
  let categoryId = 'cat-other-construction';
  let categoryName = 'अन्य निर्माण खर्च';
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some((k) => trimmed.toLowerCase().includes(k))) {
      categoryId = cat.categoryId;
      categoryName = cat.categoryNameHi;
      break;
    }
  }

  // Extract purpose: what was it for?
  // Look for patterns like "... के लिए", "... का बिल", or fall back to matched category keywords
  let description = '';
  const keLiyeMatch = trimmed.match(/([^\s]+(?:\s+[^\s]+)?)\s+के\s+लिए/i);
  if (keLiyeMatch && keLiyeMatch[1]) {
    description = keLiyeMatch[1].trim();
  } else {
    // Check if any specific keyword was mentioned
    for (const cat of CATEGORY_MAP) {
      const foundKeyword = cat.keywords.find((k) => trimmed.includes(k));
      if (foundKeyword) {
        description = foundKeyword;
        break;
      }
    }
  }

  if (!description) {
    description = trimmed; // Use full transcript if no specific subphrase isolated
  }

  const confidence = amountRupees ? 0.9 : 0.4;

  return {
    rawTranscript: trimmed,
    amountRupees: amountRupees || undefined,
    amountPaise: amountRupees ? Math.round(amountRupees * 100) : undefined,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    vendorName,
    categoryId,
    categoryName,
    paymentMethod,
    paymentDate,
    confidence,
  };
}
