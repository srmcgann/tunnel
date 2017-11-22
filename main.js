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
    loop();
    //console.log('sprites loaded -master branch');
  }

  sprites = {
    lightmap: { x:0, y:0, width: 63, height: 32 },
    purpleBall: { x:64, y:0, width: 30, height: 30},
    laserCannon: { x:94, y:0, width: 31, height: 31}
  }

  gameoverPal = [
    0,1,2,3,4,5,6,7,8,9,
    2,2,2,2,2,2,2,2,2,2,
    2,2,2,2,2,2,2,2,2,2,
    2,2,2,2,2,2,2,2,2,2,
    2,2,2,2,2,2,2,2,2,2,
    2,2,2,2,2,2,2,2,2,2,
    2,2,2,2 ]

  t = 0;
  last = 0;
  hit = false;

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
  OPZ=playerZ=2;
  playerTheta=0;
  spacekey=upkey=downkey=leftkey=rightkey=0
  shotTimer=0;
  shotInterval=10; // smaller is faster
  gameInPlay=1

  //initial enemy? position -some random entities traveling the opposite direction
  enemies = [];
  spawnEnemy=()=>{
    enemies.push({
      z: depth,
      theta: Math.random() * (Math.PI*2) - Math.PI,
      size: 15
    })
  }

  bullets = [];
  splosions = [];
  gunsActive = Array(99).fill(1);

  E = {};
  E.moveTo = moveTo;
  E.lineTo = lineTo;

  //setup fiddle knobs
  panel= QuickSettings.create(10, 60, 'controls');

  panel
  //.addHTML('stats', stats.dom)
  //"name", lowerLimit, UpperLimit, defaultSetting, sliderIncrement
  .addRange("speed", 0, 40, 29, .01)
  .addRange("horz wave", 0, 40, 2.5, .01)
  .addRange("vert wave", 0, 40, 7.13, .01)
  .addRange("splosionColor", 0, 63, 9, 1)
  .addRange("spokeColor", 0, 63, 7, 1)
  .addRange("Spokes", 1, 9, 3, 1)
  .addRange("bump Z", 1, depth, 4, 1)
  .addRange("bump Theta", 1, sides, 15, 1)

  loop();
}

function spawnSplosion(X,Y,Z){
  for(let i=99;i--;){
    let splosionVelocity=Math.random()*.13
    let p1=Math.PI*2*Math.random()
    let p2=Math.PI*Math.random()
    let VX=S(p1)*S(p2)*splosionVelocity
    let VY=C(p1)*S(p2)*splosionVelocity
    let VZ=C(p2)*splosionVelocity
    splosions.push({X,Y,Z,VX,VY,VZ,S:2+Math.random()})
  }
}

function loop(dt){

  stats.begin();

  //variable timestep game timer
  let now = new Date().getTime();
  dt = Math.min(1, (now - last) / 1000);
  t += dt;


  //good practice to update logic separately from drawing. not good golf, but easier to read!
  //indeed :)

  //update logic
  step(dt);

  //update drawing to retrobuffer
  draw(dt);

  //this puts the indexed-color pixel buffer stored
  //in ram[0...screensize] on the canvas.
  render(dt);

  stats.end();
  requestAnimationFrame(loop);
}

function step(dt){

  //hook up control panel vars
  speed = panel.getValue('speed');
  horz = panel.getValue('horz wave');
  vert = panel.getValue('vert wave');
  spokeColor = panel.getValue('spokeColor');
  splosionColor = panel.getValue('splosionColor');
  spokes = panel.getValue('Spokes');
  bumpZ = panel.getValue('bump Z');
  bumpTheta = panel.getValue('bump Theta');


  // continually spawn enemies
  if(t%20<1 && enemies.length<300)spawnEnemy();

  // f & g are offsets to recenter the mouth of the tunnel
  // they coincide with the formulas below and should not be changed independently
  f=(j=S(d=t/(1000/horz))/2)*8
  g=C(e=t/(1000/vert))*.5


  //changed player dynamics... -Scott

  //player update
	if(leftkey)playerTheta+=.05
	if(rightkey)playerTheta-=.05
	if(playerZ>depth/2)playerZ=depth/2
	if(playerZ<1)playerZ=1
	if(upkey)playerZ+=.35
	if(downkey)playerZ-=.15
	playerZ+=(OPZ-playerZ)/50


  enemies.sort(function(a,b){return b.z - a.z});
  enemies.forEach(function(e){
    //move down the tunnel
    e.z-=.08;

    //check for collision with player
    if(e.z - playerZ < 0.2){
      gameInPlay=0
      for(let i = 0; i <= spokes; ++i){
        if(gunsActive[i]){
          gameInPlay=1
          let p=playerTheta+Math.PI*2/spokes*i
          while(p>Math.PI)p-=Math.PI*2
          while(p<-Math.PI)p+=Math.PI*2
          if(Math.abs(e.theta - p) < 0.2 ){
            X=S(s*2*j*Z+d)*4-f,Y=C(s*3*j*Z+t/(1000/vert))*.5-g
            //console.log(e)
            X+=S(p=playerTheta+Math.PI*2/spokes*i),Y+=C(p)
            spawnSplosion(X,Y,playerZ)
            gunsActive[i]=0
          }
        }
      }
    }

    //reset position to back of tunnel if behind view
    if(e.z < 1){
      e.z = depth;
      e.theta = Math.random() * (Math.PI*2) - Math.PI;
    }
  })

  if(!gameInPlay){
    spawnSplosion(20-Math.random()*40,20-Math.random()*40,Math.random()*40)

  }

  // shoot guns
  if(spacekey && shotTimer<t){
    shotTimer=t+shotInterval
    for(i=spokes;i--;){
      if(gunsActive[i]){
        bullets.push({
          Z:playerZ,
          theta:playerTheta+Math.PI*2/spokes*i
        });
      }
    }
  }

  //handle bullets
  for(let i=0;i<bullets.length;i++){
    bullets[i].Z+=.1
    if(bullets[i].Z>depth){
      // cull bullets when they travel to the end of the tunnel
      bullets.splice(i,1)
    }else{
      // blow up enemies
      for(let m=0;m<enemies.length;++m){
        if(i<bullets.length){
          if(Math.abs(bullets[i].Z-enemies[m].z)<.2){
            // put bullet thetas into sane range
            while(bullets[i].theta>Math.PI)bullets[i].theta-=Math.PI*2
            while(bullets[i].theta<-Math.PI)bullets[i].theta+=Math.PI*2
            if(Math.abs(bullets[i].theta-enemies[m].theta)<.2){
              X=S(bullets[i].theta)+S(s*2*j*Z+d)*4-f
              Y=C(bullets[i].theta)+C(s*3*j*Z+e)*.5-g
              spawnSplosion(X,Y,bullets[i].Z)
              enemies.splice(m,1)
              bullets.splice(i,1)
            }
          }
        }
      }
    }
  }

  //handle splosions
  for(let i=0;i<splosions.length;++i){
    splosions[i].X+=splosions[i].VX
    splosions[i].Y+=splosions[i].VY+=.003 //gravity pulls particles down like a firework
    splosions[i].Z+=splosions[i].VZ
    splosions[i].S-=.075 // particle size diminishes
    if(splosions[i].S<.05)splosions.splice(i,1)
  }
}

function draw(dt){

  clear(0);

  // reduced intensity of vertical waves -Scott

  //tunnel draw routine
  for(m=depth;m--;){
    for(i=sides;i--;){


      // q is the depth (Z) value and is also used to generate curvature of the tunnel
      q=m-t/(1000/speed)*2%1

      bump = (m==bumpZ && i==bumpTheta) ? .1:0



      // O & P are the horizontal (X) curvature of the tunnel.
      // they are the same except for P has (q+1), which is needed to plot
      // length-wise line segments
      O=S(s*2*j*q+d)*4-f
      P=S(s*2*j*(q+1)+d)*4-f

      // Q & R are the vertical (Y) curvature. again they are the same except for (q+1)
      Q=C(s*3*j*q+e)*.5-g-bump
      R=C(s*3*j*(q+1)+e)*.5-g-bump

      // first point is a moveTo (L(1))
      X=S(p=v*i)+O,Y=C(p)+Q,Z=q;

      //modify the color by Z with LUT, first sprite in sheet
      lutcolor = (Z.map(2,13, 15,29)|0).clamp(15, 28);
      cursorColor = LUT[lutcolor][55];
      L(1);

      // second point is a lineTo the next lateral vertex in the ring
      X=S(p+=v)+O,Y=C(p)+Q,Z=q,L()

      // third point is a length-wise lineTo the next ring
      X=S(p)+P,Y=C(p)+R,Z=q+=1,L()

      // fourth and last point is a lineTo the previous point on the next ring (completing a quad)
      X=S(p-=v)+P,Y=C(p)+R,Z=q,L()

    }


    //draw splosions

    for(let i=splosions.length;i--;){
      Z=splosions[i].Z
      if(m==(Z|0)){
        cursorColor = Math.round(splosions[i].S.map(0,1.6,0,9).clamp(0, 9))
        X=splosions[i].X
        Y=splosions[i].Y
        fcir(splosions[i].S*5);
      }
    }

    //draw bullets
    cursorColor = 10;
    for(let i=bullets.length;i--;){
      Z=bullets[i].Z
      if(m==(Z|0)){
        X=S(bullets[i].theta)+S(s*2*j*Z+d)*4-f
        Y=C(bullets[i].theta)+C(s*3*j*Z+e)*.5-g
        fcir(10);
      }
    }

    //enemy draw routine
    cursorColor = 4;
    for(let ec = 0; ec < enemies.length; ec++){
      en = enemies[ec];
      Z=en.z;
      if(m==(Z|0)){ //for proper drawing order ;)
          X=S(en.theta)*.8+S(s*2*j*Z+d)*4-f
          Y=C(en.theta)*.8+C(s*3*j*Z+e)*.5-g

          //fcir(en.size);
          renderSource = SPRITES;
          spr3d(sprites.purpleBall, 70);
      }
    }


    //player draw routine
    if(m==(playerZ|0)){ //for the draw order! I get it now -Ryan
      cursorColor = spokeColor;
        //player position
      Z=playerZ
      X=S(playerTheta)+S(s*2*j*Z+d)*4-f
      Y=C(playerTheta)+C(s*3*j*Z+e)*.5-g
        L(1) //moveto
      for(let i = 0; i <= spokes; ++i){
        if(gunsActive[i]){
          X=S(s*2*j*Z+d)*4-f,Y=C(s*3*j*Z+e)*.5-g,L(1)
          X+=S(p=playerTheta+Math.PI*2/spokes*i),Y+=C(p),L()
          rspr3d(sprites.laserCannon, 1.5, p)
        }
      }
    }
  }
  if(!gameInPlay){
pal = gameoverPal
    text([
      'GAME\nOVER',
      WIDTH/2,
      80,
      8,
      15,
      'center',
      'top',
      5,
      4,
    ]);
  }
}//end draw()

// function to move to or draw a line to a 3D-projected coordinate
// relies on pre-set values for globals X, Y, and Z
L=q=>{
    z=Z>.1?Z:.1;
    E[q?"moveTo":"lineTo"](w+X/z*w,h+Y/z*w)

}
//draw a circle projected to a 3d coordinate, scaled
cir=q=>{
    z=Z>.1?Z:.1;
    //using passed in value for diameter, otherwise defaults to 16
    circle( w+X/z*w, h+Y/z*w, (q?q:16)/z, cursorColor)
}

//draw a filled circle to a 3D coordinate, scaled
fcir=q=>{
    z=Z>.1?Z:.1;
    //using passed in value for diameter, otherwise defaults to 16
    fillCircle( w+X/z*w, h+Y/z*w, (q?q:16)/z, cursorColor)
}

function spr3d(sprite, scale=1){
  //z=Z>.1?Z:.1;
  z=Z
  dstX = (w+X/z*w)-sprite.width*scale/z/70;
  dstY = (h+Y/z*w)-sprite.height*scale/z/70;
  scaleZ = scale/z;

  //sspr(sx = 0, sy = 0, sw = 16, sh = 16, x=0, y=0, dw=16, dh=16){
  //spr(sprite.x, sprite.y, sprite.width, sprite.height, w+X/z*w, h+Y/z*w )
  sspr(sprite.x, sprite.y, sprite.width, sprite.height, dstX, dstY, scaleZ, scaleZ);

}

function rspr3d(sprite, scale=1, theta){
  z=Z>.1?Z:.1;
  dstX = (w+X/z*w);
  dstY = (h+Y/z*w);
  scaleZ = scale/z;
  rspr(sprite.x, sprite.y, sprite.width, sprite.height, dstX, dstY, scaleZ, theta);
}

pset3d=q=>{
    z=Z>.1?Z:.1;
    pset( w+X/z*w, h+Y/z*w, cursorColor )
}

onkeydown=e=>{
	switch(e.which){
		case 32:spacekey=1;break;
		case 37:leftkey=1;break;
		case 38:upkey=1;break;
		case 39:rightkey=1;break;
		case 40:downkey=1;break;
	}
}
onkeyup=e=>{
	switch(e.which){
		case 32:spacekey=0;break;
		case 37:leftkey=0;break;
		case 38:upkey=0;break;
		case 39:rightkey=0;break;
		case 40:downkey=0;break;
	}
}

init();
