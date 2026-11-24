"use strict";
const data = window.study;
const groups = {
  All: {name:"Overall · 66 cities",color:"#367451"},
  C: {name:"Temperate", color:"#795891", pin:"#d6b4f5", city:"Melbourne"},
  A: {name:"Tropical", color:"#16856e", pin:"#79dfb2", city:"Mumbai"},
  B: {name:"Arid", color:"#b27237", pin:"#ffbe74", city:"Beijing"},
  D: {name:"Cold", color:"#326BA0", pin:"#a9d2f0", city:"Moscow"}
};
const byId = id => document.getElementById(id);
const state = {zone:"All",city:"Melbourne"};
const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const fmt = n => n.toLocaleString("en-US");
const signed = (n, digits=1) => (n>0?"+":"")+n.toFixed(digits);
const pct = (n,digits=1) => (n*100).toFixed(digits)+"%";
const escapeHtml = v => String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const svgNS = "http://www.w3.org/2000/svg";
function svg(tag, attrs) {
  const el=document.createElementNS(svgNS,tag);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
}
function tabGroup(id, selected) {
  const root=byId(id); root.replaceChildren();
  for (const [z,g] of Object.entries(groups)) {
    const b=document.createElement("button");
    b.type="button"; b.setAttribute("aria-pressed",String(z===selected));
    b.innerHTML='<i style="background:'+g.color+'"></i>'+g.name;
    b.onclick=()=>{setZone(z);root.querySelector('[aria-pressed=true]').focus({preventScroll:true});};
    root.append(b);
  }
}
function renderMap() {
  const root=byId("map");root.replaceChildren();
  const selected=data.cities.find(c=>c.city===state.city);
  for(const c of data.cities) {
    const [x,y]=c.point;
    const g=svg("g",{});const title=svg("title",{});
    title.textContent=c.city+" · "+groups[c.climate_group].name;g.append(title);
    g.append(svg("circle",{cx:x,cy:y,r:5.5,fill:"transparent"}),svg("circle",{cx:x,cy:y,r:2.8,fill:groups[c.climate_group].pin,stroke:"#183e35","stroke-width":.8}));
    g.onclick=()=>selectCity(c.city);root.append(g);
  }
  const [x,y]=selected.point;
  const alignRight=x>620;
  root.append(svg("circle",{cx:x,cy:y,r:6.2,fill:"none",stroke:"#fffbe8","stroke-width":1.6,"pointer-events":"none"}));
  const label=svg("text",{x:x+(alignRight?-9:9),y:y-8,fill:"#fffce2","font-size":14,"font-family":"Georgia,serif","text-anchor":alignRight?"end":"start",stroke:"#153e35","stroke-width":3,"paint-order":"stroke","pointer-events":"none"});
  label.textContent=selected.city;root.append(label);
  byId("mapCity").value=state.city;
  byId("mapFocus").innerHTML="<strong>"+escapeHtml(selected.city)+"</strong><small>"+groups[selected.climate_group].name+" · "+months[selected.start_month-1]+"–"+months[selected.end_month-1]+" warm season · "+fmt(selected.grids)+" grids</small>";
}
function selectCity(name) {state.city=name;renderMap();}
function setZone(z) {state.zone=z;tabGroup('climates',z);renderPlots();}
function plotFrame(id, xMax, yMin, yMax, xTitle, yTitle, xLabel, yLabel, ticks) {
  const el=byId(id), rect=el.getBoundingClientRect(), w=rect.width,h=rect.height;
  const ratio=window.devicePixelRatio||1;
  el.width=Math.round(w*ratio);el.height=Math.round(h*ratio);
  const ctx=el.getContext("2d");ctx.scale(ratio,ratio);
  const left=50,right=w-16,top=26,bottom=h-39;
  const x=n=>left+n/xMax*(right-left),y=n=>bottom-(n-yMin)/(yMax-yMin)*(bottom-top);
  ctx.font='11px "Segoe UI",sans-serif';ctx.fillStyle="#526158";ctx.lineWidth=1;
  for(const n of ticks) {
    ctx.strokeStyle="#dce0d4";ctx.beginPath();ctx.moveTo(left,y(n));ctx.lineTo(right,y(n));ctx.stroke();
    ctx.textAlign="right";ctx.fillText(yLabel(n),left-7,y(n)+3);
  }
  ctx.textAlign="center";
  for(let i=0;i<=4;i++){const n=xMax*i/4;ctx.fillText(xLabel(n),x(n),bottom+15);}
  ctx.fillText(xTitle,(left+right)/2,h-3);ctx.textAlign="left";ctx.fillText(yTitle,4,12);
  return {ctx,x,y,left,right,top,bottom};
}
function renderPlots() {
  const z=state.zone, g=groups[z], pts=data.points[z];
  const cities=data.cities.filter(c=>z==="All"||c.climate_group===z);
  byId("sample").textContent=cities.length+" cities · "+fmt(pts.length)+" grids";
  byId("medians").textContent="C "+data.medians.C.toFixed(3)+" · A "+pct(data.medians.A);
  const d=plotFrame("distribution",1,0,1,"Vegetation concentration (C)","Road-neighborhood cover (A)",n=>n.toFixed(2),n=>pct(n,0),[0,.25,.5,.75,1]);
  d.ctx.fillStyle=g.color;d.ctx.globalAlpha=.21;
  for(const [a,b] of pts)d.ctx.fillRect(d.x(a/1000)-.8,d.y(b/1000)-.8,1.6,1.6);
  d.ctx.globalAlpha=1;d.ctx.setLineDash([4,3]);d.ctx.strokeStyle="#617063";d.ctx.beginPath();
  d.ctx.moveTo(d.x(data.medians.C),d.top);d.ctx.lineTo(d.x(data.medians.C),d.bottom);
  d.ctx.moveTo(d.left,d.y(data.medians.A));d.ctx.lineTo(d.right,d.y(data.medians.A));d.ctx.stroke();d.ctx.setLineDash([]);
  const variable=byId("variable").value, outcome=byId("outcome").value, gvi=outcome==="gvi_pp";
  const runs=[];let run=[];
  for(const row of data.curves.filter(v=>v.variable===variable&&v.climate_group===z).sort((a,b)=>a.x-b.x)){
    if(row.supported) run.push(row);
    else if(run.length){runs.push(run);run=[];}
  }if(run.length)runs.push(run);
  const bins=data.bins.filter(v=>v.variable===variable&&v.climate_group===z&&v.supported);
  const lo=outcome+"_ci_low",hi=outcome+"_ci_high";
  const all=data.curves.filter(v=>v.supported&&v.variable===variable);
  const step=gvi?2:.5;
  const ymin=step*Math.floor(Math.min(0,...all.map(v=>v[lo]),...bins.map(b=>b[outcome]))/step);
  const ymax=step*Math.ceil(Math.max(0,...all.map(v=>v[hi]),...bins.map(b=>b[outcome]))/step);
  const ticks=[];for(let n=ymin;n<=ymax;n+=step)ticks.push(n);
  const p=plotFrame("response",.8,ymin,ymax,variable==="C"?"Vegetation concentration (C)":"Road-neighborhood cover (A)",gvi?"Change in GVI (percentage points)":"Change in within-city LST deviation (°C)",n=>variable==="C"?n.toFixed(1):pct(n,0),n=>String(n),ticks);
  const ctx=p.ctx;ctx.strokeStyle="#88948a";ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(p.left,p.y(0));ctx.lineTo(p.right,p.y(0));ctx.stroke();ctx.setLineDash([]);
  for(const arr of runs){
    ctx.beginPath();arr.forEach((r,i)=>ctx[i?"lineTo":"moveTo"](p.x(r.x),p.y(r[hi])));
    arr.slice().reverse().forEach(r=>ctx.lineTo(p.x(r.x),p.y(r[lo])));ctx.closePath();ctx.fillStyle="#c8dcd0";ctx.fill();
    ctx.beginPath();arr.forEach((r,i)=>ctx[i?"lineTo":"moveTo"](p.x(r.x),p.y(r[outcome])));ctx.lineWidth=2.4;ctx.strokeStyle="#367451";ctx.stroke();
  }
  for(const row of bins){ctx.beginPath();ctx.arc(p.x(row.mid),p.y(row[outcome]),3,0,2*Math.PI);ctx.fillStyle="white";ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle="#36493f";ctx.stroke();}
  byId("response").setAttribute("aria-label",g.name+" fitted change in "+(gvi?"GVI":"LST deviation")+" by "+variable+", with pointwise 95 percent city-jackknife confidence intervals.");
}
const sliders = [["q",100,"%"],["road",1," km/km²"],["built",100,"%"],["height",1," m"]];
let settings=[], activePreset=null;
const supportedCache=new Map();
function supportedSurface(values) {
  const cacheKey=values.join('|');
  if(supportedCache.has(cacheKey))return supportedCache.get(cacheKey);
  const key=configurations.settingKey('All',values);
  const surface=configurations.fit(key,values);
  let result=null;
  if(surface){
    // At least three neighboring lattice corners are needed for a visible face.
    const corners=new Uint8Array(34*34);
    for(const [x,y] of surface.points){
      const cell=34*y+x;
      for(const neighbor of [cell,cell+1,cell+34,cell+35]){
        if(++corners[neighbor]===3){result={key,surface};break;}
      }
      if(result)break;
    }
  }
  if(supportedCache.size>=160)supportedCache.delete(supportedCache.keys().next().value);
  supportedCache.set(cacheKey,result);return result;
}
function reachableSetting(i,target) {
  const scale=sliders[i][1]*10;
  let goodTick=Math.round(settings[i]*scale),badTick=Math.round(target*scale);
  let value=settings[i],result=supportedSurface(settings);
  function tryTick(tick){
    // Use the same decimal-to-model conversion as the native range input.
    const candidate=settings.slice();candidate[i]=Number((tick/10).toFixed(1))/sliders[i][1];
    const tested=supportedSurface(candidate);
    if(!tested)return false;
    goodTick=tick;value=candidate[i];result=tested;return true;
  }
  if(badTick!==goodTick&&!tryTick(badTick)){
    while(Math.abs(badTick-goodTick)>1){
      const mid=Math.trunc((badTick+goodTick)/2);
      if(!tryTick(mid))badTick=mid;
    }
  }
  // No monotonic-support assumption: every accepted endpoint and user value is
  // actually evaluated. An unsupported interior gap stops at a valid boundary.
  return {value,result};
}
let scenarioSelection=['Mid','Higher','Higher'];
function showScenarioSelection(custom=false) {
  document.querySelectorAll('[data-scenario-axis]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.value===scenarioSelection[Number(button.dataset.scenarioAxis)]));
  });
  const status=byId('scenarioStatus');
  status.textContent=custom?'Custom scenario':scenarioSelection.every(Boolean)?'Preset scenario':'Choose all three groups to load a preset.';
  status.classList.toggle('custom',custom||!scenarioSelection.every(Boolean));
}
const allSamples=Object.values(window.surfaceContext.samples).flat();
function scenarioLabel(key) {
  const [,green,road,built]=key.split('|');
  return (green==='Mid'?'Medium':green)+' cover · '+(road==='Lower'?'low':'high')+' road / '+(built==='Lower'?'low':'high')+' built';
}
function updateSliderLimits() {
  const transformed=r=>[r[0],Math.log1p(r[1]),r[2],Math.log1p(r[3])];
  const target=transformed(settings), tolerance=[.10,.55,.12,.6];
  sliders.forEach(([name,scale],i)=>{
    const local=allSamples.filter(r=>transformed(r).every((v,j)=>j===i||Math.abs(v-target[j])<=tolerance[j]));
    const values=local.map(r=>r[i]);
    const [fallbackLow,fallbackHigh]=window.surfaceContext.ranges.All[i];
    const low=values.length?Math.min(...values):fallbackLow;
    const high=values.length?Math.max(...values):fallbackHigh;
    const input=byId(name+'Slider');
    const validLow=reachableSetting(i,Math.ceil(low*scale*10)/(scale*10)).value;
    const validHigh=reachableSetting(i,Math.floor(high*scale*10)/(scale*10)).value;
    input.min=(Math.min(validLow,settings[i])*scale).toFixed(6);
    input.max=(Math.max(validHigh,settings[i])*scale).toFixed(6);
    input.value=settings[i]*scale;input.disabled=input.min===input.max;
    input.title='Supported range: '+Number(input.min).toFixed(1)+sliders[i][2]+' – '+Number(input.max).toFixed(1)+sliders[i][2];
    const text=(settings[i]*scale).toFixed(1)+sliders[i][2];
    byId(name+'Value').textContent=text;input.setAttribute('aria-valuetext',text);
  });
}
function renderBalance(key,surface,custom=false) {
  responseSurface.update(key,surface);
  scenarioSelection=custom?[null,null,null]:key.split('|').slice(1);
  showScenarioSelection(custom);
  byId('meshSubtitle').textContent=custom?'Custom scenario · 66-city sample':scenarioLabel(key);
  byId('choice').textContent='';
  byId('meshMarkers').querySelectorAll('button').forEach(b=>b.disabled=!surface);
  if(surface) {
    const details=surface.localGrids?' · '+surface.localGrids.toLocaleString('en-US')+' nearby grids / '+surface.localCities+' cities':'';
    byId('meshCaption').textContent=surface.points.length.toLocaleString('en-US')+' supported configurations'+details;
  }
}
function initializeSliders(key='All|Mid|Higher|Higher') {
  activePreset=key;
  settings=window.surfaceContext.presets[key].slice();
  updateSliderLimits();renderBalance(key,window.surfaceModels[key]);
}
sliders.forEach(([name,scale],i)=>{
  const input=byId(name+'Slider');
  input.oninput=()=>{
    const requested=Number(input.value)/scale;
    const {value,result}=reachableSetting(i,requested);
    // Commit only a setting that has a drawable, supported surface. Never clear
    // the last valid surface while the thumb crosses an unsupported combination.
    const changed=Math.abs(value-settings[i])>1e-12;
    if(result&&changed){
      settings[i]=value;activePreset=null;renderBalance(result.key,result.surface,true);
    }
    if(Math.abs(value-requested)>1e-9){
      if(requested>value)input.max=(value*scale).toFixed(6);
      else input.min=(value*scale).toFixed(6);
    }
    input.value=settings[i]*scale;
    const text=(settings[i]*scale).toFixed(1)+sliders[i][2];
    byId(name+'Value').textContent=text;input.setAttribute('aria-valuetext',text);
  };
  input.onchange=updateSliderLimits;
});
byId('scenarioControls').addEventListener('click',e=>{
  const button=e.target.closest('[data-scenario-axis]');if(!button)return;
  scenarioSelection[Number(button.dataset.scenarioAxis)]=button.dataset.value;
  if(scenarioSelection.every(Boolean))initializeSliders(['All',...scenarioSelection].join('|'));
  else showScenarioSelection();
});
for(const city of data.cities)byId('mapCity').add(new Option(city.city,city.city));
for(const [z,g] of Object.entries(groups))if(z!=='All'){
  const item=document.createElement('span');item.innerHTML='<i style="background:'+g.pin+'"></i>'+g.name;byId('mapKey').append(item);
}
byId('mapCity').onchange=e=>selectCity(e.target.value);
for(const id of ['outcome','variable'])byId(id).onchange=renderPlots;
renderMap();setZone('All');initializeSliders();
new ResizeObserver(renderPlots).observe(byId('distribution').parentElement);
