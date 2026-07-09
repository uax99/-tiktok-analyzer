// السيرفر الرئيسي لأداة تحليل الاتصال الاستراتيجي لحسابات TikTok
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- جلب البيانات الحقيقية من Apify ----------
async function fetchTikTokData(username) {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_TOKEN) {
    return { error: "MISSING_APIFY_TOKEN" };
  }

  const url = `https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profiles: [username],
        resultsPerPage: 20,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      }),
    });

    if (!response.ok) {
      return { error: "APIFY_REQUEST_FAILED", status: response.status };
    }
    return await response.json();
  } catch (err) {
    return { error: "APIFY_NETWORK_ERROR", details: err.message };
  }
}

// ---------- التحقق الصارم: هذا الحاجز الذي يمنع أي تحليل وهمي ----------
function validateTikTokData(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, reason: "لم يتم العثور على الحساب أو الحساب خاص." };
  }
  const profile = items[0]?.authorMeta;
  if (!profile || profile.fans === undefined || !profile.name) {
    return { valid: false, reason: "بيانات الملف الشخصي غير مكتملة من المصدر." };
  }
  return { valid: true, profile };
}

// ---------- التحليل عبر Claude مع فرض الاستناد للبيانات فقط ----------
async function analyzeWithClaude(rawData) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return { error: "MISSING_ANTHROPIC_KEY" };
  }

  const systemPrompt = `أنتِ محللة اتصال استراتيجي متخصصة. تحلّلين حساب TikTok وفق منهجية أكاديمية من 9 خطوات:
1. الرؤية والرسالة
2. تقييم الوضع الحالي (SWOT)
3. الجمهور المستهدف
4. الأهداف (SMART)
5. الاستراتيجيات المستخدمة
6. صياغة الرسالة
7. القنوات والوسائل
8. خطة التنفيذ والميزانية
9. التقييم والمتابعة

قواعد صارمة لا يجوز خرقها إطلاقًا:
- استخدمي فقط الحقول الموجودة حرفيًا في JSON المرفق أدناه.
- ممنوع إضافة أي اسم شركة، وصف نشاط، رقم، أو حقيقة غير موجودة في البيانات المرفقة، حتى لو بدا الاسم مألوفًا من معرفتك العامة.
- ضعي بعد كل معلومة مستقاة من البيانات الوسم التالي بالضبط: [VERIFIED]
- أي خطوة من الخطوات التسع لا تدعمها البيانات المتاحة، اكتبي فيها حرفيًا: "غير متوفر في البيانات المستخرجة [MISSING]" ولا تحاولي تخمينها.
- نظمي التقرير في 9 أقسام مرقمة بعناوين واضحة مطابقة للمنهجية أعلاه.`;

  const userPrompt = `البيانات الخام التالية نتيجة استخراج حقيقي من TikTok عبر Apify:

${JSON.stringify(rawData, null, 2)}

حلّلي هذا الحساب وفق المنهجية والقواعد أعلاه.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      return { error: "CLAUDE_REQUEST_FAILED", status: response.status };
    }
    const data = await response.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    return { report: text };
  } catch (err) {
    return { error: "CLAUDE_NETWORK_ERROR", details: err.message };
  }
}

// ---------- نقطة الدخول ----------
app.post("/analyze", async (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({ success: false, error: "يرجى إدخال اسم مستخدم صالح." });
  }

  const clean = username.trim().replace(/^@/, "");
  const rawData = await fetchTikTokData(clean);

  if (rawData?.error) {
    return res.status(502).json({
      success: false,
      error: "تعذر الاتصال بمصدر بيانات TikTok. حاولي مرة أخرى لاحقًا.",
    });
  }

  const validation = validateTikTokData(rawData);
  if (!validation.valid) {
    return res.status(404).json({
      success: false,
      error: `تعذر التحليل: ${validation.reason}`,
    });
  }

  const analysis = await analyzeWithClaude(rawData);
  if (analysis?.error) {
    return res.status(502).json({ success: false, error: "تعذر توليد التحليل حاليًا. حاولي مرة أخرى." });
  }

  return res.json({
    success: true,
    username: clean,
    profile: {
      followers: validation.profile.fans,
      following: validation.profile.following,
      likes: validation.profile.heart,
      videos: validation.profile.video,
      bio: validation.profile.signature,
      verified: validation.profile.verified,
    },
    report: analysis.report,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`الخادم يعمل على المنفذ ${PORT}`));
