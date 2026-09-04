const dateElement = document.querySelector("#desk-date");
const timeElement = document.querySelector("#desk-time");
const yearPercentElement = document.querySelector("#year-percent");
const yearProgressElement = document.querySelector("#year-progress");
const feedListElement = document.querySelector("#feed-list");
const feedUpdatedElement = document.querySelector("#feed-updated");
const feedFilterElements = document.querySelectorAll("[data-source]");
const quoteElement = document.querySelector("#daily-quote");
const refreshQuoteElement = document.querySelector("#refresh-quote");
const shortcutGridElement = document.querySelector("#shortcut-grid");
const shortcutDialogElement = document.querySelector("#shortcut-dialog");
const shortcutFormElement = document.querySelector("#shortcut-form");
const shortcutFieldsElement = document.querySelector("#shortcut-fields");
const editShortcutsElement = document.querySelector("#edit-shortcuts");
const closeShortcutsElement = document.querySelector("#close-shortcuts");
const addShortcutElement = document.querySelector("#add-shortcut");
const resetShortcutsElement = document.querySelector("#reset-shortcuts");

let feedItems = [];
let quoteDateKey = "";
let quoteIndex = 0;

const SHORTCUT_STORAGE_KEY = "terialion-desk-shortcuts-v2";
const LEGACY_SHORTCUT_STORAGE_KEY = "terialion-desk-shortcuts-v1";
const huaweiQuizShortcut = {
  title: "华为刷题",
  url: "../tools/huawei-ai-quiz.html",
  subtitle: "243 Questions",
  mark: "HW",
};
const defaultShortcuts = [
  { title: "公开简历", url: "../", subtitle: "Resume", mark: "CV" },
  {
    title: "GitHub",
    url: "https://github.com/Terialion",
    subtitle: "Code",
    mark: "GH",
  },
  {
    title: "ChatGPT",
    url: "https://chatgpt.com/",
    subtitle: "Workspace",
    mark: "AI",
  },
  {
    title: "USTC",
    url: "https://www.ustc.edu.cn/",
    subtitle: "Campus",
    mark: "UT",
  },
  huaweiQuizShortcut,
];

const dailyQuotes = [
  "真正重要的进步，通常来自把一件小事做完。",
  "先完成，再完善。",
  "困难的系统，也能从一个可验证的步骤开始。",
  "保持好奇，也保持耐心。",
  "把注意力交给真正能改变结果的事情。",
  "长期主义，就是认真度过普通的一天。",
  "慢一点没关系，方向和持续更重要。",
  "让每一次测量，都比猜测更接近答案。",
  "今天写下的一行代码，会成为明天理解系统的入口。",
];

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const feedDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const updatedFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function updateDesk() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now - yearStart) / (yearEnd - yearStart)) * 100;
  const readableProgress = yearProgress.toFixed(1);
  const machineTime = now.toISOString();

  dateElement.dateTime = machineTime;
  timeElement.dateTime = machineTime;
  dateElement.textContent = dateFormatter.format(now);
  timeElement.textContent = timeFormatter.format(now);
  yearPercentElement.textContent = `${readableProgress}%`;
  yearProgressElement.setAttribute("aria-valuenow", readableProgress);
  yearProgressElement.querySelector("span").style.width = `${yearProgress}%`;

  const nextQuoteDateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (nextQuoteDateKey !== quoteDateKey) {
    quoteDateKey = nextQuoteDateKey;
    quoteIndex = Math.floor(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000,
    ) % dailyQuotes.length;
    quoteElement.textContent = dailyQuotes[quoteIndex];
  }
}

function renderFeeds(source = "all") {
  const visibleItems = feedItems
    .filter((item) => source === "all" || item.source === source)
    .slice(0, 8);

  feedListElement.replaceChildren();

  if (!visibleItems.length) {
    const message = document.createElement("li");
    message.className = "feed-message";
    message.textContent = "这个来源暂时没有文章。";
    feedListElement.append(message);
    return;
  }

  for (const item of visibleItems) {
    const row = document.createElement("li");
    const link = document.createElement("a");
    const sourceName = document.createElement("span");
    const title = document.createElement("span");
    const published = document.createElement("time");

    link.className = "feed-item";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    sourceName.className = "feed-source";
    sourceName.textContent = item.source;
    title.className = "feed-item-title";
    title.textContent = item.title;
    published.className = "feed-date";
    published.dateTime = item.publishedAt;
    published.textContent = feedDateFormatter.format(new Date(item.publishedAt));

    link.append(sourceName, title, published);
    row.append(link);
    feedListElement.append(row);
  }
}

async function loadFeeds() {
  try {
    const response = await fetch("data/feeds.json");
    if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error("Invalid feed data");

    feedItems = data.items;
    feedUpdatedElement.dateTime = data.generatedAt;
    feedUpdatedElement.textContent = `更新于 ${updatedFormatter.format(
      new Date(data.generatedAt),
    )}`;
    renderFeeds();
  } catch (error) {
    feedUpdatedElement.textContent = "更新暂不可用";
    feedListElement.replaceChildren();
    const message = document.createElement("li");
    message.className = "feed-message";
    message.textContent = "文章列表载入失败，请稍后刷新。";
    feedListElement.append(message);
    console.error(error);
  }
}

function loadShortcuts() {
  try {
    const current = localStorage.getItem(SHORTCUT_STORAGE_KEY);
    if (current !== null) {
      const saved = JSON.parse(current);
      return Array.isArray(saved) ? saved : defaultShortcuts;
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_SHORTCUT_STORAGE_KEY));
    if (!Array.isArray(legacy)) return defaultShortcuts;
    const hasHuaweiQuiz = legacy.some((item) => item.url === huaweiQuizShortcut.url);
    return hasHuaweiQuiz ? legacy : [...legacy, huaweiQuizShortcut];
  } catch {
    return defaultShortcuts;
  }
}

function shortcutDetails(shortcut) {
  let host = "Local";
  try {
    host = new URL(shortcut.url, window.location.href).hostname.replace(/^www\./, "");
  } catch {
    // The editor validates URLs before saving; this only protects old local data.
  }
  const mark = shortcut.mark || shortcut.title.slice(0, 2).toUpperCase();
  return { mark, subtitle: shortcut.subtitle || host || "Link" };
}

function renderShortcuts() {
  shortcutGridElement.replaceChildren();

  for (const shortcut of loadShortcuts()) {
    const link = document.createElement("a");
    const mark = document.createElement("span");
    const title = document.createElement("span");
    const subtitle = document.createElement("small");
    const details = shortcutDetails(shortcut);

    link.className = "shortcut glass-panel";
    link.href = shortcut.url;
    if (/^https?:\/\//.test(shortcut.url)) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    mark.className = "shortcut-mark";
    mark.ariaHidden = "true";
    mark.textContent = details.mark;
    title.textContent = shortcut.title;
    subtitle.textContent = details.subtitle;
    link.append(mark, title, subtitle);
    shortcutGridElement.append(link);
  }
}

function addShortcutField(shortcut = { title: "", url: "" }) {
  const row = document.createElement("div");
  const title = document.createElement("input");
  const url = document.createElement("input");
  const remove = document.createElement("button");

  row.className = "shortcut-field";
  row.dataset.mark = shortcut.mark || "";
  row.dataset.subtitle = shortcut.subtitle || "";
  title.name = "title";
  title.placeholder = "名称";
  title.value = shortcut.title;
  title.required = true;
  title.maxLength = 30;
  title.setAttribute("aria-label", "入口名称");
  url.name = "url";
  url.type = "text";
  url.inputMode = "url";
  url.placeholder = "https://example.com";
  url.value = shortcut.url;
  url.required = true;
  url.setAttribute("aria-label", "入口网址");
  remove.className = "icon-button";
  remove.type = "button";
  remove.title = "删除入口";
  remove.setAttribute("aria-label", "删除入口");
  remove.textContent = "−";
  remove.addEventListener("click", () => row.remove());

  row.append(title, url, remove);
  shortcutFieldsElement.append(row);
}

function openShortcutEditor() {
  shortcutFieldsElement.replaceChildren();
  for (const shortcut of loadShortcuts()) addShortcutField(shortcut);
  shortcutDialogElement.showModal();
}

refreshQuoteElement.addEventListener("click", () => {
  quoteIndex = (quoteIndex + 1) % dailyQuotes.length;
  quoteElement.textContent = dailyQuotes[quoteIndex];
});

editShortcutsElement.addEventListener("click", openShortcutEditor);
closeShortcutsElement.addEventListener("click", () => shortcutDialogElement.close());
addShortcutElement.addEventListener("click", () => addShortcutField());
resetShortcutsElement.addEventListener("click", () => {
  shortcutFieldsElement.replaceChildren();
  for (const shortcut of defaultShortcuts) addShortcutField(shortcut);
});
shortcutFormElement.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = [...shortcutFieldsElement.querySelectorAll(".shortcut-field")];
  for (const field of fields) {
    const url = field.querySelector('[name="url"]');
    url.setCustomValidity("");
    try {
      const parsed = new URL(url.value, window.location.href);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("Unsupported protocol");
    } catch {
      url.setCustomValidity("请输入有效的网址或站内相对路径");
    }
  }
  const shortcuts = fields.map((field) => ({
    title: field.querySelector('[name="title"]').value.trim(),
    url: field.querySelector('[name="url"]').value.trim(),
    subtitle: field.dataset.subtitle,
    mark: field.dataset.mark,
  }));
  if (!shortcutFormElement.reportValidity()) return;
  localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcuts));
  renderShortcuts();
  shortcutDialogElement.close();
});

for (const filter of feedFilterElements) {
  filter.addEventListener("click", () => {
    for (const item of feedFilterElements) {
      item.setAttribute("aria-pressed", String(item === filter));
    }
    renderFeeds(filter.dataset.source);
  });
}

updateDesk();
loadFeeds();
renderShortcuts();
window.setInterval(updateDesk, 1000);
