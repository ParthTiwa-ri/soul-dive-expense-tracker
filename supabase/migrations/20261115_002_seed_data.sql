-- ====================================================================
-- Soul Dive Water Park — Master Seed Data
-- Categories (English & Hindi), Project Phases, Demo Profiles
-- ====================================================================

-- 1. Project Phases
INSERT INTO project_phases (id, name_en, name_hi, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'Construction', 'निर्माण (कंस्ट्रक्शन)', 1),
('00000000-0000-0000-0000-000000000002', 'Pre-opening', 'शुरुआत पूर्व (प्री-ओपनिंग)', 2),
('00000000-0000-0000-0000-000000000003', 'Operations', 'संचालन (ऑपरेशन्स)', 3),
('00000000-0000-0000-0000-000000000004', 'Expansion / Renovation', 'विस्तार एवं मरम्मत', 4)
ON CONFLICT (id) DO NOTHING;

-- 2. Construction Categories
INSERT INTO categories (name_en, name_hi, group_name, sort_order) VALUES
('Land and Site Development', 'जमीन और साइट विकास', 'construction', 1),
('Survey and Soil Testing', 'सर्वेक्षण और मिट्टी जांच', 'construction', 2),
('Civil Construction', 'सिविल निर्माण', 'construction', 3),
('Bricks, Cement, Steel and Aggregates', 'ईंट, सीमेंट, सरिया, गिट्टी', 'construction', 4),
('Plumbing and Water Systems', 'प्लंबिंग और पाइपलाइन', 'construction', 5),
('Electrical and Generator', 'बिजली फिटिंग और जनरेटर', 'construction', 6),
('Waterpark Equipment', 'वाटरपार्क उपकरण', 'construction', 7),
('Slides and Attractions', 'झूले एवं राइड्स', 'construction', 8),
('Filtration and Treatment Plant', 'फिल्ट्रेशन और वाटर ट्रीटमेंट प्लांट', 'construction', 9),
('Machinery and Tools', 'मशीनरी और औजार', 'construction', 10),
('Labour and Contractors', 'मजदूरी और ठेकेदार', 'construction', 11),
('Transportation and Logistics', 'ट्रांसपोर्ट और भाड़ा', 'construction', 12),
('Architecture and Consultancy', 'नक्शा और कंसल्टेंसी', 'construction', 13),
('Furniture and Interiors', 'फर्नीचर और इंटीरियर्स', 'construction', 14),
('Landscaping', 'पेड़-पौधे और लैंडस्केपिंग', 'construction', 15),
('Safety Equipment', 'सुरक्षा उपकरण', 'construction', 16),
('Government Fees and Approvals', 'सरकारी फीस और परमिशन', 'construction', 17),
('Insurance', 'बीमा (इंश्योरेंस)', 'construction', 18),
('Pre-opening Marketing', 'ओपनिंग पूर्व प्रचार', 'construction', 19),
('Other Construction Expenses', 'अन्य निर्माण खर्च', 'construction', 20)
ON CONFLICT DO NOTHING;

-- 3. Operations Categories
INSERT INTO categories (name_en, name_hi, group_name, sort_order) VALUES
('Salaries and Wages', 'वेतन और मजदूरी', 'operations', 30),
('Electricity', 'बिजली बिल', 'operations', 31),
('Water and Utilities', 'पानी और उपयोगिता बिल', 'operations', 32),
('Repairs and Maintenance', 'मरम्मत और रखरखाव', 'operations', 33),
('Cleaning and Housekeeping', 'साफ-सफाई और हाउसकीपिंग', 'operations', 34),
('Chemicals and Water Treatment', 'केमिकल्स (क्लोरीन आदि)', 'operations', 35),
('Costumes and Inventory', 'कॉस्ट्यूम्स और इन्वेंट्री', 'operations', 36),
('Food and Beverage Inventory', 'खान-पान सामान (F&B)', 'operations', 37),
('Marketing and Advertising', 'प्रचार और विज्ञापन', 'operations', 38),
('Ticketing and Payment Charges', 'टिकटिंग और गेटवे चार्ज', 'operations', 39),
('Security', 'सुरक्षा गार्ड और गार्डिंग', 'operations', 40),
('Insurance and Compliance', 'बीमा और कंप्लायंस', 'operations', 41),
('Office and Administration', 'ऑफिस और स्टेशनरी', 'operations', 42),
('Transport and Fuel', 'डीजल और गाड़ी खर्च', 'operations', 43),
('Guest Services', 'अतिथि सेवाएं', 'operations', 44),
('Other Operating Expenses', 'अन्य संचालन खर्च', 'operations', 45)
ON CONFLICT DO NOTHING;

-- 4. Financial & Administrative Categories
INSERT INTO categories (name_en, name_hi, group_name, sort_order) VALUES
('Professional Fees', 'सीए / वकील फीस', 'financial', 60),
('Bank Charges and Interest', 'बैंक चार्ज और ब्याज', 'financial', 61),
('Taxes and Statutory Payments', 'टैक्स एवं सरकारी भुगतान', 'financial', 62),
('Refunds', 'रिफंड वापसी', 'financial', 63),
('Advances Given', 'दी गई अग्रिम राशि (एडवांस)', 'financial', 64),
('Other', 'अन्य फुटकर खर्च', 'financial', 65)
ON CONFLICT DO NOTHING;

-- 5. Seed Initial Profiles for Development / Testing
INSERT INTO profiles (id, full_name, phone, role, preferred_language) VALUES
('11111111-1111-1111-1111-111111111111', 'Father (पिताजी)', '+91 98765 43210', 'contributor', 'hi'),
('22222222-2222-2222-2222-222222222222', 'Owner / Admin (मालिक)', '+91 98765 12345', 'owner', 'en'),
('33333333-3333-3333-3333-333333333333', 'Site Manager (मैनेजर)', '+91 98765 67890', 'manager', 'hi')
ON CONFLICT (id) DO NOTHING;

-- 6. Common Vendors Seed
INSERT INTO vendors (name, phone, notes) VALUES
('Sharma Traders (सीमेंट व सरिया)', '+91 98222 11111', 'सीमेंट और सरिया सप्लायर'),
('Patel Electricals (बिजली फिटिंग)', '+91 98333 22222', 'केबल और पैनल सप्लायर'),
('Yadav Bricks Kiln (ईंट भट्ठा)', '+91 98444 33333', 'लाल ईंट'),
('Local Hardware & Sanitary', '+91 98555 44444', 'प्लंबिंग व फिटिंग पाइप')
ON CONFLICT DO NOTHING;
