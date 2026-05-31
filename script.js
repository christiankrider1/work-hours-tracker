// =========================
// STATE
// =========================
const ANCHOR = "2026-05-10"
const STORAGE_KEY = "hours-entries"
let entries = loadEntries()
let currentPeriodIndex = 0
let periods = []
let selectedDate = null
let clockInterval = null

// =========================
// DOM REFS
// =========================
const grid = document.getElementById("calendarGrid")
const summary = document.getElementById("summaryBar")
const periodLabel = document.getElementById("periodLabel")
const prevBtn = document.getElementById("prevPeriod")
const nextBtn = document.getElementById("nextPeriod")
const overlay = document.getElementById("modalOverlay")
const modalDate = document.getElementById("modalDate")
const liveClock = document.getElementById("liveClock")
const futureNotice = document.getElementById("futureNotice")
const modalActions = document.getElementById("modalActions")
const modalFields = document.getElementById("modalFields")
const startHour = document.getElementById("startHour")
const startMinute = document.getElementById("startMinute")
const startAmPm = document.getElementById("startAmPm")
const endHour = document.getElementById("endHour")
const endMinute = document.getElementById("endMinute")
const endAmPm = document.getElementById("endAmPm")
const breakStartHour = document.getElementById("breakStartHour")
const breakStartMinute = document.getElementById("breakStartMinute")
const breakStartAmPm = document.getElementById("breakStartAmPm")
const breakEndHour = document.getElementById("breakEndHour")
const breakEndMinute = document.getElementById("breakEndMinute")
const breakEndAmPm = document.getElementById("breakEndAmPm")
const notesInput = document.getElementById("notesInput")
const hoursDisplay = document.getElementById("hoursDisplay")
const clockedInNote = document.getElementById("clockedInNote")
const saveBtn = document.getElementById("saveBtn")
const deleteBtn = document.getElementById("deleteBtn")
const modalClose = document.getElementById("modalClose")

// Details modal
const detailsBtn = document.getElementById("detailsBtn")
const detailsOverlay = document.getElementById("detailsOverlay")
const detailsClose = document.getElementById("detailsClose")
const detailsTitle = document.getElementById("detailsTitle")
const detailsBody = document.getElementById("detailsBody")
const detailsTotal = document.getElementById("detailsTotal")

// =========================
// STORAGE
// =========================
function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
  catch { return {} }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

// =========================
// DATE HELPERS
// =========================
function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

function formatTime12(d) {
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

// Convert hour(1-12), minute(0-59), ampm("AM"/"PM") → "14:30". Returns "" if hour is blank.
function timeTo24(hour, minute, ampm) {
  let h = parseInt(hour, 10)
  if (isNaN(h)) return ""
  const m = String(parseInt(minute, 10)).padStart(2, "0")
  if (ampm === "PM" && h !== 12) h += 12
  if (ampm === "AM" && h === 12) h = 0
  return String(h).padStart(2, "0") + ":" + m
}

// Convert "14:30" → { hour: 2, minute: 30, ampm: "PM" }
function time12ToParts(timeStr) {
  const p = parseTime(timeStr)
  if (!p) return { hour: 12, minute: 0, ampm: "AM" }
  const ampm = p.hours >= 12 ? "PM" : "AM"
  let hour = p.hours % 12 || 12
  return { hour, minute: p.minutes, ampm }
}

// Populate a <select> with options from min to max (inclusive), with optional blank first option
function populateSelect(sel, min, max, withBlank) {
  sel.innerHTML = ""
  if (withBlank) {
    const opt = document.createElement("option")
    opt.value = ""
    opt.textContent = "—"
    sel.appendChild(opt)
  }
  for (let i = min; i <= max; i++) {
    const opt = document.createElement("option")
    opt.value = i
    opt.textContent = String(i).padStart(2, "0")
    sel.appendChild(opt)
  }
}

// Set a select's value, defaulting to the first option if not found
function setSelectValue(sel, val) {
  sel.value = val
  if (sel.value !== String(val)) {
    sel.selectedIndex = 0
  }
}

function parseTime(s) {
  const p = s.split(":")
  if (p.length !== 2) return null
  const h = parseInt(p[0], 10), m = parseInt(p[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return { hours: h, minutes: m }
}

function timeToDec(s) {
  const p = parseTime(s)
  return p ? p.hours + p.minutes / 60 : 0
}

function calcHours(start, end, brk, brkStart, brkEnd) {
  let brkMinutes = 0
  if (brkStart && brkEnd) {
    brkMinutes = (timeToDec(brkEnd) - timeToDec(brkStart)) * 60
  } else if (brk) {
    brkMinutes = brk
  }
  return Math.max(0, timeToDec(end) - timeToDec(start) - brkMinutes / 60)
}

function formatHours(dec) {
  const h = Math.floor(dec), m = Math.round((dec - h) * 60)
  return `${h}h ${m}m`
}

function calcOvertime(days) {
  let totalOT = 0
  for (let i = 0; i < days.length; i += 7) {
    let weekTotal = 0
    for (let j = i; j < i + 7 && j < days.length; j++) {
      const ds = toDateStr(days[j])
      const e = entries[ds]
      if (e && e.start && e.end) {
        weekTotal += calcHours(e.start, e.end, e.break, e.breakStart, e.breakEnd)
      }
    }
    totalOT += Math.max(0, weekTotal - 40)
  }
  return totalOT
}

function dateFromStr(s) {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// =========================
// PAY PERIOD MATH
// =========================
function getPayPeriod(date) {
  const anchor = dateFromStr(ANCHOR)
  const msDay = 86400000
  const days = Math.floor((date.getTime() - anchor.getTime()) / msDay)
  const p = Math.floor(days / 14)
  const start = new Date(anchor.getTime() + p * 14 * msDay)
  const end = new Date(start.getTime() + 13 * msDay)
  const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    + " - " + end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return { start, end, label }
}

function getDaysInPeriod(start, end) {
  const days = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function buildPeriods() {
  const now = new Date()
  const current = getPayPeriod(now)
  periods = []
  for (let i = -5; i <= 5; i++) {
    const d = new Date(current.start.getTime() + i * 14 * 86400000)
    periods.push(getPayPeriod(d))
  }
  currentPeriodIndex = periods.findIndex(p => p.start.getTime() === current.start.getTime())
}

function isToday(d) {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function isFuture(d) {
  const today = new Date()
  return d.getFullYear() > today.getFullYear() || d.getMonth() > today.getMonth() ||
    (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() > today.getDate())
}

// =========================
// RENDER
// =========================
function render() {
  renderPeriodNav()
  renderSummary()
  renderGrid()
}

function renderPeriodNav() {
  const p = periods[currentPeriodIndex]
  periodLabel.textContent = p.label
  prevBtn.disabled = currentPeriodIndex === 0
  nextBtn.disabled = currentPeriodIndex === periods.length - 1
}

function renderSummary() {
  const p = periods[currentPeriodIndex]
  const days = getDaysInPeriod(p.start, p.end)
  let total = 0, logged = 0
  for (const day of days) {
    const ds = toDateStr(day)
    const e = entries[ds]
    if (e && e.start && e.end) {
      total += calcHours(e.start, e.end, e.break, e.breakStart, e.breakEnd)
      logged++
    }
  }
  const overtime = calcOvertime(days)
  const remaining = Math.max(0, 80 - total)

  summary.innerHTML =
    `<div class="summary-item"><span class="label">Logged</span><span class="value green">${formatHours(total)}</span></div>` +
    `<div class="summary-item"><span class="label">Decimal</span><span class="value green">${total.toFixed(2)} hrs</span></div>` +
    `<div class="summary-item"><span class="label">Days</span><span class="value">${logged}/14</span></div>` +
    `<div class="summary-item"><span class="label">Overtime</span><span class="value orange">${formatHours(overtime)}</span></div>` +
    `<div class="summary-item"><span class="label">Remaining</span><span class="value">${formatHours(remaining)}</span></div>`
}

function renderGrid() {
  const p = periods[currentPeriodIndex]
  const days = getDaysInPeriod(p.start, p.end)
  grid.innerHTML = ""

  for (const day of days) {
    const ds = toDateStr(day)
    const e = entries[ds]
    const cell = document.createElement("button")
    cell.className = "day-cell"
    if (isToday(day)) cell.classList.add("today")
    if (day.getDay() === 0 || day.getDay() === 6) cell.classList.add("weekend")
    if (isFuture(day)) cell.classList.add("future")

    let status = ""
    let hoursTxt = ""
    if (e && e.start && !e.end) {
      status = "Running"
      cell.classList.add("clocked-in")
    } else if (e && e.start && e.end) {
      status = formatHours(calcHours(e.start, e.end, e.break, e.breakStart, e.breakEnd))
      hoursTxt = status
      cell.classList.add("complete")
    }

    cell.innerHTML =
      `<span class="day-name">${day.toLocaleDateString("en-US", { weekday: "short" })}</span>` +
      `<span class="day-num">${day.getDate()}</span>` +
      (hoursTxt ? `<span class="day-hours">${hoursTxt}</span>` : "") +
      (e && e.start && !e.end ? `<span class="day-status">Running</span>` : "")

    if (!isFuture(day)) {
      cell.addEventListener("click", () => openModal(day))
    }
    grid.appendChild(cell)
  }
}

// =========================
// MODAL
// =========================
function openModal(date) {
  selectedDate = date
  const ds = toDateStr(date)
  const e = entries[ds]
  const today = isToday(date)
  const future = isFuture(date)
  const dayLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  modalDate.textContent = dayLabel
  futureNotice.classList.toggle("hidden", !future)

  // Clock in/out and break buttons (today only)
  modalActions.innerHTML = ""
  if (today && !(e && e.start && e.end)) {
    if (!(e && e.start)) {
      // Not clocked in
      const btn = document.createElement("button")
      btn.className = "btn btn-clock-in"
      btn.textContent = "Clock In"
      btn.addEventListener("click", clockIn)
      modalActions.appendChild(btn)
    } else {
      // Clocked in, not yet clocked out
      const out = document.createElement("button")
      out.className = "btn btn-clock-out"
      out.textContent = "Clock Out"
      out.addEventListener("click", clockOut)
      modalActions.appendChild(out)

      // Break button (only if break not already complete)
      const onBreak = e.breakStart && !e.breakEnd
      const breakDone = e.breakStart && e.breakEnd
      if (!breakDone) {
        const brkBtn = document.createElement("button")
        if (onBreak) {
          brkBtn.className = "btn btn-break-in"
          brkBtn.textContent = "Break In"
          brkBtn.addEventListener("click", breakIn)
        } else {
          brkBtn.className = "btn btn-break-out"
          brkBtn.textContent = "Break Out"
          brkBtn.addEventListener("click", breakOut)
        }
        modalActions.appendChild(brkBtn)
      }
    }
  }

  // Always show the time fields (manual entry for any day)
  modalFields.classList.remove("hidden")

  // Populate hour/minute dropdowns
  populateSelect(startHour, 1, 12)
  populateSelect(startMinute, 0, 59)
  populateSelect(endHour, 1, 12)
  populateSelect(endMinute, 0, 59)

  // Set values from existing entry
  if (e && e.start) {
    const p = time12ToParts(e.start)
    setSelectValue(startHour, p.hour)
    setSelectValue(startMinute, p.minute)
    startAmPm.value = p.ampm
  } else {
    setSelectValue(startHour, 9)
    setSelectValue(startMinute, 0)
    startAmPm.value = "AM"
  }
  if (e && e.end) {
    const p = time12ToParts(e.end)
    setSelectValue(endHour, p.hour)
    setSelectValue(endMinute, p.minute)
    endAmPm.value = p.ampm
  } else {
    setSelectValue(endHour, 5)
    setSelectValue(endMinute, 0)
    endAmPm.value = "PM"
  }

  // Populate break start/end dropdowns (with blank default)
  populateSelect(breakStartHour, 1, 12, true)
  populateSelect(breakStartMinute, 0, 59, true)
  populateSelect(breakEndHour, 1, 12, true)
  populateSelect(breakEndMinute, 0, 59, true)

  // Set break start values
  if (e && e.breakStart) {
    const p = time12ToParts(e.breakStart)
    setSelectValue(breakStartHour, p.hour)
    setSelectValue(breakStartMinute, p.minute)
    breakStartAmPm.value = p.ampm
  } else {
    breakStartHour.selectedIndex = 0
    breakStartMinute.selectedIndex = 0
    breakStartAmPm.selectedIndex = 0
  }
  // Set break end values
  if (e && e.breakEnd) {
    const p = time12ToParts(e.breakEnd)
    setSelectValue(breakEndHour, p.hour)
    setSelectValue(breakEndMinute, p.minute)
    breakEndAmPm.value = p.ampm
  } else {
    breakEndHour.selectedIndex = 0
    breakEndMinute.selectedIndex = 0
    breakEndAmPm.selectedIndex = 0
  }

  notesInput.value = e ? (e.notes || "") : ""

  // Clocked in note
  const onBreak = e && e.breakStart && !e.breakEnd
  const hasStart = e && e.start
  const isComplete = e && e.start && e.end
  clockedInNote.classList.toggle("hidden", !(hasStart && !isComplete))
  if (hasStart && !isComplete) {
    const p = time12ToParts(e.start)
    if (onBreak) {
      clockedInNote.textContent = "On break since " + p.hour + ":" + String(p.minute).padStart(2, "0") + " " + p.ampm
    } else {
      clockedInNote.textContent = "Clocked in at " + p.hour + ":" + String(p.minute).padStart(2, "0") + " " + p.ampm + ". Don't forget to clock out!"
    }
  }

  // Hours display
  updateHoursDisplay()

  // Footer buttons
  deleteBtn.classList.toggle("hidden", !(e && e.start))
  saveBtn.classList.remove("hidden")

  // Live clock
  startLiveClock()

  overlay.classList.remove("hidden")
}

function closeModal() {
  overlay.classList.add("hidden")
  stopLiveClock()
  selectedDate = null
}

function startLiveClock() {
  stopLiveClock()
  function tick() {
    liveClock.textContent = formatTime12(new Date())
  }
  tick()
  clockInterval = setInterval(tick, 1000)
}

function stopLiveClock() {
  if (clockInterval) {
    clearInterval(clockInterval)
    clockInterval = null
  }
}

function clockIn() {
  const now = new Date()
  const h = now.getHours(), m = now.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  const t = timeTo24(hour12, m, ampm)
  const ds = toDateStr(selectedDate)
  entries[ds] = entries[ds] || { start: null, end: null, breakStart: null, breakEnd: null, notes: "" }
  entries[ds].start = t
  saveEntries()
  openModal(selectedDate)
  render()
}

function clockOut() {
  const now = new Date()
  const h = now.getHours(), m = now.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  const t = timeTo24(hour12, m, ampm)
  const ds = toDateStr(selectedDate)
  if (entries[ds]) {
    entries[ds].end = t
    saveEntries()
    openModal(selectedDate)
    render()
  }
}

function breakOut() {
  const now = new Date()
  const h = now.getHours(), m = now.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  const t = timeTo24(hour12, m, ampm)
  const ds = toDateStr(selectedDate)
  entries[ds] = entries[ds] || { start: null, end: null, breakStart: null, breakEnd: null, notes: "" }
  entries[ds].breakStart = t
  saveEntries()
  openModal(selectedDate)
  render()
}

function breakIn() {
  const now = new Date()
  const h = now.getHours(), m = now.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  const t = timeTo24(hour12, m, ampm)
  const ds = toDateStr(selectedDate)
  if (entries[ds]) {
    entries[ds].breakEnd = t
    saveEntries()
    openModal(selectedDate)
    render()
  }
}

function updateHoursDisplay() {
  const s = timeTo24(startHour.value, startMinute.value, startAmPm.value)
  const e = timeTo24(endHour.value, endMinute.value, endAmPm.value)
  const brkStart = timeTo24(breakStartHour.value, breakStartMinute.value, breakStartAmPm.value)
  const brkEnd = timeTo24(breakEndHour.value, breakEndMinute.value, breakEndAmPm.value)
  if (s && e) {
    const h = calcHours(s, e, 0, brkStart, brkEnd)
    hoursDisplay.classList.remove("hidden")
    let txt = "Total: <strong>" + formatHours(h) + "</strong>"
    const brkMins = brkStart && brkEnd ? Math.round((timeToDec(brkEnd) - timeToDec(brkStart)) * 60) : 0
    if (brkMins > 0) {
      txt += ' <span class="break-note">(incl. ' + brkMins + 'm break)</span>'
    }
    hoursDisplay.innerHTML = txt
  } else {
    hoursDisplay.classList.add("hidden")
  }
}

// =========================
// MODAL ACTIONS
// =========================
function handleSave() {
  const ds = toDateStr(selectedDate)
  const sTime = timeTo24(startHour.value, startMinute.value, startAmPm.value)
  const eTime = timeTo24(endHour.value, endMinute.value, endAmPm.value)
  const bsTime = timeTo24(breakStartHour.value, breakStartMinute.value, breakStartAmPm.value)
  const beTime = timeTo24(breakEndHour.value, breakEndMinute.value, breakEndAmPm.value)
  const n = notesInput.value
  if (sTime) {
    entries[ds] = {
      start: sTime,
      end: eTime || null,
      breakStart: bsTime || null,
      breakEnd: beTime || null,
      notes: n
    }
  }
  saveEntries()
  closeModal()
  render()
}

function handleDelete() {
  if (!confirm("Delete this day's entry?")) return
  const ds = toDateStr(selectedDate)
  delete entries[ds]
  saveEntries()
  closeModal()
  render()
}

// =========================
// PERIOD NAVIGATION
// =========================
function goToPrev() {
  if (currentPeriodIndex > 0) { currentPeriodIndex--; render() }
}

function goToNext() {
  if (currentPeriodIndex < periods.length - 1) { currentPeriodIndex++; render() }
}

// =========================
// DETAILS MODAL
// =========================
function openDetailsModal() {
  const p = periods[currentPeriodIndex]
  detailsTitle.textContent = p.label
  const days = getDaysInPeriod(p.start, p.end)
  let html = '<table><thead><tr><th>Day</th><th>Date</th><th>Start</th><th>End</th><th>Break</th><th class="num">Hours</th><th class="num">Decimal</th></tr></thead><tbody>'

  let periodTotal = 0
  let loggedDays = 0

  for (const day of days) {
    const ds = toDateStr(day)
    const e = entries[ds]
    const dayName = day.toLocaleDateString("en-US", { weekday: "short" })
    const dateStr = day.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const isWeekend = day.getDay() === 0 || day.getDay() === 6
    const isTod = isToday(day)

    let rowClass = ""
    if (isWeekend) rowClass += " weekend"
    if (isTod && !(e && e.start)) rowClass += " empty"
    if (isTod) rowClass += " today"

    let startDisplay = "—", endDisplay = "—", breakDisplay = "—", hoursDisplayTxt = "—", decimalTxt = "—"

    if (e && e.start) {
      const sp = time12ToParts(e.start)
      startDisplay = sp.hour + ":" + String(sp.minute).padStart(2, "0") + " " + sp.ampm
    }
    if (e && e.end) {
      const ep = time12ToParts(e.end)
      endDisplay = ep.hour + ":" + String(ep.minute).padStart(2, "0") + " " + ep.ampm
    }
    if (e && e.breakStart && e.breakEnd) {
      const mins = Math.round((timeToDec(e.breakEnd) - timeToDec(e.breakStart)) * 60)
      breakDisplay = mins + "m"
    } else if (e && e.break) {
      breakDisplay = e.break + "m"
    }

    if (e && e.start && e.end) {
      const h = calcHours(e.start, e.end, e.break, e.breakStart, e.breakEnd)
      periodTotal += h
      loggedDays++
      hoursDisplayTxt = Math.floor(h) + "h " + Math.round((h - Math.floor(h)) * 60) + "m"
      decimalTxt = h.toFixed(2)
    }

    html += '<tr class="' + rowClass + '">' +
      '<td>' + dayName + '</td>' +
      '<td>' + dateStr + '</td>' +
      '<td>' + startDisplay + '</td>' +
      '<td>' + endDisplay + '</td>' +
      '<td>' + breakDisplay + '</td>' +
      '<td class="num">' + hoursDisplayTxt + '</td>' +
      '<td class="num">' + decimalTxt + '</td>' +
      '</tr>'
  }

  html += '</tbody></table>'
  detailsBody.innerHTML = html

  const overtime = calcOvertime(days)
  const remaining = Math.max(0, 80 - periodTotal)
  detailsTotal.innerHTML = '<span>Logged <span class="green">' + loggedDays + '</span>/14 days</span>' +
    '<span>Total: <span class="green">' + periodTotal.toFixed(2) + '</span> hrs' +
    (overtime > 0 ? ' (<span class="green" style="color:#fbbf24">' + overtime.toFixed(2) + ' OT</span>)' : '') +
    '</span>'

  detailsOverlay.classList.remove("hidden")
}

function closeDetailsModal() {
  detailsOverlay.classList.add("hidden")
}

// =========================
// EVENT BINDING
// =========================
prevBtn.addEventListener("click", goToPrev)
nextBtn.addEventListener("click", goToNext)
saveBtn.addEventListener("click", handleSave)
deleteBtn.addEventListener("click", handleDelete)
modalClose.addEventListener("click", closeModal)
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal() })
startHour.addEventListener("change", updateHoursDisplay)
startMinute.addEventListener("change", updateHoursDisplay)
startAmPm.addEventListener("change", updateHoursDisplay)
endHour.addEventListener("change", updateHoursDisplay)
endMinute.addEventListener("change", updateHoursDisplay)
endAmPm.addEventListener("change", updateHoursDisplay)
breakStartHour.addEventListener("change", updateHoursDisplay)
breakStartMinute.addEventListener("change", updateHoursDisplay)
breakStartAmPm.addEventListener("change", updateHoursDisplay)
breakEndHour.addEventListener("change", updateHoursDisplay)
breakEndMinute.addEventListener("change", updateHoursDisplay)
breakEndAmPm.addEventListener("change", updateHoursDisplay)

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeModal(); closeDetailsModal() }
})

// Details modal events
detailsBtn.addEventListener("click", openDetailsModal)
detailsClose.addEventListener("click", closeDetailsModal)
detailsOverlay.addEventListener("click", (e) => { if (e.target === detailsOverlay) closeDetailsModal() })

// =========================
// INIT
// =========================
buildPeriods()
render()
