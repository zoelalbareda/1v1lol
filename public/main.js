import * as THREE from './assets/three.module.js';

const $=id=>document.getElementById(id);
const canvas=$('game'), scene=new THREE.Scene();
scene.background=new THREE.Color(0x4d4a45);scene.fog=new THREE.FogExp2(0x756c60,.0035);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.08,230);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
let renderScale=Math.min(devicePixelRatio,1.5),perfFrames=0,perfStart=performance.now();
renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
scene.add(new THREE.HemisphereLight(0xffe9ca,0x282c2d,1.05));
const sun=new THREE.DirectionalLight(0xffc882,3.1);sun.position.set(35,54,-25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-56;sun.shadow.camera.right=56;sun.shadow.camera.top=56;sun.shadow.camera.bottom=-56;sun.shadow.normalBias=.03;scene.add(sun);
const fill=new THREE.DirectionalLight(0xa4bac3,.45);fill.position.set(-30,14,20);scene.add(fill);

const mat=(color,roughness=.85,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const concrete=mat(0xbfc0b7), darkMetal=mat(0x334651,.47,.8), steel=mat(0x66747a,.5,.65), edge=mat(0x8998a0,.6,.35), blue=mat(0x327eaa,.52,.45), orange=mat(0xb36b43,.52,.4), armorDark=mat(0x202f3b,.65,.4);
const box=(w,h,d,material,x=0,y=0,z=0,cast=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;scene.add(m);return m;};
const panoTex=new THREE.TextureLoader().load('./assets/panorama.png');panoTex.colorSpace=THREE.SRGBColorSpace;panoTex.wrapS=THREE.RepeatWrapping;
const backdrop=new THREE.Mesh(new THREE.CylinderGeometry(110,110,206,80,1,true),new THREE.MeshBasicMaterial({map:panoTex,side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false}));backdrop.position.y=27;backdrop.rotation.y=-Math.PI/2;scene.add(backdrop);
const groundTex=new THREE.TextureLoader().load('./assets/arena-ground.png');groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.repeat.set(8,8);groundTex.colorSpace=THREE.SRGBColorSpace;groundTex.anisotropy=8;
const steelTex=new THREE.TextureLoader().load('./assets/weathered-steel.png');steelTex.colorSpace=THREE.SRGBColorSpace;steelTex.anisotropy=8;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(84,84),new THREE.MeshStandardMaterial({map:groundTex,roughness:1,metalness:0}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
// Arena detail stays outside the fight path.
const trim=mat(0x7c8c91,.58,.55), rail=mat(0x454748,.85,.18);
for(const side of [-1,1]){
  box(86,1.7,.65,rail,0,.85,side*42);box(.65,1.7,86,rail,side*42,.85,0);
  box(86,.1,.3,trim,0,1.77,side*42);box(.3,.1,86,trim,side*42,1.77,0);
  for(let a=-36;a<=36;a+=12){
    const p1=box(1.2,5,1.2,darkMetal,a,2.5,side*40.3);box(1.65,.23,1.65,steel,a,5.05,side*40.3);
    box(.4,.5,.4,new THREE.MeshBasicMaterial({color:side<0?0x89daff:0xffb976}),a,4.2,side*40.3,false);
  }
}
for(let a=-32;a<=32;a+=8){box(3,.07,.11,edge,a,.04,-30,false);box(3,.07,.11,edge,a,.04,30,false);}
for(const s of [-1,1]){
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.5,2.56,48),new THREE.MeshBasicMaterial({color:s<0?0x7b9aa0:0xb69678,side:THREE.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.set(s*16,.03,0);scene.add(ring);
}
// Concrete blast blocks, stacked cargo and signal masts frame the open fighting area.
for(const s of [-1,1])for(const z of [-1,1]){
  const x=s*34,zz=z*34;
  box(3.8,1.7,2.1,concrete,x,0.85,zz);
  box(2.7,1.5,2.1,steel,x+s*.5,2.45,zz+.3);
  for(const offset of [-.8,.8])box(.08,2.4,.11,darkMetal,x+offset,2.2,zz+1.37);
  const mast=box(.26,8,.26,darkMetal,s*39,4,z*39);
  box(2,.25,.65,steel,s*39,8,z*39);
}

const backTex=new THREE.TextureLoader().load('./assets/operator-back.png');backTex.colorSpace=THREE.SRGBColorSpace;
const frontTex=new THREE.TextureLoader().load('./assets/operator-front.png');frontTex.colorSpace=THREE.SRGBColorSpace;
const backWalkTex=new THREE.TextureLoader().load('./assets/operator-back-walk.png');backWalkTex.colorSpace=THREE.SRGBColorSpace;
const frontWalkTex=new THREE.TextureLoader().load('./assets/operator-front-walk.png');frontWalkTex.colorSpace=THREE.SRGBColorSpace;
function avatar(isBlue){
  const group=new THREE.Group();
  const photo=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.8),new THREE.MeshBasicMaterial({map:isBlue?backTex:frontTex,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthWrite:true,toneMapped:false}));
  photo.position.y=.9;group.add(photo);group.userData.photo=photo;
  group.userData.walkBack=backWalkTex.clone();group.userData.walkFront=frontWalkTex.clone();
  for(const tex of [group.userData.walkBack,group.userData.walkFront]){tex.repeat.set(.25,.5);tex.offset.set(0,.5);tex.needsUpdate=true;}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.47,24),new THREE.MeshBasicMaterial({color:0x081013,transparent:true,opacity:.28,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.026;group.add(shadow);
  scene.add(group);return group;
}

const me={x:-16,y:0,z:0,yaw:Math.PI/2,pitch:-.04,vy:0,hp:100,shield:50,score:0,weapon:'rifle',lastShot:0,model:avatar(true)};
const foe={x:16,y:0,z:0,yaw:-Math.PI/2,hp:100,shield:50,score:0,weapon:'rifle',model:avatar(false),lastShot:0};
let mode='menu',socket=null,myId=null,myIndex=0,roomCode='',locked=false,roundOver=false,botTime=0,botBuild=0,sendTime=0,toastTimer=0,mouseFireHeld=false;
const builds=[],effects=[],keys=new Set();
const defaults={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',sprint:'ShiftLeft',fire:'Mouse0',rifle:'Digit1',shotgun:'Digit2',wall:'KeyQ',ramp:'KeyE',floor:'KeyR',pyramid:'KeyF'};
const names={forward:'Avançar',back:'Retrocedir',left:'Esquerra',right:'Dreta',jump:'Saltar',sprint:'Córrer',fire:'Disparar',rifle:'Fusell',shotgun:'Escopeta',wall:'Construir mur',ramp:'Construir rampa',floor:'Construir terra',pyramid:'Construir piràmide'};
let bindings={...defaults,...JSON.parse(localStorage.getItem('duelo3d-bindings')||'{}')},sensitivity=Number(localStorage.getItem('duelo3d-sens')||50);
let rebinding=null;
const keyName=code=>code.replace(/^Key/,'').replace(/^Digit/,'').replace('Mouse0','CLIC IZQ').replace('Mouse1','CLIC MED').replace('Mouse2','CLIC DER').replace('ShiftLeft','SHIFT').replace('Space','ESPACIO');
function refreshBindings(){
  $('bindings').innerHTML='';
  for(const [action,title] of Object.entries(names)){
    const b=document.createElement('button');b.className='binding'+(rebinding===action?' listening':'');b.innerHTML=`<span>${title}</span><kbd>${rebinding===action?'PULSA…':keyName(bindings[action])}</kbd>`;
    b.onclick=()=>{rebinding=action;refreshBindings();};$('bindings').append(b);
  }
  for(const k of ['rifle','shotgun','wall','ramp','floor','pyramid'])$(k+'Key').textContent=keyName(bindings[k]);
  $('sensitivity').value=sensitivity;$('sensitivityValue').textContent=sensitivity+'%';
}
function bind(code){if(!rebinding)return;for(const key in bindings)if(bindings[key]===code&&key!==rebinding)bindings[key]=bindings[rebinding];bindings[rebinding]=code;rebinding=null;localStorage.setItem('duelo3d-bindings',JSON.stringify(bindings));refreshBindings();}
refreshBindings();

function show(id){for(const name of ['menu','waiting','settings','pause'])$(name).classList.add('hidden');if(id)$(id).classList.remove('hidden');}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function status(label,detail){$('statusLabel').textContent=label;$('statusDetail').textContent=detail;}
function updateHud(){
  $('hpNumber').textContent=Math.ceil(me.hp);$('shieldNumber').textContent=Math.ceil(me.shield);
  $('hpBar').style.width=me.hp+'%';$('shieldBar').style.width=me.shield*2+'%';
  $('enemyHpNumber').textContent=Math.ceil(foe.hp);$('enemyHpBar').style.width=foe.hp+'%';
  $('myScore').textContent=me.score;$('enemyScore').textContent=foe.score;
  $('rifleSlot').classList.toggle('active',me.weapon==='rifle');$('shotgunSlot').classList.toggle('active',me.weapon==='shotgun');
}
function resetRound(){
  const sign=mode==='online'&&myIndex===1?-1:1;
  me.x=-16*sign;me.y=0;me.z=0;me.yaw=Math.PI/2*sign;me.pitch=-.04;me.vy=0;me.hp=100;me.shield=50;
  foe.x=16*sign;foe.y=0;foe.z=0;foe.tx=foe.x;foe.ty=0;foe.tz=0;foe.yaw=-Math.PI/2*sign;foe.targetYaw=foe.yaw;foe.hp=100;foe.shield=50;
  for(const b of builds)scene.remove(b.mesh);builds.length=0;roundOver=false;updateHud();
}
function localStart(){mode='solo';$('roomPill').textContent='PRÁCTICA VS BOT';$('enemyLabel').textContent='BOT';resetRound();show(null);status('EN COMBATE','Clic para capturar el ratón');requestLock();}
function requestLock(){if(mode!=='menu'&&!$('settings').classList.contains('hidden'))return;canvas.requestPointerLock?.();}
function connect(kind,code){
  if(socket){socket.close();socket=null;}
  const protocol=location.protocol==='https:'?'wss:':'ws:';
  socket=new WebSocket(`${protocol}//${location.host}/ws`);
  socket.onopen=()=>socket.send(JSON.stringify(kind==='create'?{type:'create'}:{type:'join',code}));
  socket.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch{return;}handleNetwork(m);};
  socket.onerror=()=>toast('No se pudo conectar con el servidor');
  socket.onclose=()=>{if(mode==='online'||mode==='waiting'){mode='menu';show('menu');document.exitPointerLock?.();toast('Conexión cerrada');}};
}
function network(m){if(socket?.readyState===1)socket.send(JSON.stringify(m));}
function handleNetwork(m){
  if(m.type==='error'){toast(m.message);if(mode==='waiting'){mode='menu';show('menu');}return;}
  if(m.type==='joined'){mode='waiting';roomCode=m.code;myId=m.id;myIndex=m.index;$('roomCode').textContent=m.code;$('roomPill').textContent='SALA '+m.code;show('waiting');return;}
  if(m.type==='snapshot'){
    if(m.started&&mode==='waiting'){mode='online';show(null);resetRound();$('enemyLabel').textContent='RIVAL';status('EN COMBATE','Clic para capturar el ratón');toast('¡Rival conectado!');requestLock();}
    if(mode==='online'){
      const self=m.players.find(p=>p.id===myId),enemy=m.players.find(p=>p.id!==myId);
      if(self){me.hp=self.hp;me.shield=self.shield;me.score=self.score;}
      if(enemy){foe.tx=enemy.x;foe.ty=enemy.y;foe.tz=enemy.z;foe.targetYaw=enemy.yaw;foe.hp=enemy.hp;foe.shield=enemy.shield;foe.score=enemy.score;foe.weapon=enemy.weapon;}
      updateHud();
    }
    return;
  }
  if(m.type==='round'){if(mode==='online'){resetRound();toast('Nueva ronda');}return;}
  if(m.type==='build'){addBuild(m.build);return;}
  if(m.type==='buildRejected'){const i=builds.findIndex(b=>b.id===m.id);if(i>=0){scene.remove(builds[i].mesh);builds.splice(i,1);}return;}
  if(m.type==='removeBuild'){const i=builds.findIndex(b=>b.id===m.id);if(i>=0){scene.remove(builds[i].mesh);builds.splice(i,1);}return;}
  if(m.type==='shot'){showShot(m.from,m.point,m.weapon,m.id===myId);return;}
  if(m.type==='damage'){if(m.id===myId){me.hp=m.hp;me.shield=m.shield;toast('T’han tocat!');}else{foe.hp=m.hp;foe.shield=m.shield;markHit();showDamage(m.amount,m.point);}updateHud();return;}
  if(m.type==='winner'){roundOver=true;toast(m.id===myId?'¡Ronda ganada!':'Ronda perdida');return;}
  if(m.type==='opponentLeft'){mode='waiting';show('waiting');document.exitPointerLock?.();toast('El rival se ha desconectado');}
}

const buildSurface=new THREE.MeshStandardMaterial({map:steelTex,metalness:.38,roughness:.7,side:THREE.DoubleSide});
const buildGeometries={wall:new THREE.BoxGeometry(4,3,.14),ramp:new THREE.BoxGeometry(4,.18,5),floor:new THREE.BoxGeometry(4,.14,4),pyramid:new THREE.ConeGeometry(2.83,1.85,4)};
function buildMesh(b){
  const group=new THREE.Group();
  const add=(geo,material,x,y,z)=>{const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=material===buildSurface;mesh.receiveShadow=true;group.add(mesh);return mesh;};
  if(b.kind==='wall'){
    add(buildGeometries.wall,buildSurface,0,1.5,0);
    for(const x of [-1.95,1.95])add(new THREE.BoxGeometry(.14,3.05,.18),darkMetal,x,1.5,0);
    for(const y of [.08,2.92])add(new THREE.BoxGeometry(4,.13,.18),steel,0,y,0);
  }else if(b.kind==='ramp'){
    const slope=add(buildGeometries.ramp,buildSurface,0,1.5,0);slope.rotation.x=-.64;
    for(const x of [-1.91,1.91]){const side=add(new THREE.BoxGeometry(.14,.16,5),steel,x,1.5,0);side.rotation.x=-.64;}
  }else if(b.kind==='floor'){
    add(buildGeometries.floor,buildSurface,0,.08,0);
    for(const x of [-1.93,1.93])add(new THREE.BoxGeometry(.12,.2,4),darkMetal,x,.07,0);
    for(const z of [-1.93,1.93])add(new THREE.BoxGeometry(4,.2,.12),steel,0,.07,z);
  }else if(b.kind==='pyramid'){
    const cone=add(buildGeometries.pyramid,buildSurface,0,.93,0);cone.rotation.y=Math.PI/4;
    for(const x of [-1.95,1.95])for(const z of [-1.95,1.95])add(new THREE.BoxGeometry(.13,.18,.13),steel,x,.09,z);
  }
  group.position.set(b.x,b.y||0,b.z);group.rotation.y=b.rot;
  scene.add(group);return group;
}
function addBuild(b){if(builds.some(v=>v.id===b.id))return;builds.push({...b,mesh:buildMesh(b)});}
function placeBuild(kind){
  if(roundOver)return;
  const forward=new THREE.Vector3(Math.sin(me.yaw),0,-Math.cos(me.yaw));
  const x=Math.round((me.x+forward.x*4)/4)*4,z=Math.round((me.z+forward.z*4)/4)*4;
  const y=Math.max(0,Math.min(12,Math.round(me.y/3)*3));
  const rot=Math.round(me.yaw/(Math.PI/2))*(Math.PI/2);
  if(Math.abs(x)>32||Math.abs(z)>32){toast('Fuera del área de construcción');return;}
  if(builds.some(b=>b.x===x&&b.y===y&&b.z===z&&b.kind===kind&&b.rot===rot))return;
  if(builds.length>=110){toast('Límit de construccions');return;}
  const id=crypto.randomUUID();
  addBuild({id,owner:mode==='online'?myId:'me',kind,x,y,z,rot,hp:kind==='wall'?150:120});
  if(mode==='online')network({type:'build',id,kind,x,y,z,rot});
}
const ray=new THREE.Raycaster();
function aimDirection(){
  ray.setFromCamera(new THREE.Vector2(0,0),camera);ray.far=70;
  const visible=[foe.model,...builds.map(b=>b.mesh)];
  const hits=ray.intersectObjects(visible,true);
  const point=hits.length?hits[0].point:camera.position.clone().addScaledVector(ray.ray.direction,70);
  return point.sub(new THREE.Vector3(me.x,me.y+1.35,me.z)).normalize();
}
function showShot(from,point,weapon,isMe){
  const a=new THREE.Vector3(from.x,from.y,from.z),b=new THREE.Vector3(point.x,point.y,point.z),dir=b.clone().sub(a),len=dir.length();
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(weapon==='rifle'?.022:.045,weapon==='rifle'?.022:.045,len,6),new THREE.MeshBasicMaterial({color:isMe?0xffd293:0xff6f52,transparent:true,opacity:.9}));beam.position.copy(a).addScaledVector(dir,.5);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());scene.add(beam);effects.push({mesh:beam,life:.1});
  const spark=new THREE.Mesh(new THREE.SphereGeometry(.13,6,4),new THREE.MeshBasicMaterial({color:isMe?0xffde9c:0xff9568}));spark.position.copy(b);scene.add(spark);effects.push({mesh:spark,life:.17});
}
function markHit(){$('hitMarker').classList.add('show');setTimeout(()=>$('hitMarker').classList.remove('show'),130);}
function showDamage(amount,point){
  if(!amount||!point)return;
  const pos=new THREE.Vector3(point.x,point.y,point.z).project(camera);
  if(pos.z>1)return;
  const el=document.createElement('span');el.className='damage-number';el.textContent='−'+Math.round(amount);
  el.style.left=((pos.x+1)*.5*innerWidth)+'px';el.style.top=((-pos.y+1)*.5*innerHeight)+'px';
  document.body.append(el);setTimeout(()=>el.remove(),650);
}
function damage(target,dmg,weapon='rifle'){
  const shieldDamage=Math.min(target.shield,weapon==='rifle'?5:Math.ceil(dmg*.4));
  target.shield-=shieldDamage;const hpDamage=dmg-shieldDamage;target.hp=Math.max(0,target.hp-hpDamage);
  if(target===foe)showDamage(hpDamage,{x:foe.x,y:foe.y+1.4,z:foe.z});
  updateHud();if(target.hp<=0){roundOver=true;if(target===foe){me.score++;toast('Ronda guanyada!');}else{foe.score++;toast('Ronda perduda');}setTimeout(()=>{if(mode==='solo'){resetRound();toast('Nova ronda');}},2400);}
}
function shot(){
  if(roundOver||!locked||!['solo','online'].includes(mode))return;
  const now=performance.now(),cooldown=me.weapon==='rifle'?145:720;
  if(now-me.lastShot<cooldown)return;me.lastShot=now;
  const dir=aimDirection();
  const from={x:me.x,y:me.y+1.35,z:me.z};
  if(mode==='online'){network({type:'fire',dx:dir.x,dy:dir.y,dz:dir.z});return;}
  const origin=new THREE.Vector3(from.x,from.y,from.z),range=me.weapon==='rifle'?55:17;
  ray.set(origin,dir);ray.far=range;
  let distance=range,hit=null;
  // Actual rendered panels and the opponent compete for the closest ray hit.
  const avatarHit=new THREE.Sphere(new THREE.Vector3(foe.x,foe.y+.95,foe.z),.78);
  const at=ray.ray.intersectSphere(avatarHit,new THREE.Vector3());if(at){distance=origin.distanceTo(at);hit='foe';}
  for(const b of builds){const box=new THREE.Box3().setFromObject(b.mesh);const at=ray.ray.intersectBox(box,new THREE.Vector3());if(at){const d=origin.distanceTo(at);if(d<distance){distance=d;hit=b;}}}
  const point=origin.clone().addScaledVector(dir,distance);showShot(from,point,me.weapon,true);
  if(hit==='foe'){damage(foe,me.weapon==='rifle'?18:Math.max(28,Math.round(76-distance*2)),me.weapon);markHit();}
  else if(hit){hit.hp-=me.weapon==='rifle'?19:50;if(hit.hp<=0){scene.remove(hit.mesh);builds.splice(builds.indexOf(hit),1);}}
}
function botFire(){
  const from={x:foe.x,y:foe.y+1.35,z:foe.z},to=new THREE.Vector3(me.x,me.y+.95,me.z),dir=to.sub(new THREE.Vector3(from.x,from.y,from.z)).normalize(),dist=Math.hypot(me.x-foe.x,me.z-foe.z);
  if(dist>30||roundOver)return;
  ray.set(new THREE.Vector3(from.x,from.y,from.z),dir);ray.far=dist;
  let blocked=false;for(const b of builds){if(ray.intersectObject(b.mesh,true).length){blocked=true;break;}}
  const point=blocked?new THREE.Vector3(from.x+dir.x*dist*.55,from.y+dir.y*dist*.55,from.z+dir.z*dist*.55):new THREE.Vector3(me.x,me.y+.95,me.z);
  showShot(from,point,'rifle',false);
  if(!blocked&&Math.random()>.28)damage(me,9+Math.floor(Math.random()*7));
}

function updateBot(dt,t){
  if(roundOver)return;
  const dx=me.x-foe.x,dz=me.z-foe.z,d=Math.hypot(dx,dz)||1;
  const strafe=Math.sin(t*.0007)*.7,approach=d>15?1:d<9?-.5:0;
  foe.x=Math.max(-36,Math.min(36,foe.x+(dx/d*approach-dz/d*strafe)*dt*3.1));
  foe.z=Math.max(-36,Math.min(36,foe.z+(dz/d*approach+dx/d*strafe)*dt*3.1));
  foe.yaw=Math.atan2(dx,-dz);
  if(t-botTime>900&&d<30){botTime=t;botFire();}
  if(t-botBuild>9000&&d<20&&builds.length<18){botBuild=t;const x=Math.round((foe.x+dx/d*3)/4)*4,z=Math.round((foe.z+dz/d*3)/4)*4;if(!builds.some(b=>b.x===x&&b.z===z))addBuild({id:crypto.randomUUID(),owner:'bot',kind:'wall',x,y:0,z,rot:Math.round(foe.yaw/(Math.PI/2))*Math.PI/2,hp:150});}
}

function animateAvatar(model,moving,front,phase){
  const photo=model.userData.photo;
  const texture=moving?model.userData[front?'walkFront':'walkBack']:(front?frontTex:backTex);
  if(moving){const frame=Math.floor(phase*10)%8;texture.offset.set((frame%4)*.25,frame<4?.5:0);}
  if(photo.material.map!==texture){photo.material.map=texture;photo.material.needsUpdate=true;}
}
const clock=new THREE.Clock();let elapsed=0,prevFoeX=foe.x,prevFoeZ=foe.z;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
  let movingNow=false;
  if(['solo','online'].includes(mode)){
    const forward=new THREE.Vector3(Math.sin(me.yaw),0,-Math.cos(me.yaw)),right=new THREE.Vector3(Math.cos(me.yaw),0,Math.sin(me.yaw));
    const move=new THREE.Vector3();if(keys.has(bindings.forward))move.add(forward);if(keys.has(bindings.back))move.sub(forward);if(keys.has(bindings.right))move.add(right);if(keys.has(bindings.left))move.sub(right);
    if(locked&&move.lengthSq()){
      movingNow=true;
      move.normalize().multiplyScalar((keys.has(bindings.sprint)?10:6.7)*dt);
      const nx=Math.max(-38,Math.min(38,me.x+move.x)),nz=Math.max(-38,Math.min(38,me.z+move.z));
      let blocked=false;for(const b of builds)if(b.kind==='wall'&&me.y<(b.y||0)+3&&me.y+1.6>(b.y||0)){
        const a=-b.rot,c=Math.cos(a),s=Math.sin(a),dx=nx-b.x,dz=nz-b.z;
        if(Math.abs(dx*c+dz*s)<2.22&&Math.abs(-dx*s+dz*c)<.42){blocked=true;break;}
      }
      if(!blocked){me.x=nx;me.z=nz;}
    }
    let support=0;for(const b of builds){
      const base=b.y||0;if(me.y<base-.35)continue;
      const a=-b.rot,c=Math.cos(a),s=Math.sin(a),dx=me.x-b.x,dz=me.z-b.z;
      const lx=dx*c+dz*s,lz=-dx*s+dz*c;
      if(b.kind==='ramp'&&Math.abs(lx)<1.8&&Math.abs(lz)<2.5)support=Math.max(support,base+Math.max(0,1.5+lz*.6));
      if(b.kind==='floor'&&Math.abs(lx)<1.95&&Math.abs(lz)<1.95)support=Math.max(support,base+.16);
      if(b.kind==='pyramid'&&Math.abs(lx)<2&&Math.abs(lz)<2)support=Math.max(support,base+1.85*(1-Math.max(Math.abs(lx),Math.abs(lz))/2));
    }
    me.vy-=22*dt;me.y+=me.vy*dt;if(me.y<support){me.y=support;me.vy=0;}
    if(mode==='solo'&&locked)updateBot(dt,performance.now());
    if(mode==='online'&&performance.now()-sendTime>40){sendTime=performance.now();network({type:'state',x:me.x,y:me.y,z:me.z,yaw:me.yaw,weapon:me.weapon});}
    if(locked&&(mouseFireHeld||keys.has(bindings.fire)))shot();
  }
  if(mode==='online'){
    const a=1-Math.exp(-dt*18);foe.x+=(foe.tx-foe.x)*a;foe.y+=(foe.ty-foe.y)*a;foe.z+=(foe.tz-foe.z)*a;
    const turn=Math.atan2(Math.sin(foe.targetYaw-foe.yaw),Math.cos(foe.targetYaw-foe.yaw));foe.yaw+=turn*a;
  }
  me.model.position.set(me.x,me.y,me.z);
  foe.model.position.set(foe.x,foe.y,foe.z);
  const f=new THREE.Vector3(Math.sin(me.yaw),0,-Math.cos(me.yaw)),r=new THREE.Vector3(Math.cos(me.yaw),0,Math.sin(me.yaw));
  const target=new THREE.Vector3(me.x,me.y+1.48,me.z).addScaledVector(f,9).add(new THREE.Vector3(0,Math.tan(me.pitch)*9,0));
  const desired=new THREE.Vector3(me.x,me.y+1.95,me.z).addScaledVector(f,-4.1).addScaledVector(r,1.15);
  camera.position.lerp(desired,Math.min(1,dt*12));camera.lookAt(target);
  me.model.userData.photo.position.y=.9+(movingNow?Math.sin(elapsed*13)*.018:0);
  me.model.userData.photo.quaternion.copy(camera.quaternion);
  if(movingNow)me.model.userData.photo.rotateZ(Math.sin(elapsed*6)*.005);
  foe.model.userData.photo.quaternion.copy(camera.quaternion);
  const towardCamera=Math.sin(foe.yaw)*(camera.position.x-foe.x)-Math.cos(foe.yaw)*(camera.position.z-foe.z);
  animateAvatar(me.model,movingNow,false,elapsed*(keys.has(bindings.sprint)?1.25:1));
  const foeMoving=Math.hypot(foe.x-prevFoeX,foe.z-prevFoeZ)>.008;
  animateAvatar(foe.model,foeMoving,towardCamera>=0,elapsed);
  prevFoeX=foe.x;prevFoeZ=foe.z;
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.life<=0){scene.remove(e.mesh);effects.splice(i,1);}}
  renderer.render(scene,camera);
  perfFrames++;
  const now=performance.now();if(now-perfStart>2200&&document.visibilityState==='visible'){
    const fps=perfFrames*1000/(now-perfStart),limit=Math.min(devicePixelRatio,1.5);
    if(fps<48&&renderScale>.85)renderScale=Math.max(.85,renderScale-.15);
    else if(fps>58&&renderScale<limit)renderScale=Math.min(limit,renderScale+.08);
    renderer.setPixelRatio(renderScale);perfFrames=0;perfStart=now;
  }
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(!locked){keys.clear();mouseFireHeld=false;}if(!locked&&['solo','online'].includes(mode)&&$('settings').classList.contains('hidden')){show('pause');status('EN PAUSA','Pulsa continuar');}else if(locked){show(null);status('EN COMBATE','ESC para pausar');}});
document.addEventListener('mousemove',e=>{if(locked){const s=sensitivity/50*.0022;me.yaw-=e.movementX*s;me.pitch=Math.max(-.7,Math.min(.62,me.pitch-e.movementY*s));}});
document.addEventListener('keydown',e=>{
  if(rebinding){e.preventDefault();bind(e.code);return;}
  if(['Space','ArrowUp','ArrowDown'].includes(e.code)&&['solo','online'].includes(mode))e.preventDefault();
  keys.add(e.code);
  if(!['solo','online'].includes(mode)||!locked||e.repeat)return;
  if(e.code===bindings.jump&&Math.abs(me.vy)<.01)me.vy=8.8;
  if(e.code===bindings.rifle){me.weapon='rifle';updateHud();}
  if(e.code===bindings.shotgun){me.weapon='shotgun';updateHud();}
  if(e.code===bindings.wall)placeBuild('wall');
  if(e.code===bindings.ramp)placeBuild('ramp');
  if(e.code===bindings.floor)placeBuild('floor');
  if(e.code===bindings.pyramid)placeBuild('pyramid');
  if(e.code===bindings.fire)shot();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('mousedown',e=>{if(rebinding){bind('Mouse'+e.button);return;}if(e.target===canvas){if(!locked){requestLock();return;}if(bindings.fire==='Mouse'+e.button){mouseFireHeld=true;shot();}}});
document.addEventListener('mouseup',()=>{mouseFireHeld=false;});
document.addEventListener('contextmenu',e=>{if(e.target===canvas)e.preventDefault();});
canvas.addEventListener('click',()=>{if(['solo','online'].includes(mode)&&!locked)requestLock();});
$('practiceBtn').onclick=localStart;
$('createBtn').onclick=()=>connect('create');
$('joinBtn').onclick=()=>{const code=$('joinCode').value.trim().toUpperCase();if(code.length!==6){toast('Introduce un código de 6 caracteres');return;}connect('join',code);};
$('joinCode').onkeydown=e=>{if(e.code==='Enter')$('joinBtn').click();};
$('copyBtn').onclick=async()=>{const link=new URL(location.href);link.searchParams.set('room',roomCode);try{await navigator.clipboard.writeText(link.href);toast('Enlace copiado');}catch{toast(link.href);}};
$('cancelWait').onclick=()=>{socket?.close();mode='menu';show('menu');};
function openSettings(){document.exitPointerLock?.();show('settings');refreshBindings();}
$('settingsBtn').onclick=openSettings;$('menuSettingsBtn').onclick=openSettings;
$('closeSettings').onclick=()=>{rebinding=null;if(['solo','online'].includes(mode))show('pause');else if(mode==='waiting')show('waiting');else show('menu');};
$('sensitivity').oninput=e=>{sensitivity=Number(e.target.value);$('sensitivityValue').textContent=sensitivity+'%';localStorage.setItem('duelo3d-sens',String(sensitivity));};
$('resetControls').onclick=()=>{bindings={...defaults};sensitivity=50;localStorage.setItem('duelo3d-bindings',JSON.stringify(bindings));localStorage.setItem('duelo3d-sens','50');refreshBindings();};
$('resumeBtn').onclick=()=>{show(null);requestLock();};
$('backMenuBtn').onclick=()=>{document.exitPointerLock?.();socket?.close();mode='menu';show('menu');$('roomPill').textContent='PRÁCTICA';};
const invite=new URLSearchParams(location.search).get('room');if(invite){$('joinCode').value=invite.toUpperCase();toast('Código listo para unirte a la sala');}
updateHud();
