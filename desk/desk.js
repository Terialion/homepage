const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const KEYS = {
  tasks: "terialion-desk-tasks-v1",
  projects: "terialion-desk-projects-v1",
  libraryState: "terialion-desk-library-state-v1",
  resources: "terialion-desk-resources-v1",
  studyGoals: "terialion-desk-study-goals-v1",
  notes: "terialion-desk-notes-v1",
  reviews: "terialion-desk-reviews-v1",
  focus: "terialion-desk-focus-v1",
  appearance: "terialion-desk-appearance-v1",
  shortcuts: "terialion-desk-shortcuts-v2",
  legacyShortcuts: "terialion-desk-shortcuts-v1",
  quiz: "huawei-ai-quiz-state-v2",
};

const DESK_KEYS = [
  KEYS.tasks,
  KEYS.projects,
  KEYS.libraryState,
  KEYS.resources,
  KEYS.studyGoals,
  KEYS.notes,
  KEYS.reviews,
  KEYS.focus,
  KEYS.appearance,
  KEYS.shortcuts,
  KEYS.legacyShortcuts,
];
const EXPORT_KEYS = [...DESK_KEYS.filter((key) => key !== KEYS.legacyShortcuts), KEYS.quiz];
const ROUTES = {
  today: "Today",
  projects: "Projects",
  library: "Library",
  study: "Study",
  notes: "Notes",
  toolbox: "Toolbox",
};
const QUIZ_TOTAL = 243;

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
const shortDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const updatedFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const homeView = $("#home-view");
const workspaceView = $("#workspace-view");
const workspaceTitle = $("#workspace-title");
const dateElement = $("#desk-date");
const timeElement = $("#desk-time");
const todayDateElement = $("#today-date");
const yearPercentElement = $("#year-percent");
const yearProgressElement = $("#year-progress");
const quoteElement = $("#daily-quote");
const toastElement = $("#desk-toast");

let tasks = readArray(KEYS.tasks);
let projects = readArray(KEYS.projects);
let libraryState = readObject(KEYS.libraryState);
let resources = readArray(KEYS.resources);
let studyGoals = readArray(KEYS.studyGoals);
let notes = readArray(KEYS.notes);
let reviews = readObject(KEYS.reviews);
let feedItems = [];
let taskFilter = "open";
let libraryStateFilter = "unread";
let librarySourceFilter = "all";
let selectedNoteId = null;
let quoteDateKey = "";
let quoteIndex = 0;
let toastTimer = 0;
let focusTimer = 0;
let focusEndAt = 0;
let focusRemaining = Number($("#focus-duration").value) * 60;

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readArray(key) {
  const value = readJSON(key, []);
  return Array.isArray(value) ? value : [];
}

function readObject(key) {
  const value = readJSON(key, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast("本地存储空间不足，数据没有保存。");
    return false;
  }
}

function makeId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toastElement.classList.remove("is-visible"), 2400);
}

function setPressed(elements, active) {
  for (const element of elements) {
    element.setAttribute("aria-pressed", String(element === active));
  }
}

function emptyItem(message) {
  return createElement("li", "empty-state", message);
}

function updateClock() {
  const now = new Date();
  const machineTime = now.toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now - yearStart) / (yearEnd - yearStart)) * 100;
  const readableProgress = yearProgress.toFixed(1);

  dateElement.dateTime = machineTime;
  timeElement.dateTime = machineTime;
  dateElement.textContent = dateFormatter.format(now);
  timeElement.textContent = timeFormatter.format(now);
  todayDateElement.dateTime = localDateKey(now);
  todayDateElement.textContent = dateFormatter.format(now);
  yearPercentElement.textContent = `${readableProgress}%`;
  yearProgressElement.setAttribute("aria-valuenow", readableProgress);
  $("span", yearProgressElement).style.width = `${yearProgress}%`;

  const nextQuoteDateKey = localDateKey(now);
  if (nextQuoteDateKey !== quoteDateKey) {
    quoteDateKey = nextQuoteDateKey;
    quoteIndex =
      Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000) %
      dailyQuotes.length;
    quoteElement.textContent = dailyQuotes[quoteIndex];
  }
}

function currentRoute() {
  const route = window.location.hash.slice(1).toLowerCase();
  return Object.hasOwn(ROUTES, route) ? route : "home";
}

function renderRoute() {
  const route = currentRoute();
  const isHome = route === "home";
  homeView.hidden = !isHome;
  workspaceView.hidden = isHome;

  for (const link of $$("[data-route]")) {
    if (link.dataset.route === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  for (const view of $$("[data-view]")) {
    view.hidden = view.dataset.view !== route;
  }

  if (isHome) {
    document.title = "Terialion 的起始页";
  } else {
    workspaceTitle.textContent = ROUTES[route];
    document.title = `${ROUTES[route]} · Terialion Desk`;
    if (route === "study") renderStudy();
    if (route === "notes") renderNotes();
  }

  if (window.location.hash !== "#home-main") window.scrollTo({ top: 0 });
}

function taskDueLabel(due) {
  if (!due) return "无日期";
  const today = localDateKey();
  if (due === today) return "今天";
  const date = parseLocalDate(due);
  if (!date) return "无日期";
  return `${due < today ? "已逾期 · " : ""}${shortDateFormatter.format(date)}`;
}

function renderTasks() {
  const list = $("#task-list");
  const priorityOrder = { high: 0, normal: 1, low: 2 };
  const visible = [...tasks]
    .filter((task) => {
      if (taskFilter === "open") return !task.done;
      if (taskFilter === "done") return task.done;
      return true;
    })
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.due || "9999").localeCompare(b.due || "9999") ||
        (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1) ||
        (a.createdAt || "").localeCompare(b.createdAt || ""),
    );

  list.replaceChildren();
  if (!visible.length) list.append(emptyItem(taskFilter === "done" ? "还没有完成记录。" : "这里已经清空了。"));

  const priorityNames = { high: "重要", normal: "普通", low: "稍后" };
  for (const task of visible) {
    const item = createElement("li", `task-item${task.done ? " is-done" : ""}`);
    const check = createElement("button", "task-check", "✓");
    const copy = createElement("span", "task-copy");
    const title = createElement("strong", "", task.title);
    const due = createElement("small", "", taskDueLabel(task.due));
    const priority = createElement(
      "span",
      `priority-mark ${task.priority || "normal"}`,
      priorityNames[task.priority] || priorityNames.normal,
    );
    const remove = createElement("button", "row-delete", "×");

    check.type = "button";
    check.title = task.done ? "标为待完成" : "标为已完成";
    check.setAttribute("aria-label", check.title);
    check.addEventListener("click", () => {
      task.done = !task.done;
      task.completedAt = task.done ? new Date().toISOString() : null;
      saveJSON(KEYS.tasks, tasks);
      renderTasks();
      updateSummaries();
    });
    remove.type = "button";
    remove.title = "删除任务";
    remove.setAttribute("aria-label", `删除任务：${task.title}`);
    remove.addEventListener("click", () => {
      tasks = tasks.filter((itemToKeep) => itemToKeep.id !== task.id);
      saveJSON(KEYS.tasks, tasks);
      renderTasks();
      updateSummaries();
    });
    copy.append(title, due);
    item.append(check, copy, priority, remove);
    list.append(item);
  }

  const openCount = tasks.filter((task) => !task.done).length;
  $("#task-count").textContent = `${openCount} 项待完成`;
}

function renderReview() {
  $("#daily-review").value = reviews[localDateKey()] || "";
  $("#review-status").textContent = reviews[localDateKey()] ? "已保存" : "";
}

function focusRecord() {
  const saved = readObject(KEYS.focus);
  if (saved.date !== localDateKey()) return { date: localDateKey(), count: 0 };
  return { date: saved.date, count: Number(saved.count) || 0 };
}

function renderFocus() {
  const minutes = Math.floor(focusRemaining / 60);
  const seconds = focusRemaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  $("#focus-time").textContent = display;
  $("#focus-time").dateTime = `PT${focusRemaining}S`;
  $("#focus-count").textContent = `今日完成 ${focusRecord().count} 次`;
}

function stopFocus() {
  window.clearInterval(focusTimer);
  focusTimer = 0;
  focusEndAt = 0;
  $("#focus-toggle").textContent = "开始";
}

function finishFocus() {
  stopFocus();
  const record = focusRecord();
  record.count += 1;
  saveJSON(KEYS.focus, record);
  focusRemaining = Number($("#focus-duration").value) * 60;
  renderFocus();
  showToast("一次专注已经完成。");
}

function tickFocus() {
  focusRemaining = Math.max(0, Math.ceil((focusEndAt - Date.now()) / 1000));
  renderFocus();
  if (focusRemaining === 0) finishFocus();
}

function renderProjects() {
  const list = $("#project-list");
  const statusOrder = { active: 0, paused: 1, done: 2 };
  const statusNames = { active: "进行中", paused: "暂停", done: "完成" };
  const sorted = [...projects].sort(
    (a, b) =>
      (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0) ||
      (a.due || "9999").localeCompare(b.due || "9999"),
  );

  list.replaceChildren();
  if (!sorted.length) list.append(emptyItem("还没有项目。添加一个正在推进的长期目标。"));

  for (const project of sorted) {
    const item = createElement("li", "project-item");
    const copy = createElement("span", "project-copy");
    const title = createElement("strong", "", project.title);
    const due = createElement("small", "", project.due ? `目标 ${taskDueLabel(project.due)}` : "未设目标日期");
    const next = createElement("span", "project-next");
    const nextLabel = createElement("small", "", "下一里程碑");
    const nextValue = createElement("strong", "", project.next || "待补充");
    const controls = createElement("span", "project-controls");
    const status = document.createElement("select");
    const progress = document.createElement("input");
    const output = createElement("output", "", `${Number(project.progress) || 0}%`);
    const remove = createElement("button", "row-delete", "×");

    status.setAttribute("aria-label", `${project.title} 状态`);
    for (const value of ["active", "paused", "done"]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = statusNames[value];
      option.selected = (project.status || "active") === value;
      status.append(option);
    }
    status.addEventListener("change", () => {
      project.status = status.value;
      if (project.status === "done") project.progress = 100;
      saveJSON(KEYS.projects, projects);
      renderProjects();
      updateSummaries();
    });

    progress.type = "range";
    progress.min = "0";
    progress.max = "100";
    progress.step = "5";
    progress.value = String(Number(project.progress) || 0);
    progress.setAttribute("aria-label", `${project.title} 进度`);
    progress.addEventListener("input", () => {
      project.progress = Number(progress.value);
      output.textContent = `${project.progress}%`;
    });
    progress.addEventListener("change", () => {
      if (project.progress === 100) project.status = "done";
      else if (project.status === "done") project.status = "active";
      saveJSON(KEYS.projects, projects);
      renderProjects();
      updateSummaries();
    });

    remove.type = "button";
    remove.title = "删除项目";
    remove.setAttribute("aria-label", `删除项目：${project.title}`);
    remove.addEventListener("click", () => {
      if (!window.confirm(`删除项目“${project.title}”？`)) return;
      projects = projects.filter((itemToKeep) => itemToKeep.id !== project.id);
      saveJSON(KEYS.projects, projects);
      renderProjects();
      updateSummaries();
    });

    copy.append(title, due);
    next.append(nextLabel, nextValue);
    controls.append(status, progress, output);
    item.append(copy, next, controls, remove);
    list.append(item);
  }

  const activeCount = projects.filter((project) => project.status !== "done").length;
  $("#project-count").textContent = activeCount ? `${activeCount} 个进行中` : "暂无进行中项目";
}

function libraryKey(item) {
  return item.manual ? item.id : item.url;
}

function itemState(item) {
  return libraryState[libraryKey(item)] || { read: false, saved: false, later: false };
}

function combinedLibrary() {
  return [
    ...resources.map((item) => ({ ...item, source: item.kind || "Web", manual: true })),
    ...feedItems.map((item) => ({ ...item, manual: false })),
  ];
}

function renderLibrary() {
  const query = $("#library-search").value.trim().toLocaleLowerCase();
  const items = combinedLibrary()
    .filter((item) => {
      const state = itemState(item);
      const stateMatches =
        libraryStateFilter === "all" ||
        (libraryStateFilter === "unread" && !state.read) ||
        (libraryStateFilter === "read" && state.read) ||
        (libraryStateFilter === "saved" && state.saved) ||
        (libraryStateFilter === "later" && state.later);
      const sourceMatches =
        librarySourceFilter === "all" ||
        (librarySourceFilter === "manual" && item.manual) ||
        (!item.manual && item.source === librarySourceFilter);
      const queryMatches = !query || `${item.title} ${item.source}`.toLocaleLowerCase().includes(query);
      return stateMatches && sourceMatches && queryMatches;
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0),
    );
  const list = $("#library-list");
  list.replaceChildren();

  if (!items.length) list.append(createElement("li", "feed-message", "当前筛选条件下没有资料。"));

  for (const item of items) {
    const state = itemState(item);
    const row = createElement("li", "library-item");
    const source = createElement("span", "library-source", item.manual ? item.kind || "Web" : item.source);
    const copy = createElement("span", "library-copy");
    const link = createElement("a", "", item.title);
    const date = createElement("small");
    const actions = createElement("span", "library-actions");
    const save = createElement("button", state.saved ? "is-active" : "", state.saved ? "★" : "☆");
    const later = createElement("button", state.later ? "is-active" : "", "◷");
    const read = createElement("button", state.read ? "is-active" : "", "✓");

    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.addEventListener("click", () => {
      libraryState[libraryKey(item)] = { ...state, read: true, later: false };
      saveJSON(KEYS.libraryState, libraryState);
      window.setTimeout(() => {
        renderLibrary();
        updateSummaries();
      });
    });
    const itemDate = new Date(item.publishedAt || item.createdAt || Date.now());
    date.textContent = `${item.manual ? "自存" : "发布"}于 ${updatedFormatter.format(itemDate)}`;

    save.type = "button";
    save.title = state.saved ? "取消收藏" : "收藏";
    save.setAttribute("aria-label", `${save.title}：${item.title}`);
    save.addEventListener("click", () => {
      libraryState[libraryKey(item)] = { ...state, saved: !state.saved };
      saveJSON(KEYS.libraryState, libraryState);
      renderLibrary();
      updateSummaries();
    });
    later.type = "button";
    later.title = state.later ? "移出稍后阅读" : "稍后阅读";
    later.setAttribute("aria-label", `${later.title}：${item.title}`);
    later.addEventListener("click", () => {
      libraryState[libraryKey(item)] = { ...state, later: !state.later };
      saveJSON(KEYS.libraryState, libraryState);
      renderLibrary();
    });
    read.type = "button";
    read.title = state.read ? "标为未读" : "标为已读";
    read.setAttribute("aria-label", `${read.title}：${item.title}`);
    read.addEventListener("click", () => {
      libraryState[libraryKey(item)] = { ...state, read: !state.read };
      saveJSON(KEYS.libraryState, libraryState);
      renderLibrary();
      updateSummaries();
    });
    actions.append(save, later, read);

    if (item.manual) {
      const remove = createElement("button", "", "×");
      remove.type = "button";
      remove.title = "移除资料";
      remove.setAttribute("aria-label", `移除资料：${item.title}`);
      remove.addEventListener("click", () => {
        resources = resources.filter((resource) => resource.id !== item.id);
        delete libraryState[libraryKey(item)];
        saveJSON(KEYS.resources, resources);
        saveJSON(KEYS.libraryState, libraryState);
        renderLibrary();
        updateSummaries();
      });
      actions.append(remove);
    }

    copy.append(link, date);
    row.append(source, copy, actions);
    list.append(row);
  }
}

async function loadFeeds() {
  try {
    const response = await fetch(`data/feeds.json?v=${localDateKey()}`);
    if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error("Invalid feed data");
    feedItems = data.items;
    $("#feed-updated").dateTime = data.generatedAt;
    $("#feed-updated").textContent = `更新于 ${updatedFormatter.format(new Date(data.generatedAt))}`;
  } catch (error) {
    $("#feed-updated").textContent = "推送暂不可用";
    console.error(error);
  }
  renderLibrary();
  updateSummaries();
}

function quizProgress() {
  const quiz = readObject(KEYS.quiz);
  const checked = quiz.checked && typeof quiz.checked === "object" ? Object.keys(quiz.checked).length : 0;
  const bookmarks =
    quiz.bookmarks && typeof quiz.bookmarks === "object" ? Object.keys(quiz.bookmarks).length : 0;
  return { checked: Math.min(checked, QUIZ_TOTAL), bookmarks };
}

function renderStudy() {
  const progress = quizProgress();
  const percent = (progress.checked / QUIZ_TOTAL) * 100;
  $("#quiz-progress-label").textContent = `${progress.checked} / ${QUIZ_TOTAL} · 收藏 ${progress.bookmarks}`;
  $("#quiz-progress-bar").style.width = `${percent}%`;
  const activeGoals = studyGoals.filter((goal) => Number(goal.progress) < 100).length;
  $("#study-summary").textContent = `${progress.checked} 道已练习 · ${activeGoals} 个目标进行中`;
  renderStudyGoals();
}

function renderStudyGoals() {
  const list = $("#study-goal-list");
  const sorted = [...studyGoals].sort(
    (a, b) => Number(Number(a.progress) >= 100) - Number(Number(b.progress) >= 100),
  );
  list.replaceChildren();
  if (!sorted.length) list.append(emptyItem("还没有学习目标。"));

  for (const goal of sorted) {
    const item = createElement("li", "study-goal-item");
    const title = createElement("strong", "", goal.title);
    const range = document.createElement("input");
    const output = createElement("output", "", `${Number(goal.progress) || 0}%`);
    const remove = createElement("button", "row-delete", "×");
    range.type = "range";
    range.min = "0";
    range.max = "100";
    range.step = "5";
    range.value = String(Number(goal.progress) || 0);
    range.setAttribute("aria-label", `${goal.title} 进度`);
    range.addEventListener("input", () => {
      goal.progress = Number(range.value);
      output.textContent = `${goal.progress}%`;
    });
    range.addEventListener("change", () => {
      saveJSON(KEYS.studyGoals, studyGoals);
      renderStudy();
      updateSummaries();
    });
    remove.type = "button";
    remove.title = "删除学习目标";
    remove.setAttribute("aria-label", `删除学习目标：${goal.title}`);
    remove.addEventListener("click", () => {
      studyGoals = studyGoals.filter((itemToKeep) => itemToKeep.id !== goal.id);
      saveJSON(KEYS.studyGoals, studyGoals);
      renderStudy();
      updateSummaries();
    });
    item.append(title, range, output, remove);
    list.append(item);
  }
  const activeCount = studyGoals.filter((goal) => Number(goal.progress) < 100).length;
  $("#study-goal-count").textContent = activeCount ? `${activeCount} 个进行中` : "";
}

function notePreview(note) {
  return note.body.replace(/[#>*_`\[\]()~-]/g, " ").replace(/\s+/g, " ").trim() || "空白笔记";
}

function fillNoteEditor(note) {
  selectedNoteId = note?.id || null;
  $("#note-title").value = note?.title || "";
  $("#note-tags").value = Array.isArray(note?.tags) ? note.tags.join(", ") : "";
  $("#note-body").value = note?.body || "";
  $("#note-pinned").checked = Boolean(note?.pinned);
  $("#delete-note").disabled = !note;
}

function renderNotes() {
  const query = $("#note-search").value.trim().toLocaleLowerCase();
  const visible = [...notes]
    .filter((note) => `${note.title} ${(note.tags || []).join(" ")} ${note.body}`.toLocaleLowerCase().includes(query))
    .sort(
      (a, b) =>
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
    );
  const list = $("#note-list");
  list.replaceChildren();
  if (!visible.length) list.append(emptyItem(query ? "没有匹配的笔记。" : "还没有笔记。"));

  for (const note of visible) {
    const item = document.createElement("li");
    const button = createElement("button", "note-list-button");
    const title = createElement("strong", "", `${note.pinned ? "· " : ""}${note.title}`);
    const preview = createElement("span", "", notePreview(note));
    const updated = createElement("small", "", `更新于 ${updatedFormatter.format(new Date(note.updatedAt))}`);
    button.type = "button";
    button.setAttribute("aria-current", String(note.id === selectedNoteId));
    button.addEventListener("click", () => {
      fillNoteEditor(note);
      renderNotes();
    });
    button.append(title, preview, updated);
    item.append(button);
    list.append(item);
  }
}

function loadShortcuts() {
  const current = readJSON(KEYS.shortcuts, null);
  if (Array.isArray(current)) return current;
  const legacy = readJSON(KEYS.legacyShortcuts, null);
  if (!Array.isArray(legacy)) return defaultShortcuts;
  const hasHuaweiQuiz = legacy.some((item) => item.url === huaweiQuizShortcut.url);
  return hasHuaweiQuiz ? legacy : [...legacy, huaweiQuizShortcut];
}

function shortcutDetails(shortcut) {
  let host = "Local";
  try {
    host = new URL(shortcut.url, window.location.href).hostname.replace(/^www\./, "");
  } catch {
    // Old local data can be malformed; the editor validates all newly saved URLs.
  }
  return {
    mark: shortcut.mark || shortcut.title.slice(0, 2).toUpperCase(),
    subtitle: shortcut.subtitle || host || "Link",
  };
}

function renderShortcuts() {
  const grid = $("#shortcut-grid");
  grid.replaceChildren();
  for (const shortcut of loadShortcuts()) {
    const link = document.createElement("a");
    const mark = createElement("span", "shortcut-mark");
    const title = createElement("span", "", shortcut.title);
    const details = shortcutDetails(shortcut);
    const subtitle = createElement("small", "", details.subtitle);
    link.className = "shortcut glass-panel";
    link.href = shortcut.url;
    if (/^https?:\/\//.test(shortcut.url)) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    mark.ariaHidden = "true";
    mark.textContent = details.mark;
    link.append(mark, title, subtitle);
    grid.append(link);
  }
  updateSummaries();
}

function addShortcutField(shortcut = { title: "", url: "" }) {
  const row = createElement("div", "shortcut-field");
  const title = document.createElement("input");
  const url = document.createElement("input");
  const remove = createElement("button", "icon-button", "−");
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
  remove.type = "button";
  remove.title = "删除入口";
  remove.setAttribute("aria-label", "删除入口");
  remove.addEventListener("click", () => row.remove());
  row.append(title, url, remove);
  $("#shortcut-fields").append(row);
}

function openShortcutEditor() {
  $("#shortcut-fields").replaceChildren();
  for (const shortcut of loadShortcuts()) addShortcutField(shortcut);
  $("#shortcut-dialog").showModal();
}

function updateSummaries() {
  const today = localDateKey();
  const todayOpen = tasks.filter((task) => !task.done && (!task.due || task.due <= today)).length;
  const activeProjects = projects.filter((project) => project.status !== "done").length;
  const unread = combinedLibrary().filter((item) => !itemState(item).read).length;
  const quiz = quizProgress();
  const activeGoals = studyGoals.filter((goal) => Number(goal.progress) < 100).length;
  const shortcutCount = loadShortcuts().length;

  $("#summary-today").textContent = todayOpen ? `${todayOpen} 项待处理` : "今天从这里开始";
  $("#summary-projects").textContent = activeProjects ? `${activeProjects} 个进行中` : "暂无进行中项目";
  $("#summary-library").textContent = unread ? `${unread} 篇未读` : "阅读列表已清空";
  $("#summary-study").textContent = `${quiz.checked} 道题 · ${activeGoals} 个目标`;
  $("#summary-notes").textContent = notes.length ? `${notes.length} 篇本地笔记` : "暂无笔记";
  $("#summary-toolbox").textContent = `${shortcutCount} 个常用入口`;
  $("#home-status").textContent = `${todayOpen} 项待办 · ${unread} 篇未读 · ${activeProjects} 个项目`;

  const nextTask = tasks
    .filter((task) => !task.done)
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))[0];
  $("#home-status-meta").textContent = nextTask ? `接下来：${nextTask.title}` : "A clear place to begin";
}

function applyAppearance(value) {
  const validValue = ["balanced", "clear", "focus"].includes(value) ? value : "balanced";
  document.body.dataset.appearance = validValue;
  $("#appearance-select").value = validValue;
}

function exportData() {
  const data = {};
  for (const key of EXPORT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  const payload = { version: 1, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `terialion-desk-${localDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  $("#settings-status").textContent = "备份文件已经导出。";
}

async function importData(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (payload.version !== 1 || !payload.data || typeof payload.data !== "object") {
      throw new Error("Invalid backup");
    }
    for (const key of EXPORT_KEYS) {
      if (!Object.hasOwn(payload.data, key)) continue;
      localStorage.setItem(key, JSON.stringify(payload.data[key]));
    }
    $("#settings-status").textContent = "导入完成，正在刷新。";
    window.setTimeout(() => window.location.reload(), 400);
  } catch {
    $("#settings-status").textContent = "无法读取这个备份文件。";
  }
}

$("#refresh-quote").addEventListener("click", () => {
  quoteIndex = (quoteIndex + 1) % dailyQuotes.length;
  quoteElement.textContent = dailyQuotes[quoteIndex];
});

$(".skip-link").addEventListener("click", (event) => {
  const route = currentRoute();
  if (route === "home") return;
  event.preventDefault();
  const activeView = $(`[data-view="${route}"]`);
  activeView.tabIndex = -1;
  activeView.focus();
});

$("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  tasks.push({
    id: makeId("task"),
    title: String(form.get("title")).trim(),
    due: String(form.get("due")),
    priority: String(form.get("priority")),
    done: false,
    createdAt: new Date().toISOString(),
  });
  saveJSON(KEYS.tasks, tasks);
  event.currentTarget.reset();
  $("#task-due").value = localDateKey();
  taskFilter = "open";
  setPressed($$("[data-task-filter]"), $("[data-task-filter='open']"));
  renderTasks();
  updateSummaries();
  $("#task-title").focus();
});

for (const filter of $$("[data-task-filter]")) {
  filter.addEventListener("click", () => {
    taskFilter = filter.dataset.taskFilter;
    setPressed($$("[data-task-filter]"), filter);
    renderTasks();
  });
}

$("#daily-review").addEventListener("input", (event) => {
  reviews[localDateKey()] = event.currentTarget.value;
  saveJSON(KEYS.reviews, reviews);
  $("#review-status").textContent = `已保存 ${timeFormatter.format(new Date()).slice(0, 5)}`;
});

$("#focus-toggle").addEventListener("click", () => {
  if (focusTimer) {
    tickFocus();
    stopFocus();
    return;
  }
  if (focusRemaining <= 0) focusRemaining = Number($("#focus-duration").value) * 60;
  focusEndAt = Date.now() + focusRemaining * 1000;
  $("#focus-toggle").textContent = "暂停";
  focusTimer = window.setInterval(tickFocus, 250);
});

$("#focus-reset").addEventListener("click", () => {
  stopFocus();
  focusRemaining = Number($("#focus-duration").value) * 60;
  renderFocus();
});

$("#focus-duration").addEventListener("change", () => {
  stopFocus();
  focusRemaining = Number($("#focus-duration").value) * 60;
  renderFocus();
});

$("#project-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  projects.push({
    id: makeId("project"),
    title: String(form.get("title")).trim(),
    next: String(form.get("next")).trim(),
    due: String(form.get("due")),
    status: "active",
    progress: 0,
    createdAt: new Date().toISOString(),
  });
  saveJSON(KEYS.projects, projects);
  event.currentTarget.reset();
  renderProjects();
  updateSummaries();
  $("#project-title").focus();
});

for (const filter of $$("[data-library-state]")) {
  filter.addEventListener("click", () => {
    libraryStateFilter = filter.dataset.libraryState;
    setPressed($$("[data-library-state]"), filter);
    renderLibrary();
  });
}

for (const filter of $$("[data-library-source]")) {
  filter.addEventListener("click", () => {
    librarySourceFilter = filter.dataset.librarySource;
    setPressed($$("[data-library-source]"), filter);
    renderLibrary();
  });
}

$("#library-search").addEventListener("input", renderLibrary);

$("#resource-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const urlInput = $("#resource-url");
  urlInput.setCustomValidity("");
  try {
    const parsed = new URL(String(form.get("url")));
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("Unsupported protocol");
  } catch {
    urlInput.setCustomValidity("请输入有效的 HTTP 或 HTTPS 网址");
  }
  if (!event.currentTarget.reportValidity()) return;

  const resource = {
    id: makeId("resource"),
    title: String(form.get("title")).trim(),
    url: String(form.get("url")).trim(),
    kind: String(form.get("kind")),
    createdAt: new Date().toISOString(),
  };
  resources.push(resource);
  libraryState[resource.id] = { read: false, saved: true, later: false };
  saveJSON(KEYS.resources, resources);
  saveJSON(KEYS.libraryState, libraryState);
  event.currentTarget.reset();
  libraryStateFilter = "saved";
  setPressed($$("[data-library-state]"), $("[data-library-state='saved']"));
  renderLibrary();
  updateSummaries();
  showToast("资料已保存到 Library。");
});

$("#study-goal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = String(new FormData(event.currentTarget).get("title")).trim();
  studyGoals.push({ id: makeId("goal"), title, progress: 0, createdAt: new Date().toISOString() });
  saveJSON(KEYS.studyGoals, studyGoals);
  event.currentTarget.reset();
  renderStudy();
  updateSummaries();
  $("#study-goal-title").focus();
});

$("#new-note").addEventListener("click", () => {
  fillNoteEditor(null);
  renderNotes();
  $("#note-title").focus();
});

$("#note-search").addEventListener("input", renderNotes);

$("#note-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const now = new Date().toISOString();
  const data = {
    title: String(form.get("title")).trim(),
    tags: String(form.get("tags"))
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    body: String(form.get("body")),
    pinned: form.get("pinned") === "on",
    updatedAt: now,
  };
  const existing = notes.find((note) => note.id === selectedNoteId);
  if (existing) Object.assign(existing, data);
  else {
    const note = { id: makeId("note"), createdAt: now, ...data };
    notes.push(note);
    selectedNoteId = note.id;
  }
  saveJSON(KEYS.notes, notes);
  renderNotes();
  updateSummaries();
  showToast("笔记已保存在这台设备上。");
});

$("#delete-note").addEventListener("click", () => {
  const note = notes.find((item) => item.id === selectedNoteId);
  if (!note || !window.confirm(`删除笔记“${note.title}”？`)) return;
  notes = notes.filter((item) => item.id !== note.id);
  saveJSON(KEYS.notes, notes);
  fillNoteEditor(null);
  renderNotes();
  updateSummaries();
});

$("#edit-shortcuts").addEventListener("click", openShortcutEditor);
$("#close-shortcuts").addEventListener("click", () => $("#shortcut-dialog").close());
$("#add-shortcut").addEventListener("click", () => addShortcutField());
$("#reset-shortcuts").addEventListener("click", () => {
  $("#shortcut-fields").replaceChildren();
  for (const shortcut of defaultShortcuts) addShortcutField(shortcut);
});

$("#shortcut-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = $$(".shortcut-field", $("#shortcut-fields"));
  for (const field of fields) {
    const url = $("[name='url']", field);
    url.setCustomValidity("");
    try {
      const parsed = new URL(url.value, window.location.href);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("Unsupported protocol");
    } catch {
      url.setCustomValidity("请输入有效的网址或站内相对路径");
    }
  }
  if (!event.currentTarget.reportValidity()) return;
  const shortcuts = fields.map((field) => ({
    title: $("[name='title']", field).value.trim(),
    url: $("[name='url']", field).value.trim(),
    subtitle: field.dataset.subtitle,
    mark: field.dataset.mark,
  }));
  saveJSON(KEYS.shortcuts, shortcuts);
  renderShortcuts();
  $("#shortcut-dialog").close();
});

for (const button of $$("[data-open-settings]")) {
  button.addEventListener("click", () => $("#settings-dialog").showModal());
}

$("#appearance-select").addEventListener("change", (event) => {
  applyAppearance(event.currentTarget.value);
  saveJSON(KEYS.appearance, event.currentTarget.value);
});

$("#export-data").addEventListener("click", exportData);
$("#import-data").addEventListener("change", (event) => {
  const [file] = event.currentTarget.files;
  if (file) importData(file);
  event.currentTarget.value = "";
});
$("#clear-desk-data").addEventListener("click", () => {
  if (!window.confirm("清空任务、项目、资料、笔记和设置？华为题库进度会保留。")) return;
  for (const key of DESK_KEYS) localStorage.removeItem(key);
  $("#settings-status").textContent = "Desk 数据已清空，正在刷新。";
  window.setTimeout(() => window.location.reload(), 400);
});

window.addEventListener("hashchange", renderRoute);
window.addEventListener("storage", () => {
  renderStudy();
  updateSummaries();
});

$("#task-due").value = localDateKey();
applyAppearance(readJSON(KEYS.appearance, "balanced"));
updateClock();
renderTasks();
renderReview();
renderFocus();
renderProjects();
renderStudy();
renderNotes();
renderShortcuts();
renderRoute();
loadFeeds();
window.setInterval(updateClock, 1000);
