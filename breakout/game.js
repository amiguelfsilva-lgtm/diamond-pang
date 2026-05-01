const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430
const COLS=10,ROWS=5,BRICKW=64,BRICKH=28,BRICKPADX=6,BRICKPADY=5
const BRICKOFFX=(GW-COLS*(BRICKW+BRICKPADX)+BRICKPADX)/2,BRICKOFFY=50
const PAD_W=100,PAD_H=14,BALL_R=8,PAD_SPEED=6

const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'

let user='',score=0,lives=3,running=false,over=false,won=false,iv=null
let bricks=[],ball={},pad={},keys={}

function makeBricks(){
  bricks=[]
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    bricks.push({x:BRICKOFFX+c*(BRICKW+BRICKPADX),y:BRICKOFFY+r*(BRICKH+BRICKPADY),alive:true,pts:(ROWS-r)*10})
  }
}

function resetBall(){
  pad={x:GW/2-PAD_W/2,y:GH-30,w:PAD_W,h:PAD_H}
  ball={x:GW/2,y:GH-50,vx:3*(Math.random()<.5?1:-1),vy:-4}
}

function update(){
  if(!running)return
  if(keys.ArrowLeft||keys.KeyA) pad.x=Math.max(0,pad.x-PAD_SPEED)
  if(keys.ArrowRight||keys.KeyD) pad.x=Math.min(GW-PAD_W,pad.x+PAD_SPEED)
  ball.x+=ball.vx; ball.y+=ball.vy
  if(ball.x-BALL_R<=0){ball.vx=Math.abs(ball.vx);ball.x=BALL_R}
  if(ball.x+BALL_R>=GW){ball.vx=-Math.abs(ball.vx);ball.x=GW-BALL_R}
  if(ball.y-BALL_R<=0){ball.vy=Math.abs(ball.vy);ball.y=BALL_R}
  if(ball.y+BALL_R>=pad.y&&ball.y+BALL_R<=pad.y+PAD_H&&ball.x>=pad.x&&ball.x<=pad.x+PAD_W){
    ball.vy=-Math.abs(ball.vy)
    ball.vx=((ball.x-(pad.x+PAD_W/2))/(PAD_W/2))*5
  }
  for(const b of bricks){
    if(!b.alive)continue
    if(ball.x+BALL_R>b.x&&ball.x-BALL_R<b.x+BRICKW&&ball.y+BALL_R>b.y&&ball.y-BALL_R<b.y+BRICKH){
      b.alive=false; score+=b.pts; ball.vy=-ball.vy; break
    }
  }
  if(ball.y>GH+20){
    lives--
    if(lives<=0){running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))}
    else resetBall()
  }
  if(bricks.every(b=>!b.alive)){running=false;won=true;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))}
}

function draw(){
  ctx.clearRect(0,0,GW,GH)
  for(const b of bricks){if(!b.alive)continue;ctx.save();ctx.globalAlpha=.85;ctx.drawImage(logoImg,b.x,b.y,BRICKW,BRICKH);ctx.restore()}
  ctx.fillStyle='#0096c7';ctx.fillRect(pad.x,pad.y,pad.w,pad.h)
  ctx.fillStyle='#e3e5e7';ctx.beginPath();ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2);ctx.fill()
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,34)
  for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#e05050':'#2a2d30';ctx.font='bold 22px Segoe UI';ctx.textAlign='right';ctx.fillText('♥',GW-8-(2-i)*26,30)}
  ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left';ctx.fillText('← → / A D  mover',8,GH-14)
  if(over){
    ctx.fillStyle='rgba(17,19,22,.88)';ctx.fillRect(0,0,GW,GH)
    const sz=130,ix=GW/2-sz/2,iy=GH/2-110
    ctx.drawImage(charFrontImg,ix,iy,sz,sz)
    ctx.textAlign='center'
    ctx.fillStyle=won?'#f5c518':'#e05050';ctx.font='bold 40px Segoe UI';ctx.fillText(won?'YOU WIN!':'GAME OVER',GW/2,iy+sz+40)
    ctx.fillStyle='#e3e5e7';ctx.font='bold 18px Segoe UI';ctx.fillText('Score: '+score,GW/2,iy+sz+70)
    ctx.fillStyle='#0096c7';ctx.font='bold 14px Segoe UI';ctx.fillText('↵  Pressionar Enter para Recomecar',GW/2,iy+sz+100)
  }
}

function startGame(u){
  user=u;score=0;lives=3;running=true;over=false;won=false
  makeBricks();resetBall()
  if(iv)clearInterval(iv);iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Enter'&&!running&&user)startGame(user)})
document.addEventListener('keyup',e=>{keys[e.code]=false})
canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();pad.x=Math.max(0,Math.min(GW-PAD_W,(e.touches[0].clientX-r.left)/r.width*GW-PAD_W/2))},{passive:false})
initUsernameOverlay(startGame)
