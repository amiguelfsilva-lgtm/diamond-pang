const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430,CELL=25,COLS=Math.floor(GW/CELL),ROWS=Math.floor(GH/CELL),SPD=110

const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const charImg=new Image();charImg.src='../assets/char_pang.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'

let user='',score=0,running=false,over=false
let snake=[],prevSnake=[],dir={x:1,y:0},nextDir={x:1,y:0},food={}
let lastMove=0,moveProgress=0

function rnd(max){return Math.floor(Math.random()*max)}
function placeFood(){
  do{food={x:rnd(COLS),y:rnd(ROWS)}}while(snake.some(s=>s.x===food.x&&s.y===food.y))
}

function moveSnake(ts) {
  if(ts-lastMove < SPD) return
  prevSnake = snake.map(s=>({...s}))
  lastMove = ts
  moveProgress = 0
  dir = {...nextDir}
  const head={x:snake[0].x+dir.x, y:snake[0].y+dir.y}
  if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)){
    running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user));return
  }
  snake.unshift(head)
  if(head.x===food.x&&head.y===food.y){score+=10;placeFood()}
  else snake.pop()
}

function update(ts){
  if(!running)return
  moveProgress = Math.min(1,(ts-lastMove)/SPD)
  moveSnake(ts)
}

function draw(){
  ctx.clearRect(0,0,GW,GH)
  ctx.drawImage(logoImg,food.x*CELL,food.y*CELL,CELL,CELL)

  const t = moveProgress
  snake.forEach((s,i)=>{
    const prev = prevSnake[i] || s
    const px = (prev.x + (s.x-prev.x)*t)*CELL
    const py = (prev.y + (s.y-prev.y)*t)*CELL
    ctx.save()
    ctx.globalAlpha = i===0 ? 1 : Math.max(0.25, 1-(i/snake.length)*0.7)
    ctx.drawImage(i===0 ? charImg : logoImg, px, py, CELL, CELL)
    ctx.restore()
  })

  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,34)
  ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left';ctx.fillText('← ↑ → ↓ / WASD  mover',8,GH-14)
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

function loop(ts){update(ts);draw();requestAnimationFrame(loop)}

function startGame(u){
  user=u;score=0;running=true;over=false
  snake=[{x:Math.floor(COLS/2),y:Math.floor(ROWS/2)}]
  prevSnake=[...snake];dir={x:1,y:0};nextDir={x:1,y:0};lastMove=performance.now();moveProgress=0
  placeFood();refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  const m={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},
           KeyA:{x:-1,y:0},KeyD:{x:1,y:0},KeyW:{x:0,y:-1},KeyS:{x:0,y:1}}
  if(m[e.code]&&running){const nd=m[e.code];if(nd.x!=-dir.x||nd.y!=-dir.y)nextDir=nd;e.preventDefault()}
  if(e.code==='Enter'&&!running&&user)startGame(user)
})

let tx0=null,ty0=null
canvas.addEventListener('touchstart',e=>{e.preventDefault();tx0=e.touches[0].clientX;ty0=e.touches[0].clientY},{passive:false})
canvas.addEventListener('touchend',e=>{
  e.preventDefault()
  if(!running&&user){startGame(user);return}
  const dx=e.changedTouches[0].clientX-tx0,dy=e.changedTouches[0].clientY-ty0
  if(Math.abs(dx)>Math.abs(dy)){nextDir=dx>0?{x:1,y:0}:{x:-1,y:0}}
  else{nextDir=dy>0?{x:0,y:1}:{x:0,y:-1}}
},{passive:false})

requestAnimationFrame(loop)
initUsernameOverlay(startGame)
