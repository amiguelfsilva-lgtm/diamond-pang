const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430

const charIdleImg=new Image();charIdleImg.src='../assets/char_front_pang.png'
const charRunImg=new Image();charRunImg.src='../assets/charlateral.png'
const charJumpImg=new Image();charJumpImg.src='../assets/charjump.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'
const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const brickImg=new Image();brickImg.src='../assets/bricks.png'
const bossImg=new Image();bossImg.src='../assets/boss.png'
const spikeImg=new Image();spikeImg.src='../assets/spikes.png'
const balaImg=new Image();balaImg.src='../assets/balas.png'

// ── Constants ─────────────────────────────────────────────────────
const GRAV=0.52, JUMP=-11.5, DJ=-9, SPD=4
const CW=32, CH=36
// Hitbox: tight torso-only (Boshy style)
const HBX=11, HBY=12, HBW=10, HBH=18
const PLAT_H=14
// spikes.png = module of 4 spikes; tile this image for longer stretches
const SPIKE_TW=64, SPIKE_TH=18   // one tile = 4 spikes, 64×18px
const BALA_SPD=14, BALA_MAX=5

// ── Room data ─────────────────────────────────────────────────────
// platforms: [x,y,w]
// spikes:    [x,y,dir,tiles]  dir='up'|'down'   tiles = how many 4-spike modules to draw
// cp:        [x,y]   checkpoint
// exit:      [x,y,w,h]
const RDATA=[
  { // ── SALA 1 ── Introdução
    bg:'#161920',
    platforms:[
      [0,416,140],[210,416,120],[400,416,100],[570,416,180], // ground
      [90,330,80],[250,280,70],[410,305,80],[525,265,85],     // floaters
    ],
    spikes:[
      [140,416,'up',1],[330,416,'up',1],[500,416,'up',1],     // floor gaps
      [0,18,'down',2],[390,18,'down',2],                       // ceiling traps
      [262,266,'up',1],                                        // trap on 2nd floater
    ],
    cp:[620,396],
    exit:[736,336,14,72]
  },
  { // ── SALA 2 ── Pressão
    bg:'#141118',
    platforms:[
      [0,416,80],[170,416,90],[360,416,80],[540,416,80],[670,416,80], // ground
      [140,340,70],[300,285,65],[455,335,70],[600,265,75],              // floaters
    ],
    spikes:[
      [80,416,'up',1],[260,416,'up',1],[440,416,'up',1],[620,416,'up',1], // floor gaps
      [0,18,'down',3],[350,18,'down',2],[560,18,'down',2],                 // ceiling
      [309,271,'up',1],[606,251,'up',1],                                   // floater traps
    ],
    mover:{x:230,y:200,vy:1.8,minY:80,maxY:360}, // moving spike column
    cp:[700,396],
    exit:[736,296,14,72]
  }
]

// ── State ─────────────────────────────────────────────────────────
let user='',deaths=0,running=false,won=false,iv=null
let roomIdx=0,inBoss=false
let flash=0,flashClr='#ff2020'

let char={},keys={},shootCd=0,facing=1
let bullets=[]
let cpActive={room:0,x:40,y:390}
let moverY=200,moverVY=1.8

// Boss
let boss=null,bBullets=[],shockwaves=[]

// ── Helpers ───────────────────────────────────────────────────────
function charHB(){return{x:char.x+HBX,y:char.y+HBY,w:HBW,h:HBH}}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function spikeHB(sp){
  const [sx,sy,dir,n]=sp
  if(dir==='up')   return{x:sx,y:sy-SPIKE_TH,w:n*SPIKE_TW,h:SPIKE_TH}
  return             {x:sx,y:sy,            w:n*SPIKE_TW,h:SPIKE_TH}
}

// ── Physics ───────────────────────────────────────────────────────
function getPlats(){
  if(inBoss) return[
    [0,416,750],
    [0,170,50],[700,170,50],    // side pillars (cover)
    [290,290,170],              // mid platform to shoot from
  ]
  return RDATA[roomIdx].platforms
}

function resolveChar(){
  char.vy=Math.min(char.vy+GRAV,14)
  char.x+=char.vx
  char.y+=char.vy
  char.onGround=false
  for(const [px,py,pw] of getPlats()){
    if(char.x+CW<px||char.x>px+pw) continue
    if(char.vy>=0&&char.y+CH>py&&char.y+CH<py+PLAT_H+char.vy+2){
      char.y=py-CH;char.vy=0;char.onGround=true;char.djUsed=false
    } else if(char.vy<0&&char.y<py+PLAT_H&&char.y>py){
      char.y=py+PLAT_H;char.vy=0
    }
  }
  // Wall bounds
  if(char.x<0){char.x=0;char.vx=0}
  if(char.x+CW>GW){char.x=GW-CW;char.vx=0}
  // Fall out = death
  if(char.y>GH+40) die()
}

// ── Death & respawn ───────────────────────────────────────────────
function die(){
  if(char.inv>0) return
  deaths++
  flash=22;flashClr='#ff1010'
  char.x=cpActive.x;char.y=cpActive.y-CH
  char.vx=0;char.vy=0;char.onGround=false;char.djUsed=false;char.inv=55
  bullets=[];bBullets=[];shockwaves=[]
}

// ── Checkpoint ────────────────────────────────────────────────────
function checkCP(){
  if(inBoss) return
  const [cx,cy]=RDATA[roomIdx].cp
  if(overlap(charHB(),{x:cx,y:cy-20,w:20,h:20}))
    cpActive={room:roomIdx,x:cx,y:cy}
}

// ── Exit / transition ─────────────────────────────────────────────
function checkExit(){
  if(inBoss) return
  const [ex,ey,ew,eh]=RDATA[roomIdx].exit
  if(!overlap(charHB(),{x:ex,y:ey,w:ew,h:eh})) return
  flash=28;flashClr='#ffffff'
  bullets=[]
  if(roomIdx===0){
    roomIdx=1
    char.x=40;char.y=370
    cpActive={room:1,x:40,y:390}
    const mv=RDATA[1].mover
    moverY=mv.y;moverVY=mv.vy
  } else {
    inBoss=true
    char.x=60;char.y=370
    cpActive={room:2,x:60,y:390}
    spawnBoss()
  }
}

// ── Boss ──────────────────────────────────────────────────────────
function spawnBoss(){
  boss={x:310,y:50,w:80,h:80,hp:30,phase:1,
        vx:2,vy:0,onGround:false,dir:1,
        shootTimer:130,jumpTimer:230,blinkTimer:0}
  bBullets=[];shockwaves=[]
}

function updateBoss(){
  if(!boss) return
  if(boss.blinkTimer>0) boss.blinkTimer--
  boss.vy=Math.min(boss.vy+GRAV,12)
  boss.x+=boss.vx;boss.y+=boss.vy;boss.onGround=false
  // Walls
  if(boss.x<10){boss.x=10;boss.vx=Math.abs(boss.vx);boss.dir=1}
  if(boss.x+boss.w>GW-10){boss.x=GW-10-boss.w;boss.vx=-Math.abs(boss.vx);boss.dir=-1}
  // Floor
  if(boss.vy>=0&&boss.y+boss.h>416&&boss.y+boss.h<416+PLAT_H+boss.vy+2){
    boss.y=416-boss.h;boss.vy=0;boss.onGround=true
  }
  if(boss.y<0){boss.y=0;boss.vy=0}
  // Speed by phase
  const spd=boss.phase===1?2:boss.phase===2?3:4.2
  boss.vx=Math.sign(boss.vx)*spd
  // Jump
  const jInt=boss.phase===1?230:boss.phase===2?160:105
  if(--boss.jumpTimer<=0&&boss.onGround){
    boss.jumpTimer=jInt+Math.floor(Math.random()*70)
    boss.vy=-10.5
  }
  // Shoot
  const sInt=boss.phase===1?130:boss.phase===2?85:58
  if(--boss.shootTimer<=0){
    boss.shootTimer=sInt+Math.floor(Math.random()*35)
    const dx=(char.x+CW/2)-(boss.x+boss.w/2)
    const dy=(char.y+CH/2)-(boss.y+boss.h/2)
    const len=Math.sqrt(dx*dx+dy*dy)||1
    const spd2=5.5
    if(boss.phase===1){
      bBullets.push({x:boss.x+boss.w/2,y:boss.y+boss.h*.7,vx:dx/len*spd2,vy:dy/len*spd2})
    } else if(boss.phase===2){
      for(let a=-1;a<=1;a++){
        const ang=Math.atan2(dy,dx)+a*0.32
        bBullets.push({x:boss.x+boss.w/2,y:boss.y+boss.h*.7,vx:Math.cos(ang)*spd2,vy:Math.sin(ang)*spd2})
      }
    } else {
      for(let a=-2;a<=2;a++){
        const ang=Math.atan2(dy,dx)+a*0.26
        bBullets.push({x:boss.x+boss.w/2,y:boss.y+boss.h*.7,vx:Math.cos(ang)*6.5,vy:Math.sin(ang)*6.5})
      }
      shockwaves.push({x:boss.x+boss.w/2,y:416,vx:boss.dir*5,w:36,h:24,life:70})
    }
  }
  // Phase transitions
  if(boss.hp<=20&&boss.phase===1) boss.phase=2
  if(boss.hp<=10&&boss.phase===2) boss.phase=3
  // Touch = death
  if(char.inv===0&&overlap(charHB(),{x:boss.x+10,y:boss.y+8,w:boss.w-20,h:boss.h-16})) die()
}

function updateBBullets(){
  for(let i=bBullets.length-1;i>=0;i--){
    const b=bBullets[i];b.x+=b.vx;b.y+=b.vy
    if(b.x<-30||b.x>GW+30||b.y<-30||b.y>GH+30){bBullets.splice(i,1);continue}
    if(char.inv===0&&overlap({x:b.x-5,y:b.y-5,w:10,h:10},charHB())){bBullets.splice(i,1);die()}
  }
  for(let i=shockwaves.length-1;i>=0;i--){
    const s=shockwaves[i];s.x+=s.vx;s.life--
    if(s.life<=0||s.x<0||s.x>GW){shockwaves.splice(i,1);continue}
    if(char.inv===0&&overlap({x:s.x,y:s.y-s.h,w:s.w,h:s.h},charHB())) die()
  }
}

function updateBullets(){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.x+=b.vx
    if(b.x<-10||b.x>GW+10){bullets.splice(i,1);continue}
    if(inBoss&&boss&&overlap({x:b.x-5,y:b.y-4,w:10,h:8},{x:boss.x,y:boss.y,w:boss.w,h:boss.h})){
      bullets.splice(i,1)
      boss.hp--;boss.blinkTimer=7
      if(boss.hp<=0){
        boss=null;won=true;running=false
        onGameEnd(user,Math.max(0,5000-deaths*8)).then(s=>s&&renderLeaderboard(s,user))
      }
    }
  }
}

// ── Update ────────────────────────────────────────────────────────
function update(){
  if(!running) return
  if(flash>0) flash--

  char.vx=0
  if(keys.ArrowLeft||keys.KeyA){char.vx=-SPD;facing=-1}
  if(keys.ArrowRight||keys.KeyD){char.vx=SPD;facing=1}

  resolveChar()
  if(char.inv>0) char.inv--

  // Shoot (hold X or Shift)
  if(shootCd>0) shootCd--
  if((keys.KeyX||keys.ShiftLeft||keys.ShiftRight)&&shootCd===0&&bullets.length<BALA_MAX){
    bullets.push({x:char.x+(facing>0?CW+2:-4),y:char.y+CH/2-3,vx:BALA_SPD*facing})
    shootCd=9
  }

  // Spike collisions
  if(char.inv===0&&!inBoss){
    for(const sp of RDATA[roomIdx].spikes){
      if(overlap(charHB(),spikeHB(sp))){die();break}
    }
    // Moving spike (sala 2)
    if(roomIdx===1){
      const mv=RDATA[1].mover
      if(overlap(charHB(),{x:mv.x,y:moverY-SPIKE_TH,w:SPIKE_TW,h:SPIKE_TH})) die()
    }
  }

  updateBullets()
  checkCP()
  checkExit()

  if(inBoss&&boss){updateBoss();updateBBullets()}

  // Update mover
  if(!inBoss&&roomIdx===1){
    const mv=RDATA[1].mover
    moverY+=moverVY
    if(moverY<mv.minY){moverY=mv.minY;moverVY=Math.abs(moverVY)}
    if(moverY>mv.maxY){moverY=mv.maxY;moverVY=-Math.abs(moverVY)}
  }
}

// ── Draw helpers ──────────────────────────────────────────────────
function drawPlat(x,y,w){
  for(let bx=x;bx<x+w;bx+=PLAT_H){
    const bw=Math.min(PLAT_H,x+w-bx)
    if(brickImg.complete&&brickImg.naturalWidth>0) ctx.drawImage(brickImg,bx,y,bw,PLAT_H)
    else{ctx.fillStyle='#0096c7';ctx.fillRect(bx,y,bw,PLAT_H)}
  }
}

// spikes.png = one module of 4 spikes (SPIKE_TW wide)
// tiles = how many modules to repeat side by side
function drawSpikes(x,y,dir,tiles){
  for(let i=0;i<tiles;i++){
    const tx=x+i*SPIKE_TW
    if(spikeImg.complete&&spikeImg.naturalWidth>0){
      ctx.save()
      if(dir==='down'){
        ctx.translate(tx+SPIKE_TW/2,y+SPIKE_TH/2)
        ctx.scale(1,-1)
        ctx.drawImage(spikeImg,-SPIKE_TW/2,-SPIKE_TH/2,SPIKE_TW,SPIKE_TH)
      } else {
        ctx.drawImage(spikeImg,tx,y-SPIKE_TH,SPIKE_TW,SPIKE_TH)
      }
      ctx.restore()
    } else {
      // Fallback: draw 4 white triangles per module
      ctx.fillStyle='#d8d8d8'
      const sw=SPIKE_TW/4
      for(let j=0;j<4;j++){
        const sx=tx+j*sw
        ctx.beginPath()
        if(dir==='up'){ctx.moveTo(sx,y);ctx.lineTo(sx+sw/2,y-SPIKE_TH);ctx.lineTo(sx+sw,y)}
        else          {ctx.moveTo(sx,y);ctx.lineTo(sx+sw/2,y+SPIKE_TH);ctx.lineTo(sx+sw,y)}
        ctx.closePath();ctx.fill()
      }
    }
  }
}

function drawChar(){
  const sprite=!char.onGround?charJumpImg:(char.vx!==0?charRunImg:charIdleImg)
  ctx.save()
  if(char.inv>0&&Math.floor(char.inv/5)%2===0) ctx.globalAlpha=.25
  if(facing<0){ctx.translate(char.x+CW,char.y);ctx.scale(-1,1);ctx.drawImage(sprite,0,0,CW,CH)}
  else ctx.drawImage(sprite,char.x,char.y,CW,CH)
  ctx.restore()
}

// ── Draw ──────────────────────────────────────────────────────────
function draw(){
  ctx.fillStyle=inBoss?'#0e0a14':(RDATA[roomIdx]?.bg||'#161920')
  ctx.fillRect(0,0,GW,GH)

  // Platforms
  for(const p of getPlats()) drawPlat(p[0],p[1],p[2])

  if(!inBoss){
    // Spikes
    for(const sp of RDATA[roomIdx].spikes) drawSpikes(sp[0],sp[1],sp[2],sp[3])
    // Moving spike
    if(roomIdx===1){
      const mv=RDATA[1].mover
      drawSpikes(mv.x,moverY,'up',1)
    }
    // Checkpoint
    const [cx,cy]=RDATA[roomIdx].cp
    const active=cpActive.room===roomIdx
    ctx.save();ctx.globalAlpha=active?.95:.3
    ctx.drawImage(logoImg,cx,cy-20,20,20)
    if(active){ctx.strokeStyle='#f5c518';ctx.lineWidth=2;ctx.strokeRect(cx-2,cy-22,24,24)}
    ctx.restore()
    // Exit door
    const [ex,ey,ew,eh]=RDATA[roomIdx].exit
    ctx.fillStyle='#f5c518';ctx.fillRect(ex,ey,ew,eh)
    ctx.fillStyle='#111';ctx.font='bold 8px Segoe UI';ctx.textAlign='center'
    ctx.fillText('EXIT',ex+ew/2,ey+eh/2+3)
  }

  // Player bullets
  for(const b of bullets){
    if(balaImg.complete&&balaImg.naturalWidth>0){
      ctx.save()
      if(b.vx<0){ctx.translate(b.x+7,b.y);ctx.scale(-1,1);ctx.drawImage(balaImg,-7,-4,14,8)}
      else ctx.drawImage(balaImg,b.x-7,b.y-4,14,8)
      ctx.restore()
    } else {ctx.fillStyle='#f5c518';ctx.fillRect(b.x-7,b.y-3,14,6)}
  }

  // Boss
  if(inBoss&&boss){
    ctx.save()
    if(boss.blinkTimer>0&&Math.floor(boss.blinkTimer/2)%2===0) ctx.globalAlpha=.15
    if(bossImg.complete&&bossImg.naturalWidth>0){
      if(boss.dir<0){ctx.save();ctx.translate(boss.x+boss.w,boss.y);ctx.scale(-1,1);ctx.drawImage(bossImg,0,0,boss.w,boss.h);ctx.restore()}
      else ctx.drawImage(bossImg,boss.x,boss.y,boss.w,boss.h)
    } else {
      ctx.fillStyle='#8B0000';ctx.fillRect(boss.x,boss.y,boss.w,boss.h)
      ctx.fillStyle='#ff2020'
      ctx.fillRect(boss.x+10,boss.y+16,12,10);ctx.fillRect(boss.x+58,boss.y+16,12,10)
    }
    ctx.restore()
    // HP bar
    ctx.fillStyle='#2a0a0a';ctx.fillRect(boss.x,boss.y-14,boss.w,8)
    const hpClr=boss.hp>20?'#00cc55':boss.hp>10?'#ffaa00':'#ff2200'
    ctx.fillStyle=hpClr;ctx.fillRect(boss.x,boss.y-14,boss.w*(boss.hp/30),8)
    // Phase label
    ctx.fillStyle='rgba(220,100,255,.7)';ctx.font='bold 9px Segoe UI';ctx.textAlign='center'
    ctx.fillText('FASE '+boss.phase,boss.x+boss.w/2,boss.y-16)
  }

  // Boss bullets
  for(const b of bBullets){
    if(balaImg.complete&&balaImg.naturalWidth>0){ctx.save();ctx.globalAlpha=.85;ctx.drawImage(balaImg,b.x-8,b.y-8,16,16);ctx.restore()}
    else{ctx.fillStyle='#ff5500';ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill()}
  }

  // Shockwaves
  for(const s of shockwaves){
    ctx.fillStyle=`rgba(255,90,0,${s.life/70*.75})`
    ctx.fillRect(s.x,s.y-s.h,s.w,s.h)
  }

  // Character
  drawChar()

  // Flash (death = red, transition = white)
  if(flash>0){
    ctx.fillStyle=flashClr;ctx.globalAlpha=flash/22*.75
    ctx.fillRect(0,0,GW,GH);ctx.globalAlpha=1
  }

  // HUD
  ctx.fillStyle='#e05050';ctx.font='bold 15px Segoe UI';ctx.textAlign='left'
  ctx.fillText('💀 '+deaths,8,24)

  if(inBoss&&boss){
    ctx.fillStyle='rgba(210,80,255,.8)';ctx.font='bold 12px Segoe UI';ctx.textAlign='center'
    ctx.fillText('Dispara no boss — X / Shift',GW/2,22)
  } else if(!inBoss){
    ctx.fillStyle='rgba(100,100,110,.5)';ctx.font='10px Segoe UI';ctx.textAlign='left'
    ctx.fillText('← →  mover    Z / ↑  saltar (2×)    X / Shift  disparar',8,GH-14)
    ctx.fillStyle='rgba(80,80,100,.5)';ctx.textAlign='right'
    ctx.fillText('SALA '+(roomIdx+1)+'/2',GW-8,GH-14)
  }

  // Win screen
  if(won){
    ctx.fillStyle='rgba(14,10,20,.92)';ctx.fillRect(0,0,GW,GH)
    const sz=110,ix=GW/2-sz/2,iy=GH/2-105
    ctx.drawImage(charFrontImg,ix,iy,sz,sz)
    ctx.textAlign='center'
    ctx.fillStyle='#f5c518';ctx.font='bold 48px Segoe UI';ctx.fillText('YOU WIN!',GW/2,iy+sz+46)
    ctx.fillStyle='#e3e5e7';ctx.font='bold 18px Segoe UI';ctx.fillText('Mortes: '+deaths,GW/2,iy+sz+78)
    ctx.fillStyle='#0096c7';ctx.font='bold 13px Segoe UI';ctx.fillText('↵  Enter para jogar de novo',GW/2,iy+sz+108)
  }
}

// ── Start ─────────────────────────────────────────────────────────
function startGame(u){
  user=u;deaths=0;running=true;won=false
  roomIdx=0;inBoss=false;facing=1;shootCd=0;flash=0
  char={x:40,y:360,vx:0,vy:0,onGround:false,djUsed:false,inv:0}
  bullets=[];bBullets=[];shockwaves=[];boss=null
  cpActive={room:0,x:40,y:390}
  moverY=RDATA[1].mover.y;moverVY=RDATA[1].mover.vy
  if(iv)clearInterval(iv);iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  keys[e.code]=true
  // Jump on keydown (for responsive double-jump)
  if((e.code==='KeyZ'||e.code==='ArrowUp'||e.code==='KeyW')&&running){
    e.preventDefault()
    if(char.onGround){char.vy=JUMP;char.onGround=false;char.djUsed=false}
    else if(!char.djUsed){char.vy=DJ;char.djUsed=true}
  }
  if(e.code==='Space') e.preventDefault()
  if(e.code==='Enter'&&!running&&user) startGame(user)
})
document.addEventListener('keyup',e=>{keys[e.code]=false})

// Touch: left/right half = move | top 35% = jump | bottom 25% = shoot
let touchMoveX=null
canvas.addEventListener('touchstart',e=>{
  e.preventDefault()
  if(!running&&user){startGame(user);return}
  const r=canvas.getBoundingClientRect()
  const ty=(e.touches[0].clientY-r.top)/r.height*GH
  if(ty<GH*.35){
    if(char.onGround){char.vy=JUMP;char.onGround=false;char.djUsed=false}
    else if(!char.djUsed){char.vy=DJ;char.djUsed=true}
  } else if(ty>GH*.75&&shootCd===0&&bullets.length<BALA_MAX){
    bullets.push({x:char.x+(facing>0?CW+2:-4),y:char.y+CH/2-3,vx:BALA_SPD*facing})
    shootCd=9
  }
  touchMoveX=e.touches[0].clientX-r.left
},{passive:false})
canvas.addEventListener('touchmove',e=>{
  e.preventDefault()
  const r=canvas.getBoundingClientRect()
  touchMoveX=e.touches[0].clientX-r.left
},{passive:false})
canvas.addEventListener('touchend',e=>{e.preventDefault();touchMoveX=null},{passive:false})
setInterval(()=>{
  if(!running||touchMoveX===null) return
  const mid=canvas.getBoundingClientRect().width/2
  if(touchMoveX<mid){char.vx=-SPD;facing=-1}else{char.vx=SPD;facing=1}
},16)

initUsernameOverlay(startGame)
