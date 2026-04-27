const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430

const charIdleImg=new Image();charIdleImg.src='../assets/char_front_pang.png'
const charRunImg=new Image();charRunImg.src='../assets/charlateral.png'
const charJumpImg=new Image();charJumpImg.src='../assets/charjump.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'
const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const brickImg=new Image();brickImg.src='../assets/bricks.png'

// ── Constants ─────────────────────────────────────────────────────
const GRAV=0.45, JUMP=-11, MOVE_SPD=4, CHAR_W=32, CHAR_H=36
const PLAT_H=14, COIN_SZ=20, ENEMY_SZ=28
const GROUND_Y=GH  // banner is ground

// ── State ─────────────────────────────────────────────────────────
let user='',score=0,lives=3,running=false,over=false,iv=null
let camX=0,keys={},invincible=0

let char={},platforms=[],coins=[],enemies=[]

// ── Platform generation ───────────────────────────────────────────
function makePlatforms() {
  platforms=[]
  // Ground strips (with gaps)
  let x=0
  while(x<6000){
    const w=80+Math.random()*200
    platforms.push({x,y:GH-PLAT_H,w,h:PLAT_H,ground:true})
    x+=w+20+Math.random()*80
  }
  // Floating platforms
  for(let i=0;i<60;i++){
    const px=200+i*90+Math.random()*60
    const py=GH-80-Math.random()*160
    const pw=60+Math.random()*80
    platforms.push({x:px,y:py,w:pw,h:PLAT_H,ground:false})
  }
  platforms.sort((a,b)=>a.x-b.x)
}

function makeCoins() {
  coins=[]
  platforms.filter(p=>!p.ground).forEach(p=>{
    const n=1+Math.floor(p.w/40)
    for(let i=0;i<n;i++) coins.push({x:p.x+10+i*(p.w/n),y:p.y-COIN_SZ-4,collected:false})
  })
}

function makeEnemies() {
  enemies=[]
  platforms.filter(p=>!p.ground&&p.w>80).forEach((p,i)=>{
    if(i%3===0) enemies.push({x:p.x+10,y:p.y-ENEMY_SZ,vx:1.2,platX:p.x,platW:p.w,stomped:false,stompTimer:0})
  })
}

// ── Collision ─────────────────────────────────────────────────────
function resolveChar() {
  char.vy+=GRAV
  char.x+=char.vx
  char.y+=char.vy
  char.onGround=false

  for(const p of platforms){
    if(char.x+CHAR_W<p.x||char.x>p.x+p.w) continue
    // Landing on top
    if(char.vy>=0&&char.y+CHAR_H>p.y&&char.y+CHAR_H<p.y+p.h+char.vy+2){
      char.y=p.y-CHAR_H; char.vy=0; char.onGround=true
    }
    // Hitting from below
    else if(char.vy<0&&char.y<p.y+p.h&&char.y>p.y){
      char.y=p.y+p.h; char.vy=0
    }
  }

  // Fell off world
  if(char.y>GH+60) loseLife()
}

function loseLife(){
  lives--
  if(lives<=0){running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user));return}
  char.x=camX+100; char.y=GH-150; char.vx=0; char.vy=0; invincible=120
}

// ── Update ────────────────────────────────────────────────────────
function update(){
  if(!running)return

  // Input
  char.vx=0
  if(keys.ArrowLeft||keys.KeyA) char.vx=-MOVE_SPD
  if(keys.ArrowRight||keys.KeyD) char.vx=MOVE_SPD
  if((keys.ArrowUp||keys.KeyW||keys.Space)&&char.onGround){ char.vy=JUMP; char.onGround=false }

  resolveChar()
  if(invincible>0)invincible--

  // Camera follows char (don't go back)
  camX=Math.max(camX, char.x-200)
  score=Math.max(score, Math.floor((char.x-100)/10))

  // Coins
  for(const c of coins){
    if(c.collected)continue
    if(Math.abs(char.x+CHAR_W/2-(c.x+COIN_SZ/2))<COIN_SZ&&Math.abs(char.y+CHAR_H/2-(c.y+COIN_SZ/2))<COIN_SZ){
      c.collected=true; score+=50
    }
  }

  // Enemies
  for(const e of enemies){
    if(e.stomped){e.stompTimer--;continue}
    e.x+=e.vx
    if(e.x<e.platX||e.x+ENEMY_SZ>e.platX+e.platW) e.vx*=-1

    if(invincible===0){
      const ex=e.x,ey=e.y,ew=ENEMY_SZ,eh=ENEMY_SZ
      const cx=char.x,cy=char.y,cw=CHAR_W,ch=CHAR_H
      if(cx+cw-4>ex&&cx+4<ex+ew&&cy+ch>ey&&cy<ey+eh){
        // Stomp from above
        if(char.vy>0&&cy+ch<ey+eh/2){
          e.stomped=true; e.stompTimer=30; char.vy=-7; score+=100
        } else {
          if(invincible===0) loseLife(); invincible=90
        }
      }
    }
  }
}

// ── Draw ──────────────────────────────────────────────────────────
function draw(){
  ctx.clearRect(0,0,GW,GH)
  ctx.save()
  ctx.translate(-camX,0)

  // Platforms
  for(const p of platforms){
    if(p.x+p.w<camX-10||p.x>camX+GW+10)continue
    // Tile bricks across platform width
    const bsz=PLAT_H
    for(let bx=p.x;bx<p.x+p.w;bx+=bsz){
      const bw=Math.min(bsz,p.x+p.w-bx)
      if(brickImg.complete&&brickImg.naturalWidth>0){
        ctx.drawImage(brickImg,bx,p.y,bw,PLAT_H)
      } else {
        ctx.fillStyle=p.ground?'#0096c7':'#1e5c7a'
        ctx.fillRect(bx,p.y,bw,PLAT_H)
      }
    }
  }

  // Coins
  for(const c of coins){
    if(c.collected)continue
    ctx.save();ctx.globalAlpha=.9
    ctx.drawImage(logoImg,c.x,c.y,COIN_SZ,COIN_SZ)
    ctx.restore()
  }

  // Enemies
  for(const e of enemies){
    if(e.stomped&&e.stompTimer<=0)continue
    ctx.save()
    if(e.stomped)ctx.globalAlpha=.3
    ctx.drawImage(logoImg,e.x,e.y,ENEMY_SZ,ENEMY_SZ)
    // Enemy eyes to distinguish from coins
    ctx.fillStyle='#e05050';ctx.fillRect(e.x+6,e.y+8,5,5);ctx.fillRect(e.x+ENEMY_SZ-11,e.y+8,5,5)
    ctx.restore()
  }

  // Char — sprite consoante estado
  const sprite = !char.onGround ? charJumpImg : (char.vx!==0 ? charRunImg : charIdleImg)
  ctx.save()
  if(invincible>0&&Math.floor(invincible/6)%2===0)ctx.globalAlpha=.3
  if(char.vx<0){
    ctx.translate(char.x+CHAR_W,char.y);ctx.scale(-1,1);ctx.drawImage(sprite,0,0,CHAR_W,CHAR_H)
  } else {
    ctx.drawImage(sprite,char.x,char.y,CHAR_W,CHAR_H)
  }
  ctx.restore()

  ctx.restore() // end camera transform

  // HUD
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,34)
  for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#e05050':'#2a2d30';ctx.font='bold 22px Segoe UI';ctx.textAlign='right';ctx.fillText('♥',GW-8-(2-i)*26,30)}
  ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left'
  ctx.fillText('← → / A D  mover    ↑ / W / ␣  saltar',8,GH-8)

  // Game over overlay
  if(over){
    ctx.fillStyle='rgba(17,19,22,.88)';ctx.fillRect(0,0,GW,GH)
    const sz=130,ix=GW/2-sz/2,iy=GH/2-110
    ctx.drawImage(charFrontImg,ix,iy,sz,sz)
    ctx.textAlign='center'
    ctx.fillStyle='#e05050';ctx.font='bold 40px Segoe UI';ctx.fillText('GAME OVER',GW/2,iy+sz+40)
    ctx.fillStyle='#e3e5e7';ctx.font='bold 18px Segoe UI';ctx.fillText('Score: '+score,GW/2,iy+sz+70)
    ctx.fillStyle='#0096c7';ctx.font='bold 14px Segoe UI';ctx.fillText('↵  Pressionar Enter para Recomecar',GW/2,iy+sz+100)
  }
}

// ── Start ─────────────────────────────────────────────────────────
function startGame(u){
  user=u;score=0;lives=3;running=true;over=false;camX=0;invincible=0
  makePlatforms();makeCoins();makeEnemies()
  char={x:80,y:GH-200,vx:0,vy:0,onGround:false}
  if(iv)clearInterval(iv);iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  keys[e.code]=true
  if(e.code==='Space')e.preventDefault()
  if(e.code==='Enter'&&!running&&user)startGame(user)
})
document.addEventListener('keyup',e=>{keys[e.code]=false})

// Touch controls
let touchX=null
canvas.addEventListener('touchstart',e=>{
  e.preventDefault()
  if(!running&&user){startGame(user);return}
  const r=canvas.getBoundingClientRect()
  const tx=e.touches[0].clientX-r.left
  touchX=tx
  // Tap top third = jump
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
  if(!running||touchX===null)return
  const mid=GW/2
  if(touchX<mid)char.vx=-MOVE_SPD
  else if(touchX>mid)char.vx=MOVE_SPD
},16)

initUsernameOverlay(startGame)
