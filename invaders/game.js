const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d')
const GW=750,GH=430,COLS=11,ROWS=4,ENEMY_W=40,ENEMY_H=30,GAPX=18,GAPY=14
const SHIP_W=44,SHIP_H=40,BULLET_SPD=8,ENEMY_BULLET_SPD=4

const logoImg=new Image();logoImg.src='../assets/mainlogo.png'
const charImg=new Image();charImg.src='../assets/char_pang.png'
const charFrontImg=new Image();charFrontImg.src='../assets/char_front_pang.png'

let user='',score=0,lives=3,running=false,over=false,won=false,iv=null
let ship={},enemies=[],bullets=[],enemyBullets=[],keys={}
let enemyDir=1,enemyMoveTimer=0,enemyMoveInterval=50,shootTimer=0

function makeEnemies(){
  enemies=[]
  const startX=(GW-COLS*(ENEMY_W+GAPX)+GAPX)/2
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    enemies.push({x:startX+c*(ENEMY_W+GAPX),y:60+r*(ENEMY_H+GAPY),alive:true,pts:(ROWS-r)*10})
  }
}

function update(){
  if(!running)return
  if(keys.ArrowLeft||keys.KeyA) ship.x=Math.max(0,ship.x-5)
  if(keys.ArrowRight||keys.KeyD) ship.x=Math.min(GW-SHIP_W,ship.x+5)
  for(let i=bullets.length-1;i>=0;i--){
    bullets[i].y-=BULLET_SPD
    if(bullets[i].y<0){bullets.splice(i,1);continue}
    for(const e of enemies){
      if(!e.alive)continue
      if(bullets[i]&&bullets[i].x>e.x&&bullets[i].x<e.x+ENEMY_W&&bullets[i].y>e.y&&bullets[i].y<e.y+ENEMY_H){
        e.alive=false;score+=e.pts;bullets.splice(i,1);break
      }
    }
  }
  if(++enemyMoveTimer>=enemyMoveInterval){
    enemyMoveTimer=0
    const alive=enemies.filter(e=>e.alive)
    if(!alive.length){won=true;over=true;running=false;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user));return}
    const hitWall=alive.some(e=>(e.x+ENEMY_W+enemyDir*20>GW)||(e.x+enemyDir*20<0))
    if(hitWall){enemies.forEach(e=>{e.y+=20});enemyDir*=-1}
    else enemies.forEach(e=>{e.x+=enemyDir*20})
    enemyMoveInterval=Math.max(10,enemyMoveInterval-0.5)
    if(alive.some(e=>e.y+ENEMY_H>=ship.y)){running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))}
  }
  if(++shootTimer>=60){
    shootTimer=0
    const alive=enemies.filter(e=>e.alive)
    if(alive.length){const e=alive[Math.floor(Math.random()*alive.length)];enemyBullets.push({x:e.x+ENEMY_W/2,y:e.y+ENEMY_H})}
  }
  for(let i=enemyBullets.length-1;i>=0;i--){
    enemyBullets[i].y+=ENEMY_BULLET_SPD
    if(enemyBullets[i].y>GH){enemyBullets.splice(i,1);continue}
    const b=enemyBullets[i]
    if(b.x>ship.x&&b.x<ship.x+SHIP_W&&b.y>ship.y&&b.y<ship.y+SHIP_H){
      enemyBullets.splice(i,1);lives--
      if(lives<=0){running=false;over=true;onGameEnd(user,score).then(s=>s&&renderLeaderboard(s,user))}
    }
  }
}

function draw(){
  ctx.clearRect(0,0,GW,GH)
  for(const e of enemies){if(!e.alive)continue;ctx.save();ctx.globalAlpha=.85;ctx.drawImage(logoImg,e.x,e.y,ENEMY_W,ENEMY_H);ctx.restore()}
  ctx.drawImage(charImg,ship.x,ship.y,SHIP_W,SHIP_H)
  ctx.fillStyle='#0096c7';for(const b of bullets){ctx.fillRect(b.x-2,b.y,4,12)}
  ctx.fillStyle='#e05050';for(const b of enemyBullets){ctx.fillRect(b.x-2,b.y,4,10)}
  ctx.fillStyle='rgba(0,150,199,.95)';ctx.font='bold 28px Segoe UI';ctx.textAlign='center';ctx.fillText(score,GW/2,34)
  for(let i=0;i<3;i++){ctx.fillStyle=i<lives?'#e05050':'#2a2d30';ctx.font='bold 22px Segoe UI';ctx.textAlign='right';ctx.fillText('♥',GW-8-(2-i)*26,30)}
  ctx.fillStyle='rgba(100,110,120,.45)';ctx.font='11px Segoe UI';ctx.textAlign='left';ctx.fillText('← → / A D  mover    ␣ disparar',8,GH-8)
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
  ship={x:GW/2-SHIP_W/2,y:GH-SHIP_H-10}
  bullets=[];enemyBullets=[];enemyDir=1;enemyMoveTimer=0;enemyMoveInterval=50;shootTimer=0
  makeEnemies()
  if(iv)clearInterval(iv);iv=setInterval(()=>{update();draw()},16)
  refreshLeaderboard(u)
}

document.addEventListener('keydown',e=>{
  keys[e.code]=true
  if(e.code==='Space'&&running){e.preventDefault();if(bullets.length<3)bullets.push({x:ship.x+SHIP_W/2,y:ship.y})}
  if(e.code==='Enter'&&!running&&user)startGame(user)
})
document.addEventListener('keyup',e=>{keys[e.code]=false})

let touchSide=null
canvas.addEventListener('touchstart',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();touchSide=e.touches[0].clientX<r.left+r.width/2?'L':'R';if(running&&bullets.length<3)bullets.push({x:ship.x+SHIP_W/2,y:ship.y})},{passive:false})
canvas.addEventListener('touchend',e=>{e.preventDefault();touchSide=null;if(!running&&user)startGame(user)},{passive:false})
setInterval(()=>{if(touchSide==='L'&&running)ship.x=Math.max(0,ship.x-5);if(touchSide==='R'&&running)ship.x=Math.min(GW-SHIP_W,ship.x+5)},16)
initUsernameOverlay(startGame)
