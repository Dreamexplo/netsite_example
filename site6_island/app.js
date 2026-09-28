/* ============================================================
   落日小岛 · site6_island —— 纪念碑谷式正交视角
   ============================================================ */
(function(){
"use strict";

var V3 = THREE.Vector3, COL = THREE.Color;
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function rnd(a,b){ return a+Math.random()*(b-a); }
function lerpColor(c1,c2,t){ return new COL(c1).lerp(new COL(c2), clamp(t,0,1)); }

var canvas = document.getElementById('bg');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf2a06a, 150, 420);

var VIEW = 13;
var camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,500);
function setSize(){
  var asp = window.innerWidth/window.innerHeight;
  camera.left = -asp*VIEW; camera.right = asp*VIEW;
  camera.top = VIEW; camera.bottom = -VIEW;
  camera.updateProjectionMatrix();
}
setSize();

/* ---------- 贴图 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function stripeTex(base, line, n){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  x.fillStyle=base; x.fillRect(0,0,128,128);
  x.fillStyle=line;
  for(var i=0;i<n;i++) x.fillRect(0, i*(128/n), 128, 2.2);
  var t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}
function radialSprite(inner, outer){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  var g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,inner); g.addColorStop(1,outer);
  x.fillStyle=g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}

/* ---------- 调色（随日晷时刻变化） ---------- */
var PAL = {
  sky:[[0x2e2a4a,0x7a4e63,0xc96f5a,0xf2a06a,0xffcf9a],
       [0x1a1c33,0x3a2c4e,0x8a4a52,0xc9745a,0xf2b088],
       [0x0d1026,0x1c1e3e,0x33305e,0x584070,0x8a5a72]],
  water:[0x4f9a94, 0x3f7a86, 0x2c4a6e],
  fog:[0xf2a06a, 0xd88a70, 0x584a78],
  blockSide:[0xefdcc3, 0xe0c4ae, 0xb8a0b4],
  blockTop:[0xe8b896, 0xd8a088, 0x9a84a8],
  sun:[1.0, 0.75, 0.0]
};
var timeVal = 0.62;      // 0 黎明 → 0.5 黄昏 → 1 夜
function palLerp(arr){
  // arr: [dawn, dusk, night]，timeVal 0..1，0.5 为黄昏
  if(timeVal <= 0.5) return lerp(arr[0], arr[1], timeVal*2);
  return lerp(arr[1], arr[2], (timeVal-0.5)*2);
}
function applySky(){
  var t = timeVal;
  function hex(h){ return '#'+('00000'+h.toString(16)).slice(-6); }
  function stops(idx){
    var p = PAL.sky[idx];
    return 'linear-gradient(180deg,'+hex(p[0])+' 0%,'+hex(p[1])+' 34%,'+hex(p[2])+' 58%,'+hex(p[3])+' 78%,'+hex(p[4])+' 94%)';
  }
  var a, b, k;
  if(t<=0.5){ a=stops(0); b=stops(1); k=t*2; } else { a=stops(1); b=stops(2); k=(t-0.5)*2; }
  document.body.style.background = a;   // 简化：直接取主档，避免跨档突变
  var idx = t<=0.5 ? (t<0.25?0:1) : (t<0.75?1:2);
  document.body.style.background = stops(idx);
  scene.fog.color = lerpColor(PAL.fog[0], PAL.fog[idx===0?0:(idx===1?1:2)], 1);
  waterMat.color = lerpColor(PAL.water[0], PAL.water[idx===0?0:(idx===1?1:2)], 1);
  sideMat.color = lerpColor(PAL.blockSide[0], PAL.blockSide[idx===0?0:(idx===1?1:2)], 1);
  topMat.color  = lerpColor(PAL.blockTop[0],  PAL.blockTop[idx===0?0:(idx===1?1:2)], 1);
  stars.material.opacity = idx===2 ? 0.9 : (idx===1 ? 0.25 : 0);
  sunMesh.material.opacity = clamp(1 - Math.abs(t-0.42)*1.8, 0, 0.95);
  key.intensity = idx===2 ? 0.35 : (idx===1 ? 1.0 : 1.25);
  hemi.intensity = idx===2 ? 0.5 : 0.85;
  var sunEl = document.getElementById('sun');
  sunEl.style.opacity = clamp(1.15 - Math.abs(t-0.55)*1.9, 0, 1);
  sunEl.style.top = (30 + t*26)+'%';
}

/* ---------- 灯光 ---------- */
var hemi = new THREE.HemisphereLight(0xffe0c0, 0x5a6a8a, 0.85); scene.add(hemi);
var key = new THREE.DirectionalLight(0xffd9a8, 1.2);
key.position.set(30, 46, 24);
key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
key.shadow.camera.near=1; key.shadow.camera.far=160;
key.shadow.camera.left=-42; key.shadow.camera.right=42;
key.shadow.camera.top=42; key.shadow.camera.bottom=-42;
key.shadow.bias=-0.0005;
scene.add(key);
var fill = new THREE.DirectionalLight(0x8ab0d8, 0.35); fill.position.set(-30,20,-20); scene.add(fill);

/* ---------- 海面 ---------- */
var waterMat = new THREE.MeshPhongMaterial({color:0x4f9a94, shininess:80, specular:0x88ccc0, transparent:true, opacity:0.96});
var waterGeo = new THREE.PlaneGeometry(900,900,64,64); waterGeo.rotateX(-Math.PI/2);
var water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = -3; water.receiveShadow = true; scene.add(water);
var tideBase = -3;
function updateWater(t){
  var p = waterGeo.attributes.position;
  for(var i=0;i<p.count;i++){
    var x=p.getX(i), z=p.getZ(i);
    p.setY(i, Math.sin(x*0.14+t*1.1)*0.22 + Math.cos(z*0.11+t*0.8)*0.20 + Math.sin((x+z)*0.05+t*0.5)*0.28);
  }
  p.needsUpdate = true;
  water.position.y = tideBase;
  waterGeo.computeVertexNormals();
}

/* ---------- 星空 / 云 / 太阳圆盘 ---------- */
var stars = (function(){
  var N=320, pos=new Float32Array(N*3);
  for(var i=0;i<N;i++){
    var th=Math.random()*6.2832, ph=Math.random()*1.2, r=220;
    pos[i*3]=Math.cos(th)*Math.cos(ph)*r; pos[i*3+1]=Math.sin(ph)*r+20; pos[i*3+2]=Math.sin(th)*Math.cos(ph)*r;
  }
  var g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var m=new THREE.PointsMaterial({color:0xfff4e0, size:1.6, sizeAttenuation:false, transparent:true, opacity:0, depthWrite:false, fog:false});
  var pts=new THREE.Points(g,m); pts.frustumCulled=false; scene.add(pts); return pts;
})();
var sunMesh = new THREE.Mesh(new THREE.CircleGeometry(16,40),
  new THREE.MeshBasicMaterial({color:0xffe8c0, transparent:true, opacity:0.9, fog:false, depthWrite:false}));
sunMesh.position.set(-90, 24, -160); scene.add(sunMesh);

var clouds = [];
(function(){
  var m = new THREE.MeshBasicMaterial({color:0xfff0e0, transparent:true, opacity:0.85, fog:false});
  for(var i=0;i<7;i++){
    var g = new THREE.Group();
    var n = 2+Math.floor(Math.random()*3);
    for(var k=0;k<n;k++){
      var b = new THREE.Mesh(new THREE.BoxGeometry(rnd(5,9), rnd(1.2,2), 2.4), m);
      b.position.set(rnd(-3,3), rnd(-0.5,0.5), 0); g.add(b);
    }
    g.position.set(rnd(-120,120), rnd(22,40), rnd(-140,-60));
    g.userData.v = rnd(0.6,1.6);
    scene.add(g); clouds.push(g);
  }
})();

/* ---------- 方块语言 ---------- */
var sideMat = new THREE.MeshPhongMaterial({color:0xefdcc3, shininess:8});
var topMat  = new THREE.MeshPhongMaterial({color:0xe8b896, shininess:8});
var darkMat = new THREE.MeshPhongMaterial({color:0x9a7a6a, shininess:8});
var tealMat = new THREE.MeshPhongMaterial({color:0x3f8f8b, shininess:24, specular:0x6fc0b4});
var goldMat = new THREE.MeshPhongMaterial({color:0xe8b25a, shininess:70, specular:0xffe0a0});
var creamMat= new THREE.MeshPhongMaterial({color:0xfff4e4, shininess:10});

function mkBlock(w,h,d){
  var g = new THREE.BoxGeometry(w,h,d);
  var mats = [sideMat, sideMat, topMat, darkMat, sideMat, sideMat];
  return new THREE.Mesh(g, mats);
}
function put(parent, mesh, x,y,z, ry){
  if(ry) mesh.rotation.y = ry;
  mesh.position.set(x,y,z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

/* ---------- 岛体 ---------- */
var island = new THREE.Group(); scene.add(island);
function tier(x,z,w,d,y0,h){
  var b = mkBlock(w,h,d); put(island, b, x, y0+h/2, z); return b;
}
tier(0,0, 30,30, -6, 4);       // 基座（半没入水中）
tier(0,0, 24,24, -2, 3);
tier(-1,-1, 17,17, 1, 3);

/* 灯塔（about） */
var beacon, beaconGlowMat;
(function(){
  var g = new THREE.Group(); g.position.set(-8,4,-7); island.add(g);
  var t1 = new THREE.Mesh(new THREE.CylinderGeometry(2.6,3.1,9,10), sideMat);
  t1.position.y=4.5; t1.castShadow=t1.receiveShadow=true; g.add(t1);
  var ring1 = new THREE.Mesh(new THREE.CylinderGeometry(2.9,2.9,0.7,10), tealMat);
  ring1.position.y=8.6; g.add(ring1);
  var lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,2.2,10), creamMat);
  lamp.position.y=10.6; lamp.castShadow=true; g.add(lamp);
  var lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(1.45,1.45,1.7,10),
    new THREE.MeshPhongMaterial({color:0xffe8b0, emissive:0xffc060, emissiveIntensity:0.25, shininess:90, transparent:true, opacity:0.92}));
  lampGlass.position.y=10.6; g.add(lampGlass);
  var cap = new THREE.Mesh(new THREE.ConeGeometry(2.2,1.8,10), tealMat);
  cap.position.y=12.6; cap.castShadow=true; g.add(cap);
  var capBall = new THREE.Mesh(new THREE.SphereGeometry(0.34,10,8), goldMat);
  capBall.position.y=13.7; g.add(capBall);
  beacon = new THREE.PointLight(0xffd080, 0.0, 60, 2); beacon.position.set(0,10.6,0); g.add(beacon);
  beaconGlowMat = new THREE.SpriteMaterial({map:radialSprite('rgba(255,214,150,.9)','rgba(255,190,120,0)'),
    transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending});
  var glowSprite = new THREE.Sprite(beaconGlowMat);
  glowSprite.scale.set(10,10,1); glowSprite.position.y=10.6; g.add(glowSprite);
})();

/* 高塔（skills） */
(function(){
  var g = new THREE.Group(); g.position.set(8.5,4,-6); island.add(g);
  var b1 = mkBlock(5.4,7,5.4); b1.position.y=3.5; b1.castShadow=b1.receiveShadow=true; g.add(b1);
  var b2 = mkBlock(4.2,3.4,4.2); b2.position.y=8.7; b2.rotation.y=0.4; b2.castShadow=true; g.add(b2);
  var b3 = mkBlock(2.8,2.2,2.8); b3.position.y=11.5; b3.rotation.y=0.8; b3.castShadow=true; g.add(b3);
  var flag = new THREE.Mesh(new THREE.ConeGeometry(0.5,1.2,4), goldMat);
  flag.position.y=13.2; g.add(flag);
})();

/* 凉亭（works） */
(function(){
  var g = new THREE.Group(); g.position.set(8,4,7.5); island.add(g);
  var base = mkBlock(5,2.2,5); base.position.y=1.1; base.castShadow=base.receiveShadow=true; g.add(base);
  [-1.9,1.9].forEach(function(px){
    [-1.9,1.9].forEach(function(pz){
      var col = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,3.4,8), tealMat);
      col.position.set(px,3.9,pz); col.castShadow=true; g.add(col);
    });
  });
  var roof = new THREE.Mesh(new THREE.ConeGeometry(3.6,1.7,4), tealMat);
  roof.position.y=6.2; roof.rotation.y=Math.PI/4; roof.castShadow=true; g.add(roof);
  var ball = new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8), goldMat); ball.position.y=7.4; g.add(ball);
})();

/* 码头（contact） */
var pier = new THREE.Group(); pier.position.set(-2,0,13.5); island.add(pier);
(function(){
  var deck = mkBlock(3.2,0.7,9); deck.position.set(0,0.35,3); deck.castShadow=deck.receiveShadow=true; pier.add(deck);
  for(var i=0;i<4;i++){
    var p = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.16,3.6,6), darkMat);
    p.position.set(-1.3+(i%2)*2.6, -1.2, 0.4+i*1.9); pier.add(p);
  }
  var lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,2.6,6), darkMat);
  lampPost.position.set(-1.2,2.0,5.6); pier.add(lampPost);
  var lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8), goldMat);
  lampBall.position.set(-1.2,3.4,5.6); pier.add(lampBall);
  var pl = new THREE.PointLight(0xffd080, 0.7, 16, 2); pl.position.set(-1.2,3.4,5.6); pier.add(pl);
})();

/* 阶梯 & 平台 */
function stairs(x,y0,z,w,steps,ry){
  var g = new THREE.Group(); g.position.set(x,y0,z); g.rotation.y=ry||0; island.add(g);
  for(var i=0;i<steps;i++){
    var s = mkBlock(w,0.5,0.62);
    s.position.set(0, 0.25+i*0.5, -i*0.62);
    s.castShadow=s.receiveShadow=true; g.add(s);
  }
  return g;
}
stairs(2.8,4,3.2, 2.4, 6, 0);          // 上到高台
stairs(-3.4,4,4.4, 2.4, 6, Math.PI);   // 另一侧
var plateau = mkBlock(9,1,9); put(island, plateau, 0, 4.5, -0.5);

/* ---------- 旋转机关（断桥） ---------- */
var crank = {group:null, angle:0, target:0, spinning:false};
(function(){
  var g = new THREE.Group();
  g.position.set(0, 4.55, 6.8); island.add(g);
  var hub = new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.2,0.9,10), tealMat);
  hub.position.y=0.1; hub.castShadow=true; g.add(hub);
  var arm = new THREE.Group(); g.add(arm);
  var bridge = mkBlock(2.6,0.5,5.4);
  bridge.position.set(0,0.32,2.9); bridge.castShadow=bridge.receiveShadow=true; arm.add(bridge);
  var rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.6,5.4), goldMat); rail1.position.set(-1.2,0.8,2.9); arm.add(rail1);
  var rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.6,5.4), goldMat); rail2.position.set(1.2,0.8,2.9); arm.add(rail2);
  var knob = new THREE.Mesh(new THREE.TorusGeometry(0.5,0.09,8,20), goldMat);
  knob.rotation.x=Math.PI/2; knob.position.y=0.9; g.add(knob);
  crank.group=g; crank.arm=arm; crank.knob=knob;
})();

/* ---------- 门扉（3D 门 + DOM 面板锚定） ---------- */
var DOORS = [
  {key:'about',   tower:[-8,4,-7],  ry: Math.PI/4,      w:7.4, off:3.15, faceY:6.4, tx:'灯塔', sub:'ABOUT'},
  {key:'skills',  tower:[8.5,4,-6], ry: Math.PI*0.75,   w:6.8, off:2.85, faceY:6.6, tx:'技艺', sub:'SKILLS'},
  {key:'works',   tower:[8,4,7.5],  ry:-Math.PI/4+Math.PI, w:7.0, off:2.7, faceY:5.6, tx:'航志', sub:'WORKS'},
  {key:'journey', tower:[-6,4,9],   ry: Math.PI*0.28,   w:7.4, off:2.6, faceY:5.8, tx:'航路', sub:'JOURNEY'},
  {key:'contact', pier:[-2,0,13.5], ry: 0.34,           w:6.6, off:1.9, faceY:3.4, tx:'泊船', sub:'CONTACT'}
];
var panels = [], doorMeshes = {};
DOORS.forEach(function(c){
  var nrm = new V3(Math.sin(c.ry), 0, Math.cos(c.ry));
  var base, cx, cy, cz;
  if(c.tower){
    base = new V3(c.tower[0], c.tower[1], c.tower[2]);
  } else {
    base = new V3(c.pier[0], c.pier[1], c.pier[2]);
  }
  // 3D 门体
  var g = new THREE.Group();
  cx = base.x + nrm.x*c.off; cz = base.z + nrm.z*c.off; cy = c.faceY;
  g.position.set(cx, cy, cz); g.rotation.y = c.ry;
  scene.add(g);
  var frame = new THREE.Mesh(new THREE.BoxGeometry(c.w*0.42, 3.4, 0.4), tealMat);
  frame.castShadow = true; g.add(frame);
  var frame2 = new THREE.Mesh(new THREE.BoxGeometry(c.w*0.42+0.7, 0.5, 0.5), goldMat);
  frame2.position.y = 1.95; g.add(frame2);
  var door = new THREE.Mesh(new THREE.BoxGeometry(c.w*0.42-0.2, 3.0, 0.18), creamMat);
  door.position.z = 0.12; door.geometry.translate(0,-1.5,0.09);
  door.position.y = 1.45; g.add(door);
  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), goldMat);
  knob.position.set(0.5,-0.4,0.3); g.add(knob);
  doorMeshes[c.key] = {door:door, frame:frame, open:0};
  var glow = new THREE.PointLight(0xffd9a0, 0.0, 20, 2);
  glow.position.set(cx+nrm.x*1.5, cy+1, cz+nrm.z*1.5); scene.add(glow);
  doorMeshes[c.key].light = glow;

  var el = document.getElementById('pn-'+c.key);
  var pcx = cx + nrm.x*0.9, pcz = cz + nrm.z*0.9;
  panels.push({
    cfg:c, key:c.key, el:el,
    pos:new V3(pcx, cy+0.3, pcz), nrm:nrm,
    right:new V3(Math.cos(c.ry),0,-Math.sin(c.ry)),
    cssW: el.offsetWidth || 640, w:c.w
  });
});

var _pv=new V3(), _pr=new V3();
function updatePanels(){
  var W=window.innerWidth, H=window.innerHeight;
  for(var i=0;i<panels.length;i++){
    var p=panels[i];
    var facing = camera.position.clone().sub(p.pos).normalize().dot(p.nrm);
    _pv.copy(p.pos).project(camera);
    _pr.copy(p.pos).addScaledVector(p.right, p.w*0.5).project(camera);
    var behind = _pv.z > 1;
    var x1=(_pv.x*0.5+0.5)*W, y1=(-_pv.y*0.5+0.5)*H;
    var x2=(_pr.x*0.5+0.5)*W, y2=(-_pr.y*0.5+0.5)*H;
    var dx=x2-x1, dy=y2-y1;
    var pxW = Math.sqrt(dx*dx+dy*dy)*2;
    var ang = Math.atan2(dy,dx)*180/Math.PI;
    var s = clamp(pxW/p.cssW, 0.05, 1.55);
    var op = 1;
    if(behind || facing < 0.02) op = 0;
    else op = clamp(facing*3.6, 0, 1);
    var st = p.el.style;
    st.transform = 'translate3d('+x1.toFixed(1)+'px,'+y1.toFixed(1)+'px,0) translate(-50%,-50%) rotate('+ang.toFixed(2)+'deg) scale('+s.toFixed(3)+')';
    st.opacity = op.toFixed(3);
    st.pointerEvents = (op>0.4 && s>0.28) ? 'auto' : 'none';
    p.el.classList.toggle('on', p.key === activeKey);
  }
}
/* ---------- 小帆船 ---------- */
var boat = new THREE.Group(); scene.add(boat);
var boatLight;
(function(){
  var hullMat = new THREE.MeshPhongMaterial({color:0x8a4a3a, shininess:30});
  var hull = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,4.6), hullMat);
  hull.position.y=0.45; hull.castShadow=true; boat.add(hull);
  var keel = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.5,3.4), new THREE.MeshPhongMaterial({color:0x6a3628, shininess:20}));
  keel.position.y=-0.1; boat.add(keel);
  var prow = new THREE.Mesh(new THREE.ConeGeometry(0.8,1.8,4), hullMat);
  prow.rotation.x = Math.PI/2; prow.rotation.y = Math.PI/4;
  prow.position.set(0,0.5,2.9); prow.castShadow=true; boat.add(prow);
  var deck = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.14,4.0), new THREE.MeshPhongMaterial({color:0xe8c896, shininess:12}));
  deck.position.y=0.95; boat.add(deck);
  var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,5.6,8), new THREE.MeshPhongMaterial({color:0x5a3a28}));
  mast.position.set(0,3.4,0.2); mast.castShadow=true; boat.add(mast);
  function tri(ax,ay,az, bx,by,bz, cx,cy,cz, mat){
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ax,ay,az,bx,by,bz,cx,cy,cz]),3));
    g.computeVertexNormals(); return new THREE.Mesh(g, mat);
  }
  var sailMat = new THREE.MeshPhongMaterial({color:0xfff2dd, side:THREE.DoubleSide, shininess:6});
  var main = tri(0.05,2.2,0.2, 0.05,6.0,0.2, 2.2,2.4,0.2, sailMat); boat.add(main);
  var top = tri(0.05,6.0,0.2, 0.05,2.2,0.2, -1.5,2.5,0.2, sailMat); boat.add(top);
  var jib = tri(0.05,1.2,2.1, 0.05,4.6,0.4, 1.5,1.3,1.9, sailMat); boat.add(jib);
  var flagP = tri(0,5.9,0.2, 0,6.3,0.2, 0.9,6.1,0.2,
    new THREE.MeshBasicMaterial({color:0xe2795b, side:THREE.DoubleSide})); boat.add(flagP);
  boatLight = new THREE.PointLight(0xffd080, 0.8, 14, 2);
  boatLight.position.set(0,1.6,-1.6); boat.add(boatLight);
  var lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8), goldMat);
  lantern.position.set(0,1.6,-1.6); boat.add(lantern);
})();
var wake = new THREE.Mesh(new THREE.RingGeometry(0.9,1.25,28),
  new THREE.MeshBasicMaterial({color:0xdff2ee, transparent:true, opacity:0.4, side:THREE.DoubleSide, depthWrite:false}));
wake.rotation.x = -Math.PI/2; scene.add(wake);
var boatState = {a: Math.PI*0.8, boost:0};

/* ---------- 飞鸟 ---------- */
var birds = [];
(function(){
  for(var i=0;i<4;i++){
    var g = new THREE.Group();
    var m = new THREE.MeshBasicMaterial({color:0x4a2c33});
    var wl = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.06,0.3), m); wl.position.x=-0.75; g.add(wl);
    var wr = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.06,0.3), m); wr.position.x=0.75; g.add(wr);
    g.userData = {r: rnd(44,74), h: rnd(24,40), sp: rnd(0.18,0.34), ph: Math.random()*6.28, wl:wl, wr:wr};
    g.scale.setScalar(0.6);
    scene.add(g); birds.push(g);
  }
})();

/* ---------- 相机 ---------- */
var rig = {
  yaw: Math.PI*0.25, yawT: Math.PI*0.25,
  pitch: 0.50,
  target: new V3(0,2.5,0), tTarget: new V3(0,2.5,0),
  zoom: 1.0, zoomT: 1.0
};
function updateRig(dt){
  rig.yaw = lerp(rig.yaw, rig.yawT, 1-Math.pow(0.0018, dt));
  rig.target.lerp(rig.tTarget, 1-Math.pow(0.02, dt));
  rig.zoom = lerp(rig.zoom, rig.zoomT, 1-Math.pow(0.02, dt));
  camera.zoom = rig.zoom; camera.updateProjectionMatrix();
  var cp = Math.cos(rig.pitch), sp = Math.sin(rig.pitch), R = 95;
  camera.position.set(
    rig.target.x + Math.sin(rig.yaw)*cp*R,
    rig.target.y + sp*R,
    rig.target.z + Math.cos(rig.yaw)*cp*R);
  camera.lookAt(rig.target);
}
function snapYaw(){ rig.yawT = Math.round(rig.yawT/(Math.PI/4))*(Math.PI/4); }

var activeKey = null;
function setHud(name, desc){
  document.getElementById('hudT').textContent = name;
  document.getElementById('hudD').textContent = desc;
  var as = document.querySelectorAll('#nav a.wp');
  for(var i=0;i<as.length;i++) as[i].classList.toggle('active', as[i].dataset.wp===activeKey);
}
function focusKey(k){
  var p = null;
  for(var i=0;i<panels.length;i++) if(panels[i].key===k) p = panels[i];
  if(!p) return;
  activeKey = k;
  rig.yawT = Math.atan2(p.nrm.x, p.nrm.z);
  rig.tTarget.set(p.pos.x, p.pos.y, p.pos.z);
  rig.zoomT = 1.9;
  setHud(p.cfg.tx+' · '+p.cfg.sub, '门已推开');
}
function goOverview(){
  activeKey = null;
  rig.tTarget.set(0,2.5,0); rig.zoomT = 1.0;
  setHud('落日小岛','转动小岛，找到每一扇门');
}

/* ---------- 拾取 ---------- */
var ray = new THREE.Raycaster(), mouse = {x:0,y:0};
var tipEl = document.getElementById('tip');
var hitDoors = [];
panels.forEach(function(p){
  var hb = new THREE.Mesh(new THREE.BoxGeometry(p.cfg.w*0.5, 4.2, 1.6),
    new THREE.MeshBasicMaterial({visible:false}));
  hb.position.copy(p.pos); hb.rotation.y = Math.atan2(p.nrm.x, p.nrm.z);
  hb.userData.door = p.key; scene.add(hb); hitDoors.push(hb);
});
var hitCrank = new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,2.4,10), new THREE.MeshBasicMaterial({visible:false}));
hitCrank.position.set(0, 5.6, 6.8); island.add(hitCrank); hitCrank.userData.crank = true;
var hitBoat = new THREE.Mesh(new THREE.BoxGeometry(3,5,6), new THREE.MeshBasicMaterial({visible:false}));
hitBoat.userData.boat = true; scene.add(hitBoat);

function doPick(px,py){
  mouse.x=(px/window.innerWidth)*2-1; mouse.y=-(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(hitDoors, false);
  if(hits.length){ focusKey(hits[0].object.userData.door); return; }
  var hits2 = ray.intersectObjects([hitCrank], false);
  if(hits2.length){
    crank.target += Math.PI/2;
    setHud('旋转机关','咔哒——断桥转向了新的方向');
    return;
  }
  var hits3 = ray.intersectObjects([hitBoat], false);
  if(hits3.length){
    boatState.boost = 3.0;
    focusKey('contact');
  }
}
function hoverTip(px,py){
  mouse.x=(px/window.innerWidth)*2-1; mouse.y=-(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var h1 = ray.intersectObjects(hitDoors, false);
  if(h1.length){
    var k = h1[0].object.userData.door, nm='';
    for(var i=0;i<panels.length;i++) if(panels[i].key===k) nm = panels[i].cfg.tx+' · '+panels[i].cfg.sub;
    tipEl.textContent = '推开「'+nm+'」'; tipEl.style.opacity=0.95; canvas.style.cursor='pointer'; return;
  }
  if(ray.intersectObjects([hitCrank], false).length){
    tipEl.textContent = '转动机关'; tipEl.style.opacity=0.95; canvas.style.cursor='pointer'; return;
  }
  if(ray.intersectObjects([hitBoat], false).length){
    tipEl.textContent = '小帆船 · 泊船';
    tipEl.style.opacity=0.95; canvas.style.cursor='pointer'; return;
  }
  tipEl.style.opacity=0; canvas.style.cursor = drag.on?'grabbing':'grab';
}

/* ---------- 交互 ---------- */
var drag = {on:false, x:0, y:0, moved:0};
canvas.addEventListener('pointerdown', function(e){
  drag.on=true; drag.x=e.clientX; drag.y=e.clientY; drag.moved=0;
  canvas.classList.add('grabbing');
  if(canvas.setPointerCapture){ try{ canvas.setPointerCapture(e.pointerId); }catch(err){} }
  stopTour();
});
window.addEventListener('pointermove', function(e){
  if(drag.on){
    var dx=e.clientX-drag.x;
    drag.moved += Math.abs(dx)+Math.abs(e.clientY-drag.y);
    rig.yawT += dx*0.0062;
    drag.x=e.clientX; drag.y=e.clientY;
  }
  tipEl.style.left=e.clientX+'px'; tipEl.style.top=e.clientY+'px';
});
window.addEventListener('pointerup', function(e){
  if(drag.on && drag.moved<6) doPick(e.clientX, e.clientY);
  else if(drag.on) snapYaw();
  drag.on=false; canvas.classList.remove('grabbing');
});
canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  rig.zoomT = clamp(rig.zoomT * (e.deltaY>0?0.9:1.11), 0.55, 3.2);
},{passive:false});
window.addEventListener('keydown', function(e){
  if(e.key==='Escape') goOverview();
});

/* ---------- 控制台 ---------- */
function bindSlider(id, cb){
  var el=document.getElementById(id);
  el.addEventListener('input', function(){ cb(parseFloat(el.value)); });
  cb(parseFloat(el.value));
}
bindSlider('sTime', function(v){
  timeVal = v/100;
  document.getElementById('vTime').textContent = timeVal<0.25?'黎明':(timeVal<0.5?'白昼':(timeVal<0.75?'黄昏':'夜晚'));
  applySky();
});
bindSlider('sTide', function(v){
  tideBase = -3.9 + (v/100)*2.6;
  document.getElementById('vTide').textContent = v<30?'低潮':(v<65?'平潮':'高潮');
});
document.getElementById('bL').onclick = function(){ rig.yawT -= Math.PI/4; stopTour(); };
document.getElementById('bR').onclick = function(){ rig.yawT += Math.PI/4; stopTour(); };
var tourBtn = document.getElementById('bTour');
var tour = {on:false};
function startTour(){ tour.on=true; tourBtn.classList.add('on'); }
function stopTour(){ if(!tour.on) return; tour.on=false; tourBtn.classList.remove('on'); snapYaw(); }
tourBtn.onclick = function(){ tour.on ? stopTour() : startTour(); };
document.getElementById('bBoat').onclick = function(){ boatState.boost = 3.5; focusKey('contact'); };
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var i=0;i<navLinks.length;i++){
  navLinks[i].addEventListener('click', function(){ focusKey(this.dataset.wp); });
}

/* ---------- 主循环 ---------- */
var clock = new THREE.Clock(), timeNow = 0, tipT = 0;
applySky();
setHud('落日小岛','转动小岛，找到每一扇门');
function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt;

  updateWater(timeNow);

  // 小船
  var sp = 0.14 + boatState.boost*0.10;
  boatState.boost = Math.max(0, boatState.boost - dt);
  boatState.a += sp*dt;
  var bx = Math.cos(boatState.a)*19, bz = Math.sin(boatState.a)*14 + 2;
  boat.position.set(bx, tideBase + 0.35 + Math.sin(timeNow*1.4)*0.14, bz);
  boat.rotation.y = Math.atan2(-Math.sin(boatState.a)*19, Math.cos(boatState.a)*14);
  boat.rotation.z = Math.sin(timeNow*1.1)*0.045;
  boat.rotation.x = Math.sin(timeNow*0.9+1)*0.03;
  wake.position.set(bx, tideBase+0.42, bz);
  wake.scale.setScalar(1 + (Math.sin(timeNow*2.2)+1)*0.35);
  wake.material.opacity = 0.28 + Math.sin(timeNow*2.2)*0.1;
  hitBoat.position.copy(boat.position);

  // 云与鸟
  for(var ci=0;ci<clouds.length;ci++){
    var cl = clouds[ci];
    cl.position.x += cl.userData.v*dt;
    if(cl.position.x > 150) cl.position.x = -150;
  }
  for(var bi=0;bi<birds.length;bi++){
    var b = birds[bi], u=b.userData;
    var a = timeNow*u.sp + u.ph;
    b.position.set(Math.cos(a)*u.r, u.h + Math.sin(a*2.3)*1.2, Math.sin(a)*u.r*0.7);
    b.rotation.y = -a + Math.PI/2;
    var flap = Math.sin(timeNow*7 + u.ph)*0.5;
    u.wl.rotation.z = flap; u.wr.rotation.z = -flap;
  }

  // 机关
  crank.angle = lerp(crank.angle, crank.target, 1-Math.pow(0.01, dt));
  crank.arm.rotation.y = crank.angle;
  crank.knob.rotation.z = crank.angle;

  // 门
  for(var key2 in doorMeshes){
    var d = doorMeshes[key2];
    var want = (key2===activeKey)?1:0;
    d.open = lerp(d.open, want, 1-Math.pow(0.02, dt));
    d.door.rotation.y = -d.open*1.5;
    d.light.intensity = d.open*1.1;
    d.frame.material = d.open>0.5? goldMat : tealMat;
  }

  // 灯塔
  var nightK = clamp((timeVal-0.55)*3, 0, 1);
  if(beacon){
    beacon.intensity = 0.4 + nightK*1.6;
    var ba = timeNow*1.4;
    beacon.position.set(Math.sin(ba)*3, 10.6, Math.cos(ba)*3);
  }
  if(beaconGlowMat) beaconGlowMat.opacity = 0.25 + nightK*0.75;

  // 巡游
  if(tour.on) rig.yawT += dt*0.22;

  updateRig(dt);
  updatePanels();
  tipT += dt;
  if(tipT>0.1){ tipT=0; if(!drag.on) hoverTip(tipEl.lastX||0, tipEl.lastY||0); else tipEl.style.opacity=0; }

  renderer.render(scene, camera);
}
window.addEventListener('pointermove', function(e){ tipEl.lastX=e.clientX; tipEl.lastY=e.clientY; });
animate();

window.addEventListener('resize', function(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  setSize();
});

setTimeout(function(){
  document.getElementById('ldbar').style.width='100%';
  setTimeout(function(){ document.getElementById('loader').classList.add('gone'); }, 300);
}, 500);

})();
