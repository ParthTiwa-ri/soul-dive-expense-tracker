import { describe, it, expect } from 'vitest';
import { parseVoiceTranscript, extractAmount, extractPaymentMethod, extractDate } from '../src/lib/voiceParser';
import { formatINR, getTodayIST, getDateStringIST, formatDateTimeIST } from '../src/lib/constants';

describe('Hindi Voice Parser & Natural Language Extractor', () => {
  it('should parse spoken Hindi expense: "आज शर्मा जी को सीमेंट के लिए पाँच हजार रुपये UPI से दिए"', () => {
    const transcript = 'आज शर्मा जी को सीमेंट के लिए पाँच हजार रुपये UPI से दिए';
    const result = parseVoiceTranscript(transcript);

    expect(result.amountRupees).toBe(5000);
    expect(result.amountPaise).toBe(500000);
    expect(result.paymentMethod).toBe('upi');
    expect(result.vendorName).toContain('शर्मा');
    expect(result.categoryId).toBe('cat-bricks-cement');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should extract compound amounts like "डेढ़ हजार" (1500) and "ढाई लाख" (250000)', () => {
    expect(extractAmount('डीजल के लिए डेढ़ हजार रुपये दिए')).toBe(1500);
    expect(extractAmount('पूल के लिए ढाई लाख रुपये')).toBe(250000);
    expect(extractAmount('लोहा खरीदा पचास हजार का')).toBe(50000);
  });

  it('should extract numerical digits with currency symbols like "₹12,500"', () => {
    expect(extractAmount('सीमेंट का बिल ₹12,500 कैश में दिया')).toBe(12500);
    expect(extractAmount('लेबर पेमेंट 8000')).toBe(8000);
  });

  it('should cleanly extract purpose "सीमेंट" even with colloquial filler words: "आज शर्मा जी को सीमेंट के रस 5000 यूपीआई के लिए"', () => {
    const transcript = 'आज शर्मा जी को सीमेंट के रस 5000 यूपीआई के लिए';
    const result = parseVoiceTranscript(transcript);

    expect(result.amountRupees).toBe(5000);
    expect(result.description).toBe('सीमेंट');
    expect(result.vendorName).toContain('शर्मा');
    expect(result.paymentMethod).toBe('upi');
    expect(result.categoryId).toBe('cat-bricks-cement');
  });

  it('should detect cash, upi, and bank transfer methods accurately', () => {
    expect(extractPaymentMethod('कैश में पेमेंट किया')).toBe('cash');
    expect(extractPaymentMethod('गूगल पे से भेजा')).toBe('upi');
    expect(extractPaymentMethod('फोनपे से 500 रुपये दिए')).toBe('upi');
    expect(extractPaymentMethod('बैंक खाते में ट्रांसफर किया')).toBe('bank_transfer');
  });

  it('should accurately extract purpose "सामान लाने के लिए" when paying labourer (Image 2 test case)', () => {
    const transcript = 'सामान लाने के लिए मजदूर को ₹400 दिए';
    const result = parseVoiceTranscript(transcript);

    expect(result.amountRupees).toBe(400);
    expect(result.amountPaise).toBe(40000);
    expect(result.description).toBe('सामान लाने के लिए');
    expect(result.vendorName).toBe('मजदूर');
    expect(result.paymentMethod).toBe('cash');
    expect(result.categoryId).toBe('cat-labour');
    expect(result.categoryName).toBe('मजदूरी और ठेकेदार');
  });

  it('should accurately extract amount and purpose "खाने के लिए" into F&B category (Image 1 test case)', () => {
    const transcript = '₹500000 खाने के लिए दिए';
    const result = parseVoiceTranscript(transcript);

    expect(result.amountRupees).toBe(500000);
    expect(result.amountPaise).toBe(50000000);
    expect(result.description).toBe('खाने के लिए');
    expect(result.description).not.toContain('500000');
    expect(result.description).not.toContain('₹');
    expect(result.paymentMethod).toBe('cash');
    expect(result.categoryId).toBe('cat-fnb');
    expect(result.categoryName).toBe('खान-पान सामान (F&B)');
  });

  it('should accurately extract purpose when recipient appears before purpose', () => {
    const transcript = 'मजदूर को सामान लाने के लिए ₹400 दिए';
    const result = parseVoiceTranscript(transcript);

    expect(result.amountRupees).toBe(400);
    expect(result.description).toBe('सामान लाने के लिए');
    expect(result.vendorName).toBe('मजदूर');
    expect(result.categoryId).toBe('cat-labour');
  });

  it('should handle Hinglish / Romanized Hindi: "saman laney ke liye mazdoor ko 400 diye"', () => {
    const transcript = 'saman laney ke liye mazdoor ko 400 diye';
    const result = parseVoiceTranscript(transcript);

    expect(result.amountRupees).toBe(400);
    expect(result.description).toBe('saman laney ke liye');
    expect(result.vendorName).toBe('mazdoor');
    expect(result.categoryId).toBe('cat-labour');
  });

  it('should parse transcript with suffix item: "स्कूटी के लिए ₹300 का पेट्रोल"', () => {
    const transcript = 'स्कूटी के लिए ₹300 का पेट्रोल';
    const result = parseVoiceTranscript(transcript);

    expect(result.amountRupees).toBe(300);
    expect(result.amountPaise).toBe(30000);
    expect(result.description).toBe('स्कूटी के लिए पेट्रोल');
    expect(result.categoryId).toBe('cat-fuel');
    expect(result.categoryName).toBe('डीजल और गाड़ी खर्च');
    expect(result.paymentMethod).toBe('cash');
  });

  describe('Apple iOS Speech Recognition Normalizer (Safe for Android)', () => {
    it('should heal Screenshot 1: "das000 रुपए ऑटो के लिए दिए लेकिन" to 10000 and cat-transport', () => {
      const transcript = 'das000 रुपए ऑटो के लिए दिए लेकिन';
      const result = parseVoiceTranscript(transcript);

      expect(result.amountRupees).toBe(10000);
      expect(result.amountPaise).toBe(1000000);
      expect(result.description).toBe('ऑटो के लिए');
      expect(result.categoryId).toBe('cat-transport');
      expect(result.categoryName).toBe('ट्रांसपोर्ट और भाड़ा');
    });

    it('should heal Screenshot 2: "ऑटो भरा Paanch000 रुपए आई" to 5000 and cat-transport', () => {
      const transcript = 'ऑटो भरा Paanch000 रुपए आई';
      const result = parseVoiceTranscript(transcript);

      expect(result.amountRupees).toBe(5000);
      expect(result.amountPaise).toBe(500000);
      expect(result.categoryId).toBe('cat-transport');
    });

    it('should heal Apple "do00" / "Do00" to 200 rupees', () => {
      const transcript = 'do00 rupaye auto ke liye';
      const result = parseVoiceTranscript(transcript);

      expect(result.amountRupees).toBe(200);
      expect(result.amountPaise).toBe(20000);
      expect(result.categoryId).toBe('cat-transport');
    });

    it('should heal teen000 (3000), char000 (4000), bees000 (20000)', () => {
      expect(extractAmount('teen000 rupaye')).toBe(3000);
      expect(extractAmount('char000 rupaye')).toBe(4000);
      expect(extractAmount('bees000 rupaye')).toBe(20000);
      expect(extractAmount('pachas000 rupaye')).toBe(50000);
    });

    it('should preserve standard Android speech without any alteration', () => {
      const android1 = parseVoiceTranscript('₹5000 सीमेंट के लिए दिए');
      expect(android1.amountRupees).toBe(5000);
      expect(android1.description).toBe('सीमेंट');

      const android2 = parseVoiceTranscript('मजदूर को सामान लाने के लिए ₹400 दिए');
      expect(android2.amountRupees).toBe(400);
      expect(android2.description).toBe('सामान लाने के लिए');
      expect(android2.vendorName).toBe('मजदूर');
    });
  });
});

describe('Indian Currency Formatting (Paise to INR)', () => {
  it('should format 500000 paise as ₹5,000 without floating point inaccuracies', () => {
    expect(formatINR(500000)).toBe('₹5,000');
  });

  it('should format 25000000 paise as ₹2,50,000 using Indian comma separator', () => {
    expect(formatINR(25000000)).toBe('₹2,50,000');
  });

  it('should handle zero, null, and edge cases gracefully', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(null as any)).toBe('₹0');
    expect(formatINR(undefined as any)).toBe('₹0');
  });
});

describe('Indian Standard Time (IST) Date Locking', () => {
  it('should return the current IST date for today by default (not lagging UTC)', () => {
    const today = getTodayIST();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const parsed = parseVoiceTranscript('₹500 नाश्ते के लिए');
    expect(parsed.paymentDate).toBe(today);
    expect(extractDate('₹500 नाश्ते के लिए')).toBe(today);
  });

  it('should parse spoken "कल" to yesterday in IST', () => {
    const yesterday = getDateStringIST(-1);
    expect(extractDate('कल ₹2000 दिए थे')).toBe(yesterday);
  });

  it('should parse spoken "परसों" to day before yesterday in IST', () => {
    const dayBefore = getDateStringIST(-2);
    expect(extractDate('परसों ₹1500 दिए थे')).toBe(dayBefore);
  });

  it('should format date and time accurately in IST for ISO timestamps and HH:MM strings', () => {
    // Test ISO string in UTC: 19:58 UTC on Nov 15 is 01:28 AM on Nov 16 in IST
    const resultFromIso = formatDateTimeIST('2026-11-16', '2026-11-15T19:58:00.000Z', 'hi');
    expect(resultFromIso).toContain('16 नव॰ 2026');
    expect(resultFromIso).toContain('01:28 AM');

    // Test simple time string
    const resultFromTime = formatDateTimeIST('2026-11-16', '14:30', 'en');
    expect(resultFromTime).toContain('16 Nov 2026');
    expect(resultFromTime).toContain('02:30 PM');
  });
});

