import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT || 3000);
const rooms = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.ico':'image/x-icon' };

function send(client, message) {
  if (!client || client.socket.destroyed) return;
  const body = Buffer.from(JSON.stringify(message));
  const head = body.length < 126 ? Buffer.from([129,body.length]) : Buffer.from([129,126,body.length >> 8,body.length & 255]);
  client.socket.write(Buffer.concat([head,body]));
}
function all(room, message) { for (const p of room.players) send(p.client, message); }
function snapshot(room) { return { type:'snapshot', players:room.players.map(p=>({id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,hp:p.hp,shield:p.shield,score:p.score,weapon:p.weapon})), builds:room.builds, started:room.players.length===2 }; }
function reset(room) {
  room.builds=[];room.roundOver=false;
  room.players.forEach((p,i)=>Object.assign(p,{x:i?16:-16,y:0,z:0,yaw:i?-Math.PI/2:Math.PI/2,hp:100,shield:50,lastFire:0}));
  all(room,{type:'round',message:'Nueva ronda'});
  all(room,snapshot(room));
}
function onMessage(client, m) {
  if (!m || typeof m.type!=='string') return;
  if (m.type==='create') {
    leave(client);
    let code; do { code=crypto.randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
    const room={code,players:[],builds:[],roundOver:false}; rooms.set(code,room); join(client,room); return;
  }
  if (m.type==='join') {
    const code=String(m.code||'').trim().toUpperCase(); const room=rooms.get(code);
    if (!room) return send(client,{type:'error',message:'La sala no existe'});
    if (room.players.length>=2) return send(client,{type:'error',message:'La sala está llena'});
    leave(client); join(client,room); return;
  }
  const p=client.player, room=client.room;
  if (!p || !room || room.players.length<2) return;
  if (m.type==='state') {
    if (![m.x,m.y,m.z,m.yaw].every(Number.isFinite)) return;
    p.x=Math.max(-36,Math.min(36,m.x)); p.y=Math.max(0,Math.min(18,m.y)); p.z=Math.max(-36,Math.min(36,m.z)); p.yaw=m.yaw; p.weapon=m.weapon==='rifle'?'rifle':'shotgun';
  }
  if (m.type==='build') {
    const reject=()=>send(client,{type:'buildRejected',id:m.id});
    if (room.builds.length>=110 || !['wall','ramp','floor','pyramid'].includes(m.kind) || ![m.x,m.y,m.z,m.rot].every(Number.isFinite)) return reject();
    const x=Math.round(m.x/4)*4,y=Math.round(m.y/3)*3,z=Math.round(m.z/4)*4,rot=Math.round(m.rot/(Math.PI/2))*(Math.PI/2);
    if (Math.abs(x)>32 || Math.abs(z)>32 || y<0 || y>12 || Math.hypot(x-p.x,z-p.z)>10 || Math.abs(y-p.y)>4.5) return reject();
    if (room.builds.some(b=>b.x===x&&b.y===y&&b.z===z&&b.kind===m.kind&&b.rot===rot)) return reject();
    const id=typeof m.id==='string'&&/^[0-9a-f-]{36}$/i.test(m.id)?m.id:crypto.randomUUID();
    const b={id,owner:p.id,kind:m.kind,x,y,z,rot,hp:kindHp(m.kind)};
    room.builds.push(b); all(room,{type:'build',build:b});
  }
  if (m.type==='fire') {
    if(room.roundOver)return;
    const now=Date.now(), weapon=p.weapon, delay=weapon==='rifle'?145:720;
    if (now-p.lastFire<delay || ![m.dx,m.dy,m.dz].every(Number.isFinite)) return;
    p.lastFire=now;
    const dir=norm({x:m.dx,y:m.dy,z:m.dz});
    const from={x:p.x,y:p.y+1.35,z:p.z};
    const range=weapon==='rifle'?55:17;
    let target=room.players.find(v=>v!==p), hit='none', point={x:from.x+dir.x*range,y:from.y+dir.y*range,z:from.z+dir.z*range};
    let best=range;
    for (const b of room.builds) {
      const t=rayBuild(from,dir,b);
      if (t!==null&&t<best) {best=t;hit=b;}
    }
    if (target) {
      const t=raySphere(from,dir,{x:target.x,y:target.y+.95,z:target.z},.78);
      if (t!==null&&t<best) {best=t;hit=target;}
    }
    point={x:from.x+dir.x*best,y:from.y+dir.y*best,z:from.z+dir.z*best};
    if (hit && hit===target) {
      const damage=weapon==='rifle'?18:Math.max(28,Math.round(76-best*2));
      const shieldDamage=Math.min(hit.shield,weapon==='rifle'?5:Math.ceil(damage*.4));hit.shield-=shieldDamage;
      const hpDamage=damage-shieldDamage;hit.hp=Math.max(0,hit.hp-hpDamage);
      all(room,{type:'damage',id:hit.id,hp:hit.hp,shield:hit.shield,amount:hpDamage,point});
      if (hit.hp<=0) {room.roundOver=true;p.score++; all(room,{type:'winner',id:p.id,score:p.score}); setTimeout(()=>{if(rooms.get(room.code)===room&&room.players.length===2)reset(room);},2600);}
    } else if (hit && hit.id) {
      hit.hp-=weapon==='rifle'?19:50;
      if (hit.hp<=0) {room.builds=room.builds.filter(b=>b!==hit); all(room,{type:'removeBuild',id:hit.id});}
    }
    all(room,{type:'shot',id:p.id,weapon,from,point});
  }
}
function kindHp(kind){return kind==='wall'?150:kind==='ramp'?130:110;}
function norm(v){const l=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/l,y:v.y/l,z:v.z/l};}
function raySphere(o,d,c,r){const x=o.x-c.x,y=o.y-c.y,z=o.z-c.z,b=x*d.x+y*d.y+z*d.z,q=b*b-(x*x+y*y+z*z-r*r);if(q<0)return null;const t=-b-Math.sqrt(q);return t>=0?t:null;}
function rayBuild(o,d,b){
  const a=-b.rot,c=Math.cos(a),s=Math.sin(a),px=o.x-b.x,pz=o.z-b.z;
  const ox=px*c+pz*s,oz=-px*s+pz*c,dx=d.x*c+d.z*s,dz=-d.x*s+d.z*c,oy=o.y-b.y;
  if(b.kind==='ramp'){
    const den=d.y-.6*dz;if(Math.abs(den)<1e-6)return null;
    const t=(1.5+.6*oz-oy)/den;
    return t>=0&&Math.abs(ox+dx*t)<=2&&Math.abs(oz+dz*t)<=2.5?t:null;
  }
  const halfZ=b.kind==='wall'?.12:2,top=b.kind==='wall'?3:b.kind==='floor'?.18:1.85;
  let near=0,far=1e9;
  for(const [v,step,low,high] of [[ox,dx,-2,2],[oy,d.y,0,top],[oz,dz,-halfZ,halfZ]]){
    if(Math.abs(step)<1e-8){if(v<low||v>high)return null;continue;}
    let t1=(low-v)/step,t2=(high-v)/step;if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return null;
  }
  return near;
}
function join(client,room){
  const i=room.players.length; const p={id:crypto.randomUUID(),client,x:i?16:-16,y:0,z:0,yaw:i?-Math.PI/2:Math.PI/2,hp:100,shield:50,score:0,weapon:'rifle',lastFire:0};
  client.room=room;client.player=p;room.players.push(p);send(client,{type:'joined',code:room.code,id:p.id,index:i});
  all(room,snapshot(room)); if(room.players.length===2) reset(room);
}
function leave(client){
  const room=client.room;if(!room)return;
  room.players=room.players.filter(p=>p.client!==client);client.room=null;client.player=null;
  if(!room.players.length)rooms.delete(room.code);else all(room,{type:'opponentLeft'});
}

const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
});
server.on('upgrade',(req,socket)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/ws'||!req.headers['sec-websocket-key']){socket.destroy();return;}
  const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  const client={socket,buffer:Buffer.alloc(0),room:null,player:null};
  socket.on('data',data=>{
    client.buffer=Buffer.concat([client.buffer,data]);
    while(client.buffer.length>=2){
      const b=client.buffer;const opcode=b[0]&15;let len=b[1]&127,offset=2;
      if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);offset=4;}
      else if(len===127){socket.destroy();return;}
      if(len>65536){socket.destroy();return;}
      if(!(b[1]&128)){socket.destroy();return;}
      if(b.length<offset+4+len)return;
      const mask=b.subarray(offset,offset+4);offset+=4;const payload=Buffer.from(b.subarray(offset,offset+len));
      client.buffer=b.subarray(offset+len);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
      if(opcode===8){socket.end();return;} if(opcode===9){socket.write(Buffer.from([138,0]));continue;}
      if(opcode===1)try{onMessage(client,JSON.parse(payload.toString('utf8')));}catch{}
    }
  });
  socket.on('close',()=>leave(client));socket.on('error',()=>leave(client));
});
setInterval(()=>{for(const room of rooms.values())if(room.players.length===2)all(room,snapshot(room));},50);
setInterval(()=>{for(const room of rooms.values())for(const p of room.players)if(!p.client.socket.destroyed)p.client.socket.write(Buffer.from([137,0]));},25000);
server.listen(port,'0.0.0.0',()=>console.log(`Duelo 3D: http://localhost:${port}`));
