function init() {

    stats = new Stats();
    document.body.appendChild( stats.dom );


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
    OPZ=playerZ=2;
    playerTheta=t=0
    upkey=downkey=leftkey=rightkey=0

    E = {};
    E.moveTo = moveTo;
    E.lineTo = lineTo;

    //setup fiddle knobs
    panel= QuickSettings.create(10, 10, 'controls');

    panel
    //.addHTML('stats', stats.dom)
    //"name", lowerLimit, UpperLimit, defaultSetting, sliderIncrement
    .addRange("speed", 0, 40, 29, .01)
    .addRange("horz wave", 0, 40, 5, .01)
    .addRange("vert wave", 0, 40, 5, .01)
    .addRange("tunnelColor", 0, 63, 29, 1)
    .addRange("playerColor", 0, 63, 18, 1)
    .addRange("spokeColor", 0, 63, 7, 1)

    loop();
}

function loop(dt){

    stats.begin();

    //variable timestep game timer
    let now = new Date().getTime();
    dt = Math.min(1, (now - last) / 1000);
    t += dt;


    //good practice to update logic separately from drawing. not good golf, but easier to read!

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
      tunnelColor = panel.getValue('tunnelColor');
      playerColor = panel.getValue('playerColor');
      spokeColor = panel.getValue('spokeColor');


  // f & g are offsets to recenter the mouth of the tunnel
  // they coincide with the formulas below and should not be changed independently
  f=(j=S(d=t/(1000/horz))/2)*12
  g=C(e=t/(1000/vert))*1.5

  //player update
	if(playerTheta>Math.PI)playerTheta=Math.PI
	if(playerTheta<-Math.PI)playerTheta=-Math.PI
	if(leftkey)playerTheta-=.125
	if(rightkey)playerTheta+=.125
	if(playerZ>depth/2)playerZ=depth/2
	if(playerZ<1)playerZ=1
	if(upkey)playerZ+=.35
	if(downkey)playerZ-=.15
	playerZ+=(OPZ-playerZ)/50
	playerTheta/=1.035


}

function draw(dt){

    clear(30);
    cursorColor = tunnelColor;

//tunnel draw routine
    for(m=depth;m--;){
    	for(i=sides;i--;){
    		//x.beginPath()

    		// q is the depth (Z) value and is also used to generate curvature of the tunnel
    		q=m-t/(1000/speed)*6%1
    		//console.log(q);

    		// O & P are the horizontal (X) curvature of the tunnel.
    		// they are the same except for P has (q+1), which is needed to plot
    		// length-wise line segments
    		O=S(s*2*j*q+d)*6-f
    		P=S(s*2*j*(q+1)+d)*6-f

    		// Q & R are the vertical (Y) curvature. again they are the same except for (q+1)
    		Q=C(s*3*j*q+e)*1.5-g
    		R=C(s*3*j*(q+1)+e)*1.5-g

    		// first point is a moveTo (L(1))
    		X=S(p=v*i)+O,Y=C(p)+Q,Z=q,L(1)

    		//cir(); //w+X/z*w,h+Y/z*w)

    		// second point is a lineTo the next lateral vertex in the ring
    		X=S(p+=v)+O,Y=C(p)+Q,Z=q,L()

    		// third point is a length-wise lineTo the next ring
    		X=S(p)+P,Y=C(p)+R,Z=q+=1,L()

    		// fourth and last point is a lineTo the previous point on the next ring (completing a quad)
    		X=S(p-=v)+P,Y=C(p)+R,Z=q,L()
    	}

      //player draw routine
      //
      if(m==(playerZ|0)){
  			Z=playerZ
  			//x.lineWidth=16/Z

  			//
  			ls=Math.max(150/Z,0) //whats this? don't see it used anywhere

  			//player position
  			X=S(playerTheta)*.8+S(s*2*j*Z+d)*6-f
  			Y=C(playerTheta)*.8+C(s*3*j*Z+e)*1.5-g

  			//draw player tunnel spokes
  			L(1) //moveto
        cursorColor = spokeColor;
  			X=S(s*2*j*Z+d)*6-f,Y=C(s*3*j*Z+e)*1.5-g,L()
  			X+=S(playerTheta+Math.PI*2/3),Y+=C(playerTheta+Math.PI*2/3),L()
  			X=S(s*2*j*Z+d)*6-f,Y=C(s*3*j*Z+e)*1.5-g,L(1)
  			X+=S(playerTheta+Math.PI*4/3),Y+=C(playerTheta+Math.PI*4/3),L()

        //draw player ball
        cursorColor = playerColor;
        fcir(30);

        //set cursor back to tunnelColor, uncomment for potential feature/fun?
        cursorColor = tunnelColor;
  		}
    }

}

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

onkeydown=e=>{
	switch(e.which){
		case 37:leftkey=1;break;
		case 38:upkey=1;break;
		case 39:rightkey=1;break;
		case 40:downkey=1;break;
	}
}
onkeyup=e=>{
	switch(e.which){
		case 37:leftkey=0;break;
		case 38:upkey=0;break;
		case 39:rightkey=0;break;
		case 40:downkey=0;break;
	}
}

init();
