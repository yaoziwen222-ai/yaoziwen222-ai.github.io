"use strict";
// Coordinates and model contrasts come directly from the archived 33 × 33 candidate lattice.
const responseSurface = (() => {
  const id = s => document.getElementById(s);
  const canvas = id("mesh");
  const ctx = canvas.getContext("2d");
  const labels = {"Balanced":"B", "GVI maximum":"G", "LST minimum":"T"};
  const ink = "#22443a";
  const view = {angle:-.70, tilt:.44};
  let model, faces=[], projected=[], selected=null, drag=null, limits;
  const signedNumber = (v,n) => (v>0?"+":"")+v.toFixed(n);
  const range = a => [Math.min(...a),Math.max(...a)];
  const norm = (v,lim) => (v-lim[0])/(lim[1]-lim[0]||1);
  function temperature(value) {
    const bound = value < 0 ? -limits.t[0] : limits.t[1];
    const mix = Math.min(1,Math.abs(value)/(bound||1));
    const shade = value < 0 ? [34,135,157] : [211,112,49];
    return "rgb("+shade.map((v,i)=>Math.round([245,241,211][i]*(1-mix)+v*mix)).join(",")+")";
  }
  function label(txt,x,y,align="left",color=ink,weight=400,size=11) {
    ctx.textAlign=align;ctx.fillStyle=color;ctx.font=weight+" "+size+'px "Segoe UI", sans-serif';
    ctx.fillText(txt,x,y);
  }
  function path(points,fill,stroke,width=1) {
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function readout() {
    const el=id("meshReadout");
    if(!model||selected===null){el.textContent="";return;}
    const p=model.points[selected];
    const tags=Object.keys(labels).filter(k=>model.markers[k]===selected);
    el.innerHTML="<strong>"+(tags.join(" / ")||"Selected configuration")+"</strong><span>C "+p[2].toFixed(3)+"</span><span>A "+(100*p[3]).toFixed(1)+"%</span><span>GVI "+signedNumber(p[4],2)+" pp</span><span>LST "+signedNumber(p[5],2)+" °C</span>";
    id("meshMarkers").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(model.markers[b.dataset.mark]===selected)));
  }
  function draw() {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.scale(dpr,dpr);
    projected=[];
    if(!model)return;
    const {angle,tilt}=view, co=Math.cos(angle),si=Math.sin(angle),ce=Math.cos(tilt),se=Math.sin(tilt);
    const project=(x,y,z)=>{
      const dx=x-.5,dy=y-.5,depth=dx*si+dy*co;
      return [dx*co-dy*si,-depth*se-z*.48*ce,depth*ce-z*.48*se];
    };
    const corners=[];
    for(const x of [0,1])for(const y of [0,1])for(const z of [0,1])corners.push(project(x,y,z));
    const xx=range(corners.map(p=>p[0])),yy=range(corners.map(p=>p[1]));
    const scale=Math.min((w-(w<430?74:108))/(xx[1]-xx[0]),(h-80)/(yy[1]-yy[0]));
    const horizontalScale=Math.min((w-(w<430?74:108))/(xx[1]-xx[0]),scale*1.65);
    const screen=(x,y,z)=>{
      const p=project(x,y,z);
      return [w/2+(p[0]-(xx[0]+xx[1])/2)*horizontalScale,h/2-4+(p[1]-(yy[0]+yy[1])/2)*scale,p[2]];
    };
    const base=[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>screen(x,y,0));
    path(base,"#e9ede0","#b2c0aa");
    for(let i=1;i<5;i++){
      path([screen(i/5,0,0),screen(i/5,1,0)],null,"#ced6c8",.8);
      path([screen(0,i/5,0),screen(1,i/5,0)],null,"#ced6c8",.8);
    }
    projected=model.points.map(p=>screen(norm(p[2],limits.x),norm(p[3],limits.y),norm(p[4],limits.z)));
    const sorted=faces.map(face=>({face,depth:face.reduce((s,i)=>s+projected[i][2],0)/face.length})).sort((a,b)=>b.depth-a.depth);
    for(const {face} of sorted){
      const tint=temperature(face.reduce((s,i)=>s+model.points[i][5],0)/face.length);
      const poly=face.map(i=>projected[i]);path(poly,tint,"rgba(255,255,248,.45)",.6);
    }
    for(const i of model.isolated){
      const p=projected[i];ctx.fillStyle=temperature(model.points[i][5]);ctx.beginPath();ctx.arc(p[0],p[1],2.5,0,2*Math.PI);ctx.fill();
    }
    // Plot ticks on the front edges so they stay visible when the view rotates.
    const frontX=si>=0?0:1,frontY=co>=0?0:1;
    const xSide=screen(.5,frontY,0)[0]<w/2?-1:1;
    for(const [axis,lim,side] of [["C",limits.x,xSide],["A",limits.y,-xSide]]){
      const edge=f=>axis==="C"?screen(f,frontY,0):screen(frontX,f,0);
      const mid=edge(.5);
      for(const f of [0,.5,1]){
        const p=edge(f),v=lim[0]+f*(lim[1]-lim[0]);
        label(axis==="C"?v.toFixed(2):Math.round(100*v)+"%",p[0]+side*5,p[1]+14,side<0?"right":"left","#566959",400,10);
      }
      label(axis,mid[0]+side*8,mid[1]+29,"center",ink,650);
    }
    const left=base.reduce((a,b)=>a[0]<b[0]?a:b);
    const c=[[0,0],[1,0],[1,1],[0,1]][base.indexOf(left)];
    const top=screen(...c,1);path([left,top],null,"#859786");
    for(const f of [0,.5,1]){
      const p=screen(...c,f);label(signedNumber(limits.z[0]+f*(limits.z[1]-limits.z[0]),1),p[0]-5,p[1]+3,"right","#566959",400,10);
    }
    label("Δ GVI (pp)",Math.max(5,top[0]-15),top[1]-8,"left",ink,600);
    const markerGroups=new Map();
    for(const [k,letter] of Object.entries(labels)){
      const idx=model.markers[k];markerGroups.set(idx,(markerGroups.get(idx)||"")+letter);
    }
    const occupied=[];
    if(selected!==null&&!markerGroups.has(selected))markerGroups.set(selected,"•");
    for(const [idx,letters] of markerGroups){
      const [px,py]=projected[idx];
      const rad=letters.length>1?13:9.5;
      let x=Math.min(w-rad-4,Math.max(rad+4,px+12)), y=Math.max(rad+3,py-15);
      while(occupied.some(p=>Math.hypot(p[0]-x,p[1]-y)<p[2]+rad+2))y+=rad*2+3;
      occupied.push([x,y,rad]);path([[px,py],[x,y]],null,"#344c42",1);
      ctx.beginPath();ctx.arc(px,py,2.5,0,2*Math.PI);ctx.fillStyle=ink;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,rad,0,2*Math.PI);ctx.fillStyle=idx===selected?ink:"#fffdf4";ctx.fill();ctx.strokeStyle=ink;ctx.stroke();
      label(letters,x,y+3.3,"center",idx===selected?"white":ink,650,10);
    }
  }
  function update(key, surface=window.surfaceModels[key]) {
    model=surface;
    const empty=!model;
    id("meshEmpty").hidden=!empty;id("meshPanel").classList.toggle("empty",empty);
    canvas.tabIndex=empty?-1:0;
    id("meshEmpty").textContent=empty?"Insufficient observational support for this setting. Choose another combination.":"";
    id("meshCaption").textContent=empty?"":model.points.length.toLocaleString("en-US")+" supported configurations";
    id("meshSubtitle").textContent=[{A:"Tropical",B:"Arid",C:"Temperate",D:"Cold"}[key[0]],"Local warm season"].join(" · ");
    if(!empty){
      const points=model.points;
      limits={x:range(points.map(p=>p[2])),y:range(points.map(p=>p[3])),z:range(points.map(p=>p[4])),t:range(points.map(p=>p[5]))};
      const map=new Map(points.map(([x,y],i)=>[[x,y].join(","),i]));
      faces=[];const used=new Set();
      for(let y=0;y<32;y++)for(let x=0;x<32;x++){
        const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(c=>map.get(c.join(","))).filter(i=>i!==undefined);
        if(corners.length>=3){faces.push(corners);corners.forEach(i=>used.add(i));}
      }
      model.isolated=points.map((_,i)=>i).filter(i=>!used.has(i));
      selected=model.markers.Balanced;
      id("coldLimit").textContent=signedNumber(limits.t[0],2)+" °C";
      id("warmLimit").textContent=signedNumber(limits.t[1],2)+" °C";
      id("meshAnchor").textContent="Predicted changes relative to C "+model.anchor[0].toFixed(3)+" and A "+(model.anchor[1]*100).toFixed(1)+"% in this setting.";
    }else{selected=null;id("meshAnchor").textContent="";}
    readout(); draw();
  }
  function rotate(dx,dy){
    view.angle+=dx;view.tilt=Math.max(.13,Math.min(1.18,view.tilt+dy));draw();
  }
  function pick(x,y){
    let best=16,nearest=null;
    projected.forEach((p,i)=>{const dist=Math.hypot(x-p[0],y-p[1]);if(dist<best){best=dist;nearest=i;}});
    if(nearest!==null){selected=nearest;readout();draw();}
  }
  canvas.onpointerdown=e=>{if(!model)return;drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{
    if(!drag)return;
    if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>3)drag.moved=true;
    if(drag.moved)rotate((e.clientX-drag.x)*.007,(e.clientY-drag.y)*.005);
    drag.x=e.clientX;drag.y=e.clientY;
  };
  canvas.onpointerup=e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect();pick(e.clientX-r.left,e.clientY-r.top);}drag=null;};
  canvas.onpointercancel=()=>{drag=null;};
  canvas.onkeydown=e=>{
    const turns={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]};
    if(turns[e.key]){e.preventDefault();rotate(...turns[e.key]);}
  };
  id("resetMesh").onclick=()=>{view.angle=-.70;view.tilt=.44;draw();};
  id("meshMarkers").onclick=e=>{const btn=e.target.closest("[data-mark]");if(btn&&model){selected=model.markers[btn.dataset.mark];readout();draw();}};
  new ResizeObserver(draw).observe(canvas);
  return {update};
})();
