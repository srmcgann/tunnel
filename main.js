function init() {

  stats = new Stats();
  document.body.appendChild( stats.dom );

  spritesheet = new Image();
  spritesheet.src = "assets/sprites.png";

  LUT = [];

  spritesheet.onload = function(){
    imageToRam(spritesheet, SPRITES);
    for(let i = 0; i < 30; ++i){
      LUT.push(ram.slice(SPRITES+WIDTH*i, SPRITES+WIDTH*i+64))
    }
    startup();
  }
}

function startup(){

  sprites = {
    lightmap: { x:0, y:0, width: 63, height: 32 },
    purpleBall: { x:64, y:0, width: 30, height: 30},
    laserCannon: { x:94, y:0, width: 29, height: 30},
    blockade: {x:123, y:0, width: 30, height: 30}
  }

  gameoverPal = [
    0,1,2,3,4,5,6,7,8,9,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17 ]

  t = 0;
  last = 0;

  // lateral facets in tube
  sides=16

  // length-wise segments in tube
  depth=35



  //center of screen
  w = WIDTH/2;
  h = HEIGHT/2;

  // a couple of constants
  v=Math.PI*2/sides;
  s=Math.PI*2/depth;

  //initial player position and key inputs
  OPZ=playerZ=5;
  playerTheta=0;
  spacekey=upkey=downkey=leftkey=rightkey=xkey=ckey=rkey=0
  shotTimer=0;
  shotInterval=10; // smaller is faster
  gameInPlay=1
  //amount of random bumps in tunnel sides
  bumpsAmount = 1;
  bumpVar=0
  squeeze=1
  score=0
  spokes=3
  lastSpokeScore=0;
  spokePowerup=50000;

  enemies = [];
  bullets = [];
  rings = [];
  splosions = [];
  gunsActive = Array(99).fill(1);
  bumps=[];

  // for(let i=0;i<depth;++i){
  //   for(let i = 0; i < bumpsAmount; i++){
  //     bumps.push({z:depth, theta:Math.random()*sides|0, b:Math.random()*.2-.4});
  //   }
  // }

  // E = {};
  // E.moveTo = moveTo;
  // E.lineTo = lineTo;

  //setup fiddle knobs
  panel= QuickSettings.create(10, 60, 'controls');

  panel
  .hideAllTitles()
  .setKey("h")
  //"name", lowerLimit, UpperLimit, defaultSetting, sliderIncrement
  .addButton("reset", reset)
  .addRange("speed", 0, 60, 49, .01)
  .addRange("horz wave", 0, 40, 2.5, .01)
  .addRange("vert wave", 0, 40, 7.13, .01)
  .addRange("spokeColor", 0, 63, 7, 1)
  //.addRange("Spokes", 1, 30, 3, 1)
  .addRange("FOV", 100, 1000, 380, .1)
  panel.hide()

  loop();
}


loop=(dt)=>{
  stats.begin();
  let now = new Date().getTime();
  dt = Math.min(1, (now - last) / 1000);
  t += dt;
  step(dt);
  draw(dt);
  render(dt);
  stats.end();
  requestAnimationFrame(loop);
}

step=(dt)=>{

  //hook up control panel vars
  speed = panel.getValue('speed');
  horz = panel.getValue('horz wave');
  vert = panel.getValue('vert wave');
  spokeColor = panel.getValue('spokeColor');
  FOV = panel.getValue('FOV');


  //check for reset
  if(rkey)reset();

  // continually spawn enemies
  if(t%40<1 && enemies.length<300)spawnEnemy();

  // continually spawn bumps
  if(t%60<1)spawnBump();

  // score-based spoke powerup
  if(score-lastSpokeScore > spokePowerup){
    spokes++;
    gunsActive[gunsActive.indexOf(0)] = 1;
    lastSpokeScore = score;
  }

  // f & g are offsets to recenter the mouth of the tunnel
  // they coincide with the formulas below and should not be changed independently
  f=(j=S(d=t/(1000/horz))/2)*8/FOV*300
  g=C(e=t/(1000/vert))*.5/FOV*300

  //player update
	if(leftkey)playerTheta+=.05
	if(rightkey)playerTheta-=.05
	playerZ+=(OPZ-playerZ)/50
  //squeeze the guns together when C is pressed
  if(ckey || upkey){
    squeeze = (squeeze - .05).clamp(.01, 1)
  }else{
    squeeze = (squeeze + .05).clamp(.01, 1)

  }


  enemies.sort(function(a,b){return b.z - a.z});
  enemies.forEach(function(e, eIndex, eArr){
    //move down the tunnel
    e.z-=.06;

    //check for collision with player
    if(e.z - playerZ < 0.2){
      for(let i = 0; i < spokes; ++i){
        if(gunsActive[i]){
          let p=playerTheta+(Math.PI*2/spokes*i)*squeeze
          while(p>Math.PI)p-=Math.PI*2
          while(p<-Math.PI)p+=Math.PI*2
          //check for squeeze to prevent killing all at once from sideways movement
          if(squeeze > .98 || squeeze < .02){
            if(Math.abs(e.theta - p) < 0.2 ){
              X=S(s*2*j*Z+d)*4/FOV*300-f,Y=C(s*3*j*Z+t/(1000/vert))*.5/FOV*300-g;
              X+=S(p = squeeze < .02 ? playerTheta : playerTheta+Math.PI*2/spokes*i*squeeze),Y+=C(p);
              spawnSplosion(X,Y,playerZ);
              eArr.splice(eIndex, 1);
              gunsActive[i]=0;
              //spokes -= 1;
              break;
            }
          }
        }
      }
    }
    //reset position to back of tunnel if behind view
    if(e.z < 1){
      e.z = depth;
      e.theta = Math.random() * (Math.PI*2) - Math.PI;
    }
  })//end enemy check

  //check for guns active, gameover if all gone
  gameInPlay = 0
  for(let i = 0; i < spokes; ++i){
    if(gunsActive[i]){
      gameInPlay = 1
    }
  }

//handle bump collision
  bumps.forEach(function(e, eIndex, eArr){
    //check for collision with player
    if(e.z - playerZ < 0.2){
      for(let i = 0; i < spokes; ++i){
        if(gunsActive[i]){
          let p=playerTheta+(Math.PI*2/spokes*i)*squeeze
          while(p>Math.PI)p-=Math.PI*2
          while(p<-Math.PI)p+=Math.PI*2
          //check for squeeze to prevent killing all at once from sideways movement
          if(squeeze > .98 || squeeze < .02){
            if(Math.abs(e.theta - p) < 0.5 ){
              X=S(s*2*j*Z+d)*4/FOV*300-f,Y=C(s*3*j*Z+t/(1000/vert))*.5/FOV*300-g;
              X+=S(p = squeeze < .02 ? playerTheta : playerTheta+Math.PI*2/spokes*i*squeeze),Y+=C(p);
              spawnSplosion(X,Y,playerZ);
              gunsActive[i]=0;
              //spokes -= 1;
              break;
            }
          }
        }
      }
    }
  })

  if(!gameInPlay){
    spawnSplosion(20-Math.random()*40,20-Math.random()*40,1+Math.random()*40)
  }

  // shoot guns
  if((spacekey || xkey) && shotTimer<t){
    shotTimer=t+shotInterval
    for(i=spokes;i--;){
      if(gunsActive[i]){
        bullets.push({
          z:playerZ,
          theta:playerTheta+(Math.PI*2/spokes*i)*squeeze
        });
      }
    }
  }

  //handle bullets
  for(let i=0;i<bullets.length;i++){

    if(bullets[i].z>18){ //bullets should die sooner
      bullets.splice(i,1)
    }
  }
  for(let i=0;i<bullets.length;i++){
    bullets[i].z+=.1
    // blow up enemies
    for(let m=0;m<enemies.length;++m){
      if(i<bullets.length){
        if(Math.abs(bullets[i].z-enemies[m].z)<.2){
          // put bullet thetas into sane range
          while(bullets[i].theta>Math.PI)bullets[i].theta-=Math.PI*2
          while(bullets[i].theta<-Math.PI)bullets[i].theta+=Math.PI*2
          if(Math.abs(bullets[i].theta-enemies[m].theta)<.2){
            Z = enemies[m].z;
            X=S(enemies[m].theta)+S(s*2*j*Z+d)*4/FOV*300-f
            Y=C(enemies[m].theta)+C(s*3*j*Z+e)*.5/FOV*300-g
            enemies[m].health-=1
            score+=50
            spawnSplosion(X,Y,Z,5)
            if(enemies[m].health < 1){
              spawnSplosion(X,Y,Z)
              enemies.splice(m,1)
              bullets.splice(i,1)
              score+=1000
            }
          }
        }
      }
    }
  }

  //handle splosions
  for(let i=0;i<splosions.length;++i){
    if(splosions[i].s<.05)splosions.splice(i,1)
  }
  for(let i=0;i<splosions.length;++i){
    splosions[i].x+=splosions[i].vx
    splosions[i].y+=splosions[i].vy//+=.003 //gravity pulls particles down like a firework
    splosions[i].z+=splosions[i].vz
    splosions[i].s-=.075 // particle size diminishes
  }

  //handleBumps
  adjust=0
  if(bumpVar>t/(1000/speed)*2%1)adjust=1
  bumpVar=t/(1000/speed)*2%1
  for(let i=0;i<bumps.length;i++)bumps[i].z-=adjust
  for(let i=0;i<bumps.length;i++){
    if(bumps[i].z<0)bumps.splice(i,1);
  }
}

draw=(dt)=>{

  clear(0);
  //tunnel draw routine
  for(m=depth;-1+m--;){
    for(i=sides;i--;){
      // q is the depth (Z) value and is also used to generate curvature of the tunnel
      q=m-t/(1000/speed)*2%1

      bump = 1
      for(let k=0;k<bumps.length;k++){
        if(m==bumps[k].z|0 && i==bumps[k].theta|0){
          bump=1-bumps[k].b
          //bump=1.5
        }
      }
      // O & P are the horizontal (X) curvature of the tunnel.
      // they are the same except for P has (q+1), which is needed to plot
      // length-wise line segments
      O=S(s*2*j*q+d)*4/FOV*300-f
      P=S(s*2*j*(q+1)+d)*4/FOV*300-f

      // Q & R are the vertical (Y) curvature. again they are the same except for (q+1)
      Q=C(s*3*j*q+e)*.5/FOV*300-g
      R=C(s*3*j*(q+1)+e)*.5/FOV*300-g

      // first point is a moveTo (L(1))
      X=S(p=v*i)*bump+O,Y=C(p)*bump+Q,Z=q;
      //modify the color by Z with LUT, first sprite in sheet
      lutcolor = (Z.map(2,13, 15,29)|0).clamp(15, 28);
      cursorColor = LUT[lutcolor][55];
      //cursorColor = LUT[lutcolor][55];
      moveTo3d(X,Y,Z);
      if(bump!=1)cursorColor = 5;
      X=S(p+=v)*bump+O,Y=C(p)*bump+Q,Z=q, lineTo3d(X,Y,Z);
      X=S(p)*bump+P,Y=C(p)*bump+R,Z=q+=1, lineTo3d(X,Y,Z);
      X=S(p-=v)*bump+P,Y=C(p)*bump+R,Z=q, lineTo3d(X,Y,Z);
      if(bump!=1){
        cursorColor = 5;
        X=S(p=v*i)*bump+O,Y=C(p)*bump+Q,Z=q-=1; lineTo3d(X,Y,Z);
        X=S(p)+O,Y=C(p)+Q,Z=q,                  lineTo3d(X,Y,Z);
        X=S(p+=v)*bump+O,Y=C(p)*bump+Q,Z=q,     moveTo3d(X,Y,Z);
        X=S(p)+O,Y=C(p)+Q,Z=q,                  lineTo3d(X,Y,Z);
        X=S(p)*bump+P,Y=C(p)*bump+R,Z=q+=1,     moveTo3d(X,Y,Z);
        X=S(p)+P,Y=C(p)+R,Z=q,                  lineTo3d(X,Y,Z);
        X=S(p-=v)*bump+P,Y=C(p)*bump+R,Z=q,     moveTo3d(X,Y,Z);
        X=S(p)+P,Y=C(p)+R,Z=q,                  lineTo3d(X,Y,Z);
        X=S(p+=v)+O,Y=C(p)+Q,Z=q-=1;            moveTo3d(X,Y,Z);
        X=S(p)+P,Y=C(p)+R,Z=q+=1;               lineTo3d(X,Y,Z);
      }
    }

    //draw splosions
    for(let i=splosions.length;i--;){
      Z=splosions[i].z
      if(m==(Z|0)){
        cursorColor = Math.round(splosions[i].s.map(0,1.6,0,9).clamp(0, 9))
        X=splosions[i].x
        Y=splosions[i].y
        fcir(X,Y,Z,splosions[i].s*5);
      }
    }

    //draw bullets
    cursorColor = 10;
    for(let i=bullets.length;i--;){
      Z=bullets[i].z
      if(m==(Z|0)){
        X=S(bullets[i].theta)+S(s*2*j*Z+d)*4/FOV*300-f
        Y=C(bullets[i].theta)+C(s*3*j*Z+e)*.5/FOV*300-g
        fcir(X,Y,Z,20);
      }
    }

    //enemy draw routine
    cursorColor = 4;
    for(let i = 0; i < enemies.length; i++){
      en = enemies[i];
      Z=en.z;
      if(m==(Z|0)){ //for proper drawing order ;)
          X=S(en.theta)*.8+S(s*2*j*Z+d)*4/FOV*300-f
          Y=C(en.theta)*.8+C(s*3*j*Z+e)*.5/FOV*300-g

        //  fcir(X,Y,Z,40);
          renderSource = SPRITES;
          rspr3d(X,Y,Z, sprites.purpleBall, 3, en.theta+Math.PI*2);
          }
    }
    //draw rings
    for(let i = 0; i < rings.length; i++){
      ri = rings[i];
      Z = ri.z;
      if(m==(Z|0)){
        X=S(en.theta)*.8+S(s*2*j*Z+d)*4/FOV*300-f
        Y=C(en.theta)*.8+C(s*3*j*Z+e)*.5/FOV*300-g
      }
    }

    //player draw routine
      if(gameInPlay){
      if(m==(playerZ|0)){
        cursorColor = spokeColor;
          //player position
        Z=playerZ
        X=S(playerTheta)+S(s*2*j*Z+d)*4/FOV*300-f
        Y=C(playerTheta)+C(s*3*j*Z+e)*.5/FOV*300-g
        p=playerTheta+Math.PI*2

        moveTo3d(X,Y,Z)
        for(let i = 0; i < spokes; ++i){
          if(gunsActive[i]){
            X=S(s*2*j*Z+d)*4/FOV*300-f,Y=C(s*3*j*Z+e)*.5/FOV*300-g,moveTo3d(X,Y,Z)
            X+=S( p = squeeze < .02 ? playerTheta : playerTheta+Math.PI*2/spokes*i*squeeze ),Y+=C(p), lineTo3d(X,Y,Z)
            rspr3d(X, Y, Z, sprites.laserCannon, 2, p)
          }
        }
      }
    }
  }
  if(!gameInPlay){
      bullets=[];
      pal = gameoverPal
      text([ 'GAME\nOVER', WIDTH/2, 60, 8, 15, 'center', 'top', 9, 4, ]);
    }
    text([ 'SCORE: ' + score.pad(10), WIDTH/2, 10, 2, 15, 'center', 'top', 1, 9, ]);
}//end draw()

//---------Spawners---------------------
spawnSplosion=(x,y,z,a=99)=>{
  for(let i=a;i--;){
    let splosionVelocity=Math.random()*.13
    let p1=Math.PI*2*Math.random()
    let p2=Math.PI*Math.random()
    let vx=S(p1)*S(p2)*splosionVelocity
    let vy=C(p1)*S(p2)*splosionVelocity
    let vz=C(p2)*splosionVelocity
    splosions.push({x,y,z,vx,vy,vz,s:2+Math.random()})
  }
}
spawnBump=()=>{
  for(let i = 0; i < bumpsAmount; i++){
    bumps.push({z:depth,theta:Math.random()*sides|0,b:.2+Math.random()*.2});
  }
}
spawnEnemy=()=>{
  enemies.push({
    z: depth,
    theta: Math.random() * (Math.PI*2) - Math.PI,
    size: 15,
    health: 1,//+score/3000
  })
}
//---------end Spawners---------------------

//projection helpers
x3d=(x,z)=>w+x/z*FOV
y3d=(y,z)=>h+y/z*FOV

lineTo3d=(x,y,z)=>{
  z=z>.1?z:.1
  lineTo( x3d(x,z), y3d(y,z) )
}
moveTo3d=(x,y,z)=>{
  z=z>.1?z:.1
  moveTo( x3d(x,z), y3d(y,z) )
}
//draw a circle projected to a 3d coordinate, scaled
cir=(x,y,z,r)=>{
  z=z>.1?z:.1
  circle( x3d(x,z), y3d(y,z), r/z, cursorColor )
}

//draw a filled circle to a 3D coordinate, scaled
fcir=(x,y,z,r)=>{
  z=z>.1?z:.1
  fillCircle( x3d(x,z), y3d(y,z), r/z, cursorColor)
}

spr3d=(x, y, z, sprite, scale=1)=>{
  z=z>.1?z:.1
  dstX = x3d(x,z)-sprite.width*scale/z/70;
  dstY = y3d(y,z)-sprite.height*scale/z/70;
  scaleZ = scale/Z*FOV/300;
  sspr(sprite.x, sprite.y, sprite.width, sprite.height, dstX, dstY, scaleZ, scaleZ);
}

rspr3d=(x, y, z, sprite, scale=1, theta)=>{
  z=z>.1?z:.1
  scaleZ = scale/z*FOV/300;
  rspr(sprite.x, sprite.y, sprite.width, sprite.height, x3d(x,z), y3d(y,z), scaleZ, theta);
}

pset3d=(x, y, z, color)=>{
  z=z>.1?z:.1
  pset( x3d(x,z), y3d(y,z), cursorColor )
}

reset=()=>{
  //console.log('reset')
  pal = palDefault
  spokes = 3
  gunsActive = Array(99).fill(1);
  gameInPlay=true
  enemies=[];
  bumps=[];
  score=0;
}

onkeydown=e=>{
	switch(e.which){
		case 32:spacekey=1;break;
		case 37:leftkey=1;break;
		case 38:upkey=1;break;
		case 39:rightkey=1;break;
		case 40:downkey=1;break;
		case 88:xkey=1;break;
		case 67:ckey=1;break;
    case 82:rkey=1;break;
	}
}

onkeyup=e=>{
	switch(e.which){
		case 32:spacekey=0;break;
		case 37:leftkey=0;break;
		case 38:upkey=0;break;
		case 39:rightkey=0;break;
		case 40:downkey=0;break;
		case 88:xkey=0;break;
		case 67:ckey=0;break;
    case 82:rkey=0;break;
	}
}

init();
