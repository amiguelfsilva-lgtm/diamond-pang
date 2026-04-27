const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430,COLS=4,ROWS=3,CELL_W=160,CELL_H=120,DURATION=30

const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'

const OX=(GW-COLS*CELL_W)/2,OY=(GH-ROWS*CELL_H)/2+10
const holes=[]
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)holes.push({x:OX+c*CELL_W+CELL_W/2,y:OY+r*CELL_H+CELL_H/2})

let user='',score=0,running=false,over=false,iv=null,timeLeft=DURATION
let moles=[],spawnTimer=0

function spawnMole(){
  const free=holes.filter((_,i)=>!moles.find(m=>m.idx===i))
  if(!free.length)return
  const h=free[Math.floor(Math.random()*free.length)]
  const idx=holes.indexOf(h)
  moles.push({idx,x:h.x,y:h.y,life:60+Math.random()*60,hit:false})
}

function update(){
  if(!running)return
  if(--spawnTimer<=0){spawnMole();spawnTimer=20+Math.random()*20}
  for(let i=moles.length-1;i>=0;i--){moles[i].life--;if(moles[i].life<=0)moles.splice(i,1)}
}

function draw(){
  ctx.clearRect(0,0,GW,GH)
  const sz=70
  for(const h of holes){ctx.fillStyle='#1a1d20';ctx.beginPath();ctx.ellipse(h.x,h.y,sz/2,sz/4,0,0,Math.PI*2);ctx.fill()}
  for(const m of moles){
    if(m.hit){ctx.save();ctx.globalAlpha=.3;ctx.drawImage(logoImg,m.x-sz/2,m.y-sz/2,sz,sz);ctx.restore()}
    else ctx.drawImage(logoImg,m.x-sz/2,m.y-sz/2,sz,sz)
  }
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,34)
  ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left';ctx.fillText('Click / Tap nos logos',8,GH-8)
  ctx.fillStyle=timeLeft<=10?'#e05050':'rgba(0,150,199,.8)';ctx.font='bold 20px Segoe UI';ctx.textAlign='right';ctx.fillText(timeLeft+'s',GW-10,28)
  if(over){
    ctx.fillStyle='rgba(17,19,22,.88)';ctx.fillRect(0,0,GW,GH)
    const sz2=130,ix=GW/2-sz2/2,iy=GH/2-110
    ctx.drawImage(charFrontImg,ix,iy,sz2,sz2)
    ctx.textAlign='center'
    ctx.fillStyle='#0096c7';ctx.font='bold 40px Segoe UI';ctx.fillText('TEMPO ESGOTADO',GW/2,iy+sz2+40)
    ctx.fillStyle='#e3e5e7';ctx.font='bold 18px Segoe UI';ctx.fillText('Score: '+score,GW/2,iy+sz2+70)
    ctx.fillStyle='#0096c7';ctx.font='bold 14px Segoe UI';ctx.fillText('↵  Pressionar Enter para Recomecar',GW/2,iy+sz2+100)
  }
}

function hitAt(cx,cy){
  const sz=35
  for(let i=moles.length-1;i>=0;i--){
    const m=moles[i]
    if(!m.hit&&Math.hypot(cx-m.x,cy-m.y)<sz){m.hit=true;score+=10;setTimeout(()=>moles.splice(moles.indexOf(m),1),100);return}
  }
}

function startGame(u){
  user=u;score=0;timeLeft=DURATION;running=true;over=false;moles=[];spawnTimer=20
  if(iv)clearInterval(iv)
  iv=setInterval(()=>{update();draw()},16)
  const cd=setInterval(()=>{if(!running){clearInterval(cd);return};if(--timeLeft<=0){running=false;over=true;clearInterval(cd);onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))}},1000)
  refreshLeaderboard(u)
}

function getCanvasPos(e,r){const t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)/r.width*GW,y:(t.clientY-r.top)/r.height*GH}}

canvas.addEventListener('click',e=>{if(!running)return;const r=canvas.getBoundingClientRect();hitAt(...Object.values(getCanvasPos(e,r)))})
canvas.addEventListener('touchstart',e=>{e.preventDefault();if(!running){if(user)startGame(user);return};const r=canvas.getBoundingClientRect();const p=getCanvasPos(e,r);hitAt(p.x,p.y)},{passive:false})
document.addEventListener('keydown',e=>{if(e.code==='Enter'&&!running&&user)startGame(user)})
initUsernameOverlay(startGame)
