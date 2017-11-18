D=()=>{
	//draw a black rect over the screen
	x.fillRect(0,0,c.width=(w=960)*2,(h=540)*2)

	// function to move to or draw a line to a 3D-projected coordinate
	// relies on pre-set values for globals X, Y, and Z 
	L=q=>{z=Z>.1?Z:.1,x[q?"moveTo":"lineTo"](w+X/z*w,h+Y/z*w)}

	// lateral facets in tube
	sides=20

	// length-wise segments in tube
	depth=35

	// a couple of constants 
	v=Math.PI*2/sides
	s=Math.PI*2/depth

	// f & g are offsets to recenter the mouth of the tunnel
	// they coincide with the formulas below and should not be changed independently
	f=(j=S(d=t/2)/2)*12
	g=C(e=t*2)*1.5


	for(m=depth;m--;){
		for(i=sides;i--;){
			x.beginPath()
			
			// q is the depth (Z) value and is also used to generate curvature of the tunnel
			q=m-t*6%1
			
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
			
			// second point is a lineTo the next lateral vertex in the ring
			X=S(p+=v)+O,Y=C(p)+Q,Z=q,L()
			
			// third point is a length-wise lineTo the next ring
			X=S(p)+P,Y=C(p)+R,Z=q+=1,L()
			
			// fourth and last point is a lineTo the previous point on the next ring (completing a quad)
			X=S(p-=v)+P,Y=C(p)+R,Z=q,L()
			
			// set line and quad color
			x.strokeStyle='#345'
			
			// closePath performs an implicit lineTo the first point
			x.closePath()
			
			// lineWidth diminishes by distance
			x.lineWidth=32/(1+Z)
			
			// draw lines
			x.stroke()
			
			// fill quad
			//x.fill()
			
		}
		if(m==(playerZ|0)){
			Z=playerZ
			x.lineWidth=16/Z
			ls=Math.max(150/Z,0)
			X=S(playerTheta)*.8+S(s*2*j*Z+d)*6-f
			Y=C(playerTheta)*.8+C(s*3*j*Z+e)*1.5-g
			x.beginPath()
			x.fillStyle='#80f'
			x.arc(tx=w+X/Z*w,ty=h+Y/Z*w,ls,0,7)
			x.fill()
			x.beginPath()
			x.fillStyle='rgba(255,255,255,.5)'
			x.arc(tx-ls/3,ty-ls/3,ls/4,0,7)
			x.fill()
			x.beginPath()
			L(1)
			x.strokeStyle="#2b4"
			X=S(s*2*j*Z+d)*6-f,Y=C(s*3*j*Z+e)*1.5-g,L()
			X+=S(playerTheta+Math.PI*2/3),Y+=C(playerTheta+Math.PI*2/3),L()
			X=S(s*2*j*Z+d)*6-f,Y=C(s*3*j*Z+e)*1.5-g,L(1)
			X+=S(playerTheta+Math.PI*4/3),Y+=C(playerTheta+Math.PI*4/3),L()
			x.stroke()
		}
	}
	if(playerTheta>Math.PI)playerTheta=Math.PI
	if(playerTheta<-Math.PI)playerTheta=-Math.PI
	if(leftkey)playerTheta-=.125
	if(rightkey)playerTheta+=.125
	if(playerZ>depth/2)playerZ=depth/2
	if(playerZ<2)playerZ=2
	if(upkey)playerZ+=.35
	if(downkey)playerZ-=.15
	playerZ+=(OPZ-playerZ)/50
	playerTheta/=1.035

	t+=1/60;
	requestAnimationFrame(D);
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
playerTheta=t=0
upkey=downkey=leftkey=rightkey=0
OPZ=playerZ=5
D()