const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430,PIPE_W=60,GAP=130,BIRD_R=18,GRAV=0.4,FLAP=-8,PIPE_SPD=3

const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const charImg=new Image();charImg.src='../assets/char_pang.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'

let user='',score=0,running=false,over=false,iv=null
let bird={},pipes=[],nextPipe=0

function flap(){if(running)bird.vy=FLAP}

function update(){
  if(!running)return
  bird.vy+=GRAV;bird.y+=bird.vy
  if(bird.y-BIRD_R<=0){bird.y=BIRD_R;bird.vy=0}
  if(bird.y+BIRD_R>=GH){running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user));return}

  if(--nextPipe<=0){
    const topH=60+Math.random()*(GH-GAP-80)
    pipes.push({x:GW,topH,passed:false})
    nextPipe=100
  }

  for(let i=pipes.length-1;i>=0;i--){
    const p=pipes[i]; p.x-=PIPE_SPD
    if(p.x+PIPE_W<0){pipes.splice(i,1);continue}
    if(!p.passed&&p.x+PIPE_W<bird.x){p.passed=true;score++}
    const bx=bird.x,by=bird.y,r=BIRD_R
    if(bx+r>p.x&&bx-r<p.x+PIPE_W&&(by-r<p.topH||by+r>p.topH+GAP)){
      running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))
    }
  }
}

function draw(){
  ctx.clearRect(0,0,GW,GH)
  for(const p of pipes){
    ctx.fillStyle='#1e4d2b'
    ctx.fillRect(p.x,0,PIPE_W,p.topH)
    ctx.fillRect(p.x,p.topH+GAP,PIPE_W,GH-p.topH-GAP)
    // Logo decorations on pipes
    ctx.save();ctx.globalAlpha=.7
    ctx.drawImage(logoImg,p.x,p.topH-30,PIPE_W,30)
    ctx.drawImage(logoImg,p.x,p.topH+GAP,PIPE_W,30)
    ctx.restore()
  }
  ctx.save();ctx.translate(bird.x,bird.y);ctx.rotate(Math.min(Math.max(bird.vy*.05,-.4),.6))
  ctx.drawImage(charImg,-BIRD_R,-BIRD_R,BIRD_R*2,BIRD_R*2);ctx.restore()
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 30px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,36)
  ctx.fillStyle='rgba(130,140,150,.7)';ctx.font='bold 12px Segoe UI';ctx.textAlign='left';ctx.fillText('␣ / click / tap  flap',10,20)
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

function startGame(u){
  user=u;score=0;running=true;over=false
  bird={x:150,y:GH/2,vy:0};pipes=[];nextPipe=80
  if(iv)clearInterval(iv);iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();if(running)flap();else if(!running&&user)startGame(user)}
  if(e.code==='Enter'&&!running&&user)startGame(user)
})
canvas.addEventListener('click',()=>{if(running)flap();else if(user)startGame(user)})
canvas.addEventListener('touchstart',e=>{e.preventDefault();if(running)flap();else if(user)startGame(user)},{passive:false})

initUsernameOverlay(startGame)
