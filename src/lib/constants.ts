import { Category, ProjectPhase, UserProfile, PaymentMethod } from '@/types';

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'पिताजी (Father)',
    phone: '+91 98765 43210',
    role: 'contributor',
    isActive: true,
    preferredLanguage: 'hi',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    fullName: 'मालिक (Owner / Admin)',
    phone: '+91 98765 12345',
    role: 'owner',
    isActive: true,
    preferredLanguage: 'en',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    fullName: 'साइट मैनेजर (Manager)',
    phone: '+91 98765 67890',
    role: 'manager',
    isActive: true,
    preferredLanguage: 'hi',
  },
];

export const DEFAULT_PHASES: ProjectPhase[] = [
  {
    id: 'phase-construction',
    nameEn: 'Construction',
    nameHi: 'निर्माण (कंस्ट्रक्शन)',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'phase-pre-opening',
    nameEn: 'Pre-opening',
    nameHi: 'शुरुआत पूर्व (प्री-ओपनिंग)',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'phase-operations',
    nameEn: 'Operations',
    nameHi: 'संचालन (ऑपरेशन्स)',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'phase-expansion',
    nameEn: 'Expansion / Renovation',
    nameHi: 'विस्तार एवं मरम्मत',
    isActive: true,
    sortOrder: 4,
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Construction
  { id: 'cat-bricks-cement', nameEn: 'Bricks, Cement, Steel and Aggregates', nameHi: 'ईंट, सीमेंट, सरिया, गिट्टी', groupName: 'construction', isActive: true, sortOrder: 1 },
  { id: 'cat-labour', nameEn: 'Labour and Contractors', nameHi: 'मजदूरी और ठेकेदार', groupName: 'construction', isActive: true, sortOrder: 2 },
  { id: 'cat-plumbing', nameEn: 'Plumbing and Water Systems', nameHi: 'प्लंबिंग और पाइपलाइन', groupName: 'construction', isActive: true, sortOrder: 3 },
  { id: 'cat-electrical', nameEn: 'Electrical and Generator', nameHi: 'बिजली फिटिंग और जनरेटर', groupName: 'construction', isActive: true, sortOrder: 4 },
  { id: 'cat-slides', nameEn: 'Slides and Attractions', nameHi: 'झूले एवं राइड्स', groupName: 'construction', isActive: true, sortOrder: 5 },
  { id: 'cat-filtration', nameEn: 'Filtration and Treatment Plant', nameHi: 'फिल्ट्रेशन और वाटर ट्रीटमेंट', groupName: 'construction', isActive: true, sortOrder: 6 },
  { id: 'cat-machinery', nameEn: 'Machinery and Tools', nameHi: 'मशीनरी और औजार', groupName: 'construction', isActive: true, sortOrder: 7 },
  { id: 'cat-transport', nameEn: 'Transportation and Logistics', nameHi: 'ट्रांसपोर्ट और भाड़ा', groupName: 'construction', isActive: true, sortOrder: 8 },
  { id: 'cat-site-dev', nameEn: 'Land and Site Development', nameHi: 'जमीन और साइट विकास', groupName: 'construction', isActive: true, sortOrder: 9 },
  { id: 'cat-civil', nameEn: 'Civil Construction', nameHi: 'सिविल निर्माण', groupName: 'construction', isActive: true, sortOrder: 10 },
  { id: 'cat-furniture', nameEn: 'Furniture and Interiors', nameHi: 'फर्नीचर और इंटीरियर्स', groupName: 'construction', isActive: true, sortOrder: 11 },
  { id: 'cat-landscaping', nameEn: 'Landscaping', nameHi: 'पेड़-पौधे और लैंडस्केपिंग', groupName: 'construction', isActive: true, sortOrder: 12 },
  { id: 'cat-safety', nameEn: 'Safety Equipment', nameHi: 'सुरक्षा उपकरण', groupName: 'construction', isActive: true, sortOrder: 13 },
  { id: 'cat-gov-fees', nameEn: 'Government Fees and Approvals', nameHi: 'सरकारी फीस और परमिशन', groupName: 'construction', isActive: true, sortOrder: 14 },
  { id: 'cat-other-construction', nameEn: 'Other Construction Expenses', nameHi: 'अन्य निर्माण खर्च', groupName: 'construction', isActive: true, sortOrder: 15 },

  // Operations
  { id: 'cat-salaries', nameEn: 'Salaries and Wages', nameHi: 'वेतन और मजदूरी', groupName: 'operations', isActive: true, sortOrder: 30 },
  { id: 'cat-electricity', nameEn: 'Electricity', nameHi: 'बिजली बिल', groupName: 'operations', isActive: true, sortOrder: 31 },
  { id: 'cat-water-util', nameEn: 'Water and Utilities', nameHi: 'पानी और बिल', groupName: 'operations', isActive: true, sortOrder: 32 },
  { id: 'cat-repairs', nameEn: 'Repairs and Maintenance', nameHi: 'मरम्मत और रखरखाव', groupName: 'operations', isActive: true, sortOrder: 33 },
  { id: 'cat-cleaning', nameEn: 'Cleaning and Housekeeping', nameHi: 'साफ-सफाई और हाउसकीपिंग', groupName: 'operations', isActive: true, sortOrder: 34 },
  { id: 'cat-chemicals', nameEn: 'Chemicals and Water Treatment', nameHi: 'केमिकल्स (क्लोरीन आदि)', groupName: 'operations', isActive: true, sortOrder: 35 },
  { id: 'cat-fnb', nameEn: 'Food and Beverage Inventory', nameHi: 'खान-पान सामान (F&B)', groupName: 'operations', isActive: true, sortOrder: 36 },
  { id: 'cat-marketing', nameEn: 'Marketing and Advertising', nameHi: 'प्रचार और विज्ञापन', groupName: 'operations', isActive: true, sortOrder: 37 },
  { id: 'cat-fuel', nameEn: 'Transport and Fuel', nameHi: 'डीजल और गाड़ी खर्च', groupName: 'operations', isActive: true, sortOrder: 38 },
  { id: 'cat-security', nameEn: 'Security', nameHi: 'सुरक्षा गार्डिंग', groupName: 'operations', isActive: true, sortOrder: 39 },
  { id: 'cat-other-op', nameEn: 'Other Operating Expenses', nameHi: 'अन्य संचालन खर्च', groupName: 'operations', isActive: true, sortOrder: 40 },

  // Financial
  { id: 'cat-advances', nameEn: 'Advances Given', nameHi: 'अग्रिम राशि (एडवांस)', groupName: 'financial', isActive: true, sortOrder: 60 },
  { id: 'cat-refunds', nameEn: 'Refunds', nameHi: 'रिफंड वापसी', groupName: 'financial', isActive: true, sortOrder: 61 },
  { id: 'cat-bank-charges', nameEn: 'Bank Charges and Interest', nameHi: 'बैंक चार्ज और ब्याज', groupName: 'financial', isActive: true, sortOrder: 62 },
  { id: 'cat-other-fin', nameEn: 'Other Miscellaneous', nameHi: 'अन्य फुटकर खर्च', groupName: 'financial', isActive: true, sortOrder: 63 },
];

export const PAYMENT_METHODS: { value: PaymentMethod; labelEn: string; labelHi: string; icon: string }[] = [
  { value: 'cash', labelEn: 'Cash', labelHi: 'नकद (कैश)', icon: 'Banknote' },
  { value: 'upi', labelEn: 'UPI', labelHi: 'UPI (GPay / PhonePe)', icon: 'QrCode' },
  { value: 'bank_transfer', labelEn: 'Bank Transfer', labelHi: 'बैंक ट्रांसफर / NEFT', icon: 'Building' },
  { value: 'card', labelEn: 'Debit / Credit Card', labelHi: 'कार्ड', icon: 'CreditCard' },
  { value: 'cheque', labelEn: 'Cheque', labelHi: 'चेक', icon: 'Receipt' },
  { value: 'other', labelEn: 'Other', labelHi: 'अन्य', icon: 'HelpCircle' },
];

/**
 * Formats paise into Indian Rupee format (e.g. 500000 paise -> ₹5,000)
 */
export function formatINR(paise: number, includeDecimals = false): string {
  if (isNaN(paise) || paise === null || paise === undefined) return '₹0';
  const rupees = paise / 100;
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return formatter.format(rupees);
}

/**
 * Format date in Asia/Kolkata timezone
 */
export function formatDateIST(dateStr: string, locale: 'hi' | 'en' = 'hi'): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return dateStr;
  }
}

