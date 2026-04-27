// ── Arcade shared infrastructure ──────────────────────────────────
const BIN_ID   = '69eea86e856a68218976ca96'
const API_KEY  = '$2a$10$v1n2pxMTPwnMYbdiFo.Dyu3PF/nOOvEpXn19tzpgZQD0FGXn4UCkm'
const API_URL  = `https://api.jsonbin.io/v3/b/${BIN_ID}`

// GAME_ID must be set by each game page before this script

async function _fetchAll() {
  try {
    const r = await fetch(API_URL + '/latest', { headers: { 'X-Access-Key': API_KEY } })
    const d = await r.json()
    return d.record || {}
  } catch { return {} }
}

async function fetchGameScores() {
  const all = await _fetchAll()
  return (all[GAME_ID] || []).filter(e => e.username !== '_init')
}

async function submitScore(username, score) {
  if (!score || score <= 0) return
  const all    = await _fetchAll()
  const scores = (all[GAME_ID] || []).filter(e => e.username !== '_init')
  const idx    = scores.findIndex(e => e.username.toLowerCase() === username.toLowerCase())
  if (idx >= 0) {
    if (score <= scores[idx].score) return scores
    scores[idx].score = score
  } else {
    scores.push({ username, score })
  }
  scores.sort((a, b) => b.score - a.score)
  all[GAME_ID] = scores
  try {
    await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Access-Key': API_KEY },
      body: JSON.stringify(all)
    })
  } catch {}
  return scores
}

function renderLeaderboard(scores, currentUsername) {
  const list = document.getElementById('lb-list')
  if (!scores || scores.length === 0) {
    list.innerHTML = '<div class="lb-empty">Sem scores ainda.</div>'; return
  }
  list.innerHTML = scores.slice(0, 15).map((e, i) => {
    const pos = i + 1
    const pc  = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : ''
    const hl  = currentUsername && e.username.toLowerCase() === currentUsername.toLowerCase() ? 'hl' : ''
    return `<div class="lb-row ${hl}"><span class="lb-pos ${pc}">${pos}</span><span class="lb-name">${e.username}</span><span class="lb-score">${e.score}</span></div>`
  }).join('')
}

async function refreshLeaderboard(currentUsername) {
  const scores = await fetchGameScores()
  renderLeaderboard(scores, currentUsername)
  const fp = document.getElementById('lb-player')
  if (fp && currentUsername) {
    const idx = scores.findIndex(e => e.username.toLowerCase() === currentUsername.toLowerCase())
    fp.textContent = idx >= 0 ? `${currentUsername}  #${idx + 1}` : currentUsername
  }
}

async function onGameEnd(username, score) {
  const scores = await submitScore(username, score)
  if (scores) renderLeaderboard(scores, username)
}

// ── Scale to fit any screen ───────────────────────────────────────
function scaleGame() {
  const page = document.getElementById('page')
  if (!page) return
  const s    = Math.min(window.innerWidth / 1024, window.innerHeight / 550)
  const ox   = (window.innerWidth  - 1024 * s) / 2
  const oy   = (window.innerHeight - 550  * s) / 2
  page.style.transform       = `translate(${ox}px,${oy}px) scale(${s})`
  page.style.transformOrigin = 'top left'
}
window.addEventListener('resize', scaleGame)
document.addEventListener('DOMContentLoaded', scaleGame)

// ── Username overlay ──────────────────────────────────────────────
function initUsernameOverlay(onStart) {
  const btn = document.getElementById('username-btn')
  const inp = document.getElementById('username-input')
  const err = document.getElementById('username-error')
  if (!btn) return

  const go = () => {
    const v = inp.value.trim()
    if (!v) { err.textContent = 'Introduz um nome.'; return }
    document.getElementById('username-overlay').classList.add('hidden')
    onStart(v)
  }
  btn.addEventListener('click', go)
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go() })
  refreshLeaderboard(null)
}
