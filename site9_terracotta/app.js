/* ============================================================
   周天子九驾 · site9_terracotta
   ============================================================ */
(function(){
"use strict";

/* ---------- 0. 工具 ---------- */
var V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion, E = THREE.Euler, COL = THREE.Color;
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function rnd(a,b){ return a+Math.random()*(b-a); }
function ease(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

var canvas = document.getElementById('bg');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1c10);
scene.fog = new THREE.FogExp2(0xa9784a, 0.0132);

var camera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, 0.1, 3200);

var C = {
  robe:0x8d7452, robeDk:0x6d5a3d, armor:0x726a5a, armorDk:0x5b5346,
  skin:0xc9a077, hair:0x241e1a, shoe:0x493724, wood:0x6d5230, woodDk:0x4a3418,
  bronze:0xb08f4e, bronzeHi:0xe2c687, jade:0x4f7f6a, red:0xa8332a, redDk:0x7d2721,
  horse:0x5b3a22, horseDk:0x3b2716, gold:0xd9a441
};

/* ---------- 1. 程序化贴图 ---------- */
function mkCanvas(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function toTex(c, rx, ry){
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx||1, ry||1);
  t.anisotropy = 4;
  return t;
}
function speckle(ctx,w,h,base,dots,a){
  ctx.fillStyle = base; ctx.fillRect(0,0,w,h);
  for(var i=0;i<dots;i++){
    var x=Math.random()*w, y=Math.random()*h, r=Math.random()*2.2+0.3;
    var d = (Math.random()*2-1)*a;
    ctx.fillStyle = 'rgba('+(d>0?'255,236,200':'40,26,12')+','+Math.abs(d)+')';
    ctx.beginPath(); ctx.arc(x,y,r,0,6.2832); ctx.fill();
  }
}
function potteryTexture(){
  var c=mkCanvas(256,256), x=c.getContext('2d');
  speckle(x,256,256,'#a07a52',2600,0.16);
  for(var i=0;i<40;i++){
    x.fillStyle='rgba(60,40,20,'+(Math.random()*0.10)+')';
    x.beginPath(); x.arc(Math.random()*256,Math.random()*256,Math.random()*16+3,0,6.2832); x.fill();
  }
  return toTex(c,2,2);
}
function groundTexture(){
  var c=mkCanvas(1024,1024), x=c.getContext('2d');
  speckle(x,1024,1024,'#a2794a',9000,0.13);
  var i,k,px,py;
  for(i=0;i<160;i++){
    x.strokeStyle='rgba(70,48,24,'+(Math.random()*0.09+0.02)+')';
    x.lineWidth=Math.random()*3+0.4; x.beginPath();
    px=Math.random()*1024; py=Math.random()*1024; x.moveTo(px,py);
    for(k=0;k<5;k++){ px+=rnd(-70,70); py+=rnd(-70,70); x.lineTo(px,py); }
    x.stroke();
  }
  for(i=0;i<500;i++){
    x.fillStyle='rgba(228,206,168,'+(Math.random()*0.10)+')';
    x.fillRect(Math.random()*1024,Math.random()*1024,Math.random()*3+1,Math.random()*3+1);
  }
  return toTex(c,26,26);
}
function roadTexture(){
  var c=mkCanvas(512,512), x=c.getContext('2d');
  speckle(x,512,512,'#9c7a4c',6000,0.14);
  for(var i=0;i<90;i++){
    x.strokeStyle='rgba(78,55,28,'+(Math.random()*0.12+0.03)+')'; x.lineWidth=Math.random()*2+0.3;
    x.beginPath(); var px=Math.random()*512, py=Math.random()*512; x.moveTo(px,py);
    for(var k=0;k<4;k++){ px+=rnd(-40,40); py+=rnd(-8,8); x.lineTo(px,py); } x.stroke();
  }
  return toTex(c,3,60);
}
function stoneTexture(base){
  var c=mkCanvas(256,256), x=c.getContext('2d');
  speckle(x,256,256,base,3400,0.14);
  for(var i=0;i<26;i++){
    x.strokeStyle='rgba(30,20,10,'+(Math.random()*0.14+0.03)+')'; x.lineWidth=Math.random()*1.6+0.2;
    x.beginPath(); var px=Math.random()*256, py=Math.random()*256; x.moveTo(px,py);
    for(var k=0;k<3;k++){ px+=rnd(-40,40); py+=rnd(-40,40); x.lineTo(px,py);} x.stroke();
  }
  return toTex(c,1,1);
}
function textTexture(title, sub, bg, fg){
  var c=mkCanvas(512,1024), x=c.getContext('2d');
  x.fillStyle=bg; x.fillRect(0,0,512,1024);
  for(var i=0;i<2200;i++){
    x.fillStyle='rgba(0,0,0,'+(Math.random()*0.08)+')';
    x.fillRect(Math.random()*512,Math.random()*1024,2,2);
  }
  x.strokeStyle=fg; x.globalAlpha=0.55; x.lineWidth=3; x.strokeRect(26,26,460,972); x.globalAlpha=1;
  x.fillStyle=fg; x.textAlign='center';
  x.font='700 116px "STKaiti","KaiTi","Songti SC",serif';
  var ch = title.replace(/\s+/g,'').split('');
  var step = 148, cy = 200;
  for(var j=0;j<ch.length;j++){ x.fillText(ch[j], 256, cy); cy += step; }
  x.font='400 38px "PingFang SC","Microsoft YaHei",sans-serif'; x.globalAlpha=0.72;
  x.fillText(sub, 256, 930);
  return toTex(c,1,1);
}
function skyTexture(){
  var c=mkCanvas(32,512), x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#2b2b4a'); g.addColorStop(0.28,'#6a4a52');
  g.addColorStop(0.48,'#c07a45'); g.addColorStop(0.62,'#e8a45c');
  g.addColorStop(0.74,'#f2c07a'); g.addColorStop(1,'#8a6a43');
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
var TEX = { pot:potteryTexture(), ground:groundTexture(), road:roadTexture(), stone:stoneTexture('#7c6a4d') };

/* ---------- 2. 灯光 / 天空 ---------- */
scene.add(new THREE.HemisphereLight(0xffd6a2, 0x4a3418, 0.80));
var key = new THREE.DirectionalLight(0xffc98a, 1.30);
key.position.set(-70, 62, -150);
key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
key.shadow.camera.near = 10; key.shadow.camera.far = 480;
key.shadow.camera.left = -95; key.shadow.camera.right = 95;
key.shadow.camera.top = 95; key.shadow.camera.bottom = -95;
key.shadow.bias = -0.0007;
scene.add(key);
var rim = new THREE.DirectionalLight(0x9fc0ff, 0.30); rim.position.set(60, 40, 120); scene.add(rim);
var bounce = new THREE.PointLight(0xd08a44, 0.6, 140, 2); bounce.position.set(0, 9, 18); scene.add(bounce);

var sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20),
  new THREE.MeshBasicMaterial({map:skyTexture(), side:THREE.BackSide, fog:false}));
scene.add(sky);

var sunDisc = new THREE.Mesh(new THREE.CircleGeometry(30, 44),
  new THREE.MeshBasicMaterial({color:0xffe9b8, transparent:true, opacity:0.85, fog:false,
    blending:THREE.AdditiveBlending, depthWrite:false}));
sunDisc.position.set(-260, 80, -640); sunDisc.lookAt(0,70,0); scene.add(sunDisc);

var halo = new THREE.Sprite(new THREE.SpriteMaterial({map:radialSprite('rgba(255,214,150,.95)','rgba(255,170,80,0)'),
  transparent:true, fog:false, blending:THREE.AdditiveBlending, depthWrite:false}));
halo.scale.set(380,380,1); halo.position.copy(sunDisc.position); scene.add(halo);

/* ---------- 3. 地面 / 驰道 / 远山 ---------- */
var groundGeo = new THREE.PlaneGeometry(2600,2600,96,96); groundGeo.rotateX(-Math.PI/2);
var gp = groundGeo.attributes.position;
for(var gi=0; gi<gp.count; gi++){
  var gx=gp.getX(gi), gz=gp.getZ(gi);
  var gh = Math.sin(gx*0.021)*Math.cos(gz*0.017)*1.5 + Math.sin(gx*0.07+gz*0.05)*0.55;
  var gd = Math.max(0, Math.abs(gx)-24);
  gh += gd*0.035 + (Math.random()-0.5)*0.16;
  gp.setY(gi, gh);
}
groundGeo.computeVertexNormals();
var ground = new THREE.Mesh(groundGeo, new THREE.MeshPhongMaterial({map:TEX.ground, shininess:2, specular:0x2a2016}));
ground.receiveShadow = true; ground.position.y = -0.02; scene.add(ground);

var road = new THREE.Mesh(new THREE.PlaneGeometry(30, 520),
  new THREE.MeshPhongMaterial({map:TEX.road, shininess:5, specular:0x34281a}));
road.rotation.x = -Math.PI/2; road.position.set(0, 0.03, -190); road.receiveShadow = true; scene.add(road);

[-11.5, 11.5].forEach(function(rx){
  var rut = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 520),
    new THREE.MeshPhongMaterial({map:TEX.road, color:0x8f7a52, shininess:4}));
  rut.rotation.x = -Math.PI/2; rut.rotation.z = Math.PI/2;
  rut.position.set(rx, 0.05, -190); scene.add(rut);
});

(function ridges(){
  function ridgeGeo(W,H,seed){
    var g=new THREE.PlaneGeometry(W,H,64,1); var p=g.attributes.position;
    for(var i=0;i<p.count;i++){
      var x=p.getX(i), y=p.getY(i);
      if(y > H/2-1){
        var h = Math.sin(x*0.011+seed)*H*0.16 + Math.sin(x*0.043+seed*2)*H*0.09 + Math.sin(x*0.11+seed*3)*H*0.035;
        p.setZ(i, h - H*0.12);
      } else { p.setZ(i, -H); }
    }
    g.computeVertexNormals(); return g;
  }
  [{z:-740,w:2200,h:260,c:0x5a4a3c,o:0.98},
   {z:-600,w:1800,h:210,c:0x6b5442,o:0.96},
   {z:-470,w:1400,h:165,c:0x7d6146,o:0.94}].forEach(function(L,idx){
    var m = new THREE.Mesh(ridgeGeo(L.w,L.h,idx*2.1),
      new THREE.MeshBasicMaterial({color:L.c, transparent:true, opacity:L.o, depthWrite:false, fog:false}));
    m.position.set(0, L.h*0.40, L.z); scene.add(m);
  });
})();

/* ---------- 4. 旌旗 ---------- */
var flags = [];
(function buildFlags(){
  var poleMat = new THREE.MeshPhongMaterial({color:C.woodDk, shininess:14});
  for(var i=0;i<20;i++){
    var side = i%2 ? 1 : -1;
    var z = 14 - i*16 + (side<0 ? -8 : 0);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.09,8.6,6), poleMat);
    pole.position.set(side*20.5, 4.3, z); pole.castShadow = true; scene.add(pole);
    var fin = new THREE.Mesh(new THREE.ConeGeometry(0.13,0.5,6),
      new THREE.MeshPhongMaterial({color:C.bronzeHi, shininess:60, specular:0xe8d29a}));
    fin.position.set(side*20.5, 8.8, z); scene.add(fin);

    var col = (i%3===0) ? C.red : ((i%3===1) ? 0x8f4a2a : 0x7a6a3a);
    var clothGeo = new THREE.PlaneGeometry(3.4, 4.6, 8, 6);
    var cloth = new THREE.Mesh(clothGeo, new THREE.MeshPhongMaterial({color:col, side:THREE.DoubleSide, shininess:3}));
    cloth.position.set(side*20.5 - side*1.75, 6.1, z);
    cloth.castShadow = true; scene.add(cloth);
    flags.push({mesh:cloth, geo:clothGeo, ph:i*0.7, radial:false});
  }
})();
function updateFlags(t){
  for(var i=0;i<flags.length;i++){
    var f=flags[i], p=f.geo.attributes.position, n=p.count;
    for(var k=0;k<n;k++){
      var x=p.getX(k), y=p.getY(k);
      var kf = (x+1.7)/3.4;
      p.setZ(k, Math.sin(x*2.2 + t*3.4 + f.ph)*0.30*kf + Math.sin(y*1.6 - t*2.2 + f.ph)*0.12*kf);
    }
    p.needsUpdate = true;
    f.geo.computeVertexNormals();
  }
}

/* ---------- 5. 烟尘 ---------- */
var dustMat;
(function(){
  var N = 1000, pos = new Float32Array(N*3), sz = new Float32Array(N), ph = new Float32Array(N);
  for(var i=0;i<N;i++){
    pos[i*3]=rnd(-52,52); pos[i*3+1]=rnd(0.2,17); pos[i*3+2]=rnd(-380,26);
    sz[i]=rnd(1.4,5.6); ph[i]=Math.random()*6.2832;
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('sz', new THREE.BufferAttribute(sz,1));
  g.setAttribute('ph', new THREE.BufferAttribute(ph,1));
  dustMat = new THREE.ShaderMaterial({
    uniforms:{uT:{value:0}, uAlpha:{value:0.7}, uColor:{value:new COL(0xd8b083)}},
    transparent:true, depthWrite:false,
    vertexShader:[
      'attribute float sz; attribute float ph; uniform float uT; varying float vA;',
      'void main(){',
      '  vec3 p = position;',
      '  p.z = mod(p.z + uT*(4.0+sz*2.2), 406.0) - 380.0;',
      '  p.y += sin(uT*0.6+ph)*0.7;',
      '  p.x += sin(uT*0.5+ph*1.7)*1.7;',
      '  vec4 mv = modelViewMatrix*vec4(p,1.0);',
      '  vA = uAlpha * smoothstep(400.0, 60.0, abs(p.z)) * (0.45+0.55*(0.5+0.5*sin(ph+uT*0.7)));',
      '  gl_PointSize = sz * 100.0 / max(-mv.z, 1.0);',
      '  gl_Position = projectionMatrix*mv;',
      '}'].join('\n'),
    fragmentShader:[
      'uniform vec3 uColor; varying float vA;',
      'void main(){',
      '  vec2 d = gl_PointCoord-0.5; float a = smoothstep(0.5,0.03,length(d));',
      '  gl_FragColor = vec4(uColor, a*vA*0.55);',
      '}'].join('\n')
  });
  var pts = new THREE.Points(g, dustMat); pts.frustumCulled=false; scene.add(pts);
})();

/* ---------- 6. 几何拼装（顶点色合并） ---------- */
var _gCache = {};
function BOX(a,b,c){ var k='b'+a+'_'+b+'_'+c; if(!_gCache[k]) _gCache[k]=new THREE.BoxGeometry(a,b,c); return _gCache[k]; }
function CYL(rt,rb,h,s){ var k='c'+rt+'_'+rb+'_'+h+'_'+s; if(!_gCache[k]) _gCache[k]=new THREE.CylinderGeometry(rt,rb,h,s||8); return _gCache[k]; }
function SPH(r,a,b){ var k='s'+r+'_'+a+'_'+b; if(!_gCache[k]) _gCache[k]=new THREE.SphereGeometry(r,a||8,b||6); return _gCache[k]; }
var _pp=new V3(), _qq=new Q(), _ee=new E(), _ss=new V3(), _nn3=new THREE.Matrix3();
function put(L, geo, color, pos, rot, scale){
  _ee.set(rot?rot[0]:0, rot?rot[1]:0, rot?rot[2]:0); _qq.setFromEuler(_ee);
  _pp.set(pos[0],pos[1],pos[2]);
  _ss.set(scale?scale[0]:1, scale?scale[1]:1, scale?scale[2]:1);
  L.push({geo:geo, matrix:new M4().compose(_pp,_qq,_ss), color:new COL(color)});
}
function mergeGeos(list){
  var vCount=0, iCount=0, k, i;
  for(k=0;k<list.length;k++){ vCount+=list[k].geo.attributes.position.count; iCount+=list[k].geo.index.count; }
  var pos=new Float32Array(vCount*3), nor=new Float32Array(vCount*3), uv=new Float32Array(vCount*2),
      col=new Float32Array(vCount*3), idx=new Uint32Array(iCount);
  var vo=0, io=0, tv=new V3(), tn=new V3();
  for(k=0;k<list.length;k++){
    var o=list[k], g=o.geo, m=o.matrix, c=o.color, nm=_nn3.getNormalMatrix(m);
    var ap=g.attributes.position, an=g.attributes.normal, au=g.attributes.uv, cnt=ap.count;
    for(i=0;i<cnt;i++){
      tv.set(ap.getX(i),ap.getY(i),ap.getZ(i)).applyMatrix4(m);
      pos[(vo+i)*3]=tv.x; pos[(vo+i)*3+1]=tv.y; pos[(vo+i)*3+2]=tv.z;
      tn.set(an.getX(i),an.getY(i),an.getZ(i)).applyMatrix3(nm).normalize();
      nor[(vo+i)*3]=tn.x; nor[(vo+i)*3+1]=tn.y; nor[(vo+i)*3+2]=tn.z;
      uv[(vo+i)*2]=au.getX(i); uv[(vo+i)*2+1]=au.getY(i);
      col[(vo+i)*3]=c.r; col[(vo+i)*3+1]=c.g; col[(vo+i)*3+2]=c.b;
    }
    var gid=g.index;
    for(i=0;i<gid.count;i++) idx[io+i]=gid.getX(i)+vo;
    io+=gid.count; vo+=cnt;
  }
  var out=new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos,3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor,3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv,2));
  out.setAttribute('color', new THREE.BufferAttribute(col,3));
  out.setIndex(new THREE.BufferAttribute(idx,1));
  out.computeBoundingSphere();
  return out;
}
var bodyMat = new THREE.MeshPhongMaterial({vertexColors:true, map:TEX.pot, shininess:6, specular:0x241f16});

/* ---------- 7. 俑的形制 ---------- */
function buildInfantry(){
  var L=[];
  put(L,BOX(0.17,0.15,0.32),C.shoe,[-0.13,0.075,0.03]);
  put(L,BOX(0.17,0.15,0.32),C.shoe,[ 0.13,0.075,0.03]);
  put(L,BOX(0.18,0.42,0.21),C.robe,[-0.13,0.36,0]);
  put(L,BOX(0.18,0.42,0.21),C.robe,[ 0.13,0.36,0]);
  put(L,CYL(0.25,0.36,0.44,6),C.armorDk,[0,0.78,0]);
  put(L,BOX(0.48,0.54,0.33),C.armor,[0,1.21,0]);
  for(var r=0;r<3;r++) put(L,BOX(0.53,0.10,0.36),C.armorDk,[0,1.02+r*0.18,0.01]);
  put(L,BOX(0.63,0.13,0.39),C.armorDk,[0,1.50,0]);
  put(L,BOX(0.15,0.46,0.17),C.armor,[-0.32,1.24,0.02],[0,0,0.10]);
  put(L,BOX(0.15,0.46,0.17),C.armor,[ 0.32,1.24,0.02],[0,0,-0.10]);
  put(L,CYL(0.08,0.09,0.11,6),C.skin,[0,1.61,0]);
  put(L,SPH(0.135,8,6),C.skin,[0,1.77,0]);
  put(L,BOX(0.31,0.11,0.29),C.hair,[0,1.87,-0.01]);
  put(L,SPH(0.078,6,5),C.hair,[0.03,1.92,-0.11]);
  put(L,BOX(0.10,0.05,0.03),C.hair,[-0.13,1.86,0.06],[0,0,0.3]);
  put(L,BOX(0.10,0.05,0.03),C.hair,[ 0.13,1.86,0.06],[0,0,-0.3]);
  put(L,CYL(0.024,0.024,2.05,4),C.wood,[0.38,1.08,0.07]);
  put(L,CYL(0.052,0.018,0.20,6),C.bronze,[0.38,2.16,0.07]);
  put(L,SPH(0.055,6,5),C.red,[0.38,2.06,0.07]);
  return mergeGeos(L);
}
function buildArcher(){
  var L=[];
  put(L,BOX(0.20,0.16,0.52),C.shoe,[-0.12,0.08,0.16]);
  put(L,BOX(0.19,0.44,0.22),C.robe,[ 0.14,0.24,-0.02],[0.55,0,0]);
  put(L,BOX(0.20,0.18,0.30),C.shoe,[ 0.16,0.09,-0.24]);
  put(L,CYL(0.26,0.38,0.40,6),C.armorDk,[0,0.66,0.02],[-0.12,0,0]);
  put(L,BOX(0.48,0.52,0.33),C.armor,[0,1.06,0.02],[-0.10,0,0]);
  put(L,BOX(0.54,0.10,0.36),C.armorDk,[0,0.94,0.03],[-0.10,0,0]);
  put(L,BOX(0.62,0.13,0.38),C.armorDk,[0,1.34,0.02],[-0.10,0,0]);
  put(L,BOX(0.15,0.42,0.17),C.armor,[-0.30,1.12,0.06],[-0.5,0,0.12]);
  put(L,BOX(0.15,0.42,0.17),C.armor,[ 0.30,1.12,0.06],[-0.5,0,-0.12]);
  put(L,CYL(0.08,0.09,0.11,6),C.skin,[0,1.44,0.03]);
  put(L,SPH(0.135,8,6),C.skin,[0,1.60,0.03]);
  put(L,BOX(0.31,0.11,0.29),C.hair,[0,1.70,0.02]);
  put(L,SPH(0.075,6,5),C.hair,[-0.04,1.74,0.14]);
  put(L,BOX(0.30,0.07,0.62),C.woodDk,[0,1.18,-0.28],[-0.12,0,0]);
  put(L,BOX(0.86,0.05,0.05),C.woodDk,[0,1.20,-0.52],[0,0,0]);
  return mergeGeos(L);
}
function buildOfficer(){
  var L=[];
  put(L,BOX(0.18,0.15,0.34),C.shoe,[-0.14,0.075,0.03]);
  put(L,BOX(0.18,0.15,0.34),C.shoe,[ 0.14,0.075,0.03]);
  put(L,BOX(0.19,0.46,0.22),C.robeDk,[-0.14,0.38,0]);
  put(L,BOX(0.19,0.46,0.22),C.robeDk,[ 0.14,0.38,0]);
  put(L,CYL(0.26,0.52,0.70,6),C.redDk,[0,0.94,0]);
  for(var r=0;r<3;r++) put(L,BOX(0.56,0.11,0.40),0x6b3f36,[0,0.80+r*0.20,0.01]);
  put(L,BOX(0.50,0.56,0.35),C.redDk,[0,1.36,0]);
  put(L,BOX(0.66,0.14,0.41),C.armorDk,[0,1.66,0]);
  put(L,BOX(0.16,0.48,0.18),C.redDk,[-0.34,1.38,0.02],[0,0,0.10]);
  put(L,BOX(0.16,0.48,0.18),C.redDk,[ 0.34,1.38,0.02],[0,0,-0.10]);
  put(L,CYL(0.085,0.095,0.12,6),C.skin,[0,1.79,0]);
  put(L,SPH(0.142,8,6),C.skin,[0,1.96,0]);
  put(L,BOX(0.30,0.16,0.30),C.hair,[0,2.06,0]);
  put(L,BOX(0.26,0.06,0.24),0x2b2320,[0,2.05,0.10],[0.42,0,0]);
  put(L,BOX(0.05,0.30,0.05),C.red,[0,1.60,0.20]);
  put(L,CYL(0.035,0.03,0.85,6),0x9aa0a6,[0.40,1.30,0.10],[-0.12,0,0.06]);
  put(L,BOX(0.10,0.05,0.22),C.gold,[0.40,1.72,0.10],[-0.12,0,0.06]);
  return mergeGeos(L);
}
function buildCavalry(){
  var L=[];
  put(L,SPH(0.42,10,8),C.horse,[0,0.95,0],[0,0,0],[0.85,0.80,1.35]);
  put(L,BOX(0.24,0.56,0.30),C.horse,[0,1.20,0.62],[0.42,0,0]);
  put(L,BOX(0.22,0.26,0.48),C.horseDk,[0,1.50,0.86],[-0.22,0,0]);
  put(L,BOX(0.08,0.14,0.06),C.horseDk,[-0.09,1.66,0.72],[0.3,0,0]);
  put(L,BOX(0.08,0.14,0.06),C.horseDk,[ 0.09,1.66,0.72],[0.3,0,0]);
  put(L,BOX(0.09,0.30,0.26),C.hair,[0,1.36,0.66],[0.34,0,0]);
  var legs=[[-0.22,-0.45,1],[0.22,-0.45,1],[-0.22,0.42,-1],[0.22,0.42,-1]];
  for(var i=0;i<4;i++){
    put(L,BOX(0.13,0.62,0.15),C.horseDk,[legs[i][0]*0.8,0.55,legs[i][1]*0.55],[legs[i][2]*0.12,0,0]);
    put(L,BOX(0.15,0.26,0.17),C.hair,[legs[i][0]*0.8,0.13,legs[i][1]*0.55]);
  }
  put(L,BOX(0.09,0.40,0.09),C.hair,[0,1.05,-0.66],[0.5,0,0]);
  put(L,BOX(0.44,0.10,0.56),C.redDk,[0,1.28,0.02]);
  put(L,BOX(0.46,0.16,0.20),C.armorDk,[0,1.36,-0.18]);
  put(L,BOX(0.42,0.44,0.30),C.armor,[0,1.72,0.02]);
  put(L,BOX(0.56,0.12,0.36),C.armorDk,[0,1.96,0.02]);
  put(L,BOX(0.14,0.34,0.16),C.armor,[-0.28,1.74,0.06],[0.5,0,0.12]);
  put(L,BOX(0.14,0.34,0.16),C.armor,[ 0.28,1.74,0.06],[0.5,0,-0.12]);
  put(L,BOX(0.19,0.34,0.22),C.robe,[-0.20,1.10,0.02],[0.7,0,0]);
  put(L,BOX(0.19,0.34,0.22),C.robe,[ 0.20,1.10,0.02],[0.7,0,0]);
  put(L,CYL(0.08,0.09,0.11,6),C.skin,[0,2.09,0.02]);
  put(L,SPH(0.135,8,6),C.skin,[0,2.25,0.02]);
  put(L,BOX(0.30,0.12,0.28),C.hair,[0,2.35,0.01]);
  put(L,SPH(0.072,6,5),C.hair,[0.03,2.41,-0.08]);
  put(L,CYL(0.022,0.022,1.5,4),C.wood,[0.36,1.55,0.06],[0.16,0,0.18]);
  return mergeGeos(L);
}
/* ---------- 8. 阵列 ---------- */
var MAXR = 40, MAXC = 15, MAXI = MAXR*MAXC + 40, MAXH = 48;
var army = {
  inf: new THREE.InstancedMesh(buildInfantry(), bodyMat, MAXI),
  arch:new THREE.InstancedMesh(buildArcher(), bodyMat, MAXC*3),
  off: new THREE.InstancedMesh(buildOfficer(), bodyMat, MAXI),
  cav: new THREE.InstancedMesh(buildCavalry(), bodyMat, MAXH)
};
[army.inf, army.arch, army.off, army.cav].forEach(function(m){
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  m.count = 0; scene.add(m);
});
var layout = {rows:26, cols:11, spacing:5.4, colGap:3.0, zFront:-19};
var slotData = {inf:[], arch:[], off:[], cav:[]};

function rebuildArmy(){
  var R = layout.rows, Cn = layout.cols, sp = layout.spacing, gap = layout.colGap, z0 = layout.zFront;
  slotData.inf.length=0; slotData.arch.length=0; slotData.off.length=0; slotData.cav.length=0;
  var halfSpan = (Cn-1)*gap/2, midC = Math.floor(Cn/2);
  for(var c=0;c<Cn;c++){
    var x = -halfSpan + c*gap;
    for(var r=0; r<2 && R>2; r++)
      slotData.arch.push({x:x+rnd(-.12,.12), y:0, z:z0-r*sp*0.62, ph:c*0.9+r*3.1, row:r, col:c});
    for(var rr=(R>2?2:0); rr<R; rr++){
      var jz = rnd(-.16,.16), jx = rnd(-.18,.18);
      if((rr % 5 === 1) && (c === midC))
        slotData.off.push({x:x, y:0, z:z0-rr*sp, ph:c*0.8+rr*0.55, row:rr, col:c});
      else
        slotData.inf.push({x:x+jx, y:0, z:z0-rr*sp+jz, ph:c*0.73+rr*0.44, row:rr, col:c});
    }
  }
  var cavRows = Math.max(2, Math.floor((R-2)/3));
  for(var i=0; i<cavRows && i*2<MAXH; i++){
    slotData.cav.push({x:-halfSpan-7.8, y:0, z:z0-6-i*9.5, ph:i*1.3,     row:i, col:0});
    slotData.cav.push({x: halfSpan+7.8, y:0, z:z0-6-i*9.5, ph:i*1.3+1.7, row:i, col:1});
  }
  army.inf.count  = slotData.inf.length;
  army.arch.count = slotData.arch.length;
  army.off.count  = slotData.off.length;
  army.cav.count  = slotData.cav.length;
}
var _mtx=new M4(), _pos=new V3(), _qt=new Q(), _eu=new E(), _sc=new V3(1,1,1);
function armyPush(t){ return Math.sin(t*0.09)*10.0; }
function updateArmy(t, speed){
  var push = armyPush(t);
  function fill(mesh, arr){
    for(var i=0;i<arr.length;i++){
      var s=arr[i];
      var bob  = Math.abs(Math.sin(t*2.2*speed + s.ph))*0.055*(0.3+0.7*speed);
      var sway = Math.sin(t*2.2*speed + s.ph)*0.028*(0.25+0.75*speed);
      _pos.set(s.x, s.y+bob, s.z+push+Math.sin(t*1.1*speed+s.ph)*0.10);
      _eu.set(sway*0.5, 0, sway);
      _qt.setFromEuler(_eu);
      _sc.set(1,1,1);
      _mtx.compose(_pos,_qt,_sc);
      mesh.setMatrixAt(i,_mtx);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  fill(army.arch, slotData.arch);
  fill(army.inf,  slotData.inf);
  fill(army.off,  slotData.off);
  fill(army.cav,  slotData.cav);
}
rebuildArmy();

/* ---------- 9. 周天子九驾车马 ---------- */
var chariot = new THREE.Group(); chariot.position.set(0,0,4); scene.add(chariot);
var horseObjs = [], wheelList = [];
(function buildChariot(){
  var bronze   = new THREE.MeshPhongMaterial({color:C.bronze, shininess:70, specular:0xe6d09a});
  var bronzeHi = new THREE.MeshPhongMaterial({color:C.bronzeHi, shininess:88, specular:0xfff0c0});
  var lacquer  = new THREE.MeshPhongMaterial({color:0x7d2a20, shininess:52, specular:0x8a3a2a});
  var lacquerDk= new THREE.MeshPhongMaterial({color:0x4a1c18, shininess:40, specular:0x5c2a22});
  var wood     = new THREE.MeshPhongMaterial({color:C.wood, shininess:24, map:TEX.pot});
  var woodDk   = new THREE.MeshPhongMaterial({color:C.woodDk, shininess:18});
  var gold     = new THREE.MeshPhongMaterial({color:C.gold, shininess:96, specular:0xfff0c8});

  var box = new THREE.Group(); box.position.y = 1.40; chariot.add(box);
  var floor = new THREE.Mesh(BOX(1.62,0.12,1.24), lacquerDk); floor.castShadow=true; box.add(floor);
  [-0.72,0.72].forEach(function(x){
    var w = new THREE.Mesh(BOX(0.10,0.62,1.24), lacquer); w.position.set(x,0.32,0); w.castShadow=true; box.add(w);
    var t = new THREE.Mesh(BOX(0.13,0.07,1.28), bronze); t.position.set(x,0.64,0); box.add(t);
  });
  var front = new THREE.Mesh(BOX(1.62,0.46,0.09), lacquer); front.position.set(0,0.28,0.60); front.castShadow=true; box.add(front);
  var back  = new THREE.Mesh(BOX(1.62,0.66,0.09), lacquer); back.position.set(0,0.36,-0.60); back.castShadow=true; box.add(back);
  for(var i=0;i<9;i++){
    var rail = new THREE.Mesh(BOX(0.05,0.30,0.05), bronze);
    rail.position.set(-0.62+i*0.155, 0.52, -0.60); box.add(rail);
  }
  var step = new THREE.Mesh(BOX(1.4,0.06,0.26), woodDk); step.position.set(0,0.02,-0.74); box.add(step);

  function wheel(){
    var g = new THREE.Group();
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.64,0.055,6,26), bronze); rim.castShadow=true; g.add(rim);
    var hub = new THREE.Mesh(CYL(0.16,0.16,0.30,10), lacquerDk); hub.rotation.x=Math.PI/2; g.add(hub);
    for(var k=0;k<20;k++){
      var s = new THREE.Mesh(BOX(0.035,0.58,0.035), bronze);
      s.position.set(Math.cos(k/20*6.2832)*0.32, Math.sin(k/20*6.2832)*0.32, 0);
      s.rotation.z = k/20*6.2832 - Math.PI/2; g.add(s);
    }
    var band = new THREE.Mesh(new THREE.TorusGeometry(0.60,0.03,5,22), bronzeHi); g.add(band);
    return g;
  }
  var wheelL = wheel(), wheelR = wheel();
  wheelL.position.set(-1.00,0.64,0); wheelR.position.set(1.00,0.64,0);
  wheelL.rotation.y = Math.PI/2; wheelR.rotation.y = Math.PI/2;
  chariot.add(wheelL); chariot.add(wheelR);
  var axle = new THREE.Mesh(CYL(0.07,0.07,2.1,8), bronze);
  axle.rotation.z=Math.PI/2; axle.position.set(0,0.64,0); chariot.add(axle);

  var pole = new THREE.Mesh(BOX(0.13,0.13,5.2), wood);
  pole.position.set(0,1.05,-2.5); pole.rotation.x = -0.075; pole.castShadow=true; chariot.add(pole);
  var poleTip = new THREE.Mesh(new THREE.ConeGeometry(0.09,0.34,6), bronze);
  poleTip.position.set(0,1.32,-5.12); poleTip.rotation.x=Math.PI/2*0.96; chariot.add(poleTip);
  var bar = new THREE.Mesh(BOX(3.9,0.11,0.13), bronze); bar.position.set(0,1.22,-4.8); chariot.add(bar);
  [-1.6,-0.8,0,0.8,1.6].forEach(function(x){
    var yoke = new THREE.Mesh(CYL(0.05,0.05,0.42,6), bronzeHi);
    yoke.position.set(x,1.10,-4.82); yoke.rotation.x = 0.5; chariot.add(yoke);
    var knob = new THREE.Mesh(SPH(0.075,7,6), gold); knob.position.set(x,1.30,-4.80); chariot.add(knob);
  });

  var canopy = new THREE.Group(); canopy.position.set(0,1.75,0); chariot.add(canopy);
  var mast = new THREE.Mesh(CYL(0.055,0.07,1.55,8), lacquerDk); mast.position.y=0.6; mast.castShadow=true; canopy.add(mast);
  var dome = new THREE.Mesh(new THREE.ConeGeometry(1.28,0.62,20,1,true), lacquer);
  dome.position.y=1.42; dome.castShadow=true; canopy.add(dome);
  var domeIn = new THREE.Mesh(new THREE.ConeGeometry(1.24,0.58,20,1,true),
    new THREE.MeshPhongMaterial({color:0x8f3a2c, side:THREE.BackSide, shininess:16}));
  domeIn.position.y=1.40; canopy.add(domeIn);
  for(i=0;i<20;i++){
    var rib = new THREE.Mesh(BOX(0.03,0.03,1.25), gold);
    var a = i/20*6.2832;
    rib.position.set(Math.cos(a)*0.62, 1.26, Math.sin(a)*0.62);
    rib.rotation.y = -a; rib.rotation.x = 0.24; canopy.add(rib);
  }
  var knobT = new THREE.Mesh(SPH(0.11,10,8), gold); knobT.position.y=1.76; canopy.add(knobT);

  function figure(mat, headMat, scale){
    var g=new THREE.Group();
    var body=new THREE.Mesh(BOX(0.42,0.72,0.30), mat); body.position.y=0.36; body.castShadow=true; g.add(body);
    var skirt=new THREE.Mesh(CYL(0.24,0.36,0.5,6), mat); skirt.position.y=0.10; g.add(skirt);
    var sh=new THREE.Mesh(BOX(0.56,0.12,0.34), mat); sh.position.y=0.72; g.add(sh);
    var armL=new THREE.Mesh(BOX(0.12,0.42,0.14), mat); armL.position.set(-0.27,0.50,0.10); armL.rotation.x=-0.55; g.add(armL);
    var armR=new THREE.Mesh(BOX(0.12,0.42,0.14), mat); armR.position.set(0.27,0.50,0.10); armR.rotation.x=-0.55; g.add(armR);
    var sk = new THREE.MeshPhongMaterial({color:C.skin, shininess:14});
    var nk=new THREE.Mesh(CYL(0.07,0.08,0.10,6), sk); nk.position.y=0.82; g.add(nk);
    var hd=new THREE.Mesh(SPH(0.13,10,8), sk); hd.position.y=0.95; g.add(hd);
    var cap=new THREE.Mesh(BOX(0.28,0.13,0.28), headMat); cap.position.y=1.04; g.add(cap);
    g.scale.setScalar(scale);
    return g;
  }
  var emperorMat = new THREE.MeshPhongMaterial({color:0x8c3326, shininess:30, map:TEX.pot});
  var emperor = figure(emperorMat, new THREE.MeshPhongMaterial({color:C.gold, shininess:80, specular:0xfff0c0}), 1.06);
  emperor.position.set(0.06,0.06,-0.14); emperor.rotation.y=0.06; box.add(emperor);
  var crown = new THREE.Mesh(BOX(0.30,0.05,0.20), gold);
  crown.position.set(0.06,1.17,-0.06); crown.rotation.x=0.35; box.add(crown);
  var driverMat = new THREE.MeshPhongMaterial({color:0x4f4a3c, shininess:20, map:TEX.pot});
  var driver = figure(driverMat, new THREE.MeshPhongMaterial({color:0x2c2622}), 1.0);
  driver.position.set(-0.10,0.06,0.34); box.add(driver);

  var staff = new THREE.Mesh(CYL(0.05,0.05,3.2,6), lacquerDk); staff.position.set(0.72,1.6,-0.5); box.add(staff);
  var bannerGeo = new THREE.PlaneGeometry(0.9,1.5,6,4);
  var banner = new THREE.Mesh(bannerGeo, new THREE.MeshPhongMaterial({color:C.red, side:THREE.DoubleSide, map:TEX.pot, shininess:8}));
  banner.position.set(1.17,2.4,-0.5); box.add(banner);
  flags.push({mesh:banner, geo:bannerGeo, ph:2.2});

  var HORSES = [
    {x:0,     z:-4.6,  s:1.00},
    {x:-1.16, z:-5.0,  s:0.99},{x:1.16, z:-5.0,  s:0.99},
    {x:-2.32, z:-5.4,  s:0.98},{x:2.32, z:-5.4,  s:0.98},
    {x:-3.48, z:-5.8,  s:0.97},{x:3.48, z:-5.8,  s:0.97},
    {x:-4.64, z:-6.2,  s:0.96},{x:4.64, z:-6.2,  s:0.96}
  ];
  HORSES.forEach(function(h, idx){
    var gm = new THREE.Group();
    var hide = new THREE.MeshPhongMaterial({color:[0x4a2f1c,0x6b4526,0x3d2716,0x7a5230,0x54341d][idx%5], shininess:26, map:TEX.pot});
    var dark = new THREE.MeshPhongMaterial({color:0x241a12, shininess:34});
    var b = new THREE.Mesh(SPH(0.42,12,9), hide); b.scale.set(0.46,0.50,1.05); b.position.y=0.86; b.castShadow=true; gm.add(b);
    var neck = new THREE.Mesh(BOX(0.26,0.62,0.32), hide); neck.position.set(0,1.12,0.62); neck.rotation.x=0.40; gm.add(neck);
    var head = new THREE.Mesh(BOX(0.22,0.28,0.54), hide); head.position.set(0,1.44,0.92); head.rotation.x=-0.18; gm.add(head);
    var nose = new THREE.Mesh(BOX(0.18,0.18,0.20), hide); nose.position.set(0,1.36,1.18); gm.add(nose);
    [-1,1].forEach(function(sd){
      var ear=new THREE.Mesh(BOX(0.05,0.16,0.04), hide);
      ear.position.set(sd*0.08,1.64,0.74); ear.rotation.z=sd*0.2; gm.add(ear);
    });
    var mane = new THREE.Mesh(BOX(0.11,0.44,0.30), dark); mane.position.set(0,1.34,0.56); mane.rotation.x=0.34; gm.add(mane);
    [[-0.20,0.62],[0.20,0.62],[-0.20,-0.52],[0.20,-0.52]].forEach(function(lg){
      var up=new THREE.Mesh(BOX(0.14,0.34,0.17), hide); up.position.set(lg[0],0.62,lg[1]); gm.add(up);
      var lo=new THREE.Mesh(BOX(0.12,0.36,0.14), hide); lo.position.set(lg[0],0.28,lg[1]); gm.add(lo);
      var hf=new THREE.Mesh(BOX(0.15,0.13,0.22), dark); hf.position.set(lg[0],0.06,lg[1]+0.04); gm.add(hf);
    });
    var tail=new THREE.Mesh(BOX(0.10,0.52,0.10), dark); tail.position.set(0,0.92,-0.98); tail.rotation.x=-0.42; gm.add(tail);
    var saddle=new THREE.Mesh(BOX(0.44,0.10,0.58), new THREE.MeshPhongMaterial({color:C.redDk, shininess:22}));
    saddle.position.y=1.20; gm.add(saddle);
    var plaque = new THREE.Mesh(BOX(0.20,0.16,0.04), bronzeHi); plaque.position.set(0,1.06,0.52); gm.add(plaque);
    var reinMat = new THREE.MeshPhongMaterial({color:0x3a2a1a});
    var reinFrom = new V3(h.x, 1.30, h.z - 0.75);
    var reinTo = new V3(h.x*0.55, 1.18, -4.8);
    var reinLen = reinFrom.distanceTo(reinTo);
    var rein = new THREE.Mesh(BOX(0.03,0.03,reinLen), reinMat);
    var reinMid = reinFrom.clone().add(reinTo).multiplyScalar(0.5);
    rein.position.copy(reinMid);
    rein.rotation.y = Math.atan2(reinTo.x-reinFrom.x, reinTo.z-reinFrom.z);
    chariot.add(rein);
    gm.position.set(h.x,0,h.z); gm.scale.setScalar(h.s*0.98);
    gm.rotation.y = Math.PI;
    chariot.add(gm);
    horseObjs.push({g:gm, base:gm.position.clone(), ph:idx*0.5, wheel:wheelL});
  });
  wheelList.push(wheelL, wheelR);
})();

/* ---------- 10. 碑阙（3D 背板 + DOM 面板） ---------- */
var SHRINES = [
  {id:'pn-about',   key:'about',   pos:[-16.5,0,10],   rotY: 0.34, w:9.6, h:5.4, kind:'stone', tx:'林 澈', st:'CREATIVE TECHNOLOGIST',
   title:'林澈 · 卷首', desc:'九马在前，三千甲士在后'},
  {id:'pn-skills',  key:'skills',  pos:[ 17.0,0,-34],  rotY:-0.32, w:9.6, h:5.4, kind:'bronze',tx:'技 艺', st:'SKILLS',
   title:'青铜技艺榜', desc:'六种工艺，铸于一鼎'},
  {id:'pn-works',   key:'works',   pos:[-17.5,0,-82],  rotY: 0.34, w:10.4,h:6.0, kind:'wood',  tx:'作 品', st:'SELECTED WORKS',
   title:'三卷图录', desc:'作品，是可以走进去的'},
  {id:'pn-journey', key:'journey', pos:[ 17.5,0,-138], rotY:-0.32, w:9.6, h:6.2, kind:'stone', tx:'履 历', st:'JOURNEY',
   title:'行军纪年', desc:'一路向前，从不回头'},
  {id:'pn-contact', key:'contact', pos:[-17.0,0,-198], rotY: 0.34, w:9.0, h:5.2, kind:'flag',  tx:'结 盟', st:'CONTACT',
   title:'盟书', desc:'等着同路的人'}
];
var panels = [], shrineHits = [];
SHRINES.forEach(function(c){
  var g = new THREE.Group();
  g.position.set(c.pos[0], c.pos[1], c.pos[2]);
  g.rotation.y = c.rotY;
  scene.add(g);
  var baseMat = new THREE.MeshPhongMaterial({color:0x6a5638, map:TEX.stone, shininess:6});
  var faceMat = new THREE.MeshPhongMaterial({
    map:textTexture(c.tx, c.st,
      c.kind==='bronze'?'#6d5a2e':(c.kind==='wood'?'#5a4326':(c.kind==='flag'?'#8a3326':'#6e5c40')),
      c.kind==='bronze'?'#f0dcae':'#e8d4a8'),
    shininess: c.kind==='bronze'?44:14
  });
  var H = c.h, W = c.w;
  if(c.kind === 'bronze'){
    var ding = new THREE.Mesh(CYL(W*0.42, W*0.34, H*0.42, 4), baseMat);
    ding.position.y = H*0.21; ding.rotation.y = Math.PI/4; ding.castShadow = true; g.add(ding);
    var face = new THREE.Mesh(new THREE.PlaneGeometry(W*0.86, H*0.48), faceMat);
    face.position.set(0, H*0.56, W*0.30); face.rotation.y = -0.1; g.add(face);
  } else if(c.kind === 'wood'){
    [-W/2+0.3, W/2-0.3].forEach(function(x){
      var post = new THREE.Mesh(CYL(0.22,0.26,H+0.6,8), baseMat);
      post.position.set(x,(H+0.6)/2,0); post.castShadow=true; g.add(post);
    });
    var panel3 = new THREE.Mesh(BOX(W-0.4, H, 0.30), baseMat);
    panel3.position.y = H/2+0.4; panel3.castShadow=true; g.add(panel3);
    var face2 = new THREE.Mesh(new THREE.PlaneGeometry(W-1.0, H-0.8), faceMat);
    face2.position.set(0, H/2+0.4, 0.17); g.add(face2);
    var roof = new THREE.Mesh(BOX(W+1.0,0.28,1.0), new THREE.MeshPhongMaterial({color:0x4a3a24, shininess:10}));
    roof.position.y = H+0.6; roof.castShadow=true; g.add(roof);
  } else if(c.kind === 'flag'){
    var mast = new THREE.Mesh(CYL(0.16,0.20,H+2.6,8), baseMat);
    mast.position.y=(H+2.6)/2; mast.castShadow=true; g.add(mast);
    var clothG = new THREE.PlaneGeometry(W, H, 10, 8);
    var cloth = new THREE.Mesh(clothG, new THREE.MeshPhongMaterial({
      map:textTexture(c.tx,c.st,'#8a3326','#f2dca6'), side:THREE.DoubleSide, shininess:6}));
    cloth.position.set(W/2, H/2+2.1, 0.05); g.add(cloth);
    flags.push({mesh:cloth, geo:clothG, ph:1.1});
  } else {
    var base = new THREE.Mesh(BOX(W+1.4, 0.6, 1.6), baseMat);
    base.position.y=0.3; base.castShadow=true; g.add(base);
    var turtle = new THREE.Mesh(BOX(W*0.5,0.5,1.9), new THREE.MeshPhongMaterial({color:0x5a4c36, map:TEX.stone, shininess:8}));
    turtle.position.y=0.85; g.add(turtle);
    var slab = new THREE.Mesh(BOX(W, H, 0.62), baseMat);
    slab.position.y = H/2+1.0; slab.castShadow=true; g.add(slab);
    var cap = new THREE.Mesh(BOX(W+0.5,0.34,0.9), new THREE.MeshPhongMaterial({color:0x7a6544, map:TEX.stone, shininess:8}));
    cap.position.y = H+1.2; g.add(cap);
    var face3 = new THREE.Mesh(new THREE.PlaneGeometry(W*0.86, H*0.66), faceMat);
    face3.position.set(0, H/2+1.2, 0.33); g.add(face3);
  }
  var nrm = new V3(Math.sin(c.rotY),0,Math.cos(c.rotY));
  var glow = new THREE.PointLight(0xffd9a0, 0.5, 28, 2);
  glow.position.set(c.pos[0]+nrm.x*2.6, H*0.62+1.4, c.pos[2]+nrm.z*2.6);
  scene.add(glow);

  var center = new V3(c.pos[0], H*0.55+1.0, c.pos[2]).addScaledVector(nrm, 0.85);
  var el = document.getElementById(c.id);
  panels.push({
    cfg:c, el:el, key:c.key, pos:center, nrm:nrm,
    right:new V3(Math.cos(c.rotY),0,-Math.sin(c.rotY)),
    cssW: el.offsetWidth || 660
  });
  var hit = new THREE.Mesh(new THREE.BoxGeometry(W+2.4, Math.max(H,5)+2.4, 2.4),
    new THREE.MeshBasicMaterial({visible:false}));
  hit.position.set(c.pos[0], Math.max(H,5)/2+0.8, c.pos[2]);
  hit.rotation.y = c.rotY; hit.userData.shrine = c.key;
  scene.add(hit); shrineHits.push(hit);
});

var _pv=new V3(), _pr=new V3();
function updatePanels(){
  var W=innerWidth, H=innerHeight;
  for(var i=0;i<panels.length;i++){
    var p=panels[i];
    var dist = camera.position.distanceTo(p.pos);
    var facing = camera.position.clone().sub(p.pos).normalize().dot(p.nrm);
    _pv.copy(p.pos).project(camera);
    _pr.copy(p.pos).addScaledVector(p.right, p.cfg.w*0.5).project(camera);
    var behind = _pv.z > 1;
    var x1=(_pv.x*0.5+0.5)*W, y1=(-_pv.y*0.5+0.5)*H;
    var x2=(_pr.x*0.5+0.5)*W, y2=(-_pr.y*0.5+0.5)*H;
    var dx=x2-x1, dy=y2-y1;
    var pxW = Math.sqrt(dx*dx+dy*dy)*2;
    var ang = Math.atan2(dy,dx)*180/Math.PI;
    var s = clamp(pxW/p.cssW, 0.06, 1.6);
    var op = 1;
    if(behind || facing < 0.04 || dist > 210) op = 0;
    else op = clamp(1 - (dist-55)/36, 0, 1) * clamp(facing*3.4, 0, 1);
    var st = p.el.style;
    st.transform = 'translate3d('+x1.toFixed(1)+'px,'+y1.toFixed(1)+'px,0) translate(-50%,-50%) rotate('+ang.toFixed(2)+'deg) scale('+s.toFixed(3)+')';
    st.opacity = op.toFixed(3);
    st.pointerEvents = (op>0.40 && s>0.28) ? 'auto' : 'none';
    p.el.classList.toggle('on', p.key === activeKey);
  }
}
/* ---------- 11. 相机装配 ---------- */
var rig = {
  target:new V3(0,4.2,-16), yaw:0.66, pitch:0.26, dist:56,
  tTarget:new V3(0,4.2,-16), tYaw:0.66, tPitch:0.26, tDist:56,
  tween:0, dur:1.6, active:false, spin:0.012, paused:false
};
function flyTo(o, dur){
  rig.tTarget.set(o.t[0],o.t[1],o.t[2]);
  rig.tYaw=o.yaw; rig.tPitch=o.pitch; rig.tDist=o.dist;
  rig.active=true; rig.tween=0; rig.dur=dur||1.6;
}
function updateRig(dt){
  if(rig.active){
    rig.tween += dt/rig.dur;
    var e = ease(clamp(rig.tween,0,1));
    rig.target.lerp(rig.tTarget, e*0.16+0.012);
    rig.yaw   = lerp(rig.yaw, rig.tYaw, e*0.14+0.012);
    rig.pitch = lerp(rig.pitch, rig.tPitch, e*0.14+0.012);
    rig.dist  = lerp(rig.dist, rig.tDist, e*0.14+0.012);
    if(rig.tween >= 1.6) rig.active=false;
  } else if(!drag.on && !rig.paused){
    rig.yaw += rig.spin*dt;
  }
  var cp=Math.cos(rig.pitch), sp=Math.sin(rig.pitch);
  camera.position.set(
    rig.target.x + Math.sin(rig.yaw)*cp*rig.dist,
    rig.target.y + sp*rig.dist,
    rig.target.z + Math.cos(rig.yaw)*cp*rig.dist);
  camera.lookAt(rig.target);
}

var VIEWS = {
  intro:  {t:[0,4.6,-14],  yaw:0.62, pitch:0.24, dist:58, name:'周天子九驾', desc:'九马在前，三千甲士在后'},
  chariot:{t:[0,2.6,3],    yaw:0.34, pitch:0.14, dist:15, name:'九驾车马',   desc:'舆、辀、衡、轭，尺寸皆有出处'},
  march:  {t:[0,3.0,-96],  yaw:0.90, pitch:0.50, dist:92, name:'阵列俯瞰',   desc:'纵深二十六列，一眼望不到尾'}
};
SHRINES.forEach(function(c){
  var nrm = new V3(Math.sin(c.rotY),0,Math.cos(c.rotY));
  VIEWS[c.key] = {
    t:[c.pos[0]+nrm.x*0.6, c.h*0.55+1.0, c.pos[2]+nrm.z*0.6],
    yaw:Math.atan2(nrm.x,nrm.z), pitch:0.13, dist:16.5,
    name:c.title, desc:c.desc
  };
});

var activeKey = 'intro';
function setHud(name, desc){
  document.getElementById('hudT').textContent = name;
  document.getElementById('hudD').textContent = desc;
  var as = document.querySelectorAll('#nav a.wp');
  for(var i=0;i<as.length;i++) as[i].classList.toggle('active', as[i].dataset.wp===activeKey);
}
function gotoKey(k){
  var v = VIEWS[k]; if(!v) return;
  activeKey = k; flyTo(v, 1.7); setHud(v.name, v.desc);
  if(k==='intro'||k==='chariot'||k==='march') stopTour();
}
function goIntro(){ gotoKey('intro'); }

/* ---------- 12. 交互控制 ---------- */
var drag = {on:false, x:0, y:0, moved:0};
var ray = new THREE.Raycaster();
var mouse = {x:0, y:0};
var planeY1 = new THREE.Plane(new V3(0,1,0), -1.0);
var tipEl = document.getElementById('tip');
var markerRing = new THREE.Mesh(new THREE.RingGeometry(0.5,0.64,26),
  new THREE.MeshBasicMaterial({color:0xffd88a, transparent:true, opacity:0.85, side:THREE.DoubleSide, depthWrite:false}));
markerRing.rotation.x = -Math.PI/2; markerRing.visible = false; scene.add(markerRing);
var markerT = 0, markerSlot = null;

var allSlots = [];
function refreshSlotIndex(){
  allSlots.length = 0;
  [['arch',0],['inf',1],['off',2],['cav',3]].forEach(function(p){
    var arr = slotData[p[0]];
    for(var i=0;i<arr.length;i++) allSlots.push({role:p[1], i:i, s:arr[i]});
  });
}
function slotRoleName(r){ return ['弩手俑','步兵俑','军吏俑','骑兵俑'][r]; }

canvas.addEventListener('pointerdown', function(e){
  drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.moved = 0;
  canvas.classList.add('grabbing');
  if(canvas.setPointerCapture){ try{ canvas.setPointerCapture(e.pointerId); }catch(err){} }
  stopTour();
});
window.addEventListener('pointermove', function(e){
  if(drag.on){
    var dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    drag.moved += Math.abs(dx)+Math.abs(dy);
    rig.yaw -= dx*0.0045;
    rig.pitch = clamp(rig.pitch + dy*0.0032, -0.10, 1.12);
    drag.x = e.clientX; drag.y = e.clientY;
    rig.active = false;
  }
  mouse.x = (e.clientX/window.innerWidth)*2-1;
  mouse.y = -(e.clientY/window.innerHeight)*2+1;
  tipEl.style.left = e.clientX+'px';
  tipEl.style.top  = e.clientY+'px';
});
window.addEventListener('pointerup', function(e){
  if(drag.on && drag.moved < 6) doPick(e.clientX, e.clientY);
  drag.on = false; canvas.classList.remove('grabbing');
});
canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  rig.dist = clamp(rig.dist * (1 + (e.deltaY>0?0.08:-0.08)), 6.5, 200);
  rig.active = false; stopTour();
},{passive:false});
var pinchD = 0;
canvas.addEventListener('touchmove', function(e){
  if(e.touches.length===2){
    var dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
    var d=Math.sqrt(dx*dx+dy*dy);
    if(pinchD) rig.dist = clamp(rig.dist*(pinchD/d), 6.5, 200);
    pinchD = d; rig.active=false;
  }
},{passive:true});
canvas.addEventListener('touchend', function(){ pinchD = 0; });
window.addEventListener('keydown', function(e){
  if(e.key === 'Escape') goIntro();
  if(e.key === ' '){ togglePause(); e.preventDefault(); }
});

function pickUnit(pt){
  var push = armyPush(timeNow);
  var best = null, bd = 1e9;
  for(var i=0;i<allSlots.length;i++){
    var s = allSlots[i].s;
    var dx = pt.x - s.x, dz = pt.z - (s.z + push);
    var d = dx*dx + dz*dz;
    if(d < bd){ bd = d; best = allSlots[i]; }
  }
  return (best && bd < 3.6) ? best : null;
}
function doPick(px, py){
  mouse.x = (px/window.innerWidth)*2-1;
  mouse.y = -(py/window.innerHeight)*2+1;
  ray.setFromCamera(mouse, camera);
  var sHits = ray.intersectObjects(shrineHits, false);
  var pt = new V3();
  var ok = ray.ray.intersectPlane(planeY1, pt);
  var u = ok ? pickUnit(pt) : null;
  if(sHits.length && (!u || sHits[0].distance < camera.position.distanceTo(new V3(u.s.x,1,u.s.z)) - 1.2)){
    gotoKey(sHits[0].object.userData.shrine); return;
  }
  if(u){
    var s = u.s, push = armyPush(timeNow);
    markerRing.position.set(s.x, 0.08, s.z + push);
    markerRing.visible = true; markerT = 4.0; markerSlot = u;
    var d = camera.position.distanceTo(new V3(s.x,1,s.z+push));
    flyTo({t:[s.x, 1.6, s.z+push], yaw:rig.yaw, pitch:0.10, dist:clamp(d*0.6, 6.5, 14)}, 1.1);
    setHud(slotRoleName(u.role)+' · 第 '+(s.col+1)+' 列 / 第 '+(s.row+1)+' 排', '阵列中的一员 · ESC 返回全景');
  }
}
function updateTip(){
  if(drag.on){ tipEl.style.opacity = 0; return; }
  ray.setFromCamera(mouse, camera);
  var pt = new V3();
  if(!ray.ray.intersectPlane(planeY1, pt)){ tipEl.style.opacity = 0; return; }
  var u = pickUnit(pt);
  if(u){
    tipEl.textContent = slotRoleName(u.role)+' · 列 '+(u.s.col+1)+' / 排 '+(u.s.row+1);
    tipEl.style.opacity = 0.95;
    canvas.style.cursor = 'pointer';
  } else {
    var sh = ray.intersectObjects(shrineHits, false);
    if(sh.length){
      var cfg = null;
      for(var i=0;i<panels.length;i++) if(panels[i].key===sh[0].object.userData.shrine) cfg = panels[i].cfg;
      tipEl.textContent = cfg ? cfg.title : '碑阙';
      tipEl.style.opacity = 0.95;
      canvas.style.cursor = 'pointer';
    } else { tipEl.style.opacity = 0; canvas.style.cursor = drag.on?'grabbing':'grab'; }
  }
}

/* ---------- 13. 控制台 UI ---------- */
var speed = 1.0;
function bindSlider(id, cb){
  var el = document.getElementById(id);
  el.addEventListener('input', function(){ cb(parseFloat(el.value)); });
  cb(parseFloat(el.value));
}
bindSlider('sRows', function(v){
  layout.rows = Math.round(v);
  document.getElementById('vRows').textContent = layout.rows+' 排';
  rebuildArmy(); refreshSlotIndex();
});
bindSlider('sCols', function(v){
  layout.cols = Math.round(v);
  document.getElementById('vCols').textContent = layout.cols+' 列';
  rebuildArmy(); refreshSlotIndex();
});
bindSlider('sSpeed', function(v){
  speed = v/100;
  document.getElementById('vSpeed').textContent = speed.toFixed(1)+'×';
});
bindSlider('sDust', function(v){
  dustMat.uniforms.uAlpha.value = v/100;
  document.getElementById('vDust').textContent = v<20?'稀':(v<60?'淡':(v<110?'中':'浓'));
});
document.getElementById('bViewAll').onclick = function(){ gotoKey('intro'); };
document.getElementById('bViewChariot').onclick = function(){ gotoKey('chariot'); };
document.getElementById('bViewMarch').onclick = function(){ gotoKey('march'); };
var tourBtn = document.getElementById('bTour'), pauseBtn = document.getElementById('bPause');
tourBtn.onclick = function(){ tour.on ? stopTour() : startTour(); };
function togglePause(){
  rig.paused = !rig.paused;
  pauseBtn.classList.toggle('on', rig.paused);
  pauseBtn.textContent = rig.paused ? '行进' : '驻足';
}
pauseBtn.onclick = togglePause;
document.getElementById('dockTg').onclick = function(){ document.getElementById('dock').classList.toggle('min'); };
var navLinks = document.querySelectorAll('#nav a.wp');
for(var i=0;i<navLinks.length;i++){
  navLinks[i].addEventListener('click', function(){ gotoKey(this.dataset.wp); });
}

var TOUR = ['intro','about','skills','works','journey','contact'];
var tour = {on:false, i:0, timer:0};
function startTour(){ tour.on=true; tour.timer=0; tourBtn.classList.add('on'); gotoKey(TOUR[tour.i]); }
function stopTour(){ if(!tour.on) return; tour.on=false; tourBtn.classList.remove('on'); }
function tickTour(dt){
  if(!tour.on) return;
  tour.timer += dt;
  if(tour.timer > 9){
    tour.timer = 0;
    tour.i = (tour.i+1) % TOUR.length;
    gotoKey(TOUR[tour.i]);
  }
}

/* ---------- 14. 主循环 ---------- */
var clock = new THREE.Clock();
var timeNow = 0, frames = 0, fpsT = 0, tipT = 0;
var perfEl = document.getElementById('perf');
refreshSlotIndex();
setHud(VIEWS.intro.name, VIEWS.intro.desc);

function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  timeNow += dt;

  updateArmy(timeNow, speed);
  updateFlags(timeNow);
  dustMat.uniforms.uT.value = timeNow * (0.4 + speed*0.8);

  chariot.position.y = Math.sin(timeNow*1.5)*0.03;
  chariot.rotation.z = Math.sin(timeNow*0.9)*0.004;
  for(var w=0; w<wheelList.length; w++) wheelList[w].rotation.z = -timeNow*0.55*speed;
  for(var h=0; h<horseObjs.length; h++){
    var ho = horseObjs[h];
    ho.g.position.y = ho.base.y + Math.abs(Math.sin(timeNow*2.1+speed + ho.ph))*0.05*(0.3+0.7*speed);
    ho.g.rotation.x = Math.sin(timeNow*2.1 + ho.ph)*0.03*(0.3+0.7*speed);
  }

  if(markerT > 0){
    markerT -= dt;
    if(markerSlot) markerRing.position.z = markerSlot.s.z + armyPush(timeNow);
    markerRing.material.opacity = clamp(markerT,0,1)*0.85;
    markerRing.scale.setScalar(1 + Math.sin(timeNow*4)*0.06);
    if(markerT <= 0) markerRing.visible = false;
  }

  updateRig(dt);
  tickTour(dt);
  updatePanels();

  tipT += dt;
  if(tipT > 0.08){ tipT = 0; updateTip(); }

  key.position.set(-70 + Math.sin(timeNow*0.05)*10, 62, -150);
  renderer.render(scene, camera);

  frames++;
  fpsT += dt;
  if(fpsT > 1){
    perfEl.textContent = Math.round(frames/fpsT) + ' FPS · 阵列 ' + (army.arch.count+army.inf.count+army.off.count+army.cav.count) + ' 俑';
    frames = 0; fpsT = 0;
  }
}
animate();

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setTimeout(function(){
  var ld = document.getElementById('loader');
  document.getElementById('ldbar').style.width = '100%';
  setTimeout(function(){ ld.classList.add('gone'); }, 260);
}, 600);

})();
