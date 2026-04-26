// ── Leaderboard (localStorage para testes; trocar por JSONBin em producao) ──
const USE_JSONBIN = true
const BIN_ID  = '69ee9da3aaba8821973eada7'
const API_KEY = '$2a$10$cF9DUjXC/qjb65CiZnNUCuWQOmZ9SxpireV3bCJKOvPDeRLRBn2d.'
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`

async function fetchLeaderboard() {
  if (USE_JSONBIN) {
    try {
      const res = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': API_KEY } })
      const data = await res.json()
      return Array.isArray(data.record) ? data.record.filter(e => e.username !== '_init') : []
    } catch { return [] }
  } else {
    return JSON.parse(localStorage.getItem('diamond_pang_lb') || '[]')
  }
}

async function saveLeaderboard(scores) {
  if (USE_JSONBIN) {
    try {
      await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
        body: JSON.stringify(scores)
      })
    } catch {}
  } else {
    localStorage.setItem('diamond_pang_lb', JSON.stringify(scores))
  }
}

async function submitScore(username, score) {
  if (score <= 0) return
  const scores = await fetchLeaderboard()
  const idx = scores.findIndex(e => e.username.toLowerCase() === username.toLowerCase())
  if (idx >= 0) {
    if (score > scores[idx].score) scores[idx].score = score
    else return scores
  } else {
    scores.push({ username, score })
  }
  scores.sort((a, b) => b.score - a.score)
  await saveLeaderboard(scores)
  return scores
}

// ── Leaderboard UI ────────────────────────────────────────────────
function renderLeaderboard(scores, currentUsername) {
  const list = document.getElementById('lb-list')
  if (!scores || scores.length === 0) {
    list.innerHTML = '<div class="lb-loading">Sem scores ainda.</div>'
    return
  }
  const top = scores.slice(0, 15)
  list.innerHTML = top.map((e, i) => {
    const pos = i + 1
    const posClass = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : ''
    const highlight = currentUsername && e.username.toLowerCase() === currentUsername.toLowerCase() ? 'highlight' : ''
    return `<div class="lb-entry ${highlight}">
      <span class="lb-pos ${posClass}">${pos}</span>
      <span class="lb-name">${e.username}</span>
      <span class="lb-score">${e.score}</span>
    </div>`
  }).join('')
}

async function refreshLeaderboard(currentUsername) {
  const scores = await fetchLeaderboard()
  renderLeaderboard(scores, currentUsername)
  const player = document.getElementById('lb-player')
  if (currentUsername) {
    const idx = scores.findIndex(e => e.username.toLowerCase() === currentUsername.toLowerCase())
    player.textContent = idx >= 0 ? `A jogar como: ${currentUsername}  (#${idx + 1})` : `A jogar como: ${currentUsername}`
  }
}

// ── Game constants ────────────────────────────────────────────────
const canvas = document.getElementById('canvas')
const ctx    = canvas.getContext('2d')

const GW = 750
const GH = 430

const GRAVITY       = 0.12
const BOUNCE_FORCE  = { giant: 9.5, large: 7.5, medium: 5.5, small: 3.8 }
const BALL_SPEED_X  = { giant: 1.3, large: 1.8, medium: 2.6, small: 3.5 }
const BALL_RADIUS   = { giant: 44,  large: 28,  medium: 18,  small: 10  }

const LEVEL_CONFIG = [
  null,
  [{ type: 'large', count: 1 }],
  [{ type: 'large', count: 2 }],
  [{ type: 'large', count: 3 }],
  [{ type: 'giant', count: 1 }],
  [{ type: 'giant', count: 2 }],
  [{ type: 'giant', count: 3 }],
  [{ type: 'giant', count: 1 }, { type: 'large', count: 1 }],
  [{ type: 'giant', count: 2 }, { type: 'large', count: 2 }],
  [{ type: 'giant', count: 3 }, { type: 'large', count: 3 }],
]
const PLAYER_W      = 40
const PLAYER_H      = 40
const HB_INSET_X    = 9
const HB_INSET_TOP  = 7
const PLAYER_SPEED  = 4
const HARPOON_SPEED = 10
const GROUND_Y      = GH

const logoImg      = new Image(); logoImg.src      = 'mainlogo.png'
const charImg      = new Image(); charImg.src      = 'char_pang.png'
const charFrontImg = new Image(); charFrontImg.src = 'char_front_pang.png'

// ── Game state ────────────────────────────────────────────────────
let username     = ''
let pangScore    = 0
let pangLives    = 3
let pangLevel    = 1
let balls        = []
let harpoon      = null
let pangPlayer   = { x: GW / 2 - PLAYER_W / 2, y: GROUND_Y - PLAYER_H }
let gameKeys     = {}
let invincible   = 0
let pangRunning  = false
let gameOver     = false
let pangInterval = null

// ── Ball helpers ──────────────────────────────────────────────────
function spawnBalls() {
  balls = []
  const cfg = LEVEL_CONFIG[pangLevel] || LEVEL_CONFIG[9]
  let slot = 0
  const totalBalls = cfg.reduce((s, g) => s + g.count, 0)
  cfg.forEach(group => {
    for (let i = 0; i < group.count; i++) {
      const dir = slot % 2 === 0 ? 1 : -1
      balls.push({
        x: GW * (slot + 1) / (totalBalls + 1),
        y: 30,
        vx: BALL_SPEED_X[group.type] * dir,
        vy: 1,
        type: group.type
      })
      slot++
    }
  })
}

function resetRound() {
  pangPlayer.x = GW / 2 - PLAYER_W / 2
  pangPlayer.y = GROUND_Y - PLAYER_H
  harpoon      = null
  invincible   = 60
  spawnBalls()
}

function splitBall(ball, index) {
  const nextMap = { giant: 'large', large: 'medium', medium: 'small', small: null }
  const ptsMap  = { giant: 50, large: 100, medium: 200, small: 400 }
  const next = nextMap[ball.type]
  const pts  = ptsMap[ball.type]
  pangScore += pts
  balls.splice(index, 1)
  if (next) {
    const spd = BALL_SPEED_X[next]
    balls.push({ x: ball.x, y: ball.y, vx: -spd, vy: -BOUNCE_FORCE[next] * 0.6, type: next })
    balls.push({ x: ball.x, y: ball.y, vx:  spd, vy: -BOUNCE_FORCE[next] * 0.6, type: next })
  }
}

// ── Update & Draw ─────────────────────────────────────────────────
function pangUpdate() {
  if (!pangRunning) return
  if (invincible > 0) invincible--

  if (gameKeys['ArrowLeft'])  pangPlayer.x = Math.max(0, pangPlayer.x - PLAYER_SPEED)
  if (gameKeys['ArrowRight']) pangPlayer.x = Math.min(GW - PLAYER_W, pangPlayer.x + PLAYER_SPEED)

  if (harpoon) {
    harpoon.y -= HARPOON_SPEED
    if (harpoon.y <= 0) harpoon = null
  }

  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i]
    const r = BALL_RADIUS[b.type]
    b.vy += GRAVITY; b.x += b.vx; b.y += b.vy

    if (b.x - r <= 0)    { b.vx =  Math.abs(b.vx); b.x = r }
    if (b.x + r >= GW)   { b.vx = -Math.abs(b.vx); b.x = GW - r }
    if (b.y - r <= 0)    { b.vy =  Math.abs(b.vy); b.y = r }
    if (b.y + r >= GROUND_Y) { b.vy = -BOUNCE_FORCE[b.type]; b.y = GROUND_Y - r }

    if (harpoon) {
      if (Math.abs(b.x - harpoon.x) < r && harpoon.y <= b.y + r && harpoon.bottom >= b.y - r) {
        splitBall(b, i); harpoon = null; continue
      }
    }

    if (invincible === 0) {
      const hbX = pangPlayer.x + HB_INSET_X, hbY = pangPlayer.y + HB_INSET_TOP
      const hbW = PLAYER_W - HB_INSET_X * 2, hbH = PLAYER_H - HB_INSET_TOP
      const cx  = Math.max(hbX, Math.min(b.x, hbX + hbW))
      const cy  = Math.max(hbY, Math.min(b.y, hbY + hbH))
      if (Math.hypot(b.x - cx, b.y - cy) < r) {
        pangLives--
        if (pangLives <= 0) {
          pangRunning = false
          gameOver    = true
          onGameOver()
        } else {
          pangPlayer.x = GW / 2 - PLAYER_W / 2
          harpoon = null; invincible = 90
        }
      }
    }
  }

  if (pangRunning && balls.length === 0) {
    if (pangLevel >= 9) {
      pangRunning = false
      gameOver    = true
      onGameOver()
    } else {
      pangLevel++
      resetRound()
    }
  }
}

function pangDraw() {
  ctx.clearRect(0, 0, GW, GH)

  if (harpoon) {
    ctx.strokeStyle = '#0096c7'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(harpoon.x, harpoon.bottom); ctx.lineTo(harpoon.x, harpoon.y); ctx.stroke()
  }

  for (const b of balls) {
    const r = BALL_RADIUS[b.type]
    ctx.save(); ctx.globalAlpha = 0.9
    ctx.drawImage(logoImg, b.x - r, b.y - r, r * 2, r * 2)
    ctx.restore()
  }

  ctx.save()
  if (invincible > 0 && Math.floor(invincible / 6) % 2 === 0) ctx.globalAlpha = 0.3
  ctx.drawImage(charImg, pangPlayer.x, pangPlayer.y, PLAYER_W, PLAYER_H)
  ctx.restore()

  // Score - centro grande
  ctx.fillStyle = 'rgba(0,150,199,0.95)'; ctx.font = 'bold 30px Segoe UI'; ctx.textAlign = 'center'
  ctx.fillText(pangScore, GW / 2, 36)

  // Vidas - topo direito
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < pangLives ? '#e05050' : '#2a2d30'
    ctx.font = 'bold 22px Segoe UI'; ctx.textAlign = 'right'
    ctx.fillText('♥', GW - 8 - (2 - i) * 26, 30)
  }

  // Hints - topo esquerdo
  ctx.fillStyle = 'rgba(130,140,150,0.7)'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'left'
  ctx.fillText('← →  mover      ␣ disparar', 10, 22)

  // Nivel - abaixo das hints
  ctx.fillStyle = 'rgba(100,110,120,0.55)'; ctx.font = '11px Segoe UI'
  ctx.fillText('NIVEL ' + pangLevel + ' / 9', 10, 38)

  // Game Over overlay
  if (gameOver) {
    ctx.fillStyle = 'rgba(17,19,22,0.88)'
    ctx.fillRect(0, 0, GW, GH)

    ctx.textAlign = 'center'

    // Mascote centrada
    const imgSize = 140
    const imgX = GW / 2 - imgSize / 2
    const imgY = GH / 2 - 120
    ctx.drawImage(charFrontImg, imgX, imgY, imgSize, imgSize)

    const isWin = pangLevel > 9
    ctx.fillStyle = isWin ? '#f5c518' : '#e05050'
    ctx.font = 'bold 42px Segoe UI'
    ctx.fillText(isWin ? 'YOU WIN!' : 'GAME OVER', GW / 2, imgY + imgSize + 42)

    ctx.fillStyle = '#e3e5e7'
    ctx.font = 'bold 20px Segoe UI'
    ctx.fillText('Score: ' + pangScore, GW / 2, imgY + imgSize + 74)

    ctx.fillStyle = '#0096c7'
    ctx.font = 'bold 15px Segoe UI'
    ctx.fillText('↵  Pressionar Enter para Recomecar', GW / 2, imgY + imgSize + 108)
  }
}

// ── Game over / submit ────────────────────────────────────────────
async function onGameOver() {
  const scores = await submitScore(username, pangScore)
  if (scores) renderLeaderboard(scores, username)
}

function startGame() {
  pangScore   = 0; pangLives = 3; pangLevel = 1
  pangRunning = true; gameOver = false
  resetRound()
  if (pangInterval) clearInterval(pangInterval)
  pangInterval = setInterval(() => { pangUpdate(); pangDraw() }, 16)
  refreshLeaderboard(username)
}

// ── Controlos ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  gameKeys[e.code] = true
  if (e.code === 'Space' && pangRunning && !harpoon) {
    e.preventDefault()
    const cx = pangPlayer.x + PLAYER_W / 2
    harpoon = { x: cx, y: pangPlayer.y + HB_INSET_TOP, bottom: pangPlayer.y + HB_INSET_TOP }
  }
  if (e.code === 'Enter' && !pangRunning && username) startGame()
})
document.addEventListener('keyup', e => { gameKeys[e.code] = false })

// ── Username flow ─────────────────────────────────────────────────
document.getElementById('username-btn').addEventListener('click', () => {
  const val = document.getElementById('username-input').value.trim()
  const err = document.getElementById('username-error')
  if (!val) { err.textContent = 'Introduz um nome.'; return }
  username = val
  document.getElementById('username-overlay').classList.add('hidden')
  startGame()
})

document.getElementById('username-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('username-btn').click()
})

// ── Init ──────────────────────────────────────────────────────────
refreshLeaderboard(null)
