/* ============================================================
   空洞牌局 · site8_cards —— 深洞里的牌桌
   ============================================================ */
(function(){
"use strict";

var V3 = THREE.Vector3, COL = THREE.Color;
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function rnd(a,b){ return a+Math.random()*(b-a); }

var canvas = document.getElementById('bg');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1224);
scene.fog = new THREE.Fog(0x0a1224, 26, 120);

var camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 400);

/* ---------- 贴图工具 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function silhouetteTexture(kind){
  var c=mkCanvas(1024,512), x=c.getContext('2d');
  x.clearRect(0,0,1024,512);
  function towers(col, base, minh, maxh, n, w1, w2){
    x.fillStyle = col;
    var bw = 1024/n;
    for(var i=0;i<n;i++){
      var h = rnd(minh,maxh);
      var w = rnd(bw*w1, bw*w2);
      var px = i*bw + rnd(0, bw-w);
      x.fillRect(px, 512-base-h, w, h+base);
      if(Math.random()<0.5){
        x.fillRect(px + w*0.3, 512-base-h-rnd(20,60), w*0.16, 80);
      }
      // 尖顶
      if(Math.random()<0.4){
        x.beginPath();
        x.moveTo(px, 512-base-h); x.lineTo(px+w/2, 512-base-h-rnd(30,90)); x.lineTo(px+w, 512-base-h);
        x.closePath(); x.fill();
      }
    }
  }
  if(kind===0) towers('#0d1730', 0, 120, 380, 14, 0.4, 0.75);
  if(kind===1) towers('#0a1122', 0, 160, 420, 11, 0.35, 0.7);
  if(kind===2) towers('#060b18', 0, 220, 470, 8, 0.4, 0.8);
  // 拱门点缀
  x.strokeStyle = 'rgba(159,212,255,0.10)'; x.lineWidth=3;
  for(var i=0;i<8;i++){
    var ax=rnd(60,960), ay=rnd(150,380), ar=rnd(14,34);
    x.beginPath(); x.arc(ax,ay,ar,Math.PI,0); x.stroke();
  }
  return new THREE.CanvasTexture(c);
}
function radialSprite(inner, outer){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  var g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,inner); g.addColorStop(1,outer);
  x.fillStyle=g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
function cardFaceTexture(val, suit){
  var c=mkCanvas(128,180), x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,128,180);
  g.addColorStop(0,'#eef6ff'); g.addColorStop(1,'#c6d9ec');
  x.fillStyle=g; x.fillRect(0,0,128,180);
  x.strokeStyle='rgba(30,50,80,.35)'; x.lineWidth=3; x.strokeRect(4,4,120,172);
  x.fillStyle = (suit==='♥'||suit==='♦') ? '#8a3a4a' : '#1c3048';
  x.textAlign='center';
  x.font='700 56px Georgia,serif'; x.fillText(String(val), 64, 82);
  x.font='44px Georgia,serif'; x.fillText(suit, 64, 136);
  return new THREE.CanvasTexture(c);
}
function tabletTexture(title, sub){
  var c=mkCanvas(512,1024), x=c.getContext('2d');
  x.fillStyle='#101b30'; x.fillRect(0,0,512,1024);
  for(var i=0;i<2600;i++){
    x.fillStyle='rgba(0,0,0,'+(Math.random()*0.12)+')';
    x.fillRect(Math.random()*512,Math.random()*1024,2,2);
  }
  x.strokeStyle='rgba(159,212,255,.4)'; x.lineWidth=2.5; x.strokeRect(24,24,464,976);
  x.fillStyle='#d8ecff'; x.textAlign='center';
  x.font='700 120px "STKaiti","KaiTi","Songti SC",serif';
  var ch=title.replace(/\s+/g,'').split(''), cy=210;
  for(var j=0;j<ch.length;j++){ x.fillText(ch[j],256,cy); cy+=150; }
  x.font='300 36px "Segoe UI",sans-serif'; x.globalAlpha=.6;
  x.fillStyle='#9fd4ff'; x.fillText(sub,256,930);
  return new THREE.CanvasTexture(c);
}

/* ---------- 灯光 ---------- */
scene.add(new THREE.HemisphereLight(0x3a5a8a, 0x0a1020, 0.55));
var lamp = new THREE.PointLight(0xbfe0ff, 1.5, 26, 2);
lamp.position.set(0, 5.2, 0); scene.add(lamp);
var coolFill = new THREE.DirectionalLight(0x4a6aa8, 0.35);
coolFill.position.set(-14, 10, -10); scene.add(coolFill);

/* ---------- 背景剪影层 ---------- */
var bgLayers = [];
[[ -34, 0.9, 60, 0.55], [-56, 1.35, 90, 0.4], [-86, 1.9, 130, 0.3]].forEach(function(L, idx){
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(L[2], L[2]*0.5),
    new THREE.MeshBasicMaterial({map:silhouetteTexture(idx), transparent:true, opacity:L[3], fog:false, depthWrite:false}));
  m.position.set(0, L[2]*0.5*0.32, L[0]);
  scene.add(m); bgLayers.push(m);
});
/* 洞顶 */
(function(){
  var mat = new THREE.MeshBasicMaterial({color:0x050a16, fog:false});
  for(var i=0;i<24;i++){
    var h=rnd(3,10);
    var st = new THREE.Mesh(new THREE.ConeGeometry(rnd(0.5,1.6), h, 6), mat);
    st.position.set(rnd(-30,30), 22-rnd(0,4)+h/2, rnd(-40,6));
    st.rotation.x = Math.PI; scene.add(st);
  }
})();

/* ---------- 雨丝（远景） ---------- */
(function(){
  var N=240, pos=new Float32Array(N*6);
  for(var i=0;i<N;i++){
    var x=rnd(-50,50), y=rnd(0,24), z=-30+rnd(-4,4);
    pos[i*6]=x; pos[i*6+1]=y; pos[i*6+2]=z;
    pos[i*6+3]=x; pos[i*6+4]=y-rnd(0.8,1.6); pos[i*6+5]=z;
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var m=new THREE.LineBasicMaterial({color:0x2a4a78, transparent:true, opacity:0.4, fog:false});
  var lines=new THREE.LineSegments(g,m); scene.add(lines);
  window.__rain = {geo:g, n:N};
})();

/* ---------- 孢子 / 魂光 ---------- */
var spores;
(function(){
  var N=420, pos=new Float32Array(N*3), ph=new Float32Array(N);
  for(var i=0;i<N;i++){
    pos[i*3]=rnd(-16,16); pos[i*3+1]=rnd(0,12); pos[i*3+2]=rnd(-20,10);
    ph[i]=Math.random()*6.28;
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('ph', new THREE.BufferAttribute(ph,1));
  var m=new THREE.ShaderMaterial({
    uniforms:{uT:{value:0}, uColor:{value:new COL(0xbfe8ff)}, uSoul:{value:new COL(0x8fd0ff)}},
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:[
      'attribute float ph; uniform float uT; varying float vS;',
      'void main(){',
      '  vec3 p=position;',
      '  p.y += mod(uT*0.25+ph*2.0, 12.0);',
      '  p.x += sin(uT*0.4+ph)*0.8; p.z += cos(uT*0.3+ph*1.3)*0.8;',
      '  vec4 mv=modelViewMatrix*vec4(p,1.0);',
      '  vS = step(0.9, fract(ph));',
      '  gl_PointSize = (1.4+2.6*fract(ph*7.0)) * (14.0/max(-mv.z,1.0)) * 3.0;',
      '  gl_Position=projectionMatrix*mv;',
      '}'].join('\n'),
    fragmentShader:[
      'uniform vec3 uColor; uniform vec3 uSoul; varying float vS;',
      'void main(){',
      '  vec2 d=gl_PointCoord-0.5; float a=smoothstep(0.5,0.02,length(d));',
      '  gl_FragColor=vec4(mix(uColor,uSoul,vS), a*(0.35+0.65*vS));',
      '}'].join('\n')
  });
  spores = new THREE.Points(g,m); spores.frustumCulled=false; scene.add(spores);
})();

/* ---------- 吊灯 ---------- */
var lampGlass;
(function(){
  var g = new THREE.Group(); g.position.set(0,0,0); scene.add(g);
  var chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,8,6),
    new THREE.MeshBasicMaterial({color:0x0a1220}));
  chain.position.y=10; g.add(chain);
  var shade = new THREE.Mesh(new THREE.ConeGeometry(0.85,0.8,10,1,true),
    new THREE.MeshPhongMaterial({color:0x16233c, side:THREE.DoubleSide, shininess:30}));
  shade.position.y=5.7; g.add(shade);
  lampGlass = new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),
    new THREE.MeshBasicMaterial({color:0xd8eeff}));
  lampGlass.position.y=5.35; g.add(lampGlass);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map:radialSprite('rgba(190,230,255,.85)','rgba(190,230,255,0)'),
    transparent:true, opacity:0.8, depthWrite:false, blending:THREE.AdditiveBlending}));
  glow.scale.set(4.5,4.5,1); glow.position.y=5.35; g.add(glow);
})();

/* ---------- 石桌 ---------- */
var TABLE_R = 2.6, TABLE_Y = 1.0;
(function(){
  var top = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R+0.15, 0.28, 24),
    new THREE.MeshPhongMaterial({color:0x223250, shininess:14, specular:0x4a6a9a}));
  top.position.y = TABLE_Y-0.14; scene.add(top);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(TABLE_R, 0.07, 8, 32),
    new THREE.MeshPhongMaterial({color:0x3a5a8c, shininess:40}));
  rim.rotation.x = Math.PI/2; rim.position.y = TABLE_Y; scene.add(rim);
  var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 0.9, 12),
    new THREE.MeshPhongMaterial({color:0x16223a, shininess:8}));
  leg.position.y = 0.45; scene.add(leg);
  // 符文环
  var runeRing = new THREE.Mesh(new THREE.RingGeometry(TABLE_R-0.5, TABLE_R-0.42, 40),
    new THREE.MeshBasicMaterial({color:0x9fd4ff, transparent:true, opacity:0.35, side:THREE.DoubleSide}));
  runeRing.rotation.x=-Math.PI/2; runeRing.position.y=TABLE_Y+0.01; scene.add(runeRing);
})();

/* ---------- 牌桌上的牌 ---------- */
var cardGeo = new THREE.BoxGeometry(0.52, 0.015, 0.74);
var cardBackMat = new THREE.MeshPhongMaterial({color:0x2a4a7c, shininess:30, specular:0x6a9ad0});
var deckGroup = new THREE.Group(); deckGroup.position.set(-0.9, TABLE_Y+0.14, 0); scene.add(deckGroup);
for(var di=0; di<10; di++){
  var dm = new THREE.Mesh(cardGeo, cardBackMat);
  dm.position.y = di*0.018;
  dm.rotation.y = rnd(-0.06,0.06);
  deckGroup.add(dm);
}

/* ---------- 座位与角色 ---------- */
var SEAT_ANGLES = [90, 162, 234, 306, 18];  // 玩家在 90°(+Z)
var SEAT_R = 4.1;
var seats = [];
function seatPos(a){
  var rad = a*Math.PI/180;
  return new V3(Math.cos(rad)*SEAT_R, 0, Math.sin(rad)*SEAT_R);
}
var NPC_DEFS = [
  {a:162, name:'白袍旅人', tint:0x2a3c5c},
  {a:234, name:'旧鼓手',   tint:0x243048},
  {a:306, name:'针与线',   tint:0x303048},
  {a:18,  name:'蘑菇先生', tint:0x1e3040}
];
function mkBug(tint, hero){
  var g = new THREE.Group();
  var cloak = new THREE.Mesh(new THREE.ConeGeometry(0.5,1.05,8),
    new THREE.MeshPhongMaterial({color:tint, shininess:10}));
  cloak.position.y=0.52; cloak.castShadow=false; g.add(cloak);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.3,14,12),
    new THREE.MeshPhongMaterial({color:0xe6eef8, shininess:60, specular:0xffffff}));
  head.position.y=1.22; g.add(head);
  [-1,1].forEach(function(s){
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.055,8,8),
      new THREE.MeshBasicMaterial({color:0x0a1424}));
    eye.position.set(s*0.11,1.24,0.26); g.add(eye);
  });
  // 角
  var hornMat = new THREE.MeshPhongMaterial({color:0xe6eef8, shininess:60});
  if(hero){
    [-1,1].forEach(function(s){
      var h = new THREE.Mesh(new THREE.ConeGeometry(0.05,0.55,6), hornMat);
      h.position.set(s*0.16,1.62,0); h.rotation.z = -s*0.5; g.add(h);
    });
  } else {
    for(var i=0;i<2;i++){
      var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.5,4), hornMat);
      ant.position.set((i?0.1:-0.1),1.66,0); ant.rotation.z=(i?0.35:-0.35); g.add(ant);
      var tip = new THREE.Mesh(new THREE.SphereGeometry(0.045,6,6),
        new THREE.MeshBasicMaterial({color:0x9fd4ff}));
      tip.position.set((i?0.18:-0.18),1.9,0); g.add(tip);
    }
  }
  return g;
}
function mkStool(){
  var g = new THREE.Group();
  var seat = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.6,0.35,10),
    new THREE.MeshPhongMaterial({color:0x1a2438, shininess:8}));
  seat.position.y=0.55; g.add(seat);
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,0.55,8),
    new THREE.MeshPhongMaterial({color:0x121c30}));
  pole.position.y=0.28; g.add(pole);
  return g;
}
SEAT_ANGLES.forEach(function(a, idx){
  var pos = seatPos(a);
  var g = new THREE.Group(); g.position.copy(pos);
  g.lookAt(0, 0, 0);   // 面向桌心
  scene.add(g);
  var stool = mkStool(); g.add(stool);
  var seatRec = {idx:idx, angle:a, group:g, pos:pos.clone(), name:'', isPlayer: idx===0};
  if(idx===0){
    // 玩家空位 + 小灯
    var lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.34,0.24),
      new THREE.MeshBasicMaterial({color:0xcfe8ff}));
    lantern.position.set(0,1.1,0.45); g.add(lantern);
    var pl = new THREE.PointLight(0x9fd4ff, 0.8, 7, 2);
    pl.position.set(0,1.2,0.5); g.add(pl);
    seatRec.lantern = lantern;
    seatRec.name = '你（空位）';
  } else {
    var def = NPC_DEFS[idx-1];
    var bug = mkBug(def.tint, def.name==='针与线');
    bug.position.y = 0.72;
    bug.rotation.y = Math.PI;   // 面向桌心
    g.add(bug);
    seatRec.bug = bug;
    seatRec.name = def.name;
  }
  seats.push(seatRec);
});

/* ---------- 石碑（3D 背板 + DOM 面板） ---------- */
var TABLETS = [
  {key:'about',   a: 150, r:15, y:3.4, w:8.6, h:6.0, tx:'林 澈', st:'ABOUT'},
  {key:'skills',  a: 200, r:15, y:3.4, w:8.6, h:6.0, tx:'技 艺', st:'SKILLS'},
  {key:'works',   a: 250, r:16, y:3.6, w:9.0, h:6.2, tx:'遗 物', st:'WORKS'},
  {key:'journey', a: 305, r:15, y:3.4, w:8.6, h:6.0, tx:'旅 程', st:'JOURNEY'},
  {key:'contact', a: 350, r:16, y:3.6, w:8.6, h:6.0, tx:'盟 约', st:'CONTACT'}
];
var panels = [], tabletHits = [];
TABLETS.forEach(function(c){
  var rad = c.a*Math.PI/180;
  var px = Math.cos(rad)*c.r, pz = Math.sin(rad)*c.r;
  var g = new THREE.Group();
  g.position.set(px, 0, pz);
  g.lookAt(0, c.y, 0); g.rotateY(Math.PI);
  scene.add(g);
  var slab = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, 0.7),
    new THREE.MeshPhongMaterial({color:0x101b30, shininess:6}));
  slab.position.y = c.y; g.add(slab);
  var face = new THREE.Mesh(new THREE.PlaneGeometry(c.w*0.8, c.h*0.74),
    new THREE.MeshBasicMaterial({map:tabletTexture(c.tx, c.st)}));
  face.position.set(0, c.y, 0.38); g.add(face);
  var base = new THREE.Mesh(new THREE.BoxGeometry(c.w+1.2, 1.2, 1.4),
    new THREE.MeshPhongMaterial({color:0x0c1526, shininess:4}));
  base.position.y = 0.6; g.add(base);
  var gl = new THREE.PointLight(0x9fd4ff, 0.55, 18, 2);
  gl.position.set(px*0.9, c.y+1.5, pz*0.9); scene.add(gl);
  var nrm = new V3(-Math.cos(rad), 0, -Math.sin(rad)).normalize();
  var el = document.getElementById('pn-'+c.key);
  var center = new V3(px, c.y, pz).addScaledVector(nrm, 0.8);
  panels.push({key:c.key, cfg:c, el:el, pos:center, nrm:nrm,
    right:new V3(nrm.z, 0, -nrm.x), cssW: el.offsetWidth||620, w:c.w*0.92});
  var hit = new THREE.Mesh(new THREE.BoxGeometry(c.w+2, c.h+2, 2),
    new THREE.MeshBasicMaterial({visible:false}));
  hit.position.copy(center); hit.lookAt(center.clone().add(nrm));
  hit.userData.tablet = c.key; scene.add(hit); tabletHits.push(hit);
});

var _pv=new V3(), _pr=new V3();
var handAnchor = {pos:new V3(0, 2.35, 6.6), nrm:new V3(0,0,1), right:new V3(1,0,0), w:5.6};
function projectPanel(el, pos, nrm, right, w, cssW, active){
  var facing = camera.position.clone().sub(pos).normalize().dot(nrm);
  _pv.copy(pos).project(camera);
  _pr.copy(pos).addScaledVector(right, w*0.5).project(camera);
  var behind = _pv.z > 1;
  var x1=(_pv.x*0.5+0.5)*window.innerWidth, y1=(-_pv.y*0.5+0.5)*window.innerHeight;
  var x2=(_pr.x*0.5+0.5)*window.innerWidth, y2=(-_pr.y*0.5+0.5)*window.innerHeight;
  var dx=x2-x1, dy=y2-y1;
  var pxW = Math.sqrt(dx*dx+dy*dy)*2;
  var ang = Math.atan2(dy,dx)*180/Math.PI;
  var s = clamp(pxW/cssW, 0.05, 1.7);
  var op = (behind || facing<0.02) ? 0 : clamp(facing*3.0, 0, 1) * clamp(1-(camera.position.distanceTo(pos)-46)/30, 0, 1);
  el.style.transform = 'translate3d('+x1.toFixed(1)+'px,'+y1.toFixed(1)+'px,0) translate(-50%,-50%) rotate('+ang.toFixed(2)+'deg) scale('+s.toFixed(3)+')';
  el.style.opacity = op.toFixed(3);
  el.style.pointerEvents = (op>0.4 && s>0.3) ? 'auto' : 'none';
  if(active!==undefined) el.classList.toggle('on', active);
}
function updatePanels(){
  for(var i=0;i<panels.length;i++){
    var p=panels[i];
    projectPanel(p.el, p.pos, p.nrm, p.right, p.w, p.cssW, p.key===activeKey);
  }
  var handOn = !!playerTurn;
  projectPanel(handEl, handAnchor.pos, handAnchor.nrm, handAnchor.right, handAnchor.w, 552, handOn);
  handEl.classList.toggle('on', handOn && handOpacityOK());
}
function handOpacityOK(){
  var facing = camera.position.clone().sub(handAnchor.pos).normalize().dot(handAnchor.nrm);
  return facing > 0;
}
/* ---------- 相机 ---------- */
var rig = {
  target:new V3(0,1.7,0), yaw:0.5, pitch:0.34, dist:12.5,
  tTarget:new V3(0,1.7,0), tYaw:0.5, tPitch:0.34, tDist:12.5,
  tween:0, dur:1.4, active:false, paused:false
};
function flyTo(o, dur){
  rig.tTarget.set(o.t[0],o.t[1],o.t[2]);
  rig.tYaw=o.yaw; rig.tPitch=o.pitch; rig.tDist=o.dist;
  rig.active=true; rig.tween=0; rig.dur=dur||1.4;
}
function updateRig(dt){
  if(rig.active){
    rig.tween += dt/rig.dur;
    var e = rig.tween<0.5 ? 4*rig.tween*rig.tween*rig.tween : 1-Math.pow(-2*rig.tween+2,3)/2;
    rig.target.lerp(rig.tTarget, clamp(e*0.14+0.01,0,1));
    rig.yaw   = lerp(rig.yaw, rig.tYaw, clamp(e*0.12+0.01,0,1));
    rig.pitch = lerp(rig.pitch, rig.tPitch, clamp(e*0.12+0.01,0,1));
    rig.dist  = lerp(rig.dist, rig.tDist, clamp(e*0.12+0.01,0,1));
    if(rig.tween>=1.4) rig.active=false;
  } else if(!drag.on && !rig.paused){
    rig.yaw += dt*0.03;
  }
  var cp=Math.cos(rig.pitch), sp=Math.sin(rig.pitch);
  camera.position.set(
    rig.target.x + Math.sin(rig.yaw)*cp*rig.dist,
    rig.target.y + sp*rig.dist,
    rig.target.z + Math.cos(rig.yaw)*cp*rig.dist);
  camera.lookAt(rig.target);
}

var activeKey = null, playerTurn = false;
var handEl = document.getElementById('hand');
function setHud(name, desc){
  document.getElementById('hudT').textContent = name;
  document.getElementById('hudD').textContent = desc;
  var as = document.querySelectorAll('#nav a.wp');
  for(var i=0;i<as.length;i++) as[i].classList.toggle('active', as[i].dataset.wp===activeKey);
}
function focusTablet(k){
  for(var i=0;i<panels.length;i++){
    if(panels[i].key===k){
      activeKey = k;
      flyTo({t:[panels[i].pos.x*0.86, panels[i].pos.y, panels[i].pos.z*0.86],
             yaw:Math.atan2(-panels[i].pos.x, -panels[i].pos.z), pitch:0.14, dist:8.2}, 1.5);
      setHud(panels[i].cfg.tx.replace(/\s+/g,''), panels[i].cfg.st);
      return;
    }
  }
}
function goTable(){
  activeKey = null;
  flyTo({t:[0,1.7,0], yaw:rig.yaw, pitch:0.34, dist:12.5}, 1.4);
  setHud('空洞牌局','拖拽环视 · 轮到你时出牌');
}

/* ---------- 交互 ---------- */
var drag = {on:false, x:0, y:0, moved:0};
var ray = new THREE.Raycaster(), mouse = {x:0,y:0};
var tipEl = document.getElementById('tip');
canvas.addEventListener('pointerdown', function(e){
  drag.on=true; drag.x=e.clientX; drag.y=e.clientY; drag.moved=0;
  canvas.classList.add('grabbing');
  if(canvas.setPointerCapture){ try{ canvas.setPointerCapture(e.pointerId); }catch(err){} }
});
window.addEventListener('pointermove', function(e){
  if(drag.on){
    var dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    drag.moved += Math.abs(dx)+Math.abs(dy);
    rig.yaw -= dx*0.005;
    rig.pitch = clamp(rig.pitch + dy*0.003, 0.08, 0.85);
    drag.x=e.clientX; drag.y=e.clientY;
    rig.active=false;
  }
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  tipEl.style.left=e.clientX+'px'; tipEl.style.top=e.clientY+'px';
});
window.addEventListener('pointerup', function(e){
  if(drag.on && drag.moved<6) doPick(e.clientX, e.clientY);
  drag.on=false; canvas.classList.remove('grabbing');
});
canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  rig.dist = clamp(rig.dist*(e.deltaY>0?1.09:0.92), 5, 30);
  rig.active=false;
},{passive:false});
window.addEventListener('keydown', function(e){ if(e.key==='Escape') goTable(); });

var FLAVOR = [
  '白袍旅人敲了敲桌面：「这一局，牌运在你那边。」',
  '旧鼓手哼起很久以前的曲子。',
  '针与线把牌立起来又推倒：「规则就是拿来绕开的。」',
  '蘑菇先生说：「深处的雨，从来不会停。」',
  '有人吹熄了多余的烛火。牌局继续。'
];
function doPick(px,py){
  mouse.x=(px/window.innerWidth)*2-1;
  mouse.y=-(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(tabletHits, false);
  if(hits.length){ focusTablet(hits[0].object.userData.tablet); return; }
  var bugHits = [];
  seats.forEach(function(s){ if(s.bug) bugHits.push(s.bug); });
  var bh = ray.intersectObjects(bugHits, true);
  if(bh.length){
    log(FLAVOR[Math.floor(Math.random()*FLAVOR.length)]);
  }
}
function hoverTip(){
  if(drag.on){ tipEl.style.opacity=0; return; }
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(tabletHits, false);
  if(hits.length){
    var k = hits[0].object.userData.tablet, nm='';
    for(var i=0;i<panels.length;i++) if(panels[i].key===k) nm=panels[i].cfg.tx.replace(/\s+/g,'');
    tipEl.textContent = '阅读「'+nm+'」'; tipEl.style.opacity=0.95;
    canvas.style.cursor='pointer';
  } else {
    tipEl.style.opacity=0;
    canvas.style.cursor = drag.on?'grabbing':'grab';
  }
}

/* ---------- 牌局逻辑 ---------- */
var SUITS = ['♠','♥','♣','♦'];
var game = {round:0, maxRounds:8, pot:5, souls:0, turn:0, phase:'idle',
            playerHand:[], npcHands:[[],[],[],[]], played:[null,null,null,null,null]};
var soulEl = document.getElementById('soul');
var logEl = document.getElementById('log');
function log(s){ logEl.innerHTML = s; }
function logPush(s){ logEl.innerHTML += '<br>'+s; }
function buildDeck(){
  var d=[];
  for(var s=0;s<4;s++) for(var v=1;v<=10;v++) d.push({v:v, s:SUITS[s]});
  for(var i=d.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=d[i]; d[i]=d[j]; d[j]=t; }
  return d;
}
function deal(){
  var deck = buildDeck();
  game.playerHand=[]; game.npcHands=[[],[],[],[]];
  for(var i=0;i<5;i++){
    game.playerHand.push(deck.pop());
    for(var k=0;k<4;k++) game.npcHands[k].push(deck.pop());
  }
  game.round=1; game.pot=5; game.turn=0; game.phase='playing';
  game.played=[null,null,null,null,null];
  log('第 1 轮 · 底池 <b>◈5</b> —— 轮到你出牌');
  playerTurn = true;
  renderHand();
}
function renderHand(){
  handEl.innerHTML = '';
  game.playerHand.forEach(function(c,i){
    var d = document.createElement('div');
    d.className = 'hcard';
    d.innerHTML = '<div class="r">'+c.v+'</div><div class="s">'+c.s+'</div><div class="b">出牌</div>';
    d.onclick = function(){ playerPlay(i); };
    handEl.appendChild(d);
  });
}
function playerPlay(i){
  if(!playerTurn || game.phase!=='playing' || game.turn!==0) return;
  var c = game.playerHand.splice(i,1)[0];
  playerTurn = false;
  renderHand();
  playCardToTable(0, c);
  nextTurn();
}
var tweens = [];
function tweenCard(mesh, to, dur, onDone){
  tweens.push({mesh:mesh, from:mesh.position.clone(), to:to.clone(), t:0, dur:dur, onDone:onDone});
}
function makeCardMesh(card){
  var face = new THREE.MeshPhongMaterial({map:cardFaceTexture(card.v, card.s), shininess:20});
  var mats = [cardBackMat, cardBackMat, face, cardBackMat, cardBackMat, cardBackMat];
  return new THREE.Mesh(cardGeo, mats);
}
function playCardToTable(seatIdx, card){
  var from = seats[seatIdx].pos.clone(); from.y = TABLE_Y+0.6;
  var rad = seats[seatIdx].angle*Math.PI/180;
  var to = new V3(Math.cos(rad)*1.05, TABLE_Y+0.16+game.round*0.004, Math.sin(rad)*1.05);
  var mesh = makeCardMesh(card);
  mesh.position.copy(from);
  mesh.rotation.y = rnd(0,6.28);
  scene.add(mesh);
  tweenCard(mesh, to, 0.55, function(){ mesh.rotation.y = rnd(-0.4,0.4); });
  game.played[seatIdx] = {card:card, mesh:mesh};
  log(seats[seatIdx].name+' 打出了 <b>'+card.v+' '+card.s+'</b>');
}
function nextTurn(){
  game.turn++;
  if(game.turn > 4){ resolveRound(); }
}
function resolveRound(){
  var best=-1, winIdx=0;
  for(var i=0;i<5;i++){
    if(game.played[i] && game.played[i].card.v > best){ best=game.played[i].card.v; winIdx=i; }
  }
  if(winIdx===0){
    game.souls += game.pot;
    logPush('<b>你赢下了这一池 ◈'+game.pot+'</b> —— 桌对面传来叹息');
    soulEl.textContent = '◈ 魂魄 '+game.souls;
  } else {
    logPush('<b>'+seats[winIdx].name+'</b> 收下底池 ◈'+game.pot);
  }
  game.pot += 2;
  for(i=0;i<5;i++){
    (function(idx){
      var rec = game.played[idx];
      if(!rec) return;
      tweens.push({mesh:rec.mesh, from:rec.mesh.position.clone(),
        to:rec.mesh.position.clone().add(new V3(0,-0.4,0)), t:0, dur:0.9,
        onDone:function(){ scene.remove(rec.mesh); }, fade:true});
    })(i);
  }
  game.played=[null,null,null,null,null];
  game.round++;
  if(game.round > game.maxRounds){
    game.phase='idle'; playerTurn=false;
    logPush('牌局终了 · 你带着 <b>◈'+game.souls+'</b> 的魂魄离开（也随时可以回来）');
    handEl.innerHTML='';
  } else {
    game.phase='roundEnd'; turnTimer=0;
  }
}
var turnTimer = 0;
function stepGame(dt){
  if(game.phase==='idle') return;
  if(game.phase==='playing'){
    if(game.turn===0){
      if(!playerTurn){ playerTurn=true; log('轮到你了 —— 点击一张手牌'); }
    } else {
      turnTimer += dt;
      if(turnTimer > 1.05){
        turnTimer = 0;
        var hand = game.npcHands[game.turn-1];
        if(hand.length){
          var c = hand.splice(Math.floor(Math.random()*hand.length),1)[0];
          playCardToTable(game.turn, c);
        }
        nextTurn();
      }
    }
  } else if(game.phase==='roundEnd'){
    turnTimer += dt;
    if(turnTimer > 2.0){
      turnTimer=0;
      game.turn=0; game.phase='playing';
      log('第 '+game.round+' 轮 · 底池 <b>◈'+game.pot+'</b>');
    }
  }
}

/* ---------- 控制台 ---------- */
document.getElementById('bDeal').onclick = function(){
  clearTable(); deal();
  setHud('空洞牌局','新的一局开始了');
};
function clearTable(){
  for(var i=0;i<5;i++){ if(game.played[i]){ scene.remove(game.played[i].mesh); game.played[i]=null; } }
  tweens.length = 0;
}
var lampOn = true;
document.getElementById('bLamp').onclick = function(){
  lampOn = !lampOn;
  this.classList.toggle('on', !lampOn);
  this.textContent = lampOn ? '灯火' : '黑暗';
};
var tourBtn = document.getElementById('bTour');
var tour = {on:false, i:0, t:0};
tourBtn.onclick = function(){ tour.on=!tour.on; tourBtn.classList.toggle('on', tour.on); };
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var ni=0;ni<navLinks.length;ni++){
  navLinks[ni].addEventListener('click', function(){ focusTablet(this.dataset.wp); });
}

/* ---------- 主循环 ---------- */
var clock = new THREE.Clock(), timeNow = 0, tipT = 0;
setHud('空洞牌局','拖拽环视 · 轮到你时出牌');
function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt;

  spores.material.uniforms.uT.value = timeNow;
  var rain = window.__rain;
  if(rain){
    var rp = rain.geo.attributes.position;
    for(var ri=0; ri<rain.n; ri++){
      var y = rp.getY(ri*2) - dt*4.2;
      if(y < 0) y += 24;
      rp.setY(ri*2, y); rp.setY(ri*2+1, y-1.1);
    }
    rp.needsUpdate = true;
  }
  var flicker = 1.35 + Math.sin(timeNow*9)*0.08 + Math.sin(timeNow*23)*0.06;
  lamp.intensity = lampOn ? flicker : 0.12;
  lampGlass.material.color.setHex(lampOn ? 0xd8eeff : 0x223248);
  if(seats[0].lantern) seats[0].lantern.material.color.setHex(playerTurn ? 0xffffff : 0x8fb8e0);
  seats.forEach(function(s, i){
    if(s.bug){
      s.bug.rotation.z = Math.sin(timeNow*0.8+i*1.7)*0.05;
      s.bug.position.y = 0.72 + Math.sin(timeNow*1.3+i*2.1)*0.03;
    }
  });

  stepGame(dt);

  for(var ti=tweens.length-1; ti>=0; ti--){
    var tw = tweens[ti];
    tw.t += dt/tw.dur;
    var e2 = tw.t<1 ? tw.t : 1;
    e2 = 1-Math.pow(1-e2,3);
    tw.mesh.position.lerpVectors(tw.from, tw.to, e2);
    tw.mesh.rotation.y += dt*3;
    if(tw.fade) tw.mesh.scale.setScalar(Math.max(0.01, 1-e2));
    if(tw.t>=1){
      if(tw.onDone) tw.onDone();
      tweens.splice(ti,1);
    }
  }

  if(tour.on){
    tour.t += dt;
    if(tour.t > 6){ tour.t=0; tour.i=(tour.i+1)%panels.length; focusTablet(panels[tour.i].key); }
  }

  updateRig(dt);
  updatePanels();
  tipT += dt;
  if(tipT>0.1){ tipT=0; hoverTip(); }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setTimeout(function(){
  document.getElementById('ldbar').style.width='100%';
  setTimeout(function(){ document.getElementById('loader').classList.add('gone'); }, 300);
  deal();
}, 600);

})();
