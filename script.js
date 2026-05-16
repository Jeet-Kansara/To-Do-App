let tasks = [];
try {
  const stored = JSON.parse(localStorage.getItem("taskflow-tasks") || "[]");
  tasks = Array.isArray(stored) ? stored : [];
} catch {
  tasks = [];
}
let currentFilter = "all";
let dragSrcId = null;

function getToday() {
  return new Date();
}

function getTodayLabel() {
  return getToday().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getTodayStr() {
  return getToday().toISOString().split("T")[0];
}

document.getElementById("today-date").textContent = getTodayLabel();

function save() {
  localStorage.setItem("taskflow-tasks", JSON.stringify(tasks));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + type + " show";
  setTimeout(() => (el.className = "toast " + type), 2500);
}

function addTask() {
  const input = document.getElementById("task-input");
  const text = input.value.trim();
  if (!text) {
    toast("Please enter a task!", "error");
    input.focus();
    return;
  }

  const priority = document.getElementById("priority-select").value;
  const category = document.getElementById("category-select").value;
  const due = document.getElementById("due-input").value;

  tasks.unshift({
    id: genId(),
    text,
    completed: false,
    priority,
    category,
    due: due || null,
    createdAt: Date.now(),
  });

  input.value = "";
  document.getElementById("due-input").value = "";
  save();
  renderTasks();
  toast("Task added ✓", "success");
  input.focus();
}

function handleInputKey(e) {
  if (e.key === "Enter") addTask();
}

function toggleTask(id) {
  const t = tasks.find((t) => t.id === id);
  if (t) {
    t.completed = !t.completed;
    save();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  save();
  renderTasks();
  toast("Task deleted");
}

function startEdit(id) {
  const t = tasks.find((t) => t.id === id);
  if (!t) return;
  const card = document.querySelector(`[data-id="${id}"]`);
  const textEl = card.querySelector(".task-text");
  const inp = document.createElement("input");
  inp.className = "edit-input";
  inp.value = t.text;
  textEl.replaceWith(inp);
  inp.focus();
  inp.select();
  inp.addEventListener("blur", () => finishEdit(id, inp.value));
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") inp.blur();
    if (e.key === "Escape") {
      inp.value = t.text;
      inp.blur();
    }
  });
}

function finishEdit(id, val) {
  const t = tasks.find((t) => t.id === id);
  if (t && val.trim()) {
    t.text = val.trim();
    save();
  }
  renderTasks();
}

function setFilter(f) {
  currentFilter = f;
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.filter === f));
  const titles = {
    all: "All Tasks",
    active: "Active Tasks",
    completed: "Completed Tasks",
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
    today: "Due Today",
    overdue: "Overdue Tasks",
  };
  document.getElementById("filter-title").textContent = titles[f] || "Tasks";
  renderTasks();
}

function getFilteredTasks() {
  const search = document
    .getElementById("search-input")
    .value.trim()
    .toLowerCase();
  const todayStr = getTodayStr();

  return tasks.filter((t) => {
    if (search && !t.text.toLowerCase().includes(search)) return false;
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    if (currentFilter === "high") return t.priority === "high";
    if (currentFilter === "medium") return t.priority === "medium";
    if (currentFilter === "low") return t.priority === "low";
    if (currentFilter === "today") return t.due === todayStr;
    if (currentFilter === "overdue")
      return t.due && t.due < todayStr && !t.completed;
    return true;
  });
}

function getSortedTasks(list) {
  const sort = document.getElementById("sort-select").value;
  const pOrder = { high: 0, medium: 1, low: 2 };
  const copy = [...list];
  if (sort === "priority")
    copy.sort((a, b) => (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1));
  else if (sort === "due")
    copy.sort((a, b) => ((a.due || "9999") > (b.due || "9999") ? 1 : -1));
  else if (sort === "az") copy.sort((a, b) => a.text.localeCompare(b.text));
  else if (sort === "date-added")
    copy.sort((a, b) => b.createdAt - a.createdAt);
  return copy;
}

function formatDue(due) {
  if (!due) return null;
  const d = new Date(due + "T00:00:00");
  const today = getToday();
  const todayStr = getTodayStr();
  if (due === todayStr) return { label: "Today", overdue: false };
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 1) return { label: "Tomorrow", overdue: false };
  return {
    label: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    overdue: false,
  };
}

function renderTasks() {
  updateCounts();
  const section = document.getElementById("tasks-section");
  const filtered = getSortedTasks(getFilteredTasks());
  const active = filtered.filter((t) => !t.completed);
  const done = filtered.filter((t) => t.completed);

  let html = "";

  if (filtered.length === 0) {
    html = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No tasks here</div>
        <div class="empty-sub">Add a task above or change your filter</div>
      </div>`;
  } else {
    if (active.length > 0) {
      html += `<div class="section-header"><span class="section-label">Active (${active.length})</span><div class="section-line"></div></div>`;
      html += `<div class="task-list">${active.map((t) => taskCard(t)).join("")}</div>`;
    }
    if (done.length > 0) {
      html += `<div class="section-header"><span class="section-label">Completed (${done.length})</span><div class="section-line"></div></div>`;
      html += `<div class="task-list">${done.map((t) => taskCard(t)).join("")}</div>`;
    }
  }

  document.getElementById("actions-count").innerHTML =
    `<strong>${filtered.length}</strong> task${filtered.length !== 1 ? "s" : ""}`;
  section.innerHTML = html;
}

function taskCard(t) {
  const due = formatDue(t.due);
  const pLabel = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
  const dueHtml = due
    ? `<span class="meta-badge badge-due${due.overdue ? " overdue" : ""}">📅 ${due.label}</span>`
    : "";

  return `<div class="task-card${t.completed ? " completed" : ""}" data-id="${t.id}" draggable="true"
      ondragstart="dragStart(event,'${t.id}')" ondragover="dragOver(event)" ondrop="drop(event,'${t.id}')">
      <div class="priority-stripe ${t.priority}"></div>
      <div class="check-wrap">
        <div class="custom-checkbox${t.completed ? " checked" : ""}" onclick="toggleTask('${t.id}')" title="${t.completed ? "Mark active" : "Mark complete"}"></div>
      </div>
      <div class="task-body">
        <div class="task-text">${escHtml(t.text)}</div>
        <div class="task-meta">
          <span class="meta-badge badge-category">${escHtml(t.category)}</span>
          <span class="meta-badge badge-priority-${t.priority}">${pLabel}</span>
          ${dueHtml}
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn" onclick="startEdit('${t.id}')" title="Edit">✏️</button>
        <button class="action-btn delete" onclick="deleteTask('${t.id}')" title="Delete">🗑</button>
      </div>
    </div>`;
}

function escHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateCounts() {
  const todayStr = getTodayStr();
  const counts = {
    all: tasks.length,
    active: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
    high: tasks.filter((t) => t.priority === "high").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    low: tasks.filter((t) => t.priority === "low").length,
    today: tasks.filter((t) => t.due === todayStr).length,
    overdue: tasks.filter((t) => t.due && t.due < todayStr && !t.completed)
      .length,
  };
  Object.entries(counts).forEach(([k, v]) => {
    const el = document.getElementById("count-" + k);
    if (el) el.textContent = v;
  });
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-done").textContent = done;
  document.getElementById("stat-pct").textContent = pct + "%";
  document.getElementById("progress-fill").style.width = pct + "%";
}

function completeAll() {
  const filtered = getFilteredTasks();
  const allDone = filtered.every((t) => t.completed);
  filtered.forEach((t) => {
    t.completed = !allDone;
  });
  save();
  renderTasks();
  toast(allDone ? "Marked all active" : "All tasks completed ✓", "success");
}

function clearCompleted() {
  const n = tasks.filter((t) => t.completed).length;
  if (!n) {
    toast("No completed tasks to clear");
    return;
  }
  if (!confirm(`Delete ${n} completed task${n > 1 ? "s" : ""}?`)) return;
  tasks = tasks.filter((t) => !t.completed);
  save();
  renderTasks();
  toast(`${n} task${n > 1 ? "s" : ""} cleared`);
}

// Drag-and-drop reorder
function dragStart(e, id) {
  dragSrcId = id;
  e.dataTransfer.effectAllowed = "move";
}
function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
function drop(e, targetId) {
  e.preventDefault();
  if (dragSrcId === targetId) return;
  const si = tasks.findIndex((t) => t.id === dragSrcId);
  const ti = tasks.findIndex((t) => t.id === targetId);
  if (si < 0 || ti < 0) return;
  const [moved] = tasks.splice(si, 1);
  tasks.splice(ti, 0, moved);
  save();
  renderTasks();
}



renderTasks();
