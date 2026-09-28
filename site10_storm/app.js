/* ============================================================
   风暴眼 · site10_storm
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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b10);
scene.fog = new THREE.FogExp2(0x0a1418, 0.0062);

var camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 600);

/* ---------- 贴图 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function softSprite(inner, outer){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  var g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,inner); g.addColorStop(1,outer);
  x.fillStyle=g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
var SPR = {
  cloud:softSprite('rgba(200,220,235,1)','rgba(200,220,235,0)'),
  white:softSprite('rgba(235,245,250,1)','rgba(235,245,250,0)'),
  glow: softSprite('rgba(180,235,220,1)','rgba(180,235,220,0)'),
  storm:softSprite('rgba(120,150,180,1)','rgba(120,150,180,0)')
};

/* ---------- 灯光 ---------- */
scene.add(new THREE.HemisphereLight(0x9cc8d8, 0x0a1420, 0.5));
var eyeLight = new THREE.PointLight(0xcfeee8, 1.6, 120, 2);
eyeLight.position.set(0, 30, 0); scene.add(eyeLight);
var flashLight = new THREE.DirectionalLight(0xdfe8ff, 0, 300);
flashLight.position.set(40, 20, -30); scene.add(flashLight);

/* ---------- 眼心开口（天光） ---------- */
var skyGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map:softSprite('rgba(210,245,238,.9)','rgba(210,245,238,0)'),
  transparent:true, fog:false, depthWrite:false, blending:THREE.AdditiveBlending}));
skyGlow.scale.set(160,160,1); skyGlow.position.set(0,60,0); scene.add(skyGlow);

/* ---------- 海（眼心下方） ---------- */
(function(){
  var g = new THREE.PlaneGeometry(600,600,64,64); g.rotateX(-Math.PI/2);
  var p = g.attributes.position;
  for(var i=0;i<p.count;i++){
    p.setY(i, Math.sin(p.getX(i)*0.05)*Math.cos(p.getZ(i)*0.04)*1.2);
  }
  g.computeVertexNormals();
  var sea = new THREE.Mesh(g, new THREE.MeshPhongMaterial({color:0x0c1a20, shininess:60, specular:0x2a4a50}));
  sea.position.y = -34; sea.receiveShadow = true; scene.add(sea);
  window.__sea = sea;
})();

/* ---------- 风暴云墙（粒子螺旋） ---------- */
var stormGroup = new THREE.Group(); scene.add(stormGroup);
var stormBulk, stormHi;
(function(){
  function build(count, color, size, map, additive){
    var pos = new Float32Array(count*3);
    for(var i=0;i<count;i++){
      var t = Math.pow(Math.random(), 0.62);
      var r = 25 + t*58 + rnd(-2,2);
      var a = Math.random()*Math.PI*2;
      var y = rnd(-72, 30) - Math.pow(t,2)*8;
      // 螺旋相关：角度与高度、半径耦合形成带
      a += y*0.045 + r*0.05;
      pos[i*3] = Math.cos(a)*r;
      pos[i*3+1] = y;
      pos[i*3+2] = Math.sin(a)*r;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    var m = new THREE.PointsMaterial({
      color:color, size:size, map:map, transparent:true, opacity:0.8,
      depthWrite:false, sizeAttenuation:true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    var pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    stormGroup.add(pts);
    return pts;
  }
  stormBulk = build(26000, 0x44566e, 5.4, SPR.storm, false);
  stormHi   = build(6000,  0xcfdde8, 3.2, SPR.white, true);
})();

/* ---------- 雨幕（云墙内壁） ---------- */
var rainGeo;
(function(){
  var N = 1500, pos = new Float32Array(N*6);
  for(var i=0;i<N;i++){
    var r = 25 + Math.random()*9;
    var a = Math.random()*Math.PI*2;
    var y = rnd(-70, 30);
    pos[i*6]   = Math.cos(a)*r;
    pos[i*6+1] = y;
    pos[i*6+2] = Math.sin(a)*r;
    pos[i*6+3] = Math.cos(a)*r;
    pos[i*6+4] = y-rnd(1.6,3.2);
    pos[i*6+5] = Math.sin(a)*r;
  }
  rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var m = new THREE.LineBasicMaterial({color:0x7f9cb0, transparent:true, opacity:0.22, depthWrite:false});
  var lines = new THREE.LineSegments(rainGeo, m);
  lines.frustumCulled = false;
  stormGroup.add(lines);
})();

/* ---------- 闪电 ---------- */
var lightning = {group:null, light:flashLight, timer:0};
(function(){
  var g = new THREE.Group(); scene.add(g);
  var lines = [];
  var mat = new THREE.LineBasicMaterial({color:0xeaf4ff, transparent:true, opacity:0});
  for(var k=0;k<4;k++){
    var r = rnd(20,40), a = rnd(0,Math.PI*2);
    var pts = [];
    var x=Math.cos(a)*r, z=Math.sin(a)*r, y=rnd(0,10);
    pts.push(new V3(x,y,z));
    for(var s=0;s<7;s++){
      x += rnd(-4,4); y -= rnd(4,9); z += rnd(-4,4);
      pts.push(new V3(x,y,z));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var ln = new THREE.Line(geo, mat.clone());
    g.add(ln); lines.push(ln);
  }
  lightning.group = g; lightning.lines = lines; lightning.mat = mat;
})();
function zap(){
  lightning.timer = 0.28;
  lightning.lines.forEach(function(ln){
    ln.material.opacity = rnd(0.7,1);
    ln.position.x = rnd(-12,12);
  });
}

/* ---------- 眼心浮岛 ---------- */
var island = new THREE.Group(); scene.add(island);
(function(){
  var rockMat = new THREE.MeshPhongMaterial({color:0x27343c, shininess:10});
  var mossMat = new THREE.MeshPhongMaterial({color:0x3c5a4c, shininess:8});
  var base = new THREE.Mesh(new THREE.ConeGeometry(9, 6, 10), rockMat);
  base.position.y = -3; base.castShadow=true; island.add(base);
  var rock2 = new THREE.Mesh(new THREE.ConeGeometry(6, 5, 8), rockMat);
  rock2.position.set(-3, 1, 2); rock2.castShadow=true; island.add(rock2);
  var rock3 = new THREE.Mesh(new THREE.ConeGeometry(4.4, 4, 7), rockMat);
  rock3.position.set(2.6, 1.4, -1.4); rock3.castShadow=true; island.add(rock3);
  var top = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5, 0.9, 14), mossMat);
  top.position.y = 3.4; top.castShadow=true; island.add(top);
  var pool = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20),
    new THREE.MeshBasicMaterial({color:0x9fd8cc, transparent:true, opacity:0.8}));
  pool.rotation.x = -Math.PI/2; pool.position.y = 3.9; island.add(pool);
  var poolGlow = new THREE.Sprite(new THREE.SpriteMaterial({map:SPR.glow, transparent:true, opacity:0.6, depthWrite:false, blending:THREE.AdditiveBlending}));
  poolGlow.scale.set(6,6,1); poolGlow.position.y = 4.0; island.add(poolGlow);
  // 小树
  for(var i=0;i<7;i++){
    var a = rnd(0,Math.PI*2), rr = rnd(3.4,5.2);
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.14,1.2,5),
      new THREE.MeshPhongMaterial({color:0x4a3a2a}));
    trunk.position.set(Math.cos(a)*rr, 4.6, Math.sin(a)*rr); island.add(trunk);
    var leaf = new THREE.Mesh(new THREE.ConeGeometry(0.7,1.4,6),
      new THREE.MeshPhongMaterial({color:[0x3c5a4c,0x4a6a52,0x2e4a40][i%3]}));
    leaf.position.set(Math.cos(a)*rr, 5.6, Math.sin(a)*rr); island.add(leaf);
  }
})();

/* ---------- 内容信标（3D 晶石 + DOM 面板） ---------- */
var BEACONS = [
  {key:'about',   a:40,  y:4.2, tx:'眼心', st:'EYE'},
  {key:'skills',  a:112, y:4.6, tx:'技艺', st:'SKILLS'},
  {key:'works',   a:184, y:5.0, tx:'风迹', st:'WORKS'},
  {key:'journey', a:256, y:4.4, tx:'风程', st:'JOURNEY'},
  {key:'contact', a:328, y:4.8, tx:'无风', st:'CONTACT'}
];
var panels = [], beaconHits = [];
BEACONS.forEach(function(c){
  var rad = c.a*Math.PI/180;
  var bx = Math.cos(rad)*11, bz = Math.sin(rad)*11;
  var g = new THREE.Group();
  g.position.set(bx, c.y-3.6, bz);
  scene.add(g);
  var ped = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.16,3.4,6),
    new THREE.MeshPhongMaterial({color:0x33434e, shininess:16}));
  ped.position.y = 1.7; g.add(ped);
  var crys = new THREE.Mesh(new THREE.OctahedronGeometry(0.62,0),
    new THREE.MeshPhongMaterial({color:0x9fd8cc, emissive:0x2a6a5c, shininess:90, specular:0xdffff0}));
  crys.position.y = 3.8; crys.castShadow=true; g.add(crys);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.9,0.05,8,24),
    new THREE.MeshBasicMaterial({color:0x9fd8cc, transparent:true, opacity:0.5}));
  ring.rotation.x = Math.PI/2; ring.position.y = 3.6; g.add(ring);
  var gl = new THREE.PointLight(0x9fe8d8, 0.7, 14, 2);
  gl.position.set(bx, c.y+0.6, bz); scene.add(gl);
  // DOM 面板
  var nrm = new V3(Math.cos(rad), 0, Math.sin(rad)).normalize();
  var el = document.getElementById('pn-'+c.key);
  panels.push({
    key:c.key, cfg:c, el:el,
    pos:new V3(bx+nrm.x*0.8, c.y+0.4, bz+nrm.z*0.8),
    nrm:nrm, right:new V3(nrm.z,0,-nrm.x),
    cssW: el.offsetWidth||620, w:8.0
  });
  var hit = new THREE.Mesh(new THREE.BoxGeometry(2.6,4,2.6), new THREE.MeshBasicMaterial({visible:false}));
  hit.position.set(bx, c.y, bz);
  hit.userData.beacon = c.key; scene.add(hit); beaconHits.push(hit);
});

/* ---------- 面板投影 ---------- */
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
  if(camera.position.distanceTo(pos) > 260) op = 0;
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
/* ---------- 相机 ---------- */
var rig = {
  target:new V3(0,2.5,0), yaw:0.5, pitch:0.32, dist:19,
  tTarget:new V3(0,2.5,0), tYaw:0.5, tPitch:0.32, tDist:19,
  tween:0, dur:1.5, active:false
};
function flyTo(o, dur){
  rig.tTarget.set(o.t[0],o.t[1],o.t[2]);
  rig.tYaw=o.yaw; rig.tPitch=o.pitch; rig.tDist=o.dist;
  rig.active=true; rig.tween=0; rig.dur=dur||1.5;
}
function updateRig(dt){
  if(rig.active){
    rig.tween += dt/rig.dur;
    var e = rig.tween<0.5 ? 4*rig.tween*rig.tween*rig.tween : 1-Math.pow(-2*rig.tween+2,3)/2;
    rig.target.lerp(rig.tTarget, clamp(e*0.14+0.01,0,1));
    rig.yaw   = lerp(rig.yaw, rig.tYaw, clamp(e*0.13+0.01,0,1));
    rig.pitch = lerp(rig.pitch, rig.tPitch, clamp(e*0.13+0.01,0,1));
    rig.dist  = lerp(rig.dist, rig.tDist, clamp(e*0.13+0.01,0,1));
    if(rig.tween>=1.5) rig.active=false;
  } else if(!drag.on){
    rig.yaw += dt*0.03;
  }
  var cp=Math.cos(rig.pitch), sp=Math.sin(rig.pitch);
  camera.position.set(
    rig.target.x + Math.sin(rig.yaw)*cp*rig.dist,
    rig.target.y + sp*rig.dist,
    rig.target.z + Math.cos(rig.yaw)*cp*rig.dist);
  camera.lookAt(rig.target);
}

var activeKey = null;
function setHud(name, desc){
  document.getElementById('hudT').textContent = name;
  document.getElementById('hudD').textContent = desc;
  var as = document.querySelectorAll('#nav a.wp');
  for(var i=0;i<as.length;i++) as[i].classList.toggle('active', as[i].dataset.wp===activeKey);
}
function focusBeacon(k){
  for(var i=0;i<panels.length;i++){
    if(panels[i].key===k){
      activeKey = k;
      flyTo({t:[panels[i].pos.x*0.9, panels[i].pos.y, panels[i].pos.z*0.9],
             yaw:Math.atan2(panels[i].pos.x, panels[i].pos.z), pitch:0.12, dist:9}, 1.5);
      setHud(panels[i].cfg.tx, panels[i].cfg.st);
      return;
    }
  }
}
function goEye(){
  activeKey = null;
  flyTo({t:[0,2.5,0], yaw:rig.yaw, pitch:0.32, dist:19}, 1.6);
  setHud('风暴眼','在旋涡最深处，守住一片静海');
}
function goWall(){
  activeKey = null;
  flyTo({t:[0,4,0], yaw:rig.yaw, pitch:0.22, dist:85}, 1.8);
  setHud('云墙','外面是八级风，里面是寂静');
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
    rig.pitch = clamp(rig.pitch + dy*0.0032, -0.15, 1.1);
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
  rig.dist = clamp(rig.dist*(e.deltaY>0?1.09:0.92), 6, 150);
  rig.active=false;
},{passive:false});
window.addEventListener('keydown', function(e){ if(e.key==='Escape') goEye(); });
function doPick(px,py){
  mouse.x=(px/window.innerWidth)*2-1;
  mouse.y=-(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(beaconHits, false);
  if(hits.length) focusBeacon(hits[0].object.userData.beacon);
}
function hoverTip(){
  if(drag.on){ tipEl.style.opacity=0; return; }
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(beaconHits, false);
  if(hits.length){
    var k = hits[0].object.userData.beacon, nm='';
    for(var i=0;i<panels.length;i++) if(panels[i].key===k) nm=panels[i].cfg.tx;
    tipEl.textContent = '阅读「'+nm+'」'; tipEl.style.opacity=0.95;
    canvas.style.cursor='pointer';
  } else { tipEl.style.opacity=0; canvas.style.cursor=drag.on?'grabbing':'grab'; }
}

/* ---------- 控制台 ---------- */
var wind = 0.6, spin = 1.0;
function bindSlider(id, cb){
  var el=document.getElementById(id);
  el.addEventListener('input', function(){ cb(parseFloat(el.value)); });
  cb(parseFloat(el.value));
}
bindSlider('sWind', function(v){
  wind = v/100;
  document.getElementById('vWind').textContent = Math.round(v*0.12)+' 级';
});
bindSlider('sSpin', function(v){
  spin = v/100;
  document.getElementById('vSpin').textContent = spin.toFixed(1)+'×';
});
document.getElementById('bEye').onclick = goEye;
document.getElementById('bWall').onclick = goWall;
document.getElementById('bLightning').onclick = zap;
var tourBtn = document.getElementById('bTour');
var tour = {on:false, i:0, t:0};
tourBtn.onclick = function(){ tour.on=!tour.on; tourBtn.classList.toggle('on', tour.on); };
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var ni=0;ni<navLinks.length;ni++){
  navLinks[ni].addEventListener('click', function(){ focusBeacon(this.dataset.wp); });
}

/* ---------- 主循环 ---------- */
var clock = new THREE.Clock(), timeNow = 0, tipT = 0;
setHud('风暴眼','在旋涡最深处，守住一片静海');
function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt;

  // 风暴旋转
  stormGroup.rotation.y += dt*0.10*spin*(0.3+wind*1.4);
  stormBulk.material.opacity = 0.55 + wind*0.4;
  stormHi.material.opacity = 0.4 + wind*0.55;

  // 雨幕下落
  var rp = rainGeo.attributes.position;
  for(var ri=0; ri<1500; ri++){
    var y = rp.getY(ri*2) - dt*(14+wind*20);
    if(y < -72) y = 30;
    rp.setY(ri*2, y); rp.setY(ri*2+1, y-rnd(1.6,3.2));
  }
  rp.needsUpdate = true;

  // 闪电
  if(lightning.timer > 0){
    lightning.timer -= dt;
    var k = Math.max(0, lightning.timer/0.28);
    flashLight.intensity = 3.0*k;
    lightning.mat.opacity = k;
    if(lightning.timer<=0){ flashLight.intensity=0; }
  }
  if(Math.random() < dt*(0.2+wind*0.5)) zap();

  // 岛体微浮 + 信标晶石
  island.position.y = Math.sin(timeNow*0.8)*0.5;
  island.rotation.y = Math.sin(timeNow*0.25)*0.04;
  var sea = window.__sea;
  if(sea){
    sea.material.opacity = 1;
    var sp = sea.geometry.attributes.position;
    for(var si=0; si<sp.count; si++){
      sp.setY(si, Math.sin(sp.getX(si)*0.05 + timeNow*0.7)*Math.cos(sp.getZ(si)*0.04)*1.4);
    }
    sp.needsUpdate = true; sea.geometry.computeVertexNormals();
  }
  eyeLight.intensity = 1.4 + Math.sin(timeNow*2.3)*0.15;

  if(tour.on){
    tour.t += dt;
    if(tour.t > 5.5){ tour.t=0; tour.i=(tour.i+1)%panels.length; focusBeacon(panels[tour.i].key); }
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
