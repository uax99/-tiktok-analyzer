# مرصد — أداة تحليل الاتصال الاستراتيجي لحسابات TikTok

## المحتويات
- `server.js` — الخادم (يستدعي Apify ثم Claude، ويمنع أي تحليل غير موثّق)
- `public/` — الواجهة (index.html, style.css, script.js)
- `package.json` — قائمة الاعتماديات

## خطوات النشر (بدون خبرة برمجية، عبر Render.com)

### 1. جهّزي المفاتيح
- مفتاح Apify: من صفحة Settings → Integrations في حسابك على apify.com
- مفتاح Anthropic: من console.anthropic.com → API Keys

### 2. ارفعي المشروع إلى GitHub
- أنشئي حساب مجاني على github.com إن ما عندك
- أنشئي "New repository" باسم tiktok-analyzer
- اسحبي مجلد المشروع كامل داخل صفحة الرفع (Add file → Upload files)

### 3. انشري على Render
- سجّلي دخول على render.com بحساب GitHub
- اضغطي New → Web Service → اختاري المستودع اللي رفعتيه
- Build Command: `npm install`
- Start Command: `npm start`
- في قسم Environment Variables أضيفي:
  - `APIFY_API_TOKEN` = مفتاحك
  - `ANTHROPIC_API_KEY` = مفتاحك
- اضغطي Create Web Service

بعد دقائق بيعطيك Render رابط عام مثل:
`https://tiktok-analyzer.onrender.com`

هذا هو رابط موقعك الجاهز للمشاركة.

## ملاحظة مهمة عن اسم الـ Actor في Apify
الكود يستخدم `clockworks/tiktok-profile-scraper` كمثال شائع.
لو تستخدمين Actor مختلف على حسابك، بدّلي الاسم في `server.js`
داخل السطر اللي فيه `apify.com/acts/clockworks~tiktok-profile-scraper`.

## لو احتجتِ مساعدة بخطوة معينة
انسخي أي رسالة خطأ تطلع لك من Render أو من الموقع نفسه، والصقيها
في محادثتك مع Claude — كل رسالة خطأ فيها تلميح واضح للمشكلة.
