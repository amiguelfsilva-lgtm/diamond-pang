const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430

const charIdleImg=new Image();charIdleImg.src='../assets/char_front_pang.png'
const charRunImg=new Image();charRunImg.src='../assets/charlateral.png'
const charJumpImg=new Image();charJumpImg.src='../assets/charjump.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'
const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const brickImg=new Image();brickImg.src='../assets/bricks.png'
const bossImg=new Image();bossImg.src='../assets/boss.png'
const fireImg=new Image();fireImg.src='../assets/fogo.png'
const lavaImg=new Image();lavaImg.src='../assets/lava.png'

// ── Constants ─────────────────────────────────────────────────────
const GRAV=0.45,JUMP=-11,MOVE_SPD=4,CHAR_W=32,CHAR_H=36
const PLAT_H=14,COIN_SZ=20,ENEMY_SZ=28
const ARENA_START=8000,ARENA_W=750

// Bridge y so boss falls through visible lava column before floor
const BRIDGE_Y=GH-170   // 260
const BOSS_W=64,BOSS_H=64

// ── State ─────────────────────────────────────────────────────────
let user='',score=0,lives=3,running=false,over=false,won=false,iv=null
let camX=0,keys={},invincible=0
let arenaLocked=false,bridgeGone=false,leverHit=false

let char={},platforms=[],coins=[],enemies=[]
let boss=null,fireballs=[],lever=null,bridgePlat=null

// ── Platform generation ───────────────────────────────────────────
function makePlatforms(){
  platforms=[]
  // Ground with gaps up to arena approach
  let x=0
  while(x<ARENA_START-250){
    const w=80+Math.random()*200
    platforms.push({x,y:GH-PLAT_H,w,h:PLAT_H,ground:true})
    x+=w+20+Math.random()*80
  }
  // Solid approach into arena
  platforms.push({x:ARENA_START-250,y:GH-PLAT_H,w:300,h:PLAT_H,ground:true})
  // Floating platforms across normal level
  for(let i=0;i<90;i++){
    const px=200+i*85+Math.random()*55
    if(px>ARENA_START-500) break
    const py=GH-80-Math.random()*160
    const pw=60+Math.random()*80
    platforms.push({x:px,y:py,w:pw,h:PLAT_H,ground:false})
  }
  // ── Boss arena ────────────────────────────────────────────────
  const AX=ARENA_START
  // Full arena floor
  platforms.push({x:AX,y:GH-PLAT_H,w:ARENA_W,h:PLAT_H,ground:true,arena:true})
  // Bridge (boss walks here) — destroyed by lever
  bridgePlat={x:AX+80,y:BRIDGE_Y,w:530,h:PLAT_H,ground:false,arena:true,isBridge:true}
  platforms.push(bridgePlat)
  // Side steps to help player navigate / dodge
  platforms.push({x:AX+20, y:GH-85,w:80,h:PLAT_H,ground:false,arena:true})
  platforms.push({x:AX+610,y:GH-85,w:80,h:PLAT_H,ground:false,arena:true})
  platforms.sort((a,b)=>a.x-b.x)
}

function makeCoins(){
  coins=[]
  platforms.filter(p=>!p.ground&&!p.arena).forEach(p=>{
    const n=1+Math.floor(p.w/40)
    for(let i=0;i<n;i++) coins.push({x:p.x+10+i*(p.w/n),y:p.y-COIN_SZ-4,collected:false})
  })
}

function makeEnemies(){
  enemies=[]
  platforms.filter(p=>!p.ground&&!p.arena&&p.w>80).forEach((p,i)=>{
    if(i%3===0) enemies.push({x:p.x+10,y:p.y-ENEMY_SZ,vx:1.2,platX:p.x,platW:p.w,stomped:false,stompTimer:0})
  })
}

function makeBoss(){
  boss={
    x:ARENA_START+310,y:BRIDGE_Y-BOSS_H,
    w:BOSS_W,h:BOSS_H,
    vx:-2.2,vy:0,onGround:true,
    dir:-1,
    shootTimer:160,
    jumpTimer:240,
    blinkTimer:0
  }
  lever={x:ARENA_START+700,y:GH-PLAT_H-32,w:18,h:32,hit:false}
  fireballs=[]
  arenaLocked=false;bridgeGone=false;leverHit=false
}

// ── Physics ───────────────────────────────────────────────────────
function resolveChar(){
  char.vy+=GRAV
  char.x+=char.vx
  char.y+=char.vy
  char.onGround=false
  for(const p of platforms){
    if(p.isBridge&&bridgeGone) continue
    if(char.x+CHAR_W<p.x||char.x>p.x+p.w) continue
    if(char.vy>=0&&char.y+CHAR_H>p.y&&char.y+CHAR_H<p.y+p.h+char.vy+2){
      char.y=p.y-CHAR_H;char.vy=0;char.onGround=true
    } else if(char.vy<0&&char.y<p.y+p.h&&char.y>p.y){
      char.y=p.y+p.h;char.vy=0
    }
  }
  if(char.y>GH+60) loseLife()
}

function loseLife(){
  lives--
  if(lives<=0){
    running=false;over=true
    onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))
    return
  }
  if(arenaLocked){char.x=ARENA_START+40;char.y=GH-150}
  else{char.x=camX+100;char.y=GH-150}
  char.vx=0;char.vy=0;invincible=120
}

// ── Boss ──────────────────────────────────────────────────────────
function updateBoss(){
  if(!boss) return
  if(boss.blinkTimer>0) boss.blinkTimer--

  boss.vy+=GRAV
  boss.x+=boss.vx
  boss.y+=boss.vy
  boss.onGround=false

  // Land on bridge
  if(!bridgeGone){
    const bp=bridgePlat
    if(boss.x+boss.w>bp.x&&boss.x<bp.x+bp.w){
      if(boss.vy>=0&&boss.y+boss.h>bp.y&&boss.y+boss.h<bp.y+bp.h+boss.vy+2){
        boss.y=bp.y-boss.h;boss.vy=0;boss.onGround=true
      }
    }
    // Patrol boundaries
    if(boss.x<bp.x+10){boss.vx=Math.abs(boss.vx);boss.dir=1}
    if(boss.x+boss.w>bp.x+bp.w-10){boss.vx=-Math.abs(boss.vx);boss.dir=-1}
  }

  // Shoot — aimed at player
  boss.shootTimer--
  if(boss.shootTimer<=0){
    boss.shootTimer=140+Math.floor(Math.random()*100)
    const dx=(char.x+CHAR_W/2)-(boss.x+boss.w/2)
    const dy=(char.y+CHAR_H/2)-(boss.y+boss.h/2)
    const len=Math.sqrt(dx*dx+dy*dy)||1
    const spd=4.5
    fireballs.push({x:boss.x+boss.w/2-8,y:boss.y+boss.h-12,vx:dx/len*spd,vy:dy/len*spd,w:16,h:16})
    // Second fireball at slight angle when bridge is gone (harder phase)
    if(bridgeGone){
      fireballs.push({x:boss.x+boss.w/2-8,y:boss.y+boss.h-12,vx:dx/len*spd+1.2,vy:dy/len*spd+0.8,w:16,h:16})
    }
  }

  // Jump
  boss.jumpTimer--
  if(boss.jumpTimer<=0&&boss.onGround){
    boss.jumpTimer=180+Math.floor(Math.random()*140)
    boss.vy=-9
  }

  // Boss fell into lava (past floor level — no floor collision for boss)
  if(boss.y+boss.h>GH-10) boss=null
}

function updateFireballs(){
  for(let i=fireballs.length-1;i>=0;i--){
    const f=fireballs[i]
    f.x+=f.vx;f.y+=f.vy
    // Remove if out of arena
    if(f.x<ARENA_START-200||f.x>ARENA_START+ARENA_W+200||f.y>GH+80||f.y<-80){
      fireballs.splice(i,1);continue
    }
    // Hit player
    if(invincible===0&&f.x+f.w>char.x&&f.x<char.x+CHAR_W&&f.y+f.h>char.y&&f.y<char.y+CHAR_H){
      fireballs.splice(i,1);loseLife();invincible=90
    }
  }
}

function checkLever(){
  if(!lever||lever.hit) return
  if(char.x+CHAR_W>lever.x&&char.x<lever.x+lever.w&&char.y+CHAR_H>lever.y&&char.y<lever.y+lever.h){
    lever.hit=true;leverHit=true;bridgeGone=true
    if(boss) boss.vy=-1  // slight upward nudge so boss visibly falls
    score+=500
  }
}

// ── Update ────────────────────────────────────────────────────────
function update(){
  if(!running) return

  char.vx=0
  if(keys.ArrowLeft||keys.KeyA) char.vx=-MOVE_SPD
  if(keys.ArrowRight||keys.KeyD) char.vx=MOVE_SPD
  if((keys.ArrowUp||keys.KeyW||keys.Space)&&char.onGround){char.vy=JUMP;char.onGround=false}

  resolveChar()
  if(invincible>0) invincible--

  // Lock camera when player reaches arena
  if(!arenaLocked&&char.x>ARENA_START+200) arenaLocked=true
  camX=arenaLocked ? ARENA_START : Math.max(camX,char.x-200)

  score=Math.max(score,Math.floor((char.x-100)/10))

  // Coins
  for(const c of coins){
    if(c.collected) continue
    if(Math.abs(char.x+CHAR_W/2-(c.x+COIN_SZ/2))<COIN_SZ&&Math.abs(char.y+CHAR_H/2-(c.y+COIN_SZ/2))<COIN_SZ){
      c.collected=true;score+=50
    }
  }

  // Normal enemies (pre-arena only)
  for(const e of enemies){
    if(e.stomped){e.stompTimer--;continue}
    e.x+=e.vx
    if(e.x<e.platX||e.x+ENEMY_SZ>e.platX+e.platW) e.vx*=-1
    if(invincible===0){
      const cx=char.x,cy=char.y,cw=CHAR_W,ch=CHAR_H
      if(cx+cw-4>e.x&&cx+4<e.x+ENEMY_SZ&&cy+ch>e.y&&cy<e.y+ENEMY_SZ){
        if(char.vy>0&&cy+ch<e.y+ENEMY_SZ/2){
          e.stomped=true;e.stompTimer=30;char.vy=-7;score+=100
        } else {
          loseLife();invincible=90
        }
      }
    }
  }

  // Boss section
  if(arenaLocked){
    updateBoss();updateFireballs();checkLever()
    if(leverHit&&!boss&&!won){
      won=true;running=false;score+=1000
      onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))
    }
  }
}

// ── Draw helpers ──────────────────────────────────────────────────
function drawLava(x,y,w,h){
  if(lavaImg.complete&&lavaImg.naturalWidth>0){
    for(let tx=x;tx<x+w;tx+=60){
      ctx.drawImage(lavaImg,tx,y,Math.min(60,x+w-tx),h)
    }
  } else {
    const grad=ctx.createLinearGradient(x,y,x,y+h)
    grad.addColorStop(0,'#ff8800');grad.addColorStop(0.5,'#ff3300');grad.addColorStop(1,'#aa1100')
    ctx.fillStyle=grad;ctx.fillRect(x,y,w,h)
    ctx.fillStyle='rgba(255,180,0,.3)'
    for(let lx=x+5;lx<x+w;lx+=18) ctx.fillRect(lx,y+2,6,h-4)
  }
}

// ── Draw ──────────────────────────────────────────────────────────
function draw(){
  ctx.clearRect(0,0,GW,GH)
  ctx.save()
  ctx.translate(-camX,0)

  // Lava column visible in space between bridge bottom and floor
  if(arenaLocked){
    const AX=ARENA_START
    const lavaTop=BRIDGE_Y+PLAT_H+4          // just below bridge
    const lavaBot=GH-PLAT_H-2                 // just above floor
    ctx.save()
    ctx.globalAlpha=bridgeGone?0.92:0.38
    drawLava(AX+80,lavaTop,530,lavaBot-lavaTop)
    ctx.restore()
  }

  // Platforms
  for(const p of platforms){
    if(p.isBridge&&bridgeGone) continue
    if(p.x+p.w<camX-10||p.x>camX+GW+10) continue
    for(let bx=p.x;bx<p.x+p.w;bx+=PLAT_H){
      const bw=Math.min(PLAT_H,p.x+p.w-bx)
      if(brickImg.complete&&brickImg.naturalWidth>0){
        ctx.drawImage(brickImg,bx,p.y,bw,PLAT_H)
      } else {
        ctx.fillStyle=p.ground?'#0096c7':(p.isBridge?'#7a3c10':'#1e5c7a')
        ctx.fillRect(bx,p.y,bw,PLAT_H)
      }
    }
  }

  // Lever
  if(lever&&!lever.hit){
    // Post
    ctx.fillStyle='#666';ctx.fillRect(lever.x+lever.w/2-3,lever.y+10,6,lever.h-10)
    // Handle
    ctx.fillStyle='#f5c518';ctx.fillRect(lever.x,lever.y,lever.w,12)
    ctx.fillStyle='rgba(245,197,24,.45)';ctx.font='bold 10px Segoe UI';ctx.textAlign='center'
    ctx.fillText('▼ LEVER',lever.x+lever.w/2,lever.y-5)
  }

  // Coins
  for(const c of coins){
    if(c.collected) continue
    ctx.save();ctx.globalAlpha=.9
    ctx.drawImage(logoImg,c.x,c.y,COIN_SZ,COIN_SZ)
    ctx.restore()
  }

  // Normal enemies
  for(const e of enemies){
    if(e.stomped&&e.stompTimer<=0) continue
    ctx.save()
    if(e.stomped) ctx.globalAlpha=.3
    ctx.drawImage(logoImg,e.x,e.y,ENEMY_SZ,ENEMY_SZ)
    ctx.fillStyle='#e05050';ctx.fillRect(e.x+6,e.y+8,5,5);ctx.fillRect(e.x+ENEMY_SZ-11,e.y+8,5,5)
    ctx.restore()
  }

  // Fireballs
  for(const f of fireballs){
    if(fireImg.complete&&fireImg.naturalWidth>0){
      ctx.drawImage(fireImg,f.x,f.y,f.w,f.h)
    } else {
      ctx.save();ctx.globalAlpha=.9
      ctx.fillStyle='#ff6600'
      ctx.beginPath();ctx.arc(f.x+f.w/2,f.y+f.h/2,f.w/2,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#ffdd00'
      ctx.beginPath();ctx.arc(f.x+f.w/2,f.y+f.h/2,f.w/4,0,Math.PI*2);ctx.fill()
      ctx.restore()
    }
  }

  // Boss
  if(boss){
    ctx.save()
    if(boss.blinkTimer>0&&Math.floor(boss.blinkTimer/4)%2===0) ctx.globalAlpha=.25
    if(bossImg.complete&&bossImg.naturalWidth>0){
      if(boss.dir<0){
        ctx.save();ctx.translate(boss.x+boss.w,boss.y);ctx.scale(-1,1)
        ctx.drawImage(bossImg,0,0,boss.w,boss.h);ctx.restore()
      } else {
        ctx.drawImage(bossImg,boss.x,boss.y,boss.w,boss.h)
      }
    } else {
      // Fallback: red rectangle with eyes
      ctx.fillStyle='#8B0000';ctx.fillRect(boss.x,boss.y,boss.w,boss.h)
      ctx.fillStyle='#ff0000'
      ctx.fillRect(boss.x+10,boss.y+14,12,10);ctx.fillRect(boss.x+42,boss.y+14,12,10)
      ctx.fillStyle='#ffff00'
      ctx.fillRect(boss.x+13,boss.y+16,6,6);ctx.fillRect(boss.x+45,boss.y+16,6,6)
    }
    ctx.restore()
    // Danger glow around boss (only while bridge intact)
    if(!bridgeGone){
      ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#ff0000'
      ctx.beginPath();ctx.arc(boss.x+boss.w/2,boss.y+boss.h/2,48,0,Math.PI*2);ctx.fill()
      ctx.restore()
    }
  }

  // Character
  const sprite=!char.onGround?charJumpImg:(char.vx!==0?charRunImg:charIdleImg)
  ctx.save()
  if(invincible>0&&Math.floor(invincible/6)%2===0) ctx.globalAlpha=.3
  if(char.vx<0){
    ctx.translate(char.x+CHAR_W,char.y);ctx.scale(-1,1);ctx.drawImage(sprite,0,0,CHAR_W,CHAR_H)
  } else {
    ctx.drawImage(sprite,char.x,char.y,CHAR_W,CHAR_H)
  }
  ctx.restore()

  ctx.restore() // end camera transform

  // HUD
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center'
  ctx.fillText(score,GW/2,34)
  for(let i=0;i<3;i++){
    ctx.fillStyle=i<lives?'#e05050':'#2a2d30';ctx.font='bold 22px Segoe UI';ctx.textAlign='right'
    ctx.fillText('♥',GW-8-(2-i)*26,30)
  }
  // Help text / boss hint
  if(arenaLocked&&!leverHit){
    ctx.fillStyle='rgba(220,60,60,.85)';ctx.font='bold 11px Segoe UI';ctx.textAlign='center'
    ctx.fillText('BOSS — chega à alavanca para o derrotar!',GW/2,GH-8)
  } else if(!arenaLocked){
    ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left'
    ctx.fillText('← → / A D  mover    ↑ / W / ␣  saltar',8,GH-8)
  }

  // Game Over overlay
  if(over){
    ctx.fillStyle='rgba(17,19,22,.88)';ctx.fillRect(0,0,GW,GH)
    const sz=130,ix=GW/2-sz/2,iy=GH/2-110
    ctx.drawImage(charFrontImg,ix,iy,sz,sz)
    ctx.textAlign='center'
    ctx.fillStyle='#e05050';ctx.font='bold 40px Segoe UI';ctx.fillText('GAME OVER',GW/2,iy+sz+40)
    ctx.fillStyle='#e3e5e7';ctx.font='bold 18px Segoe UI';ctx.fillText('Score: '+score,GW/2,iy+sz+70)
    ctx.fillStyle='#0096c7';ctx.font='bold 14px Segoe UI';ctx.fillText('↵  Pressionar Enter para Recomecar',GW/2,iy+sz+100)
  }

  // Victory overlay
  if(won){
    ctx.fillStyle='rgba(17,19,22,.92)';ctx.fillRect(0,0,GW,GH)
    ctx.textAlign='center'
    ctx.fillStyle='#f5c518';ctx.font='bold 54px Segoe UI';ctx.fillText('VITÓRIA!',GW/2,GH/2-50)
    ctx.fillStyle='#e3e5e7';ctx.font='bold 22px Segoe UI';ctx.fillText('Score: '+score,GW/2,GH/2+5)
    ctx.fillStyle='#0096c7';ctx.font='bold 14px Segoe UI';ctx.fillText('↵  Pressionar Enter para Recomecar',GW/2,GH/2+45)
  }
}

// ── Start ─────────────────────────────────────────────────────────
function startGame(u){
  user=u;score=0;lives=3;running=true;over=false;won=false;camX=0;invincible=0
  makePlatforms();makeCoins();makeEnemies();makeBoss()
  char={x:80,y:GH-200,vx:0,vy:0,onGround:false}
  if(iv)clearInterval(iv);iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  keys[e.code]=true
  if(e.code==='Space') e.preventDefault()
  if(e.code==='Enter'&&!running&&user) startGame(user)
})
document.addEventListener('keyup',e=>{keys[e.code]=false})

// Touch controls
let touchX=null
canvas.addEventListener('touchstart',e=>{
  e.preventDefault()
  if(!running&&user){startGame(user);return}
  const r=canvas.getBoundingClientRect()
  touchX=e.touches[0].clientX-r.left
  const ty=e.touches[0].clientY-r.top
  if(ty<r.height*0.4&&char.onGround){char.vy=JUMP;char.onGround=false}
},{passive:false})
canvas.addEventListener('touchmove',e=>{
  e.preventDefault()
  const r=canvas.getBoundingClientRect()
  touchX=e.touches[0].clientX-r.left
},{passive:false})
canvas.addEventListener('touchend',e=>{e.preventDefault();touchX=null},{passive:false})
setInterval(()=>{
  if(!running||touchX===null) return
  const mid=GW/2
  if(touchX<mid) char.vx=-MOVE_SPD
  else if(touchX>mid) char.vx=MOVE_SPD
},16)

initUsernameOverlay(startGame)
