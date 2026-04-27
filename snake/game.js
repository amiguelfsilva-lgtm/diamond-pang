const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430,CELL=25,COLS=Math.floor(GW/CELL),ROWS=Math.floor(GH/CELL),SPD=120

const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const charImg=new Image();charImg.src='../assets/char_pang.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'

let user='',score=0,running=false,over=false,iv=null
let snake=[],dir={x:1,y:0},nextDir={x:1,y:0},food={},lastMove=0

function rnd(max){return Math.floor(Math.random()*max)}
function placeFood(){
  do{food={x:rnd(COLS),y:rnd(ROWS)}}while(snake.some(s=>s.x===food.x&&s.y===food.y))
}

function update(ts){
  if(!running)return
  if(ts-lastMove<SPD)return
  lastMove=ts
  dir={...nextDir}
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y}
  if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)){
    running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user));return
  }
  snake.unshift(head)
  if(head.x===food.x&&head.y===food.y){score+=10;placeFood()}
  else snake.pop()
}

function draw(){
  ctx.clearRect(0,0,GW,GH)
  ctx.drawImage(logoImg,food.x*CELL,food.y*CELL,CELL,CELL)
  snake.forEach((s,i)=>{
    if(i===0){ctx.drawImage(charImg,s.x*CELL,s.y*CELL,CELL,CELL)}
    else{ctx.fillStyle=`rgba(0,150,199,${1-.4*(i/snake.length)})`;ctx.fillRect(s.x*CELL+2,s.y*CELL+2,CELL-4,CELL-4)}
  })
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,34)
  ctx.fillStyle='rgba(130,140,150,.7)';ctx.font='bold 12px Segoe UI';ctx.textAlign='left';ctx.fillText('← ↑ → ↓ / WASD  mover',10,20)
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

function loop(ts){if(running||over){update(ts);draw()}; requestAnimationFrame(loop)}

function startGame(u){
  user=u;score=0;running=true;over=false
  snake=[{x:Math.floor(COLS/2),y:Math.floor(ROWS/2)}]
  dir={x:1,y:0};nextDir={x:1,y:0};lastMove=0
  placeFood();refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  const m={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},
           KeyA:{x:-1,y:0},KeyD:{x:1,y:0},KeyW:{x:0,y:-1},KeyS:{x:0,y:1}}
  if(m[e.code]&&running){const nd=m[e.code];if(nd.x!=-dir.x||nd.y!=-dir.y)nextDir=nd;e.preventDefault()}
  if(e.code==='Enter'&&!running&&user)startGame(user)
})

// Swipe touch
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
