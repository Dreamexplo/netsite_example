/* ============================================================
   血管巡游 · site12_blood
   ============================================================ */
(function(){
"use strict";

var V3 = THREE.Vector3;
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function rnd(a,b){ return a+Math.random()*(b-a); }

var canvas = document.getElementById('bg');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0407);
scene.fog = new THREE.FogExp2(0x24060a, 0.028);

var camera = new THREE.PerspectiveCamera(68, window.innerWidth/window.innerHeight, 0.1, 400);

/* ---------- 贴图 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function endoTexture(){
  var c=mkCanvas(1024,512), x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#5a1420'); g.addColorStop(0.5,'#7a2430'); g.addColorStop(1,'#5a1420');
  x.fillStyle=g; x.fillRect(0,0,1024,512);
  // 内皮细胞：铺满的多边形
  var cells=[], COLS=14, ROWS=7;
  for(var r=0;r<ROWS;r++){
    for(var q=0;q<COLS;q++){
      var cx = q*(1024/COLS) + (r%2?0.5:0)*(1024/COLS) + rnd(-8,8);
      var cy = r*(512/ROWS) + rnd(-6,6);
      cells.push({x:cx, y:cy});
    }
  }
  cells.forEach(function(cell){
    var w = 1024/COLS*rnd(0.9,1.15), h = 512/ROWS*rnd(0.9,1.15);
    x.fillStyle = 'rgba('+(120+Math.random()*60|0)+','+(28+Math.random()*22|0)+','+(36+Math.random()*20|0)+',0.85)';
    x.beginPath();
    x.ellipse(cell.x, cell.y, w/2, h/2, rnd(-0.2,0.2), 0, 6.2832);
    x.fill();
    x.strokeStyle='rgba(30,6,10,.55)'; x.lineWidth=2; x.stroke();
    // 细胞核
    x.fillStyle='rgba(60,10,16,.8)';
    x.beginPath(); x.ellipse(cell.x+rnd(-14,14), cell.y+rnd(-8,8), rnd(5,9), rnd(3,6), 0, 0, 6.2832); x.fill();
  });
  // 高光
  for(var i=0;i<400;i++){
    x.fillStyle='rgba(255,150,140,'+(Math.random()*0.06)+')';
    x.fillRect(Math.random()*1024, Math.random()*512, rnd(6,40), 2);
  }
  var t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=4;
  return t;
}
function radialSprite(inner, outer){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  var g2=x.createRadialGradient(64,64,0,64,64,64);
  g2.addColorStop(0,inner); g2.addColorStop(1,outer);
  x.fillStyle=g2; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
var SPR = { glow: radialSprite('rgba(255,170,150,1)','rgba(255,170,150,0)') };

/* ---------- 灯光 ---------- */
scene.add(new THREE.HemisphereLight(0xff9080, 0x2a0810, 0.75));
var flowLight = new THREE.PointLight(0xff8a70, 1.1, 60, 2);
flowLight.position.set(0, 0, 30); scene.add(flowLight);

/* ---------- 血管路径 ---------- */
var PATH = [
  new V3(0,0,90),
  new V3(0,1,40),
  new V3(7,3,-10),
  new V3(-6,-2,-60),
  new V3(5,1,-115),
  new V3(-3,2,-170),
  new V3(0,0,-215)
];
var path = new THREE.CatmullRomCurve3(PATH, false, 'catmullrom', 0.5);
var VESSEL_R = 6.5;

/* ---------- 血管壁 ---------- */
var vessel;
(function(){
  var tex = endoTexture();
  tex.repeat.set(10, 3);
  var geo = new THREE.TubeGeometry(path, 240, VESSEL_R, 28, false);
  vessel = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    map:tex, side:THREE.BackSide, shininess:26, specular:0x5a2018}));
  scene.add(vessel);
  // 外壁轮廓（半透明包鞘）
  var sheath = new THREE.Mesh(new THREE.TubeGeometry(path, 120, VESSEL_R+0.5, 16, false),
    new THREE.MeshBasicMaterial({color:0x3a0c12, transparent:true, opacity:0.35, side:THREE.FrontSide}));
  scene.add(sheath);
})();

/* ---------- 血细胞 ---------- */
var rbcMesh, wbcMesh, pltMesh;
var rbcData = [], wbcData = [], pltData = [];
(function(){
  // 红细胞：扁圆盘
  var rbcGeo = new THREE.SphereGeometry(0.52, 10, 8);
  rbcGeo.scale(1, 0.42, 1);
  var rbcN = 420;
  rbcMesh = new THREE.InstancedMesh(rbcGeo,
    new THREE.MeshPhongMaterial({color:0xa82830, emissive:0x3a0a0e, shininess:40, specular:0x8a4038}), rbcN);
  rbcMesh.frustumCulled = false; scene.add(rbcMesh);
  for(var i=0;i<rbcN;i++){
    rbcData.push({
      t: Math.random(),
      ang: rnd(0,Math.PI*2),
      rad: Math.random()<0.75 ? rnd(1.9, VESSEL_R*0.64) : rnd(2.3, VESSEL_R*0.82),
      spin: rnd(0.4,2.2),
      sp: rnd(0.8,1.25),
      tumble: rnd(0,6.28)
    });
  }
  // 白细胞：大球
  var wbcN = 14;
  wbcMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1.05, 14, 12),
    new THREE.MeshPhongMaterial({color:0xd8d4c8, emissive:0x3a3830, shininess:24}), wbcN);
  wbcMesh.frustumCulled = false; scene.add(wbcMesh);
  for(i=0;i<wbcN;i++){
    wbcData.push({t:Math.random(), ang:rnd(0,Math.PI*2), rad:rnd(2.3,VESSEL_R*0.58),
                  sp:rnd(0.35,0.6), wob:rnd(0,6.28)});
  }
  // 血小板：小颗粒
  var pltN = 180;
  pltMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 5),
    new THREE.MeshPhongMaterial({color:0xd89a80, emissive:0x4a2018, shininess:30}), pltN);
  pltMesh.frustumCulled = false; scene.add(pltMesh);
  for(i=0;i<pltN;i++){
    pltData.push({t:Math.random(), ang:rnd(0,Math.PI*2), rad:rnd(1.7,VESSEL_R*0.85), sp:rnd(0.9,1.6)});
  }
})();

function vesselPoint(t, ang, rad){
  var p = path.getPointAt(clamp(t,0,1));
  var tan = path.getTangentAt(clamp(t,0,1));
  // 构造垂直于切线的平面基
  var up = new V3(0,1,0);
  var b1 = new V3().crossVectors(tan, up).normalize();
  if(b1.lengthSq() < 0.01) b1.set(1,0,0);
  var b2 = new V3().crossVectors(tan, b1).normalize();
  return p.addScaledVector(b1, Math.cos(ang)*rad).addScaledVector(b2, Math.sin(ang)*rad);
}

/* ---------- 血流更新 ---------- */
var _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(),
    _p = new V3(), _s = new V3();
function updateBlood(dt, speed){
  for(var i=0;i<rbcData.length;i++){
    var d = rbcData[i];
    d.t += dt*speed*0.02*d.sp;
    if(d.t > 1) d.t -= 1;
    if(d.t < 0) d.t += 1;
    d.tumble += dt*d.spin*speed;
    _p.copy(vesselPoint(d.t, d.ang, d.rad));
    _e.set(d.tumble*0.7, d.tumble, d.tumble*0.4);
    _q.setFromEuler(_e);
    _s.set(1,1,1);
    _m4.compose(_p,_q,_s);
    rbcMesh.setMatrixAt(i,_m4);
  }
  rbcMesh.instanceMatrix.needsUpdate = true;

  for(i=0;i<wbcData.length;i++){
    var w = wbcData[i];
    w.t += dt*speed*0.02*w.sp;
    if(w.t > 1) w.t -= 1;
    var wob = Math.sin(timeNow*1.6+w.wob)*0.4;
    _p.copy(vesselPoint(w.t, w.ang+wob*0.2, w.rad+wob*0.3));
    _e.set(timeNow*0.4+w.wob, wob, timeNow*0.3);
    _q.setFromEuler(_e);
    _s.set(1,1,1);
    _m4.compose(_p,_q,_s);
    wbcMesh.setMatrixAt(i,_m4);
  }
  wbcMesh.instanceMatrix.needsUpdate = true;

  for(i=0;i<pltData.length;i++){
    var pl = pltData[i];
    pl.t += dt*speed*0.02*pl.sp;
    if(pl.t > 1) pl.t -= 1;
    _p.copy(vesselPoint(pl.t, pl.ang, pl.rad));
    _e.set(0,0,0); _q.setFromEuler(_e);
    _s.set(1,1,1);
    _m4.compose(_p,_q,_s);
    pltMesh.setMatrixAt(i,_m4);
  }
  pltMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- 内容贴片（内皮细胞告示） ---------- */
var SPOTS = [
  {key:'about',   t:0.06, ang:0.6,  tx:'内皮', st:'ENDOTHELIUM'},
  {key:'skills',  t:0.26, ang:3.6,  tx:'技艺', st:'SKILLS'},
  {key:'works',   t:0.48, ang:5.4,  tx:'细胞志', st:'WORKS'},
  {key:'journey', t:0.68, ang:2.0,  tx:'循环', st:'JOURNEY'},
  {key:'contact', t:0.88, ang:4.4,  tx:'汇合', st:'CONTACT'}
];
var panels = [], spotHits = [];
SPOTS.forEach(function(c){
  var wallP = vesselPoint(c.t, c.ang, VESSEL_R-0.25);
  var center = path.getPointAt(c.t);
  var nrm = center.clone().sub(wallP).normalize();  // 指向管腔
  var g = new THREE.Group();
  g.position.copy(wallP);
  g.lookAt(wallP.clone().add(nrm));
  scene.add(g);
  var patch = new THREE.Mesh(new THREE.CircleGeometry(2.6, 22),
    new THREE.MeshPhongMaterial({color:0x8a3040, emissive:0x401018, shininess:40, side:THREE.DoubleSide}));
  g.add(patch);
  var frame = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.9, 22),
    new THREE.MeshBasicMaterial({color:0xffa890, transparent:true, opacity:0.55, side:THREE.DoubleSide}));
  g.add(frame);
  var core = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14),
    new THREE.MeshBasicMaterial({color:0xffd0c0, side:THREE.DoubleSide}));
  core.position.z = 0.02; g.add(core);
  var gl = new THREE.PointLight(0xffa890, 0.7, 12, 2);
  gl.position.copy(wallP).addScaledVector(nrm, 2); scene.add(gl);

  var el = document.getElementById('pn-'+c.key);
  panels.push({
    key:c.key, cfg:c, el:el,
    pos:wallP.clone().addScaledVector(nrm, 0.55),
    nrm:nrm,
    right:new V3().crossVectors(new V3(0,1,0), nrm).normalize(),
    cssW: el.offsetWidth||620, w:6.6
  });
  var hit = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
  hit.position.copy(wallP).addScaledVector(nrm, 1);
  hit.userData.spot = c.key; scene.add(hit); spotHits.push(hit);
});

var _pv=new V3(), _pr=new V3();
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
  var s = clamp(pxW/cssW, 0.05, 1.6);
  var op = (behind || facing<0.03) ? 0 : clamp(facing*3.0, 0, 1);
  if(camera.position.distanceTo(pos) > 90) op = 0;
  el.style.transform = 'translate3d('+x1.toFixed(1)+'px,'+y1.toFixed(1)+'px,0) translate(-50%,-50%) rotate('+ang.toFixed(2)+'deg) scale('+s.toFixed(3)+')';
  el.style.opacity = op.toFixed(3);
  el.style.pointerEvents = (op>0.4 && s>0.3) ? 'auto' : 'none';
  el.classList.toggle('on', !!active);
}
function updatePanels(){
  for(var i=0;i<panels.length;i++){
    var p=panels[i];
    projectPanel(p.el, p.pos, p.nrm, p.right, p.w, p.cssW, p.key===activeKey);
  }
}
/* ---------- 相机（血管内漂流） ---------- */
var cam = {
  t:0.01, drift:1.0, mode:'drift',   // drift | hold
  lookYaw:0, lookPitch:0, lookYawT:0, lookPitchT:0
};
var activeKey = null;
function updateCamera(dt){
  if(cam.mode==='drift' && !drag.on){
    cam.t += dt*0.012*cam.drift;
    if(cam.t > 0.97){ cam.t = 0.03; activeKey=null; }
  }
  var base = path.getPointAt(clamp(cam.t,0,1));
  var ahead = path.getPointAt(clamp(cam.t+0.035,0,1));
  cam.lookYaw = lerp(cam.lookYaw, cam.lookYawT, 1-Math.pow(0.002, dt));
  cam.lookPitch = lerp(cam.lookPitch, cam.lookPitchT, 1-Math.pow(0.002, dt));
  camera.position.copy(base).add(new V3(0,0.2,0));
  var dir = ahead.clone().sub(base).normalize();
  var right = new V3().crossVectors(dir, new V3(0,1,0)).normalize();
  var look = ahead.clone()
    .addScaledVector(right, Math.tan(cam.lookYaw)*8)
    .add(new V3(0, Math.tan(cam.lookPitch)*8, 0));
  camera.up.set(0,1,0);
  camera.lookAt(look);
  flowLight.position.copy(base);
}
function setHud(name, desc){
  document.getElementById('hudT').textContent = name;
  document.getElementById('hudD').textContent = desc;
  var as = document.querySelectorAll('#nav a.wp');
  for(var i=0;i<as.length;i++) as[i].classList.toggle('active', as[i].dataset.wp===activeKey);
}
function gotoSpot(k){
  for(var i=0;i<panels.length;i++){
    if(panels[i].key===k){
      activeKey = k;
      cam.t = clamp(SPOTS[i].t - 0.05, 0.01, 0.95);
      var d = panels[i].pos.clone().sub(path.getPointAt(cam.t));
      cam.lookYawT = clamp(Math.atan2(d.x, -d.z)*0.8, -1.1, 1.1);
      cam.lookPitchT = clamp(d.y*0.1, -0.5, 0.5);
      cam.mode = 'hold';
      syncModeBtns();
      setHud(panels[i].cfg.tx, panels[i].cfg.st);
      return;
    }
  }
}
function resetCam(){
  activeKey = null;
  cam.lookYawT = 0; cam.lookPitchT = 0;
  cam.mode = 'drift'; syncModeBtns();
  setHud('血管巡游','在血流中央，跟着红细胞走');
}

/* ---------- 交互 ---------- */
var drag = {on:false, x:0, y:0, moved:0};
var ray = new THREE.Raycaster(), mouse = {x:0,y:0,moved:false};
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
    cam.lookYawT = clamp(cam.lookYawT - dx*0.004, -1.2, 1.2);
    cam.lookPitchT = clamp(cam.lookPitchT + dy*0.003, -0.6, 0.6);
    drag.x=e.clientX; drag.y=e.clientY;
  }
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  tipEl.style.left=e.clientX+'px'; tipEl.style.top=e.clientY+'px';
  mouse.moved = true;
});
window.addEventListener('pointerup', function(e){
  if(drag.on && drag.moved<6) doPick(e.clientX, e.clientY);
  drag.on=false; canvas.classList.remove('grabbing');
});
canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  cam.drift = clamp(cam.drift*(e.deltaY>0?0.9:1.1), 0, 4);
  document.getElementById('sFlow').value = Math.round(cam.drift*50);
  document.getElementById('vFlow').textContent = cam.drift.toFixed(1)+'×';
},{passive:false});
window.addEventListener('keydown', function(e){ if(e.key==='Escape') resetCam(); });

function doPick(px,py){
  mouse.x=(px/window.innerWidth)*2-1;
  mouse.y=-(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var sh = ray.intersectObjects(spotHits, false);
  if(sh.length){ gotoSpot(sh[0].object.userData.spot); return; }
  var ch = ray.intersectObjects([rbcMesh, wbcMesh, pltMesh], false);
  if(ch.length){
    var obj = ch[0].object;
    var nm = obj===rbcMesh ? '红细胞 · 正在运氧' : (obj===wbcMesh ? '白细胞 · 免疫巡逻中' : '血小板 · 随时待命修补');
    setHud(nm, '点击内皮贴片可以阅读章节');
  }
}
function hoverTip(){
  if(drag.on || !mouse.moved){ tipEl.style.opacity=0; return; }
  ray.setFromCamera(mouse, camera);
  var sh = ray.intersectObjects(spotHits, false);
  if(sh.length){
    var k = sh[0].object.userData.spot, nm='';
    for(var i=0;i<panels.length;i++) if(panels[i].key===k) nm=panels[i].cfg.tx;
    tipEl.textContent = '停靠「'+nm+'」'; tipEl.style.opacity=0.95;
    canvas.style.cursor='pointer';
    return;
  }
  var ch = ray.intersectObjects([wbcMesh], false);
  if(ch.length){
    tipEl.textContent = '白细胞 · 点我看看'; tipEl.style.opacity=0.95;
    canvas.style.cursor='pointer';
  } else { tipEl.style.opacity=0; canvas.style.cursor=drag.on?'grabbing':'grab'; }
}

/* ---------- 控制台 ---------- */
var bpm = 72;
function bindSlider(id, cb){
  var el=document.getElementById(id);
  el.addEventListener('input', function(){ cb(parseFloat(el.value)); });
  cb(parseFloat(el.value));
}
bindSlider('sFlow', function(v){
  cam.drift = v/50;
  document.getElementById('vFlow').textContent = cam.drift.toFixed(1)+'×';
});
bindSlider('sBpm', function(v){
  bpm = Math.round(v);
  document.getElementById('vBpm').textContent = bpm+' BPM';
  document.getElementById('bpmV').textContent = bpm;
});
var driftBtn = document.getElementById('bDrift'), holdBtn = document.getElementById('bHold');
function syncModeBtns(){
  driftBtn.classList.toggle('on', cam.mode==='drift');
  holdBtn.classList.toggle('on', cam.mode==='hold');
}
driftBtn.classList.add('on');
driftBtn.onclick = function(){ cam.mode='drift'; syncModeBtns(); };
holdBtn.onclick = function(){ cam.mode='hold'; syncModeBtns(); };
var wbcBoost = 0;
document.getElementById('bWBC').onclick = function(){
  wbcBoost = 4;
  setHud('白细胞加速','免疫响应启动——它们赶去处理一点炎症');
};
var tourBtn = document.getElementById('bTour');
var tour = {on:false, i:0, t:0};
tourBtn.onclick = function(){ tour.on=!tour.on; tourBtn.classList.toggle('on', tour.on); };
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var ni=0;ni<navLinks.length;ni++){
  navLinks[ni].addEventListener('click', function(){ gotoSpot(this.dataset.wp); });
}

/* ---------- 主循环 ---------- */
var clock = new THREE.Clock(), timeNow = 0, tipT = 0;
setHud('血管巡游','在血流中央，跟着红细胞走');
function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt;

  var flowSpeed = cam.drift * (1 + wbcBoost*0.02);
  updateBlood(dt, flowSpeed);
  wbcBoost = Math.max(0, wbcBoost - dt);

  // 心跳脉搏
  var beat = (timeNow*bpm/60) % 1;
  var pulse = Math.exp(-beat*5) * (0.6 + 0.4*Math.sin(beat*Math.PI));
  vessel.scale.setScalar(1 + pulse*0.035);
  flowLight.intensity = 0.9 + pulse*1.4;

  updateCamera(dt);

  if(tour.on){
    tour.t += dt;
    if(tour.t > 6){ tour.t=0; tour.i=(tour.i+1)%panels.length; gotoSpot(panels[tour.i].key); }
  }

  updatePanels();
  tipT += dt;
  if(tipT>0.12){ tipT=0; hoverTip(); }

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
  setTimeout(function(){ document.getElementById('loader').classList.add('gone'); }, 280);
}, 500);

})();
