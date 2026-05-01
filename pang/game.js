const canvas = document.getElementById('canvas')
const ctx    = canvas.getContext('2d')
const GW = 750, GH = 430

const GRAVITY       = 0.12
const BOUNCE_FORCE  = { giant:9.5, large:7.5, medium:5.5, small:3.8 }
const BALL_SPEED_X  = { giant:1.3, large:1.8, medium:2.6, small:3.5 }
const BALL_RADIUS   = { giant:44,  large:28,  medium:18,  small:10  }
const LEVEL_CONFIG  = [null,
  [{type:'large',count:1}],[{type:'large',count:2}],[{type:'large',count:3}],
  [{type:'giant',count:1}],[{type:'giant',count:2}],[{type:'giant',count:3}],
  [{type:'giant',count:1},{type:'large',count:1}],
  [{type:'giant',count:2},{type:'large',count:2}],
  [{type:'giant',count:3},{type:'large',count:3}],
]
const PLAYER_W=40, PLAYER_H=40, HB_X=9, HB_TOP=7, PSPEED=4, HSPEED=10, GROUND=GH

const logoImg = new Image(); logoImg.src = '../assets/mainlogo.png'
const charImg = new Image(); charImg.src = '../assets/char_pang.png'
const charFrontImg = new Image(); charFrontImg.src = '../assets/char_front_pang.png'

let user='', score=0, lives=3, level=1, balls=[], harpoon=null
let player={x:GW/2-PLAYER_W/2, y:GROUND-PLAYER_H}
let keys={}, inv=0, running=false, over=false, iv=null

function spawnBalls() {
  balls=[]
  const cfg=LEVEL_CONFIG[level]||LEVEL_CONFIG[9]
  let slot=0, total=cfg.reduce((s,g)=>s+g.count,0)
  cfg.forEach(g=>{ for(let i=0;i<g.count;i++){
    balls.push({x:GW*(slot+1)/(total+1),y:30,vx:BALL_SPEED_X[g.type]*(slot%2?-1:1),vy:1,type:g.type}); slot++
  }})
}

function reset() { player.x=GW/2-PLAYER_W/2; player.y=GROUND-PLAYER_H; harpoon=null; inv=60; spawnBalls() }

function splitBall(b,i) {
  const nx={giant:'large',large:'medium',medium:'small',small:null}[b.type]
  score+={giant:50,large:100,medium:200,small:400}[b.type]
  balls.splice(i,1)
  if(nx){const s=BALL_SPEED_X[nx];balls.push({x:b.x,y:b.y,vx:-s,vy:-BOUNCE_FORCE[nx]*.6,type:nx},{x:b.x,y:b.y,vx:s,vy:-BOUNCE_FORCE[nx]*.6,type:nx})}
}

function update() {
  if(!running)return
  if(inv>0)inv--
  if(keys.ArrowLeft||keys.KeyA) player.x=Math.max(0,player.x-PSPEED)
  if(keys.ArrowRight||keys.KeyD) player.x=Math.min(GW-PLAYER_W,player.x+PSPEED)
  if(harpoon){harpoon.y-=HSPEED; if(harpoon.y<=0)harpoon=null}
  for(let i=balls.length-1;i>=0;i--){
    const b=balls[i],r=BALL_RADIUS[b.type]
    b.vy+=GRAVITY; b.x+=b.vx; b.y+=b.vy
    if(b.x-r<=0){b.vx=Math.abs(b.vx);b.x=r} if(b.x+r>=GW){b.vx=-Math.abs(b.vx);b.x=GW-r}
    if(b.y-r<=0){b.vy=Math.abs(b.vy);b.y=r} if(b.y+r>=GROUND){b.vy=-BOUNCE_FORCE[b.type];b.y=GROUND-r}
    if(harpoon&&Math.abs(b.x-harpoon.x)<r&&harpoon.y<=b.y+r&&harpoon.bottom>=b.y-r){splitBall(b,i);harpoon=null;continue}
    if(inv===0){const hx=player.x+HB_X,hy=player.y+HB_TOP,hw=PLAYER_W-HB_X*2,hh=PLAYER_H-HB_TOP
      const cx=Math.max(hx,Math.min(b.x,hx+hw)),cy=Math.max(hy,Math.min(b.y,hy+hh))
      if(Math.hypot(b.x-cx,b.y-cy)<r){lives--;if(lives<=0){running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))}else{player.x=GW/2-PLAYER_W/2;harpoon=null;inv=90}}}
  }
  if(running&&balls.length===0){if(level>=9){running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))}else{level++;reset()}}
}

function draw() {
  ctx.clearRect(0,0,GW,GH)
  if(harpoon){ctx.strokeStyle='#0096c7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(harpoon.x,harpoon.bottom);ctx.lineTo(harpoon.x,harpoon.y);ctx.stroke()}
  for(const b of balls){const r=BALL_RADIUS[b.type];ctx.save();ctx.globalAlpha=.9;ctx.drawImage(logoImg,b.x-r,b.y-r,r*2,r*2);ctx.restore()}
  ctx.save();if(inv>0&&Math.floor(inv/6)%2===0)ctx.globalAlpha=.3;ctx.drawImage(charImg,player.x,player.y,PLAYER_W,PLAYER_H);ctx.restore()
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 30px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,36)
  for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#e05050':'#2a2d30';ctx.font='bold 22px Segoe UI';ctx.textAlign='right';ctx.fillText('♥',GW-8-(2-i)*26,30)}
  ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left';ctx.fillText('NIVEL '+level+' / 9',8,GH-20)
  ctx.fillText('← → / A D  mover    ␣ disparar',8,GH-12)
  if(over){
    ctx.fillStyle='rgba(17,19,22,.88)';ctx.fillRect(0,0,GW,GH)
    const sz=140,ix=GW/2-sz/2,iy=GH/2-120
    ctx.drawImage(charFrontImg,ix,iy,sz,sz)
    ctx.textAlign='center'
    ctx.fillStyle=level>9?'#f5c518':'#e05050';ctx.font='bold 42px Segoe UI';ctx.fillText(level>9?'YOU WIN!':'GAME OVER',GW/2,iy+sz+42)
    ctx.fillStyle='#e3e5e7';ctx.font='bold 20px Segoe UI';ctx.fillText('Score: '+score,GW/2,iy+sz+74)
    ctx.fillStyle='#0096c7';ctx.font='bold 15px Segoe UI';ctx.fillText('↵  Pressionar Enter para Recomecar',GW/2,iy+sz+108)
  }
}

function startGame(u) {
  user=u; score=0; lives=3; level=1; running=true; over=false
  reset(); if(iv)clearInterval(iv); iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  keys[e.code]=true
  if(e.code==='Space'&&running&&!harpoon){e.preventDefault();const cx=player.x+PLAYER_W/2;harpoon={x:cx,y:player.y+HB_TOP,bottom:player.y+HB_TOP}}
  if(e.code==='Enter'&&!running&&user)startGame(user)
})
document.addEventListener('keyup',e=>{keys[e.code]=false})
initUsernameOverlay(startGame)
