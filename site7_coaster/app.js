/* ============================================================
   云霄轨道 · site7_coaster —— 第一人称过山车
   ============================================================ */
(function(){
"use strict";

var V3 = THREE.Vector3, COL = THREE.Color;
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function rnd(a,b){ return a+Math.random()*(b-a); }

var canvas = document.getElementById('bg');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1526);
scene.fog = new THREE.Fog(0x2a3a58, 140, 640);

var camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.1, 3000);

/* ---------- 贴图 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function skyTexture(){
  var c=mkCanvas(32,512), x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#0a1030'); g.addColorStop(0.34,'#1c2c54');
  g.addColorStop(0.58,'#4a4a78'); g.addColorStop(0.74,'#b06a58');
  g.addColorStop(0.84,'#f0a05c'); g.addColorStop(1,'#3a2c38');
  x.fillStyle=g; x.fillRect(0,0,32,512);
  return new THREE.CanvasTexture(c);
}
function radialSprite(inner, outer){
  var c=mkCanvas(128,128), x=c.getContext('2d');
  var g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,inner); g.addColorStop(1,outer);
  x.fillStyle=g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
var sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 20),
  new THREE.MeshBasicMaterial({map:skyTexture(), side:THREE.BackSide, fog:false}));
scene.add(sky);
var sun = new THREE.Sprite(new THREE.SpriteMaterial({map:radialSprite('rgba(255,214,150,.95)','rgba(255,150,80,0)'),
  transparent:true, fog:false, blending:THREE.AdditiveBlending, depthWrite:false}));
sun.scale.set(420,420,1); sun.position.set(-500, 60, -900); scene.add(sun);

/* ---------- 灯光 ---------- */
scene.add(new THREE.HemisphereLight(0x9ab4e8, 0x4a3c38, 1.05));
var key = new THREE.DirectionalLight(0xffc890, 1.15); key.position.set(-80, 60, -120); scene.add(key);
var fill = new THREE.DirectionalLight(0x6a86c8, 0.4); fill.position.set(60, 40, 100); scene.add(fill);

/* ---------- 地面与远山 ---------- */
var groundGeo = new THREE.PlaneGeometry(3200,3200,72,72); groundGeo.rotateX(-Math.PI/2);
var gp = groundGeo.attributes.position;
for(var gi=0; gi<gp.count; gi++){
  var gx=gp.getX(gi), gz=gp.getZ(gi);
  gp.setY(gi, Math.sin(gx*0.012)*Math.cos(gz*0.01)*2.2 + Math.sin(gx*0.05+gz*0.04)*0.6);
}
groundGeo.computeVertexNormals();
var ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({color:0x2c3648}));
ground.position.y = -2; scene.add(ground);

(function ridges(){
  function ridgeGeo(W,H,seed){
    var g=new THREE.PlaneGeometry(W,H,72,1); var p=g.attributes.position;
    for(var i=0;i<p.count;i++){
      var x=p.getX(i), y=p.getY(i);
      if(y > H/2-1){
        var h = Math.sin(x*0.009+seed)*H*0.18 + Math.sin(x*0.037+seed*2)*H*0.10 + Math.sin(x*0.09+seed*3)*H*0.04;
        p.setZ(i, h - H*0.1);
      } else { p.setZ(i, -H); }
    }
    g.computeVertexNormals(); return g;
  }
  [{z:-1150,w:3000,h:340,c:0x232f4c,o:1},
   {z:-950,w:2400,h:270,c:0x2a3a5c,o:1},
   {z:-760,w:1900,h:210,c:0x33466c,o:1},
   {z:1100,w:3000,h:300,c:0x222c48,o:1}].forEach(function(L,idx){
    var m = new THREE.Mesh(ridgeGeo(L.w,L.h,idx*2.3),
      new THREE.MeshBasicMaterial({color:L.c, fog:false, depthWrite:true}));
    m.position.set(0, L.h*0.36, L.z); scene.add(m);
  });
})();

/* ---------- 云 ---------- */
var clouds = [];
(function(){
  for(var i=0;i<16;i++){
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map:radialSprite('rgba(255,235,220,.5)','rgba(255,235,220,0)'),
      transparent:true, opacity:rnd(0.25,0.6), fog:false, depthWrite:false}));
    sp.scale.set(rnd(60,160), rnd(14,30), 1);
    sp.position.set(rnd(-700,700), rnd(90,220), rnd(-900,300));
    sp.userData.v = rnd(1.5,4);
    scene.add(sp); clouds.push(sp);
  }
})();

/* ---------- 树（ instanced ） ---------- */
var trees = (function(){
  var N=140;
  var cone = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6,4.5,6),
    new THREE.MeshLambertMaterial({color:0x2e4a3a}), N);
  var trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25,0.35,1.6,5),
    new THREE.MeshLambertMaterial({color:0x4a3423}), N);
  var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), p=new V3(), s=new V3();
  for(var i=0;i<N;i++){
    var x=rnd(-450,450), z=rnd(-520,320);
    if(Math.abs(x)<26 && z<120 && z>-320) { x += (x<0?-30:30); }
    var sc=rnd(0.7,1.7);
    e.set(0,Math.random()*6.28,0); q.setFromEuler(e);
    p.set(x,1.0*sc,z); s.set(sc,sc,sc);
    m4.compose(p,q,s); trunk.setMatrixAt(i,m4);
    p.set(x,(1.2+2.25)*sc,z);
    m4.compose(p,q,s); cone.setMatrixAt(i,m4);
  }
  scene.add(cone); scene.add(trunk);
  return {cone:cone, trunk:trunk};
})();

/* ============================================================
   轨道
   ============================================================ */
var PTS = [
  [0,3.0,70],      // 站台
  [0,3.4,52],
  [0,7,22],        // 开始爬升
  [0,16,-8],
  [0,26,-38],
  [0,33,-62],      // 制高点
  [0,20,-84],      // 俯冲
  [0,6,-108],
  [0,4,-128],      // 谷底
  [0,13,-152],     // 空气山
  [0,5,-176],
  [14,5,-196],
  [42,7,-208],
  [64,6,-186],
  [75,5,-160],     // 接近回环
  [75,5,-146],     // 回环入口（底）
  [83,12,-146],
  [75,24,-146],    // 顶点（倒挂）
  [67,12,-146],
  [75,5,-146],     // 回环出口（底，交叉）
  [92,6,-146],
  [118,9,-140],
  [140,13,-104],   // 左转弯爬升
  [136,15,-58],
  [108,16,-22],
  [72,18,-4],
  [40,20,4],
  [12,16,16],
  [-6,12,36],
  [0,6.5,56],
  [0,3.0,70]       // 回到站台
].map(function(a){ return new V3(a[0],a[1],a[2]); });

var curve = new THREE.CatmullRomCurve3(PTS, false, 'catmullrom', 0.5);
var TRACK_LEN = curve.getLength();
var frames = curve.computeFrenetFrames(600, false);

var UP = new V3(0,1,0);
function stableNormal(t, frenetN){
  var n = UP.clone().addScaledVector(t, -UP.dot(t));
  if(n.lengthSq() < 1e-6) return frenetN.clone();
  n.normalize();
  var w = clamp((Math.abs(t.y)-0.72)/0.22, 0, 1);   // 近垂直段换回 Frenet
  return n.multiplyScalar(1-w).addScaledVector(frenetN, w).normalize();
}
function frameAt(u){
  u = clamp(u, 0, 1);
  var f = u*600;
  var i0 = Math.min(600, Math.floor(f));
  var i1 = Math.min(600, i0+1);
  var t = f - i0;
  function mix(a,b){ return a+(b-a)*t; }
  var T = new V3().copy(frames.tangents[i0]).lerp(frames.tangents[i1], t).normalize();
  var N = new V3().copy(frames.normals[i0]).lerp(frames.normals[i1], t).normalize();
  N = stableNormal(T, N);
  var B = new V3().crossVectors(T, N).normalize();
  return { tangent:T, normal:N, binormal:B };
}

/* ---------- 钢轨 ---------- */
function buildRail(offset){
  var pts = [];
  var N = 500;
  for(var i=0;i<=N;i++){
    var u = i/N;
    var p = curve.getPointAt(u);
    var f = frameAt(u);
    p.addScaledVector(f.binormal, offset);
    p.addScaledVector(f.normal, 0.55);
    pts.push(p);
  }
  var railCurve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(
    new THREE.TubeGeometry(railCurve, 520, 0.10, 6, false),
    new THREE.MeshPhongMaterial({color:0xd8e2f0, shininess:80, specular:0x8898b8}));
}
scene.add(buildRail(-0.62));
scene.add(buildRail(0.62));
var spine = (function(){
  var pts=[];
  for(var i=0;i<=400;i++){
    var u=i/400, p=curve.getPointAt(u), f=frameAt(u);
    p.addScaledVector(f.normal, 0.18);
    pts.push(p);
  }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 420, 0.30, 6, false),
    new THREE.MeshPhongMaterial({color:0xc05038, shininess:40, specular:0x662a1c}));
})();
scene.add(spine);

/* ---------- 枕木 / 支柱 ---------- */
(function(){
  var N = 420;
  var sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9,0.12,0.5),
    new THREE.MeshPhongMaterial({color:0x5a4a3a, shininess:6}), N);
  var m4=new THREE.Matrix4();
  var basis=new THREE.Matrix4();
  for(var i=0;i<N;i++){
    var u=i/N;
    var p=curve.getPointAt(u), f=frameAt(u);
    p.addScaledVector(f.normal, 0.42);
    basis.makeBasis(f.binormal, f.normal, f.tangent);
    m4.set(
      f.binormal.x, f.normal.x, f.tangent.x, p.x,
      f.binormal.y, f.normal.y, f.tangent.y, p.y,
      f.binormal.z, f.normal.z, f.tangent.z, p.z,
      0,0,0,1);
    sleepers.setMatrixAt(i, m4);
  }
  scene.add(sleepers);

  // 支柱
  var M=90;
  var cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42,0.55,1,8),
    new THREE.MeshPhongMaterial({color:0x9aa8bc, shininess:30, specular:0x4a5a70}), M);
  var cnt=0;
  for(i=0;i<M;i++){
    var uu=i/M;
    var pp=curve.getPointAt(uu);
    if(pp.y < 4.2) continue;
    var f2=frameAt(uu);
    var side=(i%2?1:-1)*1.55;
    var h = pp.y + 1;
    var e2=new THREE.Euler(), q2=new THREE.Quaternion();
    e2.set(0,0,0); q2.setFromEuler(e2);
    var s2=new V3(1,h,1);
    m4.compose(new V3(pp.x+f2.binormal.x*side, h/2-1, pp.z+f2.binormal.z*side), q2, s2);
    cols.setMatrixAt(cnt++, m4);
  }
  cols.count = cnt;
  scene.add(cols);
})();

/* ---------- 车站 ---------- */
var STATION = {pos:new V3(0,3.0,70), tangent:new V3(0,0,-1)};
(function(){
  var g = new THREE.Group(); g.position.set(0,0,74); scene.add(g);
  var plat = new THREE.Mesh(new THREE.BoxGeometry(14,1.2,16),
    new THREE.MeshPhongMaterial({color:0x3c4a62, shininess:12}));
  plat.position.set(6.5,0.6,0); plat.receiveShadow=true; g.add(plat);
  [-1,1].forEach(function(sd){
    for(var i=0;i<4;i++){
      var col = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.2,5.4,8),
        new THREE.MeshPhongMaterial({color:0xc05038, shininess:30}));
      col.position.set(6.5+sd*5.4, 3.9, -6+i*4); g.add(col);
    }
  });
  var roof = new THREE.Mesh(new THREE.BoxGeometry(13.5,0.4,17),
    new THREE.MeshPhongMaterial({color:0x28324a, shininess:8}));
  roof.position.set(6.5,6.8,0); g.add(roof);
  var sign = new THREE.Mesh(new THREE.BoxGeometry(0.3,1.4,6.5),
    new THREE.MeshPhongMaterial({color:0xff8a3c, emissive:0x7a3210, shininess:40}));
  sign.position.set(6.5,6.0,0); g.add(sign);
})();

/* ---------- 沿途内容门架 ---------- */
var GATES = [
  {key:'skills',  u:0.22, name:'爬升段', desc:'链式提升段，视野开始变好'},
  {key:'works',   u:0.47, name:'回环段', desc:'刚刚倒挂穿过回环'},
  {key:'journey', u:0.70, name:'螺旋段', desc:'大回旋，抓紧了'},
  {key:'contact', u:0.90, name:'终点前', desc:'冲线之前，留个联系方式'}
];
var gates = [];
GATES.forEach(function(cfg){
  var p = curve.getPointAt(cfg.u);
  var f = frameAt(cfg.u);
  var right = f.binormal.clone();
  var g = new THREE.Group();
  g.position.copy(p); scene.add(g);
  var archMat = new THREE.MeshPhongMaterial({color:0xc05038, shininess:36, specular:0x662a1c});
  [-1,1].forEach(function(sd){
    var col = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,10,8), archMat);
    col.position.copy(right.clone().multiplyScalar(sd*4.6)).add(new V3(0,5,0));
    g.add(col);
  });
  var beam = new THREE.Mesh(new THREE.BoxGeometry(10,0.7,0.8), archMat);
  beam.position.y = 10; g.add(beam);
  var lampM = new THREE.MeshBasicMaterial({color:0xffd28a});
  for(var i=0;i<5;i++){
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8), lampM);
    lamp.position.set(-4+i*2, 9.4, 0); g.add(lamp);
  }
  g.quaternion.setFromUnitVectors(new V3(1,0,0), right.clone().normalize());
  gates.push({cfg:cfg, group:g, pos:p.clone(), right:right.clone().normalize(), tangent:f.tangent.clone()});
});
/* ---------- 车体（追尾视角可见） ---------- */
var car = new THREE.Group(); scene.add(car);
(function(){
  var body = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.85,3.4),
    new THREE.MeshPhongMaterial({color:0xc05038, shininess:46, specular:0x7a2a1c}));
  body.position.y = 0.4; car.add(body);
  var nose = new THREE.Mesh(new THREE.ConeGeometry(0.9,1.4,4),
    new THREE.MeshPhongMaterial({color:0xd8e2f0, shininess:70}));
  nose.rotation.x = Math.PI/2; nose.rotation.y = Math.PI/4;
  nose.position.set(0,0.4,2.2); car.add(nose);
  [-0.6,0.6].forEach(function(x){
    var seat = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.5),
      new THREE.MeshPhongMaterial({color:0x222c44}));
    seat.position.set(x,1.0,-0.6); car.add(seat);
  });
})();

/* ---------- DOM 面板（锚定在门架旁的站牌上） ---------- */
var panels = [];
(function(){
  addPanel('about', STATION.pos.clone().add(new V3(10.5, 4.6, -2)), new V3(0.94,0,-0.34), 8.2, '车站 · STATION');
  gates.forEach(function(gt){
    var p = gt.pos.clone()
      .addScaledVector(gt.right, 8.6)
      .addScaledVector(gt.tangent, 7.5);
    p.y += 4.6;
    var nrm = gt.right.clone().negate();
    addPanel(gt.cfg.key, p, nrm, 8.0, gt.cfg.name);
  });
  function addPanel(key, pos, nrm, w, label){
    var el = document.getElementById('pn-'+key);
    if(!el) return;
    panels.push({key:key, el:el, pos:pos, nrm:nrm.clone().normalize(),
      right:new V3().crossVectors(new V3(0,1,0), nrm).normalize().negate(),
      cssW: el.offsetWidth || 620, w:w, label:label});
  }
})();

var _pv=new V3(), _pr=new V3();
function distToCam(v){ return camera.position.distanceTo(v); }
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
    var s = clamp(pxW/p.cssW, 0.05, 1.6);
    var op = (behind || facing < 0.05) ? 0 : clamp(facing*2.6, 0, 1);
    if(distToCam(p.pos) > 460) op = 0;
    var st = p.el.style;
    st.transform = 'translate3d('+x1.toFixed(1)+'px,'+y1.toFixed(1)+'px,0) translate(-50%,-50%) rotate('+ang.toFixed(2)+'deg) scale('+s.toFixed(3)+')';
    st.opacity = op.toFixed(3);
    st.pointerEvents = (op>0.4 && s>0.28) ? 'auto' : 'none';
    p.el.classList.toggle('on', p.key === activeKey);
  }
}

/* ============================================================
   行驶逻辑
   ============================================================ */
var ride = {
  u:0, speed:0, baseSpeed:15, speedMult:1.0,
  braking:false, dwell:0, state:'running', pov:true
};
var SECTION_NAMES = [
  {u:0.0,  n:'车站',   d:'扣好安全杆'},
  {u:0.10, n:'爬升段', d:'链式提升，视野变好'},
  {u:0.30, n:'制高点', d:'深呼吸——前面是俯冲'},
  {u:0.40, n:'俯冲段', d:'抓稳扶手'},
  {u:0.52, n:'回环',   d:'倒挂通过'},
  {u:0.66, n:'大回旋', d:'侧向 G 力'},
  {u:0.82, n:'回场弯', d:'快到站了'},
  {u:0.94, n:'进站',   d:'欢迎回来'}
];
var activeKey = 'about';
var hudCache=null, gateCache=null;
function setHud(name, desc){
  document.getElementById('hudT').textContent = name;
  document.getElementById('hudD').textContent = desc;
  var as = document.querySelectorAll('#nav a.wp');
  for(var i=0;i<as.length;i++) as[i].classList.toggle('active', as[i].dataset.wp===activeKey);
}
function sectionAt(u){
  var cur = SECTION_NAMES[0];
  for(var i=0;i<SECTION_NAMES.length;i++) if(u >= SECTION_NAMES[i].u) cur = SECTION_NAMES[i];
  return cur;
}

/* ---------- 相机 ---------- */
var look = {yaw:0, pitch:0, yawT:0, pitchT:0};
var camUp = new V3(0,1,0);
function updateCamera(dt){
  var p = curve.getPointAt(ride.u);
  var f = frameAt(ride.u);
  car.position.copy(p).addScaledVector(f.normal, 0.72);
  car.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(f.binormal, f.normal, f.tangent));
  car.visible = !ride.pov;
  if(ride.pov){
    look.yaw = lerp(look.yaw, look.yawT, 1-Math.pow(0.0001, dt));
    look.pitch = lerp(look.pitch, look.pitchT, 1-Math.pow(0.0001, dt));
    var eye = p.clone().addScaledVector(f.normal, 1.55);
    camera.position.copy(eye);
    var dir = f.tangent.clone();
    var right = new V3().crossVectors(dir, f.normal).normalize();
    dir.addScaledVector(right, Math.tan(look.yaw)).addScaledVector(f.normal, Math.tan(look.pitch));
    camUp.lerp(f.normal, 1-Math.pow(0.001, dt));
    camera.up.copy(camUp);
    camera.lookAt(eye.clone().add(dir));
  } else {
    var back = p.clone().addScaledVector(f.tangent, -11).addScaledVector(f.normal, 4.2);
    camera.position.lerp(back, 1-Math.pow(0.001, dt));
    camUp.lerp(f.normal, 1-Math.pow(0.005, dt));
    camera.up.copy(camUp);
    camera.lookAt(p.clone().addScaledVector(f.tangent, 6));
  }
}
function tickRide(dt){
  if(ride.state === 'running'){
    var targetSpeed = ride.baseSpeed * ride.speedMult;
    var f = frameAt(ride.u);
    var slope = -f.tangent.y;
    targetSpeed *= clamp(1 + slope*1.6, 0.45, 2.1);
    if(ride.u > 0.965 || ride.u < 0.02) targetSpeed *= 0.35;
    if(ride.braking) targetSpeed = 0;
    ride.speed = lerp(ride.speed, targetSpeed, 1-Math.pow(0.02, dt));
    ride.u += ride.speed * dt / TRACK_LEN;
    if(ride.u >= 1){
      ride.u = 0; ride.state='dwelling'; ride.dwell = 0;
      activeKey = 'about';
      setHud('车站','到站了，读点什么再走');
    }
    if(ride.state === 'running'){
      var sec = sectionAt(ride.u);
      if(sec.n !== hudCache){ hudCache = sec.n; setHud(sec.n, sec.d); }
      for(var i=0;i<GATES.length;i++){
        if(Math.abs(ride.u - GATES[i].u) < 0.006 && gateCache !== GATES[i].key){
          gateCache = GATES[i].key;
          setHud(GATES[i].cfg.name, GATES[i].cfg.desc);
        }
      }
    }
  } else {
    ride.dwell += dt;
    ride.speed = lerp(ride.speed, 0, 1-Math.pow(0.01, dt));
    if(ride.dwell > 9){ ride.state='running'; activeKey=null; gateCache=null; hudCache=null; }
  }
}

/* ---------- 交互 ---------- */
var lookSens = 1.0;
window.addEventListener('mousemove', function(e){
  look.yawT = clamp((e.clientX/window.innerWidth - 0.5) * 1.7 * lookSens, -1.15, 1.15);
  look.pitchT = clamp(-(e.clientY/window.innerHeight - 0.5) * 0.9 * lookSens, -0.55, 0.65);
});
var brakeBtn = document.getElementById('bBrake');
window.addEventListener('keydown', function(e){
  if(e.code==='Space'){ ride.braking=true; brakeBtn.classList.add('on'); e.preventDefault(); }
});
window.addEventListener('keyup', function(e){
  if(e.code==='Space'){ ride.braking=false; brakeBtn.classList.remove('on'); }
});

/* ---------- 控制台 ---------- */
function bindSlider(id, cb){
  var el=document.getElementById(id);
  el.addEventListener('input', function(){ cb(parseFloat(el.value)); });
  cb(parseFloat(el.value));
}
bindSlider('sSpd', function(v){
  ride.speedMult = v/100;
  document.getElementById('vSpd').textContent = ride.speedMult.toFixed(1)+'×';
});
bindSlider('sLook', function(v){
  lookSens = v/100;
  document.getElementById('vLook').textContent = lookSens.toFixed(1)+'×';
});
brakeBtn.onclick = function(){ ride.braking=!ride.braking; brakeBtn.classList.toggle('on', ride.braking); };
document.getElementById('bGo').onclick = function(){
  ride.u = 0; ride.state='running'; ride.dwell=0; activeKey=null; hudCache=null; gateCache=null;
  ride.braking=false; brakeBtn.classList.remove('on');
  setHud('车站','再次发车！');
};
var povBtn = document.getElementById('bPOV'), chaseBtn = document.getElementById('bChase');
function setPOV(pov){
  ride.pov = pov;
  povBtn.classList.toggle('on', pov);
  chaseBtn.classList.toggle('on', !pov);
}
povBtn.classList.add('on');
povBtn.onclick = function(){ setPOV(true); };
chaseBtn.onclick = function(){ setPOV(false); };
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var ni=0;ni<navLinks.length;ni++){
  navLinks[ni].addEventListener('click', function(){
    var k = this.dataset.wp;
    activeKey = k;
    if(k==='about'){ ride.u=0; ride.state='dwelling'; ride.dwell=0; }
    var name={about:'车站',skills:'爬升段',works:'回环段',journey:'螺旋段',contact:'终点前'}[k];
    setHud(name, '站牌已点亮 · 车辆驶近时可见');
  });
}

/* ---------- 主循环 ---------- */
var clock = new THREE.Clock(), timeNow = 0;
var kmhEl = document.getElementById('kmh'), progI = document.getElementById('progI');
var linesEl = document.getElementById('speedlines');
setHud('车站','扣好安全杆');
function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt;

  tickRide(dt);
  updateCamera(dt);
  updatePanels();

  kmhEl.textContent = Math.round(ride.speed*3.6);
  progI.style.width = (ride.u*100).toFixed(1)+'%';
  linesEl.style.opacity = clamp((ride.speed-16)/26, 0, 0.5).toFixed(2);

  for(var i=0;i<clouds.length;i++){
    clouds[i].position.x += clouds[i].userData.v*dt;
    if(clouds[i].position.x > 760) clouds[i].position.x = -760;
  }
  sky.position.copy(camera.position);
  sun.position.set(camera.position.x-500, 60, camera.position.z-900);

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
}, 500);

})();
