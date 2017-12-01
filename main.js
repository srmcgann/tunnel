function init() {

  stats = new Stats();
  document.body.appendChild( stats.dom );

  spritesheet = new Image();
  spritesheet.src = "assets/sprites.png";
  level=1;

  sprites = {
    lightmap: { x:0, y:0, width: 63, height: 32 },
    purpleBall: { x:64, y:0, width: 30, height: 30},
    laserCannon: { x:94, y:0, width: 29, height: 30},
    blockade: {x:123, y:0, width: 30, height: 30},
    star: {x:0, y:30, width: 65, height: 80}
  }

  gameoverPal = [
     0,1,2,3,4,5,6,7,8,9,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17 ]

  enemyPal = palDefault.slice();


  t = 0;
  last = 0;

  // lateral facets in tube
  sides=16

  // length-wise segments in tube
  depth=35


  LUT = [];

  //center of screen
  w = WIDTH/2;
  h = HEIGHT/2;

  // a couple of constants
  v=Math.PI*2/sides;
  s=Math.PI*2/depth;

  //initial player position and key inputs
  OPZ=playerZ=5;
  playerTheta=0;
  ctrlkey=spacekey=upkey=downkey=leftkey=rightkey=xkey=ckey=rkey=0
  shotTimer=0;
  //amount of random bumps in tunnel sides
  bumpsAmount = 1;
  bumpVar=0
  squeeze=1
  score=0
  lastSpokeScore=0;
  spokePowerup=50000;
  spokeGet = false;

  enemies = [];
  bullets = [];
  splosions = [];
  bumps=[];
  powerups=[];

  //setup fiddle knobs
  panel= QuickSettings.create(10, 60, 'controls');

  panel
  .hideAllTitles()
  .setKey("h")
  //"name", lowerLimit, UpperLimit, defaultSetting, sliderIncrement
  .addButton("reset", reset)
  .addRange("horz wave", 0, 40, 2.5, .01)
  .addRange("vert wave", 0, 40, 7.13, .01)
  .addRange("spokeColor", 0, 63, 7, 1)
  //.addRange("Spokes", 1, 30, 3, 1)
  .addRange("FOV", 100, 1000, 380, .1)
  panel.hide()

  sprites = {
    lightmap: { x:0, y:0, width: 63, height: 32 },
    purpleBall: { x:64, y:0, width: 30, height: 30},
    laserCannon: { x:94, y:0, width: 29, height: 30},
    blockade: {x:123, y:0, width: 30, height: 30},
    star: {x:0, y:30, width: 65, height: 80}
  }

  gameoverPal = [
     0,1,2,3,4,5,6,7,8,9,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17,17,17,17,17,17,17,
    17,17,17,17 ]

  enemyPal = palDefault.slice();


  t = 0;
  last = 0;

  // lateral facets in tube
  sides=16

  // length-wise segments in tube
  depth=35
  spritesheet.onload = function(){
    imageToRam(spritesheet, SPRITES);
    for(let i = 0; i < 30; ++i){
      LUT.push(ram.slice(SPRITES+WIDTH*i, SPRITES+WIDTH*i+64))
    }
    soundtrack=new Audio("cantelope.mp3");
    soundtrack.loop=1;
    soundtrack.volume=.6;
    soundtrack.play();
    startup();
    loop();
  }
}

function startup(){

  gunsActive = Array(99).fill(1);
  enemiesKilledThisLevel=0
  levelUpDisplayTimer=t+100;
  gameInPlay=1
  switch(level){
    case 1:
      speed=30;
      powerupSpawnFreq=700;
      targetKills=35
      bumpSpawnFreq=200
      ringSpawnFreq=1500
      enemySpawnFreq=30
      shotInterval=10
      spokes=3
      break;
    case 2:
      speed=35;
      powerupSpawnFreq=600;
      targetKills=40
      bumpSpawnFreq=170
      ringSpawnFreq=1200
      enemySpawnFreq=26
      shotInterval=9
      spokes=4
      break;
    case 3:
      speed=40;
      powerupSpawnFreq=500;
      targetKills=50
      bumpSpawnFreq=140
      ringSpawnFreq=1000
      enemySpawnFreq=23
      shotInterval=8
      spokes=5
      break;
    case 4:
      speed=45;
      powerupSpawnFreq=300;
      targetKills=60
      bumpSpawnFreq=120
      ringSpawnFreq=600
      enemySpawnFreq=18
      shotInterval=7
      spokes=6
      break;
    case 5:
      speed=45;
      powerupSpawnFreq=50;
      targetKills=100
      bumpSpawnFreq=100
      ringSpawnFreq=100
      enemySpawnFreq=1000
      shotInterval=6
      spokes=8
      break;
  }
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
  horz = panel.getValue('horz wave');
  vert = panel.getValue('vert wave');
  spokeColor = panel.getValue('spokeColor');
  FOV = panel.getValue('FOV');

  //rotate palette index for flashing powerups
  if(t%4<1)enemyPal[9] = 8 + t%7|0
  //rotate palette index for enemy outline, for higher health enemies
  if(t%2<1)enemyPal[3] = 3 + t%5|0


  //check for reset
  if(rkey)reset();
  //enemies=[];

  // continually spawn enemies
  if(t%enemySpawnFreq<1 && enemies.length<300)spawnEnemy();

  // continually spawn powerups
  if(t%powerupSpawnFreq<1 && powerups.length<3)spawnPowerup();

  // continually spawn bumps
  if(t%bumpSpawnFreq<1)spawnBump();
  if(t%ringSpawnFreq<1)spawnBump(16);

  // score-based spoke powerup
  // if(score-lastSpokeScore > spokePowerup){
  //   spawnSpoke();
  // }

  // f & g are offsets to recenter the mouth of the tunnel
  // they coincide with the formulas below and should not be changed independently
  f=(j=S(d=t/(1000/horz))/2)*6/FOV*300
  g=C(e=t/(1000/vert))*.5/FOV*300

  //player update
	if(leftkey)playerTheta+=.05
	if(rightkey)playerTheta-=.05
	playerZ+=(OPZ-playerZ)/50
  //squeeze the guns together when C  or up is pressed
  if(ckey || upkey){
    squeeze = (squeeze - .05).clamp(.01, 1)
  }else{
    squeeze = (squeeze + .05).clamp(.01, 1)
  }

  if(spokeGet > 0)spokeGet = (spokeGet - .05).clamp(0,1);


  enemies.sort(function(a,b){return b.z - a.z});
  enemies.forEach(function(e, eIndex, eArr){
    //move down the tunnel
    e.z-=speed/500;
    //e.theta+=.01;

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
              X=S(s*2*j*playerZ+d)*3/FOV*300-f,Y=C(s*3*j*playerZ+t/(1000/vert))*.5/FOV*300-g;
              X+=S(p = squeeze < .02 ? playerTheta : playerTheta+Math.PI*2/spokes*i*squeeze),Y+=C(p);
              spawnSplosion(X,Y,playerZ,150);
              eArr.splice(eIndex, 1);
              gunsActive[i]=0;
              spokes--;
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

  powerups.sort(function(a,b){return b.z - a.z});
  powerups.forEach(function(e, eIndex, eArr){
    //move down the tunnel
    e.z-=speed/500;
    //e.theta+=.01;

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
              X=S(s*2*j*playerZ+d)*3/FOV*300-f,Y=C(s*3*j*playerZ+t/(1000/vert))*.5/FOV*300-g;
              X+=S(p = squeeze < .02 ? playerTheta : playerTheta+Math.PI*2/spokes*i*squeeze),Y+=C(p);
              spawnSpoke();
              eArr.splice(eIndex, 1);
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
  })//end powerup check

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
    if(e.z == playerZ){
      for(let i = 0; i < spokes; ++i){
        if(gunsActive[i]){
          //check for squeeze to prevent killing all at once from sideways movement
          if(squeeze > .98 || squeeze < .02){
            p=(playerTheta+(Math.PI*2/spokes*i)*squeeze)
            while(p>Math.PI)p-=Math.PI*2
            while(p<-Math.PI)p+=Math.PI*2
            pmap = p.map(-Math.PI, Math.PI, 0, sides)|0
            //console.info('spokeTheta: '+pmap+' bumpTheta: '+ e.theta + ' difference: ' +(e.theta-pmap));
            if(Math.abs(e.theta-pmap) == sides/2){
              X=S(s*2*j*playerZ+d)*3/FOV*300-f,Y=C(s*3*j*playerZ+t/(1000/vert))*.5/FOV*300-g;
              X+=S(p = squeeze < .02 ? playerTheta : playerTheta+Math.PI*2/spokes*i*squeeze),Y+=C(p);
              spawnSplosion(X,Y,playerZ,150);
              gunsActive[i]=0;
              spokes--;
              break;
            }
          }
        }
      }
    }
  })

  if(gameInPlay){
    if (enemiesKilledThisLevel>=targetKills) levelUp()
  }else{
    spawnSplosion(5-Math.random()*10,5-Math.random()*10,1+Math.random()*40,98)
    if(spacekey){
      enemies = [];
      powerups=[];
      level=1 // comment this out to remain on current level after death
      startup()
    }
  }

  // shoot guns
  if((xkey || ctrlkey) && shotTimer<t && gameInPlay){
    sound=new Audio("pew.ogg");
    sound.volume=.1;
    sound.play();
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
            X=S(enemies[m].theta)+S(s*2*j*Z+d)*3/FOV*300-f
            Y=C(enemies[m].theta)+C(s*3*j*Z+e)*.5/FOV*300-g
            enemies[m].health-=1
            score+=50
            spawnSplosion(X,Y,Z,10)
            if(enemies[m].health < 1){
              spawnSplosion(X,Y,Z)
              enemiesKilledThisLevel++;
              enemies.splice(m,1)
              bullets.splice(i,1)
              score+=1000
            }
          }
        }
      }
    }

    //bullets vs bumps
    for(let m=0;m<bumps.length;++m){
      if(i<bullets.length){
        if(Math.abs(bullets[i].z-bumps[m].z)<.2){
          // put bullet thetas into sane range
          while(bullets[i].theta>Math.PI)bullets[i].theta-=Math.PI*2
          while(bullets[i].theta<-Math.PI)bullets[i].theta+=Math.PI*2
          bmap = bullets[i].theta.map(-Math.PI, Math.PI, 0, 16)|0
          if(Math.abs(bumps[m].theta - bmap) == 8){
            Z = bullets[i].z;
            X=S(bullets[i].theta)+S(s*2*j*Z+d)*3/FOV*300-f
            Y=C(bullets[i].theta)+C(s*3*j*Z+e)*.5/FOV*300-g
            spawnSplosion(X,Y,Z,10)
              bullets.splice(i,1)
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
  if(bumpVar>t/(1000/speed)*2%1)adjust=1 //
  bumpVar=t/(1000/speed)*2%1
  for(let i=0;i<bumps.length;i++)bumps[i].z-=adjust
  for(let i=0;i<bumps.length;i++){
    if(bumps[i].z<0)bumps.splice(i,1);
  }
}


levelUp=()=>{
  level++;
  levelUpDisplayTimer=t+100;
  startup()
}


draw=(dt)=>{

  clear(0);

  //fcir(-1,1,5,50,22);
  //fillCircle(50,50,10,22)
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
      O=S(s*2*j*q+d)*3/FOV*300-f
      P=S(s*2*j*(q+1)+d)*3/FOV*300-f

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
        tx=X,ty=Y,tz=Z
        X=S(p)+O,Y=C(p)+Q,Z=q,                  lineTo3d(X,Y,Z);
        tx1=X,ty1=Y,tz1=Z
        X=S(p+=v)*bump+O,Y=C(p)*bump+Q,Z=q,     moveTo3d(X,Y,Z);
        tx2=X,ty2=Y,tz2=Z
        X=S(p)+O,Y=C(p)+Q,Z=q,                  lineTo3d(X,Y,Z);
        tx3=X,ty3=Y,tz3=Z
        X=S(p)*bump+P,Y=C(p)*bump+R,Z=q+=1,     moveTo3d(X,Y,Z);
        tx4=X,ty4=Y,tz4=Z
        X=S(p)+P,Y=C(p)+R,Z=q,                  lineTo3d(X,Y,Z);
        tx5=X,ty5=Y,tz5=Z
        X=S(p-=v)*bump+P,Y=C(p)*bump+R,Z=q,     moveTo3d(X,Y,Z);
        tx6=X,ty6=Y,tz6=Z
        X=S(p)+P,Y=C(p)+R,Z=q,                  lineTo3d(X,Y,Z);
        tx7=X,ty7=Y,tz7=Z
        X=S(p+=v)+O,Y=C(p)+Q,Z=q-=1;            moveTo3d(X,Y,Z);
        tx8=X,ty8=Y,tz8=Z
        X=S(p)+P,Y=C(p)+R,Z=q+=1;               lineTo3d(X,Y,Z);
        tx9=X,ty9=Y,tz9=Z
        cursorColor=4
        tri3d(tx,ty,tz, tx1,ty1,tz1, tx2,ty2,tz2)
        tri3d(tx3,ty3,tz3, tx2,ty2,tz2, tx1,ty1,tz1)
      }
    }

    //draw splosions
    for(let i=splosions.length;i--;){
      Z=splosions[i].z
      if(m==(Z|0)){

        //black through red and yellow are colors 0-9.
        //we map the size of the particle S to a number that corresponds w the color
        cursorColor = Math.round(splosions[i].s.map(0,1.6,0,9).clamp(0, 9 ))
       // cursorColor = Math.round(splosions[i].s.map(0,1.6,16,21).clamp(16, 21 ))
        X=splosions[i].x
        Y=splosions[i].y
        fcir(X,Y,Z,splosions[i].s*5);
      }
    }

    //draw bullets
   // cursorColor = 22;
    for(let i=bullets.length;i--;){
      Z=bullets[i].z
      if(m==(Z|0)){


        let r = 20
        let z = Z-.6
        z+=.1
        X=S(bullets[i].theta)+S(s*2*j*z+d)*3/FOV*300-f
        Y=C(bullets[i].theta)+C(s*3*j*z+e)*.5/FOV*300-g
        fcir(X,Y,z,r,18);
         z+=.1
        X=S(bullets[i].theta)+S(s*2*j*z+d)*3/FOV*300-f
        Y=C(bullets[i].theta)+C(s*3*j*z+e)*.5/FOV*300-g
        fcir(X,Y,z,r,19);
         z+=.1
        X=S(bullets[i].theta)+S(s*2*j*z+d)*3/FOV*300-f
        Y=C(bullets[i].theta)+C(s*3*j*z+e)*.5/FOV*300-g
        fcir(X,Y,z,r,20);
         z+=.1
        X=S(bullets[i].theta)+S(s*2*j*z+d)*3/FOV*300-f
        Y=C(bullets[i].theta)+C(s*3*j*z+e)*.5/FOV*300-g
        fcir(X,Y,z,r,21);
         z+=.1
        X=S(bullets[i].theta)+S(s*2*j*z+d)*3/FOV*300-f
        Y=C(bullets[i].theta)+C(s*3*j*z+e)*.5/FOV*300-g
        fcir(X,Y,z,r, 22);

      }
    }

    //enemy draw routine
    cursorColor = 4;
    for(let i = 0; i < enemies.length; i++){
      en = enemies[i];
      Z=en.z;
      if(m==(Z|0)){ //for proper drawing order ;)
        X=S(en.theta)*.8+S(s*2*j*Z+d)*3/FOV*300-f
        Y=C(en.theta)*.8+C(s*3*j*Z+e)*.5/FOV*300-g

        //  fcir(X,Y,Z,40);
        renderSource = SPRITES;
        if(en.health > 1){
          rspr3d(X,Y,Z, sprites.purpleBall, 3, en.theta+Math.PI*2, gameInPlay? enemyPal : gameoverPal );
        }else {
          rspr3d(X,Y,Z, sprites.purpleBall, 3, en.theta+Math.PI*2);
        }
      }
    }
    pal = palDefault;


    //powerup draw routine
    for(let i = 0; i < powerups.length; i++){
      en = powerups[i];
      Z=en.z;
      if(m==(Z|0)){ //for proper drawing order ;)
        X=S(en.theta)*.8+S(s*2*j*Z+d)*3/FOV*300-f
        Y=C(en.theta)*.8+C(s*3*j*Z+e)*.5/FOV*300-g

        //  fcir(X,Y,Z,40);
        renderSource = SPRITES;
        rspr3d(X,Y,Z, sprites.star, 3, en.theta+Math.PI*2, gameInPlay? enemyPal : gameoverPal );
      }
    }
    pal = palDefault;


    //player draw routine
      if(gameInPlay){
      if(m==(playerZ|0)){
          //player position
        Z=playerZ
        X=S(playerTheta)+S(s*2*j*Z+d)*3/FOV*300-f
        Y=C(playerTheta)+C(s*3*j*Z+e)*.5/FOV*300-g
        p=playerTheta+Math.PI*2

        moveTo3d(X,Y,Z)
        for(let i = 0; i < spokes; ++i){
          if(gunsActive[i]){
            cursorColor = i?spokeColor:12;
            X=S(s*2*j*Z+d)*3/FOV*300-f,Y=C(s*3*j*Z+e)*.5/FOV*300-g,moveTo3d(X,Y,Z)
            X+=S( p = squeeze < .02 ? playerTheta : playerTheta+Math.PI*2/(spokes-spokeGet)*i*squeeze ),Y+=C(p), lineTo3d(X,Y,Z)
            rspr3d(X, Y, Z, sprites.laserCannon, 2, p)
          }
        }
      }
    }
  }
  if(!gameInPlay){
      bullets=[];
      pal = gameoverPal
      renderTarget = BUFFER;
      text([ 'GAME\nOVER', WIDTH/2, 60, 8, 15, 'center', 'top', 9, 1, ]);
      text([ 'HIT THE SPACEBAR: ', WIDTH/2+20, HEIGHT/2+80, 8, 15, 'center', 'top', 3, 1+t/9%10, ]);
      outline(BUFFER, SCREEN, 6,9,6,3);
      renderTarget = SCREEN;
      renderSource = BUFFER;
      spr();
  }
  text([ 'SCORE: ' + score.pad(10), WIDTH/2+50, 10, 2, 15, 'center', 'top', 1, 9, ]);
  text([ 'LEVEL: ' + level, WIDTH/2-100, 10, 2, 15, 'center', 'top', 1, 9, ]);

  if(t<=levelUpDisplayTimer){
    text([ 'LEVEL: ' + level, WIDTH/2, HEIGHT/2-40, 8, 15, 'center', 'top', 6, 12, ]);
  }
}//end draw()

//---------Spawners---------------------
spawnSplosion=(x,y,z,a=99)=>{

  if(a==99){ // enemy died
    sound=new Audio("splode.ogg");
    sound.volume=.5/(1+z/8);
    sound.play();
  }
  if(a==150){ // player lost gun
    sound=new Audio("splode.ogg");
    sound.volume=.2;
    sound.play();
    sound=new Audio(`metal${1+Math.random()*5|0}.ogg`);
    sound.volume=.175;
    sound.play();
  }
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
spawnBump=(a=1)=>{
  for(let i = 0; i < a; i++){
    bumps.push({z:depth,theta:Math.random()*sides|0,b:.2+Math.random()*.2});
    //bumps.push({z:depth, theta:15, b:.2+Math.random()*.2});
  }
}
spawnEnemy=()=>{
  enemies.push({
    z: depth,
    theta: Math.random() * (Math.PI*2) - Math.PI,
    size: 15,
    health: Math.random()>.5 ? 1 : 2,//+score/3000
  })
}
spawnPowerup=()=>{
  powerups.push({
    z: depth,
    theta: Math.random() * (Math.PI*2) - Math.PI,
    size: 15
  })
}
spawnSpoke=()=>{
  sound=new Audio("powerup.ogg");
  sound.volume=.75;
  sound.play()
  spokes+=gunsActive.indexOf(0)<spokes&&gunsActive.indexOf(0)!=-1?0:1;
  gunsActive[gunsActive.indexOf(0)] = 1;
  lastSpokeScore = score;
  spokeGet = 1;
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
fcir=(x,y,z,r, color=cursorColor)=>{
  r=r<500?r:500
  z=z>.1?z:.1
  fillCircle( x3d(x,z), y3d(y,z), r/z, color)
}

spr3d=(x, y, z, sprite, scale=1)=>{
  z=z>.1?z:.1
  dstX = x3d(x,z)-sprite.width*scale/z/70;
  dstY = y3d(y,z)-sprite.height*scale/z/70;
  scaleZ = scale/Z*FOV/300;
  sspr(sprite.x, sprite.y, sprite.width, sprite.height, dstX, dstY, scaleZ, scaleZ);
}

rspr3d=(x, y, z, sprite, scale=1, theta, palette=pal)=>{
  z=z>.1?z:.1
  scaleZ = scale/z*FOV/300;
  rspr(sprite.x, sprite.y, sprite.width, sprite.height, x3d(x,z), y3d(y,z), scaleZ, theta, palette);
}

pset3d=(x, y, z, color=cursorColor)=>{
  z=z>.1?z:.1
  pset( x3d(x,z), y3d(y,z), color )
}

tri3d=(x, y, z, x1, y1, z1, x2, y2, z2)=>{
z=z>.1?z:.1
  fillTriangle( x3d(x,z), y3d(y,z), x3d(x1,z1), y3d(y1,z1), x3d(x2,z2), y3d(y2,z2) )
}


reset=()=>{
  //console.log('reset')
  pal = palDefault
  spokes = 3
  gunsActive = Array(99).fill(1);
  playerTheta = 0;
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
    case 17:ctrlkey=1;break;
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
    case 17:ctrlkey=0;break;
	}
}

init();
