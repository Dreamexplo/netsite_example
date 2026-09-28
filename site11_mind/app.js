/* ============================================================
   芯上心灵 · site11_mind
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
scene.background = new THREE.Color(0x020a08);
scene.fog = new THREE.FogExp2(0x03120e, 0.011);

var camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 500);

/* ---------- 贴图 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function pcbTexture(){
  var c=mkCanvas(2048,2048), x=c.getContext('2d');
  x.fillStyle='#0a241c'; x.fillRect(0,0,2048,2048);
  // 细网格
  x.strokeStyle='rgba(40,110,90,.4)'; x.lineWidth=1;
  for(var i=0;i<=64;i++){
    x.beginPath(); x.moveTo(i*32,0); x.lineTo(i*32,2048); x.stroke();
    x.beginPath(); x.moveTo(0,i*32); x.lineTo(2048,i*32); x.stroke();
  }
  // 发光走线（曼哈顿）
  function trace(col, w){
    x.strokeStyle=col; x.lineWidth=w; x.lineCap='round';
    var px=rnd(64,1984), py=rnd(64,1984);
    x.beginPath(); x.moveTo(px,py);
    var steps=3+Math.floor(Math.random()*6);
    for(var k=0;k<steps;k++){
      if(Math.random()<0.5) px += (Math.random()<0.5?-1:1)*rnd(60,300);
      else py += (Math.random()<0.5?-1:1)*rnd(60,300);
      x.lineTo(px,py);
    }
    x.stroke();
    // 焊盘
    x.fillStyle=col;
    x.beginPath(); x.arc(px,py,w*2.2,0,6.2832); x.fill();
  }
  for(var j=0;j<70;j++) trace('rgba(40,120,105,.5)', 2.2);
  for(j=0;j<45;j++) trace('rgba(110,240,215,.8)', 3.4);
  for(j=0;j<12;j++) trace('rgba(255,180,84,.4)', 2.6);
  // 芯片块
  for(j=0;j<26;j++){
    var cw=rnd(50,130), ch=rnd(50,130);
    var cx=rnd(80,1968-cw), cy=rnd(80,1968-ch);
    x.fillStyle='#123528'; x.fillRect(cx,cy,cw,ch);
    x.strokeStyle='rgba(79,216,200,.35)'; x.lineWidth=2; x.strokeRect(cx,cy,cw,ch);
    x.fillStyle='rgba(79,216,200,.12)';
    for(var p2=0;p2<6;p2++) x.fillRect(cx+8, cy+10+p2*10, cw-16, 3);
  }
  var t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=4;
  return t;
}
function radialSprite(inner, outer){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  var g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,inner); g.addColorStop(1,outer);
  x.fillStyle=g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
var SPR = {
  glow: radialSprite('rgba(140,255,230,1)','rgba(140,255,230,0)'),
  amber:radialSprite('rgba(255,190,110,1)','rgba(255,190,110,0)'),
  white:radialSprite('rgba(230,255,248,1)','rgba(230,255,248,0)')
};

/* ---------- 灯光 ---------- */
scene.add(new THREE.HemisphereLight(0x3a8a7c, 0x06140f, 0.95));
var coreLight = new THREE.PointLight(0x6fe8d4, 2.1, 110, 2);
coreLight.position.set(0, 6, 0); scene.add(coreLight);
var amberLight = new THREE.PointLight(0xffb454, 0.5, 60, 2);
amberLight.position.set(-16, 8, -14); scene.add(amberLight);

/* ---------- 主板 ---------- */
(function(){
  var tex = pcbTexture();
  tex.repeat.set(3,3);
  var board = new THREE.Mesh(new THREE.PlaneGeometry(400,400),
    new THREE.MeshBasicMaterial({map:tex}));
  board.rotation.x = -Math.PI/2; scene.add(board);
  // 边缘渐暗
  var fade = new THREE.Mesh(new THREE.PlaneGeometry(400,400),
    new THREE.MeshBasicMaterial({color:0x020a08, transparent:true, opacity:0.18}));
  fade.rotation.x = -Math.PI/2; fade.position.y = 0.01; scene.add(fade);
  window.__boardFade = fade;
})();

/* ---------- 心灵核心 ---------- */
var core = new THREE.Group(); scene.add(core);
var coreMesh, coreWire, coreGlow;
(function(){
  coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1,1),
    new THREE.MeshPhongMaterial({color:0x1a4a42, emissive:0x1a6a5c, emissiveIntensity:0.9,
      shininess:80, specular:0xaafff0, transparent:true, opacity:0.92}));
  coreMesh.position.y = 4.2; core.add(coreMesh);
  coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5,1),
    new THREE.MeshBasicMaterial({color:0x6fe8d4, wireframe:true, transparent:true, opacity:0.35}));
  coreWire.position.y = 4.2; core.add(coreWire);
  coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({map:SPR.glow, transparent:true, opacity:0.85,
    depthWrite:false, blending:THREE.AdditiveBlending}));
  coreGlow.scale.set(9,9,1); coreGlow.position.y = 4.2; core.add(coreGlow);
  var pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.9,1.0,8),
    new THREE.MeshPhongMaterial({color:0x0e2a24, shininess:30}));
  pedestal.position.y = 0.5; core.add(pedestal);
})();

/* ---------- 神经元网络 ---------- */
var neurons = [], synapses = [];
(function(){
  var N = 85;
  var inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32,10,8),
    new THREE.MeshPhongMaterial({color:0x2a8a7c, emissive:0x1a6a5c, emissiveIntensity:0.8, shininess:70}), N);
  var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3();
  for(var i=0;i<N;i++){
    var r = rnd(6,52), a = rnd(0,Math.PI*2);
    var y = 1.5 + Math.pow(Math.random(),1.6)*15;
    var p = new V3(Math.cos(a)*r, y, Math.sin(a)*r);
    var s = rnd(0.5,1.5);
    sc.set(s,s,s);
    m4.compose(p, q, sc);
    inst.setMatrixAt(i, m4);
    neurons.push(p);
  }
  scene.add(inst);
  // 近邻连接
  var linePos = [];
  for(i=0;i<N;i++){
    var dists = [];
    for(var k2=0;k2<N;k2++){
      if(k2===i) continue;
      dists.push({k:k2, d:neurons[i].distanceToSquared(neurons[k2])});
    }
    dists.sort(function(a,b){ return a.d-b.d; });
    for(var c2=0;c2<2;c2++){
      var j2 = dists[c2].k;
      linePos.push(neurons[i].x,neurons[i].y,neurons[i].z, neurons[j2].x,neurons[j2].y,neurons[j2].z);
      synapses.push({a:neurons[i], b:neurons[j2]});
    }
  }
  var lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos),3));
  var lm = new THREE.LineBasicMaterial({color:0x2a8a7c, transparent:true, opacity:0.28, blending:THREE.AdditiveBlending});
  var lines = new THREE.LineSegments(lg, lm);
  scene.add(lines);
  // 突触脉冲（沿线移动的亮点）
  var pulseGeo = new THREE.BufferGeometry();
  var PN = 40;
  var pulsePos = new Float32Array(PN*3);
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos,3));
  var pulses = [];
  for(i=0;i<PN;i++){
    pulses.push({edge:Math.floor(Math.random()*synapses.length), t:Math.random(), sp:rnd(0.4,1.4)});
  }
  var pulseMat = new THREE.PointsMaterial({color:0xaefCE8, size:0.5, map:SPR.white,
    transparent:true, opacity:0.9, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true});
  var pulsePts = new THREE.Points(pulseGeo, pulseMat);
  pulsePts.frustumCulled = false; scene.add(pulsePts);
  window.__syn = {geo:pulseGeo, pulses:pulses, mat:pulseMat};
})();

/* ---------- 数据流（板面走线粒子） ---------- */
var flow;
(function(){
  var N = 320;
  var pos = new Float32Array(N*3);
  var parts = [];
  for(var i=0;i<N;i++){
    var horiz = Math.random()<0.5;
    var p = {x:rnd(-190,190), z:rnd(-190,190), y:0.25,
             dx:horiz?(Math.random()<0.5?-1:1):0, dz:horiz?0:(Math.random()<0.5?-1:1),
             sp:rnd(6,22)};
    parts.push(p);
    pos[i*3]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z;
  }
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var m = new THREE.PointsMaterial({color:0x6fe8d4, size:0.55, map:SPR.glow,
    transparent:true, opacity:0.85, depthWrite:false, blending:THREE.AdditiveBlending, sizeAttenuation:true});
  flow = new THREE.Points(g, m);
  flow.frustumCulled = false;
  scene.add(flow);
  window.__flow = {parts:parts, mat:m, geo:g};
})();

/* ---------- 存储单元（内容面板） ---------- */
var UNITS = [
  {key:'about',   a:36,  tx:'核心',   st:'CORE'},
  {key:'skills',  a:108, tx:'技艺',   st:'SKILLS'},
  {key:'works',   a:180, tx:'记忆体', st:'WORKS'},
  {key:'journey', a:252, tx:'进程',   st:'JOURNEY'},
  {key:'contact', a:324, tx:'接口',   st:'CONTACT'}
];
var panels = [], unitHits = [];
UNITS.forEach(function(c){
  var rad = c.a*Math.PI/180;
  var ux = Math.cos(rad)*8.5, uz = Math.sin(rad)*8.5;
  var g = new THREE.Group(); g.position.set(ux,0,uz); scene.add(g);
  var body = new THREE.Mesh(new THREE.BoxGeometry(1.3,2.6,1.0),
    new THREE.MeshPhongMaterial({color:0x0c2620, shininess:40, specular:0x3a8a7c}));
  body.position.y = 1.3; g.add(body);
  // 闪烁指示灯
  for(var i=0;i<4;i++){
    var led = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.08,0.05),
      new THREE.MeshBasicMaterial({color: i%2 ? 0x6fe8d4 : 0xffb454}));
    led.position.set(-0.35+i*0.23, 2.1-i*0.3, 0.53); g.add(led);
  }
  var cap = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.16,1.2),
    new THREE.MeshPhongMaterial({color:0x1a4a42, emissive:0x0e3a32, shininess:60}));
  cap.position.y = 2.68; g.add(cap);
  var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.0,4),
    new THREE.MeshPhongMaterial({color:0x8ab8ac}));
  ant.position.set(0.4,3.2,-0.2); g.add(ant);
  var tip = new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),
    new THREE.MeshBasicMaterial({color:0xffb454}));
  tip.position.set(0.4,3.72,-0.2); g.add(tip);
  var gl = new THREE.PointLight(0x6fe8d4, 0.45, 12, 2);
  gl.position.set(ux, 3.4, uz); scene.add(gl);

  var nrm = new V3(Math.cos(rad), 0, Math.sin(rad)).normalize();
  var el = document.getElementById('pn-'+c.key);
  panels.push({
    key:c.key, cfg:c, el:el,
    pos:new V3(ux+nrm.x*1.1, 3.0, uz+nrm.z*1.1),
    nrm:nrm, right:new V3(nrm.z,0,-nrm.x),
    cssW: el.offsetWidth||620, w:7.4
  });
  var hit = new THREE.Mesh(new THREE.BoxGeometry(2.4,3.6,2.2), new THREE.MeshBasicMaterial({visible:false}));
  hit.position.set(ux, 1.8, uz);
  hit.userData.unit = c.key; scene.add(hit); unitHits.push(hit);
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
  if(camera.position.distanceTo(pos) > 240) op = 0;
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
  target:new V3(0,2.8,0), yaw:0.5, pitch:0.34, dist:24,
  tTarget:new V3(0,2.8,0), tYaw:0.5, tPitch:0.34, tDist:24,
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
    rig.yaw += dt*0.026;
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
function focusUnit(k){
  for(var i=0;i<panels.length;i++){
    if(panels[i].key===k){
      activeKey = k;
      flyTo({t:[panels[i].pos.x*0.88, panels[i].pos.y, panels[i].pos.z*0.88],
             yaw:Math.atan2(panels[i].pos.x, panels[i].pos.z), pitch:0.13, dist:8.4}, 1.5);
      setHud(panels[i].cfg.tx, panels[i].cfg.st);
      return;
    }
  }
}
function goCore(){
  activeKey = null;
  flyTo({t:[0,2.8,0], yaw:rig.yaw, pitch:0.34, dist:24}, 1.6);
  setHud('芯上心灵','电路是骨骼，脉冲是心跳');
}
function goNet(){
  activeKey = null;
  flyTo({t:[0,6,0], yaw:rig.yaw, pitch:0.5, dist:52}, 1.8);
  setHud('神经网络','突触之间，思想在传播');
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
    rig.pitch = clamp(rig.pitch + dy*0.0032, 0.05, 1.05);
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
  rig.dist = clamp(rig.dist*(e.deltaY>0?1.09:0.92), 5, 90);
  rig.active=false;
},{passive:false});
window.addEventListener('keydown', function(e){ if(e.key==='Escape') goCore(); });
function doPick(px,py){
  mouse.x=(px/window.innerWidth)*2-1;
  mouse.y=-(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(unitHits, false);
  if(hits.length) focusUnit(hits[0].object.userData.unit);
}
function hoverTip(){
  if(drag.on){ tipEl.style.opacity=0; return; }
  ray.setFromCamera(mouse, camera);
  var hits = ray.intersectObjects(unitHits, false);
  if(hits.length){
    var k = hits[0].object.userData.unit, nm='';
    for(var i=0;i<panels.length;i++) if(panels[i].key===k) nm=panels[i].cfg.tx;
    tipEl.textContent = '读取「'+nm+'」'; tipEl.style.opacity=0.95;
    canvas.style.cursor='pointer';
  } else { tipEl.style.opacity=0; canvas.style.cursor=drag.on?'grabbing':'grab'; }
}

/* ---------- 控制台 ---------- */
var clk = 1.0, flowAmt = 0.6;
function bindSlider(id, cb){
  var el=document.getElementById(id);
  el.addEventListener('input', function(){ cb(parseFloat(el.value)); });
  cb(parseFloat(el.value));
}
bindSlider('sClk', function(v){
  clk = Math.max(0.05, v/100);
  document.getElementById('vClk').textContent = clk.toFixed(1)+' GHz';
});
bindSlider('sFlow', function(v){
  flowAmt = v/100;
  document.getElementById('vFlow').textContent = v<25?'稀疏':(v<55?'正常':(v<85?'密集':'洪峰'));
});
document.getElementById('bCore').onclick = goCore;
document.getElementById('bNet').onclick = goNet;
var manualPulse = 0;
document.getElementById('bPulse').onclick = function(){ manualPulse = 1.2; };
var tourBtn = document.getElementById('bTour');
var tour = {on:false, i:0, t:0};
tourBtn.onclick = function(){ tour.on=!tour.on; tourBtn.classList.toggle('on', tour.on); };
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var ni=0;ni<navLinks.length;ni++){
  navLinks[ni].addEventListener('click', function(){ focusUnit(this.dataset.wp); });
}

/* ---------- 主循环 ---------- */
var clock = new THREE.Clock(), timeNow = 0, tipT = 0;
setHud('芯上心灵','电路是骨骼，脉冲是心跳');
function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt*clk;

  // 核心脉冲
  var beat = (Math.sin(timeNow*2.2)*0.5+0.5) + manualPulse;
  manualPulse = Math.max(0, manualPulse - dt*1.2);
  coreMesh.scale.setScalar(1 + beat*0.07);
  coreWire.rotation.y = timeNow*0.3;
  coreWire.rotation.x = Math.sin(timeNow*0.4)*0.3;
  coreWire.scale.setScalar(1 + beat*0.1);
  coreGlow.material.opacity = 0.55 + beat*0.35;
  coreGlow.scale.setScalar(9 + beat*2.5);
  coreLight.intensity = 1.2 + beat*0.8;

  // 突触脉冲推进
  var syn = window.__syn;
  if(syn){
    var pp = syn.geo.attributes.position;
    for(var i=0;i<syn.pulses.length;i++){
      var pu = syn.pulses[i];
      pu.t += dt*pu.sp*clk*0.5;
      if(pu.t > 1){ pu.t = 0; pu.edge = Math.floor(Math.random()*synapses.length); }
      var e = synapses[pu.edge];
      var x = lerp(e.a.x, e.b.x, pu.t), y = lerp(e.a.y, e.b.y, pu.t), z = lerp(e.a.z, e.b.z, pu.t);
      pp.setXYZ(i, x, y, z);
    }
    pp.needsUpdate = true;
    syn.mat.opacity = clamp(0.25 + flowAmt*0.7, 0, 1);
  }

  // 数据流
  var fl = window.__flow;
  if(fl){
    var fp = fl.geo.attributes.position;
    var activeCount = Math.floor(fl.parts.length * clamp(flowAmt*1.15, 0.08, 1));
    for(i=0;i<fl.parts.length;i++){
      var pt = fl.parts[i];
      if(i < activeCount){
        pt.x += pt.dx * pt.sp * dt * clk;
        pt.z += pt.dz * pt.sp * dt * clk;
        if(Math.abs(pt.x) > 195 || Math.abs(pt.z) > 195){
          pt.x = clamp(pt.x, -195, 195); pt.z = clamp(pt.z, -195, 195);
          if(Math.random()<0.5){ pt.dx = -pt.dx; } else { pt.dz = -pt.dz; }
        }
        if(Math.random() < dt*0.8){
          var t2 = pt.dx; pt.dx = -pt.dz; pt.dz = t2;   // 转向
        }
        fp.setXYZ(i, pt.x, pt.y, pt.z);
      } else {
        fp.setXYZ(i, 0, -50, 0);   // 隐藏
      }
    }
    fp.needsUpdate = true;
  }

  if(tour.on){
    tour.t += dt;
    if(tour.t > 5.5){ tour.t=0; tour.i=(tour.i+1)%panels.length; focusUnit(panels[tour.i].key); }
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
