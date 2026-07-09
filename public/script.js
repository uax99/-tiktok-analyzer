const form = document.getElementById("analyze-form");
const input = document.getElementById("username");
const submitBtn = document.getElementById("submit-btn");
const statusNote = document.getElementById("status-note");
const resultSection = document.getElementById("result");
const errorBox = document.getElementById("error-box");
const errorMessage = document.getElementById("error-message");
const profileStrip = document.getElementById("profile-strip");
const reportBody = document.getElementById("report-body");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = input.value.trim();
  if (!username) return;

  resultSection.classList.add("hidden");
  errorBox.classList.add("hidden");
  submitBtn.disabled = true;
  submitBtn.textContent = "جارِ التحقق...";
  statusNote.textContent = "نستخرج البيانات الحقيقية من المصدر، قد يستغرق ذلك حتى 30 ثانية.";

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();

    if (!data.success) {
      showError(data.error || "حدث خطأ غير متوقع.");
      return;
    }

    renderProfile(data.profile, data.username);
    renderReport(data.report);
    resultSection.classList.remove("hidden");
    statusNote.textContent = "";
  } catch (err) {
    showError("تعذر الاتصال بالخادم. تأكدي من اتصالك بالإنترنت وحاولي مرة أخرى.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "تحليل";
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorBox.classList.remove("hidden");
  statusNote.textContent = "";
}

function renderProfile(profile, username) {
  const rows = [
    ["الحساب", `@${username}`],
    ["المتابعون", formatNumber(profile.followers)],
    ["المتابَعون", formatNumber(profile.following)],
    ["الإعجابات", formatNumber(profile.likes)],
    ["الفيديوهات", formatNumber(profile.videos)],
  ];
  profileStrip.innerHTML = rows
    .map(([label, value]) => `<span>${label}: <b>${value ?? "—"}</b></span>`)
    .join("");
}

function formatNumber(n) {
  if (n === undefined || n === null) return "—";
  return Number(n).toLocaleString("en-US");
}

function renderReport(text) {
  // تحويل الوسوم النصية [VERIFIED] / [MISSING] إلى أختام بصرية
  // وتحويل الأسطر التي تبدأ برقم متبوع بنقطة إلى عناوين أقسام
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  let html = "";

  for (const line of lines) {
    const isHeading = /^\s*\d+\.\s*.+/.test(line) && line.length < 80;
    let content = line
      .replace(/\[VERIFIED\]/g, '<span class="tag-verified">✓ موثّق من المصدر</span>')
      .replace(/\[MISSING\]/g, '<span class="tag-missing">⚠ غير متوفر بالبيانات</span>');

    if (isHeading) {
      html += `<h2>${content}</h2>`;
    } else {
      html += `<p>${content}</p>`;
    }
  }
  reportBody.innerHTML = html;
}
