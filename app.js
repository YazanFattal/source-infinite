'use strict';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#universe');
const ctx = canvas.getContext('2d');
const panel = canvas.parentElement;
const motionToggle = document.querySelector('#motion-toggle');
let mode = 'light', motionPaused = reducedMotion.matches, visible = true;
let width = 0, height = 0, elapsed = 0, lastFrame = 0, burstCount = 0;
const sparks = [];
const modes = {
  light: { label: 'A STUDY IN LIGHT', word: 'Let there<br>be <em>light.</em>', description: 'A single spark. An endless possibility.' },
  matter: { label: 'A STUDY IN MATTER', word: 'Everything<br>is <em>becoming.</em>', description: 'From the smallest pieces, a world takes shape.' },
  life: { label: 'A STUDY IN LIFE', word: 'Life finds<br>a <em>way.</em>', description: 'Something opens. Something reaches toward the light.' }
};
const points = Array.from({length: 280}, (_, i) => ({angle: i * 2.39996, radius: Math.sqrt((i + 1) / 280), size: .6 + (i % 5) * .3, phase: i * .73}));
function resizeCanvas() {
  const rect = panel.getBoundingClientRect(); width = rect.width; height = rect.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawUniverse();
}
new ResizeObserver(resizeCanvas).observe(panel);
new IntersectionObserver(([entry]) => {visible = entry.isIntersecting;}, {rootMargin: '100px'}).observe(panel);
function drawUniverse() {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2, cy = height / 2, radius = Math.min(width * .37, height * .41);
  const glow = ctx.createRadialGradient(cx,cy,0,cx,cy,radius*1.7);
  glow.addColorStop(0,mode === 'life' ? '#8da96519' : '#daa34816'); glow.addColorStop(1,'#00000000');
  ctx.fillStyle = glow; ctx.fillRect(0,0,width,height);
  ctx.lineWidth = .5;
  const positions = [];
  points.forEach((p, i) => {
    let x, y;
    if (mode === 'matter') {
      const angle = p.angle + elapsed*.065 + p.radius * 4;
      x = cx + Math.cos(angle) * p.radius * radius * 1.75;
      y = cy + Math.sin(angle) * p.radius * radius * .62;
    } else if (mode === 'life') {
      const angle = p.angle + elapsed*.025;
      const r = radius * p.radius * (.65 + .24*Math.sin(angle*5 + p.radius*3));
      x = cx + Math.cos(angle)*r*1.45; y = cy + Math.sin(angle)*r;
    } else {
      const angle = p.angle + elapsed*.025;
      const r = radius * (.78 + p.radius * .85 + Math.sin(p.phase+elapsed*.2)*.045);
      x = cx + Math.cos(angle)*r*1.33; y = cy + Math.sin(angle)*r*.8;
    }
    positions.push({x,y});
    const alpha = .2 + .4*(.5+.5*Math.sin(p.phase+elapsed*.5));
    ctx.fillStyle = mode === 'life' ? `rgba(179,199,139,${alpha})` : `rgba(225,184,110,${alpha})`;
    ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2); ctx.fill();
    if(mode === 'life' && i > 4 && i % 2 === 0) {
      const previous = positions[i-5];
      if(Math.hypot(x-previous.x,y-previous.y)<radius*.55) {
        ctx.strokeStyle = '#b3c78b19'; ctx.beginPath(); ctx.moveTo(previous.x,previous.y); ctx.lineTo(x,y); ctx.stroke();
      }
    }
  });
  for(let n=0;n<3;n++) {
    ctx.strokeStyle = mode === 'life' ? '#a3bc7c0f' : '#d7b5830e'; ctx.beginPath();
    ctx.ellipse(cx,cy,radius*(1.15+n*.25),radius*(mode==='matter'?.55:.8)*(1+n*.18),mode==='matter'?-.15:0,0,Math.PI*2); ctx.stroke();
  }
  sparks.forEach(s => {
    const progress = Math.min((elapsed-s.born)/2.6,1);
    for(let i=0;i<45;i++) {
      const a=i*2.39996, r=(12+progress*radius*.9)*Math.sqrt(i/45);
      ctx.fillStyle=`rgba(255,222,158,${(1-progress)*.8})`;ctx.beginPath();ctx.arc(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r,1.2,0,Math.PI*2);ctx.fill();
    }
  });
  while(sparks.length && elapsed-sparks[0].born>2.6) sparks.shift();
}
function animate(time) {
  if(time-lastFrame>33) {
    const dt=Math.min((time-lastFrame)/1000,.06);lastFrame=time;
    if(!motionPaused && visible && !document.hidden){elapsed+=dt;drawUniverse();}
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
function updateMotionButton(){motionToggle.innerHTML=motionPaused?'Resume motion <span>▷</span>':'Pause motion <span>Ⅱ</span>';motionToggle.setAttribute('aria-pressed',String(motionPaused));}
updateMotionButton();
motionToggle.addEventListener('click',()=>{motionPaused=!motionPaused;updateMotionButton();});
reducedMotion.addEventListener('change',()=>{motionPaused=reducedMotion.matches;updateMotionButton();});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  mode=button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  document.querySelector('#universe-label').textContent=modes[mode].label;
  document.querySelector('#universe-word').innerHTML=modes[mode].word;
  document.querySelector('#universe-description').textContent=modes[mode].description;
  drawUniverse();
}));
document.querySelector('#create-spark').addEventListener('click',()=>{
  burstCount++;const x=width*(.3+Math.random()*.4),y=height*(.25+Math.random()*.5);
  sparks.push({x,y,born:elapsed});if(sparks.length>8)sparks.shift();drawUniverse();
  document.querySelector('#spark-feedback').textContent=`Spark ${burstCount} created. A new beginning.`;
  const button=document.querySelector('#create-spark');button.innerHTML='A new beginning <svg><use href="#spark"/></svg>';
  clearTimeout(button.resetTimer);button.resetTimer=setTimeout(()=>{button.innerHTML='Create a spark <svg><use href="#spark"/></svg>';if(motionPaused){sparks.length=0;drawUniverse();}},1400);
});
const art=document.querySelector('.hero-art');
document.querySelector('.hero').addEventListener('pointermove',event=>{
  if(reducedMotion.matches || window.innerWidth<701)return;
  const r=event.currentTarget.getBoundingClientRect();
  art.style.transform=`translate(${(event.clientX-r.left-r.width/2)*.012}px, calc(-50% + ${(event.clientY-r.top-r.height/2)*.012}px))`;
});
document.querySelector('.hero').addEventListener('pointerleave',()=>{art.style.transform='';});
const acts=[
  'Tell someone one specific thing you appreciate about them.',
  'Give someone your full attention for a few minutes.',
  'Make one small corner of the world easier for the next person.',
  'Offer yourself the patience you would offer a friend.',
  'Reach out to someone you’ve been meaning to check on.',
  'Notice something beautiful. Share it with someone.',
  'Leave a kind note where it will be found.',
  'Do one helpful thing without needing to be noticed.'
];
let actIndex=0;const accepted=new Set();
const actText=document.querySelector('#kindness-text'), actStatus=document.querySelector('#kindness-status'), acceptButton=document.querySelector('#accept-kindness');
function renderAct(){
  actText.textContent=acts[actIndex];document.querySelector('#act-number').textContent=`${String(actIndex+1).padStart(2,'0')} / 08`;
  acceptButton.innerHTML=accepted.has(actIndex)?'A beginning is enough <span>✓</span>':'I’ll try this <span>↗</span>';
  actStatus.textContent=accepted.has(actIndex)?'Your intention is here. The next step is yours.':'A small invitation. Entirely yours.';
}
document.querySelector('#next-kindness').addEventListener('click',()=>{actIndex=(actIndex+1)%acts.length;renderAct();});
acceptButton.addEventListener('click',()=>{accepted.add(actIndex);renderAct();});
const dialog=document.querySelector('#quiet-dialog'), breath=document.querySelector('.breath-visual');
let quietElapsed=0,quietPaused=false,quietLast=0,quietFrame=0,returnFocus=null,quietDone=false;
const instruction=document.querySelector('#breath-instruction'),pauseButton=document.querySelector('#breath-pause');
function formatTime(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function renderQuiet(){
  const seconds=Math.min(quietElapsed,60),cycle=seconds%12;
  let label=cycle<4?'Breathe in':cycle<6?'Rest':'Breathe out';
  const scale=cycle<4?.65+.35*(cycle/4):cycle<6?1:1-.35*((cycle-6)/6);
  if(!reducedMotion.matches)breath.querySelectorAll('span').forEach(s=>s.style.transform=`scale(${scale})`);
  if(seconds>=60){label='Carry this quiet with you';quietDone=true;pauseButton.hidden=true;document.querySelector('#breath-restart').hidden=false;}
  if(instruction.textContent!==label)instruction.textContent=label;
  document.querySelector('#breath-time').textContent=formatTime(Math.ceil(60-seconds));
  document.querySelector('#breath-progress').style.width=`${seconds/60*100}%`;
}
function quietTick(t){
  if(!dialog.open)return;
  if(!quietPaused&&!quietDone&&!document.hidden){if(quietLast)quietElapsed+=Math.min((t-quietLast)/1000,.15);renderQuiet();}
  quietLast=t;quietFrame=requestAnimationFrame(quietTick);
}
function resetQuiet(){quietElapsed=0;quietPaused=false;quietLast=0;quietDone=false;pauseButton.textContent='Pause';pauseButton.hidden=false;document.querySelector('#breath-restart').hidden=true;renderQuiet();}
document.querySelectorAll('[data-quiet]').forEach(button=>button.addEventListener('click',()=>{
  returnFocus=button;resetQuiet();dialog.showModal();quietFrame=requestAnimationFrame(quietTick);
}));
document.querySelector('.close-quiet').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{cancelAnimationFrame(quietFrame);returnFocus?.focus({preventScroll:true});});
pauseButton.addEventListener('click',()=>{quietPaused=!quietPaused;pauseButton.textContent=quietPaused?'Continue':'Pause';instruction.textContent=quietPaused?'Stay as long as you like':'Breathe in';});
document.querySelector('#breath-restart').addEventListener('click',()=>{resetQuiet();pauseButton.focus();});
