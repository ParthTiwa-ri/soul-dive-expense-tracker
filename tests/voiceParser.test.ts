import { describe, it, expect } from 'vitest';
import { parseVoiceTranscript, extractAmount, extractPaymentMethod } from '../src/lib/voiceParser';
import { formatINR } from '../src/lib/constants';

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

