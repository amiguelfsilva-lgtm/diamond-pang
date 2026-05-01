const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430,GROUND=GH,CHAR_W=40,CHAR_H=40

const charImg=new Image();charImg.src='../assets/char_pang.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'
const logoImg=new Image();logoImg.src='../assets/mainlogo.png'

let user='',score=0,running=false,over=false,iv=null
let charY=GROUND-CHAR_H,velY=0,jumping=false,doubleJump=false
let obstacles=[],speed=4,dist=0,nextObs=80

const GRAV=0.5, JUMP=-11, DJ=-9

function spawnObs() {
  const sz=28+Math.random()*32
  obstacles.push({x:GW,y:GROUND-sz,w:sz,h:sz})
  nextObs=60+Math.random()*80
}

function jump() {
  if(!jumping){velY=JUMP;jumping=true;doubleJump=false}
  else if(!doubleJump){velY=DJ;doubleJump=true}
}

function update() {
  if(!running)return
  dist++; score=Math.floor(dist/5)
  speed=4+dist/800
  if(--nextObs<=0)spawnObs()
  velY+=GRAV; charY+=velY
  if(charY>=GROUND-CHAR_H){charY=GROUND-CHAR_H;velY=0;jumping=false;doubleJump=false}
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i]; o.x-=speed
    if(o.x+o.w<0){obstacles.splice(i,1);continue}
    if(charY+CHAR_H-6>o.y&&charY+6<o.y+o.h&&40+CHAR_W-8>o.x&&48<o.x+o.w){
      running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))
    }
  }
}

function draw() {
  ctx.clearRect(0,0,GW,GH)
  for(const o of obstacles){ctx.drawImage(logoImg,o.x,o.y,o.w,o.h)}
  ctx.drawImage(charImg,40,charY,CHAR_W,CHAR_H)
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,34)
  ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left';ctx.fillText('␣ / W / ↑  saltar  (2x = duplo salto)',8,GH-14)
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

function startGame(u) {
  user=u;score=0;dist=0;speed=4;running=true;over=false
  charY=GROUND-CHAR_H;velY=0;jumping=false;doubleJump=false
  obstacles=[];nextObs=80
  if(iv)clearInterval(iv);iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  if((e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp')&&running){e.preventDefault();jump()}
  if(e.code==='Enter'&&!running&&user)startGame(user)
})

const TAP_MS=200; let ts=null
canvas.addEventListener('touchstart',e=>{e.preventDefault();ts=Date.now()},{passive:false})
canvas.addEventListener('touchend',e=>{e.preventDefault()
  if(Date.now()-ts<TAP_MS){if(running)jump();else if(user)startGame(user)}
  ts=null
},{passive:false})

initUsernameOverlay(startGame)
