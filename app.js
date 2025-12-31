const KEY = "writer_vault_v2";

const $ = (id) => document.getElementById(id);

function nowISO(){ return new Date().toISOString(); }
function todayKey(){ return new Date().toISOString().slice(0,10); }

function wordCount(text){
  const t = (text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function load(){
  const raw = localStorage.getItem(KEY);
  if (!raw){
    return {
      stories: [],
      selectedId: null,
      dailyWords: {},   // { "YYYY-MM-DD": number }
      goal: 250,
      reminderTime: "22:30",
      lastReminderDay: null
    };
  }
  try { return JSON.parse(raw); } catch {
    return { stories: [], selectedId: null, dailyWords: {}, goal: 250, reminderTime: "22:30", lastReminderDay: null };
  }
}
function save(){
  localStorage.setItem(KEY, JSON.stringify(state));
}

let state = load();

// UI refs
const storyList = $("storyList");
const emptyState = $("emptyState");
const editor = $("editor");

const storyTitle = $("storyTitle");
const storyText = $("storyText");
const storyWords = $("storyWords");
const storyUpdated = $("storyUpdated");

const pillTotal = $("pillTotal");
const pillToday = $("pillToday");
const pillStreak = $("pillStreak");
const pillGoal = $("pillGoal");

const goalInput = $("goalInput");
const reminderTime = $("reminderTime");
const goalHint = $("goalHint");

const tabWrite = $("tabWrite");
const tabChars = $("tabChars");
const tabTimeline = $("tabTimeline");
const panelWrite = $("panelWrite");
const panelChars = $("panelChars");
const panelTimeline = $("panelTimeline");

const btnNewStory = $("btnNewStory");
const btnDeleteStory = $("btnDeleteStory");

const btnExport = $("btnExport");
const fileImport = $("fileImport");

const charName = $("charName");
const btnAddChar = $("btnAddChar");
const charList = $("charList");

const eventWhen = $("eventWhen");
const eventTitle = $("eventTitle");
const btnAddEvent = $("btnAddEvent");
const eventList = $("eventList");

const btnTestReminder = $("btnTestReminder");

const toast = $("toast");

function showToast(msg){
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(()=> toast.style.display = "none", 2400);
}

function selectedStory(){
  return state.stories.find(s => s.id === state.selectedId) || null;
}

function setTab(which){
  panelWrite.style.display = which === "write" ? "block" : "none";
  panelChars.style.display = which === "chars" ? "block" : "none";
  panelTimeline.style.display = which === "timeline" ? "block" : "none";

  tabWrite.classList.toggle("active", which==="write");
  tabChars.classList.toggle("active", which==="chars");
  tabTimeline.classList.toggle("active", which==="timeline");
}

function calcStreak(){
  let streak = 0;
  const d = new Date();
  for(;;){
    const k = d.toISOString().slice(0,10);
    if ((state.dailyWords[k] || 0) > 0){
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function renderStats(){
  const total = state.stories.reduce((sum, s) => sum + wordCount(s.text), 0);
  pillTotal.textContent = `Total: ${total}`;

  const t = todayKey();
  const today = state.dailyWords[t] || 0;
  pillToday.textContent = `Hoy: ${today}`;

  pillStreak.textContent = `Racha: ${calcStreak()}`;
  pillGoal.textContent = `Meta: ${state.goal}`;

  goalInput.value = state.goal;
  reminderTime.value = state.reminderTime;

  if (state.goal > 0){
    const faltan = Math.max(0, state.goal - today);
    goalHint.textContent = (faltan === 0)
      ? "Meta de hoy cumplida. Puedes parar… o ponerte peligrosa 😌"
      : `Para cumplir tu meta hoy te faltan ${faltan} palabras.`;
  } else {
    goalHint.textContent = "";
  }
}

function storyCardHTML(s){
  const w = wordCount(s.text);
  const updated = s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—";
  return `
    <div><strong>${escapeHtml(s.title || "Sin título")}</strong></div>
    <div class="muted">${w} palabras · ${updated}</div>
  `;
}

function renderStories(){
  storyList.innerHTML = "";

  const sorted = state.stories.slice().sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));

  sorted.forEach(s=>{
    const div = document.createElement("div");
    div.className = "card storyCard" + (s.id === state.selectedId ? " active" : "");
    div.innerHTML = storyCardHTML(s);
    div.onclick = () => {
      state.selectedId = s.id;
      save();
      render();
    };
    storyList.appendChild(div);
  });
}

function renderEditor(){
  const s = selectedStory();
  if (!s){
    emptyState.style.display = "block";
    editor.style.display = "none";
    return;
  }
  emptyState.style.display = "none";
  editor.style.display = "block";

  storyTitle.value = s.title || "";
  storyText.value = s.text || "";

  storyWords.textContent = `Palabras: ${wordCount(s.text)}`;
  storyUpdated.textContent = `Última edición: ${s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}`;

  renderChars(s);
  renderEvents(s);
}

function renderChars(s){
  charList.innerHTML = "";
  (s.characters || []).forEach((c, idx)=>{
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
        <strong>${escapeHtml(c.name)}</strong>
        <button class="btn">Eliminar</button>
      </div>
      <div class="muted" style="margin-top:6px;">Notas / rasgos / relaciones</div>
      <textarea data-idx="${idx}" class="textarea" style="min-height:120px;">${escapeHtml(c.notes || "")}</textarea>
    `;
    div.querySelector("button").onclick = ()=>{
      s.characters.splice(idx,1);
      s.updatedAt = nowISO();
      save();
      renderChars(s);
      renderStories();
      renderStats();
    };
    div.querySelector("textarea").oninput = (e)=>{
      c.notes = e.target.value;
      s.updatedAt = nowISO();
      save();
      storyUpdated.textContent = `Última edición: ${new Date(s.updatedAt).toLocaleString()}`;
      renderStories();
    };
    charList.appendChild(div);
  });
}

function renderEvents(s){
  eventList.innerHTML = "";
  (s.timeline || []).forEach((ev, idx)=>{
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
        <div>
          <strong>${escapeHtml(ev.title)}</strong>
          <div class="muted">${escapeHtml(ev.when || "")}</div>
        </div>
        <button class="btn">Eliminar</button>
      </div>
      <div class="muted" style="margin-top:6px;">Detalle / consecuencia</div>
      <textarea data-idx="${idx}" class="textarea" style="min-height:120px;">${escapeHtml(ev.notes || "")}</textarea>
    `;
    div.querySelector("button").onclick = ()=>{
      s.timeline.splice(idx,1);
      s.updatedAt = nowISO();
      save();
      renderEvents(s);
      renderStories();
      renderStats();
    };
    div.querySelector("textarea").oninput = (e)=>{
      ev.notes = e.target.value;
      s.updatedAt = nowISO();
      save();
      storyUpdated.textContent = `Última edición: ${new Date(s.updatedAt).toLocaleString()}`;
      renderStories();
    };
    eventList.appendChild(div);
  });
}

function render(){
  renderStories();
  renderEditor();
  renderStats();
}

function escapeHtml(str){
  return (str || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

// ------- events -------
btnNewStory.onclick = ()=>{
  const id = crypto.randomUUID();
  const story = {
    id,
    title: "Nueva historia",
    text: "",
    characters: [],
    timeline: [],
    updatedAt: nowISO()
  };
  state.stories.push(story);
  state.selectedId = id;
  save();
  render();
  showToast("Historia creada ✨");
};

btnDeleteStory.onclick = ()=>{
  const s = selectedStory();
  if (!s) return;
  state.stories = state.stories.filter(x=>x.id !== s.id);
  state.selectedId = state.stories[0]?.id || null;
  save();
  render();
  showToast("Historia eliminada");
};

tabWrite.onclick = ()=> setTab("write");
tabChars.onclick = ()=> setTab("chars");
tabTimeline.onclick = ()=> setTab("timeline");

storyTitle.oninput = ()=>{
  const s = selectedStory(); if (!s) return;
  s.title = storyTitle.value;
  s.updatedAt = nowISO();
  save();
  renderStories();
};

let lastWC = 0;

storyText.onfocus = ()=>{
  const s = selectedStory(); if (!s) return;
  lastWC = wordCount(s.text);
};

storyText.oninput = ()=>{
  const s = selectedStory(); if (!s) return;

  const before = lastWC;
  s.text = storyText.value;
  s.updatedAt = nowISO();

  const after = wordCount(s.text);
  const diff = Math.max(0, after - before); // cuenta avance positivo

  if (diff > 0){
    const k = todayKey();
    state.dailyWords[k] = (state.dailyWords[k] || 0) + diff;
  }

  lastWC = after;

  save();
  storyWords.textContent = `Palabras: ${after}`;
  storyUpdated.textContent = `Última edición: ${new Date(s.updatedAt).toLocaleString()}`;
  renderStories();
  renderStats();

  const today = state.dailyWords[todayKey()] || 0;
  if (state.goal > 0 && today === state.goal){
    showToast("Meta diaria cumplida. Reina. 👑");
  }
};

btnAddChar.onclick = ()=>{
  const s = selectedStory(); if (!s) return;
  const name = (charName.value || "").trim();
  if (!name) return;
  s.characters.push({ name, notes: "" });
  s.updatedAt = nowISO();
  charName.value = "";
  save();
  renderChars(s);
  renderStories();
  showToast("Personaje agregado");
};

btnAddEvent.onclick = ()=>{
  const s = selectedStory(); if (!s) return;
  const title = (eventTitle.value || "").trim();
  const when = (eventWhen.value || "").trim();
  if (!title) return;
  s.timeline.push({ title, when, notes: "" });
  s.updatedAt = nowISO();
  eventTitle.value = "";
  save();
  renderEvents(s);
  renderStories();
  showToast("Evento agregado");
};

goalInput.oninput = ()=>{
  const val = Number(goalInput.value || 0);
  state.goal = Math.max(0, val);
  save();
  renderStats();
};

reminderTime.oninput = ()=>{
  state.reminderTime = reminderTime.value || "22:30";
  save();
  showToast("Hora guardada");
};

btnExport.onclick = ()=>{
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `writer-vault-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Respaldo descargado ✅");
};

fileImport.onchange = async (e)=>{
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  if (!imported || !Array.isArray(imported.stories)){
    showToast("Archivo inválido");
    return;
  }
  state = imported;
  save();
  render();
  showToast("Importado ✅");
};

// “recordatorio” dentro de la app (si la tienes abierta)
function maybeReminder(){
  const t = todayKey();
  const [hh, mm] = (state.reminderTime || "22:30").split(":").map(Number);
  const now = new Date();
  const isTime = now.getHours() === hh && now.getMinutes() === mm;

  if (isTime && state.lastReminderDay !== t){
    state.lastReminderDay = t;
    save();
    showToast("Hora de escribir: 5 minutos y era ✍️");
  }
}
setInterval(maybeReminder, 20_000);

btnTestReminder.onclick = ()=> showToast("Hora de escribir: 5 minutos y era ✍️");

render();
setTab("write");
