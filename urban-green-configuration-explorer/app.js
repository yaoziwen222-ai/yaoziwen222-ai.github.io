"use strict";
const data = window.study;
const groups = {
  C: {name:"Temperate", color:"#795891", pin:"#d6b4f5", city:"Melbourne"},
  A: {name:"Tropical", color:"#16856e", pin:"#79dfb2", city:"Mumbai"},
  B: {name:"Arid", color:"#b27237", pin:"#ffbe74", city:"Beijing"},
  D: {name:"Cold", color:"#326BA0", pin:"#a9d2f0", city:"Moscow"}
};
const byId = id => document.getElementById(id);
const state = {zone:"C",city:"Melbourne"};
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
function selectCity(name) {
  const city=data.cities.find(c=>c.city===name);
  setZone(city.climate_group,city.city);
}
function setZone(z,city=groups[z].city) {
  state.zone=z;state.city=city;
  byId("balClimate").value=z;
  tabGroup("climates",z);
  renderMap();renderPlots();initializeSliders();
}
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
  const cities=data.cities.filter(c=>c.climate_group===z);
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
  byId("response").setAttribute("aria-label",g.name+" fitted change in "+(gvi?"GVI":"LST deviation")+" by "+variable+", with "+bins.length+" supported bin means.");
}
const sliders = [
  ["q",100,"%"], ["road",1," km/km²"], ["built",100,"%"], ["height",1," m"]
];
let settings = [];
function drawableSurface(values) {
  const key=configurations.settingKey(state.zone,values);
  const surface=configurations.fit(key,values);
  if(!surface) return null;
  // The renderer needs three corners of one lattice cell to make a face.
  const corners=new Uint8Array(34*34);
  for(const [x,y] of surface.points){
    const cell=34*y+x;
    for(const neighbor of [cell,cell+1,cell+34,cell+35]){
      if(++corners[neighbor]===3) return {key,surface};
    }
  }
  return null;
}
function reachableSetting(i,target) {
  const scale=sliders[i][1]*10;
  let good=Math.round(settings[i]*scale);
  const candidate=settings.slice();
  let result=null;
  function tryTick(tick) {
    candidate[i]=tick/scale;
    const tested=drawableSurface(candidate);
    if(!tested) return false;
    good=tick; result=tested; return true;
  }
  if(target!==good && !tryTick(target)){
    let bad=target;
    while(Math.abs(bad-good)>1){
      const mid=Math.trunc((bad+good)/2);
      if(!tryTick(mid)) bad=mid;
    }
  }
  return {tick:good,result};
}
function updateSliderLimits(skip=-1) {
  sliders.forEach(([name,scale],i)=>{
    if(i===skip) return;
    const [lo,hi]=window.surfaceContext.ranges[state.zone][i];
    const input=byId(name+"Slider");
    input.min=reachableSetting(i,Math.floor(lo*scale*10)).tick/10;
    input.max=reachableSetting(i,Math.ceil(hi*scale*10)).tick/10;
    input.value=settings[i]*scale;
    input.disabled=input.min===input.max;
  });
}
function showSlider(i) {
  const [name,scale,unit]=sliders[i], text=(settings[i]*scale).toFixed(1)+unit;
  byId(name+"Value").textContent=text;
  byId(name+"Slider").setAttribute("aria-valuetext",text);
}
function initializeSliders() {
  const previousDefault=state.zone+"|High|Higher|Higher";
  const key=window.surfaceModels[previousDefault]?previousDefault:state.zone+"|Mid|Higher|Higher";
  settings=window.surfaceContext.presets[key].slice();
  updateSliderLimits();
  sliders.forEach((_,i)=>showSlider(i));
  renderBalance(key,window.surfaceModels[key],false);
}
sliders.forEach(([name,scale],i)=>{
  const input=byId(name+"Slider");
  input.oninput=()=>{
    const requested=Math.round(input.value*10);
    const {tick,result}=reachableSetting(i,requested);
    input.value=tick/10;
    if(result){
      settings[i]=tick/(scale*10);
      showSlider(i);
      renderBalance(result.key,result.surface,true);
    }
  };
  input.onchange=()=>updateSliderLimits(i);
});
function renderBalance(key,surface,custom) {
  const [z,green,road,built]=key.split("|");
  responseSurface.update(key,surface);
  byId("choice").textContent="";
  if(custom){
    byId("seasonal").textContent="Slider estimates use local warm-season temperatures. Annual and cold-season comparisons were calculated at the reference conditions for each study setting.";
    return;
  }
  const match=a=>a.climate_group===z&&a.green_band===green&&a.road_band===road&&a.built_band===built;
  const b=data.balance.find(match);
  byId("choice").innerHTML=b?'<h3>Warm-season balance</h3><div class="numbers"><div><strong>'+b.C.toFixed(2)+'</strong><small>Concentration (C)</small></div><div><strong>'+pct(b.A)+'</strong><small>Road-neighborhood cover (A)</small></div></div><p class="rule">Predicted change from the setting anchor (C '+b.anchor_C.toFixed(2)+', A '+pct(b.anchor_A)+')<br>GVI <b>'+signed(b.gvi_difference_pp)+' pp</b> · LST deviation <b>'+signed(b.lst_difference_c,2)+' °C</b></p>':'<h3>Insufficient sample support</h3><p>This setting does not meet the observational support criteria. Select another setting to view a fitted configuration.</p>';
  const a=data.annual.find(match), s=data.seasons.find(match), value=(c,v)=>"C "+c.toFixed(2)+", A "+pct(v);
  byId("seasonal").innerHTML='<p><b>Annual reference · 66 cities, 32,812 matched grids.</b><br>'+(a?"Warm "+value(a.warm_C,a.warm_A)+" · Annual "+value(a.annual_C,a.annual_A):"No supported pair for this setting.")+'</p><p><b>Seasonal supplement · 46 cities, 13,861 matched grids.</b><br>'+(s?"Warm "+value(s.Warm_C,s.Warm_A)+" · Cold "+value(s.Cold_C,s.Cold_A):"No supported pair for this setting.")+"</p>";
}
for(const city of data.cities)byId("mapCity").add(new Option(city.city,city.city));
for(const [z,g] of Object.entries(groups)){
  byId("balClimate").add(new Option(g.name,z));
  const item=document.createElement("span");item.innerHTML='<i style="background:'+g.pin+'"></i>'+g.name;byId("mapKey").append(item);
}
byId("mapCity").onchange=e=>selectCity(e.target.value);
byId("balClimate").onchange=e=>setZone(e.target.value);
for(const id of ["outcome","variable"])byId(id).onchange=renderPlots;
setZone("C");
new ResizeObserver(()=>renderPlots()).observe(byId("distribution").parentElement);
