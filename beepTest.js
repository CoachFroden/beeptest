/* =========================
   BEEP TEST – STABIL MOTOR
   ========================= */

/* ---------- DELTAKERE ---------- */
const participantNames = [
  "Ask",
  "Brage",
  "Gabriel",
  "Lars",
  "Liam",
  "Lukas",
  "Martin",
  "Nicolai",
  "Noah",
  "Nytveit",
  "Oliver",
  "Snorre",
  "Sondre",
  "Sverre",
  "Thage",
  "Theodor",
  "Torvald",
  "William"
];

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------- DATA ---------- */
const beepLevels = [
  { level: 1, speed: 8.5, shuttles: 7 },
  { level: 2, speed: 9.0, shuttles: 8 },
  { level: 3, speed: 9.5, shuttles: 8 },
  { level: 4, speed: 10.0, shuttles: 9 },
  { level: 5, speed: 10.5, shuttles: 9 },
  { level: 6, speed: 11.0, shuttles: 10 },
  { level: 7, speed: 11.5, shuttles: 10 },
  { level: 8, speed: 12.0, shuttles: 11 },
  { level: 9, speed: 12.5, shuttles: 11 },
  { level: 10, speed: 13.0, shuttles: 12 },
  { level: 11, speed: 13.5, shuttles: 12 },
  { level: 12, speed: 14.0, shuttles: 13 },
  { level: 13, speed: 14.5, shuttles: 13 },
  { level: 14, speed: 15.0, shuttles: 14 },
  { level: 15, speed: 15.5, shuttles: 14 },
  { level: 16, speed: 16.0, shuttles: 15 },
  { level: 17, speed: 16.5, shuttles: 15 },
  { level: 18, speed: 17.0, shuttles: 16 },
  { level: 19, speed: 17.5, shuttles: 16 },
  { level: 20, speed: 18.0, shuttles: 17 },
  { level: 21, speed: 18.5, shuttles: 17 }
];

/* ---------- LYDER ---------- */
const sounds = {
  info: new Audio("startbeeptest.mp3"),
  countdown: new Audio("nedtelling.mp3"),
  tripleBeep: new Audio("startbeeps.mp3"),
  beep: "beep.wav",
  startLevel: lvl => new Audio(`niva-${lvl}.mp3`)
};

function play(audio) {
  if (audio instanceof Audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}
/* =====================================================
   WEB AUDIO API – KUN FOR BEEP (iOS-STABIL)
   ===================================================== */
let audioCtx = null;
let beepBuffer = null;
let webAudioUnlocked = false;

async function initWebAudio() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const res = await fetch("beep.wav");
  const buf = await res.arrayBuffer();
  beepBuffer = await audioCtx.decodeAudioData(buf);
}

async function unlockWebAudio() {
  if (webAudioUnlocked) return;

  await initWebAudio();

  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  // iOS krever faktisk avspilling én gang
  const src = audioCtx.createBufferSource();
  src.buffer = beepBuffer;
  src.connect(audioCtx.destination);
  src.start(0);
  src.stop(0);

  webAudioUnlocked = true;
}

function playBeep() {
  if (!audioCtx || audioCtx.state !== "running") return;

  const src = audioCtx.createBufferSource();
  src.buffer = beepBuffer;
  src.connect(audioCtx.destination);
  src.start();
}


/* ---------- STATE ---------- */
let levelIndex = 0;
let shuttleCount = 0;
let running = false;
let timer = null;
let barForward = true;
let wakeLock = null;

/* ---------- HJELP ---------- */
function shuttleIntervalMs(speed) {
  return (20 / (speed / 3.6)) * 1000;
}

function updateDisplay() {
  const el = document.getElementById("levelDisplay");
  if (!el || !beepLevels[levelIndex]) return;

  const lvl = beepLevels[levelIndex];
  el.textContent = `Nivå ${lvl.level} – Shuttle ${shuttleCount}/${lvl.shuttles}`;
}

/* ---------- PROGRESS BAR ---------- */
function animateProgress(duration) {
  const bar = document.getElementById("progressBar");
  const startTime = Date.now();

  let startPercent;

  // 🔑 Hvis dette er første shuttle i hele testen
  if (levelIndex === 0 && shuttleCount === 1) {
    startPercent = 0;
    bar.style.width = "0%";
  } else {
    startPercent = parseFloat(bar.style.width) || 0;
  }

  const endPercent = barForward ? 100 : 0;
  const delta = endPercent - startPercent;

  function step() {
    if (!running) return;

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    bar.style.width = (startPercent + delta * progress) + "%";

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ---------- SHUTTLE LOGIKK ---------- */
function startShuttle() {
  if (!running) return;

  const level = beepLevels[levelIndex];
  const interval = shuttleIntervalMs(level.speed);

  animateProgress(interval);
  timer = setTimeout(onShuttleEnd, interval);
}

function onShuttleEnd() {
  if (!running) return;

  const level = beepLevels[levelIndex];

  // Hvis dette var siste shuttle i nivået
  if (shuttleCount >= level.shuttles) {
    levelIndex++;

    if (levelIndex >= beepLevels.length) {
      stopTest();
      return;
    }

    startNewLevel();
    return;
  }

  // 🔊 Beep ved vending
  playBeep();

  // Start neste shuttle
  shuttleCount++;
  updateDisplay();

  barForward = !barForward;
  startShuttle();
}

function startNewLevel() {
  if (!running) return;

  const level = beepLevels[levelIndex];

  // 🔊 Start nivå-beep
  play(sounds.tripleBeep);

  // ⏱️ Start timer + shuttle 1 UMIDDELBART
  shuttleCount = 1;
  updateDisplay();

  // Synk bar-retning mot nåværende posisjon
  const bar = document.getElementById("progressBar");
  const current = parseFloat(bar.style.width) || 0;
  barForward = current < 50;

  // 🏃 Første shuttle starter nå
  startShuttle();

  // 🗣️ Stemmen kommer litt etter
  setTimeout(() => {
    if (running) play(sounds.startLevel(level.level));
  }, 750);
}

/* ---------- START / STOP ---------- */
async function startTest() {
  await unlockWebAudio(); // 🔑 iOS / Web Audio unlock

  if (running) return;
  running = true;
  
    // 🔒 Hold skjermen våken under test
  if ("wakeLock" in navigator) {
    navigator.wakeLock.request("screen")
      .then(lock => wakeLock = lock)
      .catch(() => {});
  }


  levelIndex = 0;
  shuttleCount = 0;

  // 🔑 KUN HER resettes bar
  barForward = true;
  document.getElementById("progressBar").style.width = "0%";

  play(sounds.info);

  sounds.info.onended = () => {
    play(sounds.countdown);

    sounds.countdown.onended = () => {
      startNewLevel();
    };
  };
}


function stopTest() {
  running = false;
  clearTimeout(timer);

  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}


// HTML-en din bruker pauseTest(). Vi lar den pause med stopTest() (enkelt og stabilt).
function pauseTest() {
  stopTest();
}

function resetTest() {
  stopTest();
  levelIndex = 0;
  shuttleCount = 0;
  barForward = true;

  const bar = document.getElementById("progressBar");
  if (bar) bar.style.width = "0%";

  updateDisplay();

  // RESET ALLE DELTAKERE
  document.querySelectorAll("#participants button").forEach(btn => {
    btn.textContent = btn.dataset.name;
    btn.classList.remove("done");
  });
}

/* ---------- DELTAKERE: RENDER ---------- */
function renderParticipants() {
  const container = document.getElementById("participants");
  if (!container) return;

  container.innerHTML = "";

  participantNames.forEach(name => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.dataset.name = name;
    container.appendChild(btn);
  });
}

/* ---------- MODAL (RESET/REDIGER/FJERN) ---------- */
let pendingButton = null;

const resetModal = document.getElementById("resetModal");
const resetText = document.getElementById("resetText");
const editSection = document.getElementById("editSection");
const editInput = document.getElementById("editResult");

const confirmReset = document.getElementById("confirmReset");
const editBtn = document.getElementById("editBtn");
const saveEdit = document.getElementById("saveEdit");
const cancelBtn = document.getElementById("cancelReset");
const removeParticipantBtn = document.getElementById("removeParticipantBtn");

/* ---------- KLIKK PÅ DELTAKER ---------- */
document.getElementById("participants").addEventListener("click", e => {
  if (e.target.tagName !== "BUTTON") return;

  const btn = e.target;

  // CASE 1: Deltaker har resultat → åpne modal for reset/rediger
  if (btn.classList.contains("done")) {
    pendingButton = btn;
    resetText.textContent = `Resultat for ${btn.dataset.name}:`;

    // vis rediger-knapp, skjul fjern-knapp
    editSection.classList.add("hidden");
    saveEdit.classList.add("hidden");
    editBtn.classList.remove("hidden");
    removeParticipantBtn?.classList.add("hidden");

    resetModal.classList.remove("hidden");
    return;
  }

  // CASE 2: Testen kjører → registrer resultat (ikke modal)
  if (running) {
    const level = beepLevels[levelIndex].level;
    const shuttle = shuttleCount;
    const result = `${level}.${shuttle}`;

    btn.textContent = `${btn.dataset.name} – ${result}`;
    btn.classList.add("done");
    return;
  }

  // CASE 3: Testen kjører ikke og deltakeren har ikke resultat → tilby fjerning
  pendingButton = btn;
  resetText.textContent = `Hva vil du gjøre med ${btn.dataset.name}?`;

  // vis fjern, skjul rediger/reset-deler
  removeParticipantBtn?.classList.remove("hidden");
  editBtn.classList.add("hidden");
  saveEdit.classList.add("hidden");
  editSection.classList.add("hidden");

  resetModal.classList.remove("hidden");
});

/* ---------- RESET RESULTAT (done → tilbake til navn) ---------- */
confirmReset.addEventListener("click", () => {
  if (!pendingButton) return;

  pendingButton.textContent = pendingButton.dataset.name;
  pendingButton.classList.remove("done");

  closeResetModal();
});

/* ---------- GÅ TIL REDIGER ---------- */
editBtn.addEventListener("click", () => {
  if (!pendingButton) return;

  const current = pendingButton.textContent.split("–")[1]?.trim() || "";
  editInput.value = current;

  editSection.classList.remove("hidden");
  saveEdit.classList.remove("hidden");
  editBtn.classList.add("hidden");
});

/* ---------- LAGRE REDIGERT RESULTAT ---------- */
saveEdit.addEventListener("click", () => {
  if (!pendingButton) return;

  const value = editInput.value.trim();

  if (!/^\d+(\.\d+)?$/.test(value)) {
    showStatus("Ugyldig format. Bruk x.x");
    return;
  }

  pendingButton.textContent = `${pendingButton.dataset.name} – ${value}`;
  pendingButton.classList.add("done");

  closeResetModal();
});

/* ---------- FJERN DELTAKER ---------- */
removeParticipantBtn?.addEventListener("click", () => {
  if (!pendingButton) return;

  const name = pendingButton.dataset.name;
  const idx = participantNames.indexOf(name);

  if (idx !== -1) {
    participantNames.splice(idx, 1);
    renderParticipants();
    showStatus(`${name} fjernet`);
  }

  closeResetModal();
});

/* ---------- AVBRYT MODAL ---------- */
cancelBtn.addEventListener("click", closeResetModal);

function closeResetModal() {
  pendingButton = null;
  editInput.value = "";

  editSection.classList.add("hidden");
  saveEdit.classList.add("hidden");
  editBtn.classList.remove("hidden");
  removeParticipantBtn?.classList.add("hidden");

  resetModal.classList.add("hidden");
}

/* ---------- LEGG TIL DELTAKER (MODAL) ---------- */
const addParticipantBtn = document.getElementById("addParticipantBtn");
const addParticipantModal = document.getElementById("addParticipantModal");
const newParticipantInput = document.getElementById("newParticipantName");
const confirmAddParticipant = document.getElementById("confirmAddParticipant");
const cancelAddParticipant = document.getElementById("cancelAddParticipant");

addParticipantBtn?.addEventListener("click", () => {
  newParticipantInput.value = "";
  addParticipantModal.classList.remove("hidden");
  newParticipantInput.focus();
});

cancelAddParticipant?.addEventListener("click", () => {
  addParticipantModal.classList.add("hidden");
});

confirmAddParticipant?.addEventListener("click", () => {
  const name = newParticipantInput.value.trim();
  if (!name) {
    showStatus("Skriv inn et navn");
    return;
  }

  // enkel duplikatsjekk (case-insensitive)
  const exists = participantNames.some(n => n.toLowerCase() === name.toLowerCase());
  if (exists) {
    showStatus("Deltaker finnes allerede");
    return;
  }

  participantNames.push(name);
  renderParticipants();

  addParticipantModal.classList.add("hidden");
  showStatus(`${name} lagt til`);
});

/* ---------- FIREBASE: SEND RESULTATER ---------- */
document
  .getElementById("sendResultsBtn")
  .addEventListener("click", sendResultsToFirebase);

async function sendResultsToFirebase() {
  const buttons = document.querySelectorAll("#participants button.done");

  if (buttons.length === 0) {
    showStatus("Ingen resultater å sende");
    return;
  }

  const results = [];

  buttons.forEach(btn => {
    const name = btn.dataset.name;
    const text = btn.textContent;

    // Forventer: "Navn – x.x"
    const result = text.split("–")[1]?.trim();
    if (!result) return;

    const [level, shuttle] = result.split(".");
    const now = new Date();

    results.push({
      name,
      level: Number(level),
      shuttle: Number(shuttle),
      result,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      timestamp: now.getTime()
    });
  });

  try {
    for (const r of results) {
      await addDoc(collection(db, "beeptestResults"), r);
    }
    showStatus("Resultater sendt til Firebase");
  } catch (err) {
    console.error(err);
    showStatus("Feil ved sending til Firebase");
  }
}

/* ---------- FIREBASE: VIS RESULTATER ---------- */
async function openResultsModal() {
  const modal = document.getElementById("resultsModal");
  const dateList = document.getElementById("dateList");
  const resultsList = document.getElementById("resultsList");

  dateList.innerHTML = "";
  resultsList.innerHTML = "";

  modal.classList.remove("hidden");

  const q = query(collection(db, "beeptestResults"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);

  const byDate = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.date) return;
    (byDate[data.date] ??= []).push(data);
  });

  Object.keys(byDate).forEach(date => {
    const btn = document.createElement("button");
    btn.textContent = date;
    btn.addEventListener("click", () => showResultsForDate(date, byDate[date]));
    dateList.appendChild(btn);
  });
}

function showResultsForDate(date, results) {
  const container = document.getElementById("resultsList");
  container.innerHTML = `<h4>${date}</h4>`;

  results
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(r => {
      const row = document.createElement("div");
      row.textContent = `${r.name} – ${r.result}`;
      container.appendChild(row);
    });
}

document.getElementById("viewResultsBtn").addEventListener("click", openResultsModal);

document.getElementById("closeResults").addEventListener("click", () => {
  document.getElementById("resultsModal").classList.add("hidden");
});

document
  .getElementById("printResultsBtn")
  .addEventListener("click", printResults);

document
  .getElementById("shareResultsBtn")
  .addEventListener("click", shareResults);

function printResults() {
  const content = document.getElementById("resultsList").innerHTML;

  const win = window.open("", "", "width=800,height=600");
  win.document.write(`
    <html>
      <head>
        <title>Beep Test – Resultater</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            padding: 20px;
          }
          h4 {
            margin-top: 20px;
          }
          div {
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <h2>Beep Test – Resultater</h2>
        ${content}
      </body>
    </html>
  `);

  win.document.close();
  win.focus();
  win.print();
}

function shareResults() {
  const text = document.getElementById("resultsList").innerText;

  if (navigator.share) {
    navigator.share({
      title: "Beep Test – Resultater",
      text
    })
    .catch(() => {
      // Fallback hvis deling feiler
      navigator.clipboard.writeText(text);
      showStatus("Ingen delingsapper funnet – resultat kopiert");
    });
  } else {
    navigator.clipboard.writeText(text);
    showStatus("Resultat kopiert til utklippstavle");
  }
}



/* ---------- STATUS (TOAST) ---------- */
function showStatus(message, duration = 2500) {
  const el = document.getElementById("statusMessage");
  if (!el) return;

  el.textContent = message;
  el.classList.remove("hidden");

  setTimeout(() => el.classList.add("hidden"), duration);
}

/* ---------- INIT ---------- */
renderParticipants();
updateDisplay();

// Eksponer funksjoner brukt fra HTML
window.startTest = startTest;
window.stopTest = stopTest;
window.pauseTest = pauseTest;
window.resetTest = resetTest;
