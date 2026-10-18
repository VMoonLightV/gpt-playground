import { plantFromSeed, normalizeSeed } from './seed-core.mjs';
const svg = document.querySelector('#garden');
const group = document.querySelector('#plant-layer');
const ns = 'http://www.w3.org/2000/svg';
const readout = document.querySelector('#seed-code');
const specimen = document.querySelector('#specimen');
const status = document.querySelector('#action-status');
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, a, b) => Math.max(a, Math.min(b, value));
const element = (tag, attrs = {}, parent) => {
  const item = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
  if (parent) parent.appendChild(item);
  return item;
};
const seedValue = () => {
  const data = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(data);
  else { data[0] = Math.floor(Math.random() * 2 ** 32); data[1] = Date.now() >>> 0; }
  return Array.from(data, x => x.toString(16).padStart(8, '0')).join('');
};
function draw(seed, x, updateAddress = true) {
  const plant = plantFromSeed(seed);
  const baseY = 341;
  const topX = x + plant.lean;
  const topY = baseY - plant.height;
  const easeX = t => x + plant.lean * (.25*t + .75*t*t);
  const easeY = t => baseY - plant.height*t;
  group.replaceChildren();
  const stem = element('path', {
    d:'M '+x+' '+baseY+' C '+(x-plant.lean*.3)+' '+(baseY-plant.height*.32)+', '+(topX-plant.lean*.48)+' '+(topY+plant.height*.3)+', '+topX+' '+topY,
    class:'stem', stroke:'#8eb9a9', 'stroke-width':3.7, opacity:.95
  },group);
  if (!mq.matches) {
    const length = Math.ceil(stem.getTotalLength());
    stem.style.strokeDasharray = String(length);
    stem.style.strokeDashoffset = String(length);
    stem.animate([{strokeDashoffset:length},{strokeDashoffset:0}],{duration:1750,easing:'ease-in-out',fill:'forwards'});
  }
  plant.leaves.forEach((leaf,i)=>{
    const at = leaf.at;
    const ax = easeX(at), ay = easeY(at);
    const sign = leaf.side;
    const bx = ax + sign * leaf.length;
    const by = ay - leaf.rise;
    const lx = (ax+bx)/2;
    const ly = Math.min(ay,by)-leaf.width*1.8;
    const leafEl = element('path',{
      d:'M '+ax+' '+ay+' Q '+lx+' '+ly+' '+bx+' '+by+' Q '+lx+' '+(ly+leaf.width*2.4)+' '+ax+' '+ay+' Z',
      fill:plant.palette.leaf, opacity:.92,class:'leaf'
    },group);
    leafEl.style.animationDelay = (.4+i*.18)+'s';
    element('path',{d:'M '+ax+' '+ay+' Q '+lx+' '+(ly+leaf.width*.7)+' '+bx+' '+by,fill:'none',stroke:'#d7ebd8','stroke-width':.55,opacity:.42},group);
  });
  const flower = element('g',{class:'flower'},group);
  flower.style.animationDelay = '1.27s';
  const head = element('g',{transform:'translate('+topX+' '+topY+') rotate('+plant.tilt+')'},flower);
  for(let layer=plant.layers-1;layer>=0;layer--){
    const petals=plant.petals;
    for(let i=0;i<petals;i++){
      const angle=360*i/petals+(layer?360/petals/2:0);
      element('ellipse',{
        cx:0,cy:-plant.flowerRadius*.84,rx:plant.flowerRadius*.42,
        ry:plant.flowerRadius*(layer?1.18:1),fill:layer?plant.palette.petalInner:plant.palette.petal,
        transform:'rotate('+angle+')',opacity:layer?.83:.98
      },head);
    }
  }
  element('circle',{cx:0,cy:0,r:plant.flowerRadius*.48,fill:plant.palette.center},head);
  for(let i=0;i<7;i++){
    const a=(i/7)*Math.PI*2;
    element('circle',{cx:Math.sin(a)*plant.flowerRadius*.25,cy:Math.cos(a)*plant.flowerRadius*.25,r:1.15,fill:'#fff8d5',opacity:.9},head);
  }
  element('circle',{cx:0,cy:0,r:2,fill:'#f6faf5'},head);
  for (let i=0;i<3;i++) {
    const a=(i*2.4)+plant.tilt;
    const sx=topX+Math.cos(a)* (plant.flowerRadius*2.15);
    const sy=topY+Math.sin(a)* (plant.flowerRadius*1.7);
    const spark=element('circle',{cx:sx,cy:sy,r:i===0?2.1:1.4,fill:plant.palette.petalInner, class:'spark',opacity:.6},group);
    spark.style.animationDelay=(1.3+i*.55)+'s';
  }
  element('ellipse',{cx:x,cy:baseY+4,rx:14,ry:3.7,fill:'#050f1a',opacity:.45},group);
  readout.textContent = plant.seed;
  specimen.textContent = 'SPECIMEN / '+plant.seed.slice(-4).toUpperCase();
  document.querySelector('#palette-name').textContent = '· '+plant.palette.name;
  document.querySelector('#plant-message').textContent = plant.message;
  svg.setAttribute('aria-label','夜色中的一株'+plant.palette.name+'色植物。'+plant.message+' 点击土地可以改变它的生长位置。');
  if (updateAddress) {
    const url = new URL(location.href);
    url.searchParams.set('seed',plant.seed);
    url.searchParams.set('x',Math.round(x));
    history.replaceState(null,'',url);
  }
  return plant;
}
const query = new URL(location.href).searchParams;
let firstSeed = normalizeSeed(query.get('seed'));
if (!query.has('seed') || !/^[a-f\d]{8,16}$/i.test(query.get('seed'))) firstSeed=seedValue();
let currentX = clamp(Number(query.get('x'))||358, 130, 590);
draw(firstSeed,currentX);
document.querySelector('#plant-button').addEventListener('click',()=>{
  draw(seedValue(),currentX);
  status.textContent='一颗新的种子已经悄悄发芽。';
});
document.querySelector('#soil-hit').addEventListener('click',event=>{
  const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
  const matrix=svg.getScreenCTM();
  if(!matrix) return;
  const pos=point.matrixTransform(matrix.inverse());
  currentX=clamp(pos.x,130,590);
  draw(seedValue(),currentX);
  status.textContent='这一次，它选择在这里生长。';
});
document.querySelector('#soil-hit').addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();draw(seedValue(),currentX);status.textContent='另一株植物正在生长。';}
});
document.querySelector('#share-button').addEventListener('click',async()=>{
  const url=location.href;
  try {
    if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    status.textContent='这株植物的链接已复制。分享给一个喜欢夜晚的人吧。';
  }catch{
    status.textContent='复制不可用。可以直接复制浏览器地址栏里的链接。';
  }
});
