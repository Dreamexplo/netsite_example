/* ============================================================
   太阳系主页 · site13_solar
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
scene.background = new THREE.Color(0x020409);
scene.fog = new THREE.FogExp2(0x020409, 0.0016);

var camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 4000);

/* ---------- 贴图 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function planetTexture(base, spots){
  var c=mkCanvas(256,128), x=c.getContext('2d');
  x.fillStyle=base; x.fillRect(0,0,256,128);
  for(var i=0;i<spots;i++){
    var band = Math.random()<0.5;
    x.fillStyle = 'rgba('+(Math.random()<0.5?'255,255,255,0.10':'0,0,0,0.16')+')';
    if(band){ x.fillRect(0, Math.random()*128, 256, rnd(2,9)); }
    else { x.beginPath(); x.arc(Math.random()*256, Math.random()*128, rnd(3,14), 0, 6.2832); x.fill(); }
  }
  var t=new THREE.CanvasTexture(c);
  t.wrapS=THREE.RepeatWrapping;
  return t;
}
function sunTexture(){
  var c=mkCanvas(256,128), x=c.getContext('2d');
  x.fillStyle='#ff9a2a'; x.fillRect(0,0,256,128);
  for(var i=0;i<260;i++){
    x.fillStyle='rgba('+(Math.random()<0.5?'255,220,120,0.25':'200,60,10,0.22')+')';
    x.beginPath(); x.arc(Math.random()*256, Math.random()*128, rnd(3,16), 0, 6.2832); x.fill();
  }
  var t=new THREE.CanvasTexture(c); t.wrapS=THREE.RepeatWrapping;
  return t;
}
function radialSprite(inner, outer){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  var g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,inner); g.addColorStop(1,outer);
  x.fillStyle=g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}

/* ---------- 灯光 ---------- */
var sunLight = new THREE.PointLight(0xffe0b0, 2.2, 500, 1.6);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x223048, 0.7));

/* ---------- 星空 ---------- */
(function(){
  var N=2400, pos=new Float32Array(N*3);
  for(var i=0;i<N;i++){
    var th=Math.random()*Math.PI*2, ph=Math.acos(rnd(-1,1)), r=1600;
    pos[i*3]=Math.sin(ph)*Math.cos(th)*r;
    pos[i*3+1]=Math.cos(ph)*r;
    pos[i*3+2]=Math.sin(ph)*Math.sin(th)*r;
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var m=new THREE.PointsMaterial({color:0xcfe0ff, size:1.6, sizeAttenuation:false, transparent:true, opacity:0.8, fog:false});
  var stars=new THREE.Points(g,m); stars.frustumCulled=false; scene.add(stars);
})();

/* ---------- 太阳 ---------- */
var sunGroup = new THREE.Group(); scene.add(sunGroup);
var sunMesh;
(function(){
  sunMesh = new THREE.Mesh(new THREE.SphereGeometry(6, 28, 20),
    new THREE.MeshBasicMaterial({map:sunTexture()}));
  sunGroup.add(sunMesh);
  var glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map:radialSprite('rgba(255,190,90,.95)','rgba(255,140,40,0)'),
    transparent:true, opacity:0.95, fog:false, depthWrite:false, blending:THREE.AdditiveBlending}));
  glow.scale.set(34,34,1); sunGroup.add(glow);
  var glow2 = new THREE.Sprite(new THREE.SpriteMaterial({
    map:radialSprite('rgba(255,220,150,.5)','rgba(255,160,60,0)'),
    transparent:true, opacity:0.45, fog:false, depthWrite:false, blending:THREE.AdditiveBlending}));
  glow2.scale.set(42,42,1); sunGroup.add(glow2);
})();

/* ---------- 行星 ---------- */
var PLANETS = [
  {key:'about',   name:'水星', r:14, size:1.3, color:0x9a8f84, speed:1.60, spin:0.8,  period:'88 天'},
  {key:'skills',  name:'金星', r:20, size:2.0, color:0xd8b06a, speed:1.17, spin:-0.3, period:'225 天'},
  {key:'works',   name:'地球', r:27, size:2.15, color:0x3a7ac8, speed:1.00, spin:1.6,  period:'365 天'},
  {key:'journey', name:'火星', r:35, size:1.65,  color:0xc06040, speed:0.80, spin:1.5,  period:'687 天'},
  {key:'contact', name:'木星', r:50, size:4.9,  color:0xc8a878, speed:0.44, spin:2.4,  period:'12 年'}
];
PLANETS.push(
  {name:'土星', r:64, size:4.2, color:0xd8c090, speed:0.32, spin:2.2, ring:true},
  {name:'天王星', r:76, size:2.8, color:0x8ac8d8, speed:0.23, spin:1.4},
  {name:'海王星', r:87, size:2.7, color:0x4068d8, speed:0.18, spin:1.5}
);
var planets = [], orbitLines = [];
PLANETS.forEach(function(def, idx){
  var pivot = new THREE.Group(); scene.add(pivot);
  var mesh = new THREE.Mesh(new THREE.SphereGeometry(def.size, 22, 16),
    new THREE.MeshPhongMaterial({
      color:def.color,
      map:planetTexture('#'+('000000'+def.color.toString(16)).slice(-6), 24),
      shininess:8, emissive:0x0c1424, emissiveIntensity:0.55}));
  mesh.rotation.z = rnd(-0.2,0.2);
  mesh.position.set(def.r, 0, 0);
  pivot.add(mesh);
  var world = new THREE.Group(); scene.add(world); // 承载实际位置
  var rec = {def:def, pivot:pivot, mesh:mesh, world:world, angle:rnd(0,Math.PI*2), idx:idx};
  if(def.ring){
    var ring = new THREE.Mesh(new THREE.RingGeometry(def.size*1.4, def.size*2.2, 40),
      new THREE.MeshBasicMaterial({color:0xd8c8a0, transparent:true, opacity:0.5, side:THREE.DoubleSide}));
    ring.rotation.x = Math.PI/2 + 0.35;
    mesh.add(ring);
  }
  if(def.name==='地球'){
    var moonPivot = new THREE.Group(); mesh.add(moonPivot);
    var moon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8),
      new THREE.MeshPhongMaterial({color:0xb8b8c0}));
    moon.position.x = 3.6; moonPivot.add(moon);
    rec.moonPivot = moonPivot;
  }
  // 轨道线
  var segs = 128, pts = [];
  for(var i=0;i<=segs;i++){
    var a = i/segs*Math.PI*2;
    pts.push(new V3(Math.cos(a)*def.r, 0, Math.sin(a)*def.r));
  }
  var og = new THREE.BufferGeometry().setFromPoints(pts);
  var line = new THREE.Line(og, new THREE.LineBasicMaterial({color:0x2a3c60, transparent:true, opacity:0.5}));
  scene.add(line); orbitLines.push(line);
  planets.push(rec);
});

/* ---------- 小行星带 ---------- */
var belt;
(function(){
  var N = 420;
  var inst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.22,0),
    new THREE.MeshPhongMaterial({color:0x6a6258, shininess:4}), N);
  var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler();
  belt = {mesh:inst, items:[]};
  for(var i=0;i<N;i++){
    var r = rnd(40.5,46.5), a = rnd(0,Math.PI*2), y = rnd(-0.8,0.8);
    belt.items.push({r:r, a:a, y:y, sp:rnd(0.1,0.3)});
    e.set(rnd(0,3),rnd(0,3),rnd(0,3)); q.setFromEuler(e);
    m4.compose(new V3(Math.cos(a)*r, y, Math.sin(a)*r), q, new V3(1,1,1).multiplyScalar(rnd(0.4,1.4)));
    inst.setMatrixAt(i, m4);
  }
  scene.add(inst);
})();

/* ---------- 内容全息屏（跟随行星） ---------- */
var HOLO = ['about','skills','works','journey','contact'];
var panels = [];
HOLO.forEach(function(key, i){
  var pl = planets[i];
  var el = document.getElementById('pn-'+key);
  panels.push({
    key:key, el:el, planet:pl,
    nrm:new V3(0,1,0), right:new V3(1,0,0),
    cssW: el.offsetWidth||620, w:8.4, pos:new V3()
  });
});
function updateHoloPositions(){
  for(var i=0;i<panels.length;i++){
    var p = panels[i];
    var pos = p.planet.world.position;
    var out = pos.clone().normalize();
    p.pos.copy(pos).addScaledVector(out, p.planet.def.size*2.2 + 5.5);
    p.pos.y += p.planet.def.size + 2.2;
    p.nrm.copy(out);
    p.right.set(-out.z, 0, out.x);
  }
}

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
  var op = (behind || facing<0.0) ? 0 : 1;
  if(camera.position.distanceTo(pos) > 300) op = 0;
  el.style.transform = 'translate3d('+x1.toFixed(1)+'px,'+y1.toFixed(1)+'px,0) translate(-50%,-50%) rotate('+ang.toFixed(2)+'deg) scale('+s.toFixed(3)+')';
  el.style.opacity = op.toFixed(3);
  el.style.pointerEvents = (op>0.4 && s>0.3) ? 'auto' : 'none';
  el.classList.toggle('on', !!active);
}
function updatePanels(){
  if(!panelsOn){
    for(var z=0;z<panels.length;z++) panels[z].el.style.opacity=0;
    return;
  }
  for(var i=0;i<panels.length;i++){
    var p=panels[i];
    projectPanel(p.el, p.pos, p.nrm, p.right, p.w, p.cssW, p.key===activeKey);
  }
}
/* ---------- 相机 ---------- */
var rig = {
  target:new V3(0,0,0), yaw:0.6, pitch:0.42, dist:120,
  tTarget:new V3(0,0,0), tYaw:0.6, tPitch:0.46, tDist:105,
  tween:0, dur:1.6, active:false
};
var activePlanet = null;   // 聚焦的行星（相机跟随）
var activeKey = null;
function flyTo(o, dur){
  rig.tTarget.set(o.t[0],o.t[1],o.t[2]);
  rig.tYaw=o.yaw; rig.tPitch=o.pitch; rig.tDist=o.dist;
  rig.active=true; rig.tween=0; rig.dur=dur||1.6;
}
function updateRig(dt){
  if(activePlanet){
    rig.target.lerp(activePlanet.world.position, 1-Math.pow(0.005, dt));
    rig.yaw = lerp(rig.yaw, rig.yaw, 1);
  } else if(rig.active){
    rig.tween += dt/rig.dur;
    var e = rig.tween<0.5 ? 4*rig.tween*rig.tween*rig.tween : 1-Math.pow(-2*rig.tween+2,3)/2;
    rig.target.lerp(rig.tTarget, clamp(e*0.13+0.01,0,1));
    rig.yaw   = lerp(rig.yaw, rig.tYaw, clamp(e*0.12+0.01,0,1));
    rig.pitch = lerp(rig.pitch, rig.tPitch, clamp(e*0.12+0.01,0,1));
    rig.dist  = lerp(rig.dist, rig.tDist, clamp(e*0.12+0.01,0,1));
    if(rig.tween>=1.6) rig.active=false;
  } else if(!drag.on){
    rig.yaw += dt*0.012;
  }
  var cp=Math.cos(rig.pitch), sp=Math.sin(rig.pitch);
  camera.position.set(
    rig.target.x + Math.sin(rig.yaw)*cp*rig.dist,
    rig.target.y + sp*rig.dist,
    rig.target.z + Math.cos(rig.yaw)*cp*rig.dist);
  camera.lookAt(rig.target);
}
function setHud(name, desc){
  document.getElementById('hudT').textContent = name;
  document.getElementById('hudD').textContent = desc;
  var as = document.querySelectorAll('#nav a.wp');
  for(var i=0;i<as.length;i++) as[i].classList.toggle('active', as[i].dataset.wp===activeKey);
}
function focusPlanet(key){
  var rec = null;
  if(key==='sun'){ goTop(); return; }
  for(var i=0;i<planets.length;i++){
    if(planets[i].def.key===key){ rec = planets[i]; break; }
  }
  if(!rec) return;
  activePlanet = rec; activeKey = key;
  rig.dist = rec.def.size*9;
  setHud(rec.def.name + (rec.def.period?' · 公转 '+rec.def.period:''), '全息屏随行星运行 · ESC 拉远');
}
function goTop(){
  activePlanet = null; activeKey = 'sun';
  flyTo({t:[0,0,0], yaw:rig.yaw, pitch:0.55, dist:150}, 1.8);
  setHud('太阳系','点击任意行星，驻留观察');
}

/* ---------- 交互 ---------- */
var drag = {on:false, x:0, y:0, moved:0};
var ray = new THREE.Raycaster(), mouse = {x:0,y:0,moved:false};
var tipEl = document.getElementById('tip');
var planetMeshes = planets.map(function(p){ return p.mesh; });
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
    rig.pitch = clamp(rig.pitch + dy*0.0032, -0.1, 1.25);
    drag.x=e.clientX; drag.y=e.clientY;
    rig.active=false;
  }
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  mouse.moved=true;
  tipEl.style.left=e.clientX+'px'; tipEl.style.top=e.clientY+'px';
});
window.addEventListener('pointerup', function(e){
  if(drag.on && drag.moved<6) doPick(e.clientX, e.clientY);
  drag.on=false; canvas.classList.remove('grabbing');
});
canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  rig.dist = clamp(rig.dist*(e.deltaY>0?1.09:0.92), 8, 600);
  rig.active=false; activePlanet=null;
},{passive:false});
window.addEventListener('keydown', function(e){ if(e.key==='Escape') goTop(); });
function doPick(px,py){
  mouse.x=(px/window.innerWidth)*2-1;
  mouse.y=-(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(planetMeshes.concat([sunMesh]), false);
  if(hits.length){
    var m = hits[0].object;
    if(m===sunMesh){ goTop(); return; }
    for(var i=0;i<planets.length;i++){
      if(planets[i].mesh===m){ focusPlanet(planets[i].def.key); return; }
    }
  }
}
function hoverTip(){
  if(drag.on || !mouse.moved){ tipEl.style.opacity=0; return; }
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(planetMeshes.concat([sunMesh]), false);
  if(hits.length){
    var nm = hits[0].object===sunMesh ? '太阳' : '行星';
    for(var i=0;i<planets.length;i++) if(planets[i].mesh===hits[0].object) nm=planets[i].def.name;
    tipEl.textContent = '驻留观察「'+nm+'」'; tipEl.style.opacity=0.95;
    canvas.style.cursor='pointer';
  } else { tipEl.style.opacity=0; canvas.style.cursor=drag.on?'grabbing':'grab'; }
}

/* ---------- 控制台 ---------- */
var timeScale = 1.0;
function bindSlider(id, cb){
  var el=document.getElementById(id);
  el.addEventListener('input', function(){ cb(parseFloat(el.value)); });
  cb(parseFloat(el.value));
}
bindSlider('sTime', function(v){
  timeScale = Math.max(0, v/20);
  document.getElementById('vTime').textContent = timeScale<0.05?'静止':(timeScale.toFixed(1)+' 天/秒');
});
var orbitsOn = true, panelsOn = true;
var orbitBtn = document.getElementById('bOrbits');
orbitBtn.classList.add('on');
orbitBtn.onclick = function(){
  orbitsOn = !orbitsOn;
  orbitBtn.classList.toggle('on', orbitsOn);
  orbitLines.forEach(function(l){ l.visible = orbitsOn; });
};
var labelsBtn = document.getElementById('bLabels');
labelsBtn.classList.add('on');
labelsBtn.onclick = function(){ panelsOn = !panelsOn; labelsBtn.classList.toggle('on', panelsOn); };
document.getElementById('bTop').onclick = goTop;
var tourBtn = document.getElementById('bTour');
var tour = {on:false, i:0, t:0};
tourBtn.onclick = function(){ tour.on=!tour.on; tourBtn.classList.toggle('on', tour.on); };
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var ni=0;ni<navLinks.length;ni++){
  navLinks[ni].addEventListener('click', function(){ focusPlanet(this.dataset.wp); });
}

/* ---------- 主循环 ---------- */
var clock = new THREE.Clock(), timeNow = 0, tipT = 0, days = 0;
setHud('太阳系','点击任意行星，驻留观察');
function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt;
  var dDays = dt*timeScale;
  days += dDays;

  // 公转与自转（速度按真实周期比例近似）
  for(var i=0;i<planets.length;i++){
    var pl = planets[i], def = pl.def;
    pl.angle += dDays * 0.06 * def.speed * 2.2;
    pl.pivot.rotation.y = pl.angle;
    pl.world.position.set(Math.cos(pl.angle)*def.r, 0, Math.sin(pl.angle)*def.r);
    pl.mesh.rotation.y += dt*def.spin*(0.2+timeScale);
    if(pl.moonPivot) pl.moonPivot.rotation.y += dDays*0.9;
  }
  // 小行星带
  for(i=0;i<belt.items.length;i++){
    var it = belt.items[i];
    it.a += dDays*0.03*it.sp;
  }
  belt.mesh.rotation.y += dDays*0.02;
  sunMesh.rotation.y += dt*0.05*(0.2+timeScale);
  sunLight.position.set(0,0,0);

  updateHoloPositions();

  if(tour.on){
    tour.t += dt;
    if(tour.t > 7){
      tour.t=0;
      var keys = ['about','skills','works','journey','contact'];
      tour.i = (tour.i+1)%keys.length;
      focusPlanet(keys[tour.i]);
    }
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
  setTimeout(function(){ document.getElementById('loader').classList.add('gone'); }, 280);
}, 500);

})();
