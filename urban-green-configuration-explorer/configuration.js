"use strict";
const configurations = (() => {
  const data = window.surfaceContext;
  function settingKey(zone, [q, road, built, height]) {
    const c = data.cut;
    const intensity = ((built-c.built_mean)/c.built_sd + (Math.log1p(height)-c.logheight_mean)/c.logheight_sd)/2;
    return [zone, q<c.q_tertile1?"Low":q<c.q_tertile2?"Mid":"High",
      road<c.median_road?"Lower":"Higher", intensity<c.median_built_index?"Lower":"Higher"].join("|");
  }
  const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function hullOf(rows) {
    const xy = rows.map(r=>[r[4],r[5]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    function half(points) {
      const h=[];
      for(const p of points) {
        while(h.length>=2 && cross(h[h.length-2],h[h.length-1],p)<=0) h.pop();
        h.push(p);
      }
      h.pop(); return h;
    }
    return half(xy).concat(half(xy.reverse()));
  }
  function quantile(sorted,p) {
    const t=(sorted.length-1)*p, i=Math.floor(t);
    return sorted[i]+(t-i)*(sorted[Math.ceil(t)]-sorted[i]);
  }
  function spline(v,[a,b,c,d]) {
    const cube = k => Math.max(0,v-k)**3;
    const last=(cube(c)-cube(d))/(d-c);
    return [v,...[a,b].map(k=>(cube(k)-cube(d)-(d-k)*last)/(d-a)**2)];
  }
  function fit(key, values) {
    const [q,road,built,height]=values, logRoad=Math.log1p(road), logHeight=Math.log1p(height);
    const local=(data.samples[key]||[]).filter(r=>Math.abs(r[0]-q)<=.10 && Math.abs(r[2]-built)<=.12
      && Math.abs(Math.log1p(r[1])-logRoad)<=.55 && Math.abs(Math.log1p(r[3])-logHeight)<=.6);
    if(local.length<25 || new Set(local.map(r=>r[6])).size<3) return null;
    const hull=hullOf(local);
    if(hull.length<3) return null;
    const axes=[4,5].map(k=>local.map(r=>r[k]).sort((a,b)=>a-b));
    const coords=axes.map(a=>Array.from({length:33},(_,i)=>quantile(a,.05)+(quantile(a,.95)-quantile(a,.05))*i/32));
    const median=axes.map(a=>quantile(a,.5)), points=[];
    const coefficients=data.configTerms.All.concat(data.interactions);
    const modifiers=[q-.30,logRoad-3.2,(built/.12+(logHeight-2.3)/.6)/2];
    // Only C- and A-dependent terms survive subtraction of the setting anchor.
    const terms=coords.map((axis,k)=>axis.map(v=>spline(v,k===0?[.05,.22,.40,.65]:[.01,.12,.30,.65])));
    let anchorIndex=0, bestDistance=Infinity;
    for(const [j,a] of coords[1].entries()) for(const [i,c] of coords[0].entries()) {
      if(hull.some((p,n)=>cross(p,hull[(n+1)%hull.length],[c,a]) < -1e-12)) continue;
      let count=0; const cities=new Set();
      for(const r of local) {
        if((c-r[4])**2+(a-r[5])**2>.06**2) continue;
        count++; cities.add(r[6]);
        if(count>=10 && cities.size>=3) break;
      }
      if(count<10 || cities.size<3) continue;
      const basis=[...terms[0][i],...terms[1][j],...modifiers.map(v=>v*c),...modifiers.map(v=>v*a)];
      const pred=[0,1].map(y=>basis.reduce((sum,v,k)=>sum+v*coefficients[k][y],0));
      const d=(c-median[0])**2+(a-median[1])**2;
      if(d<bestDistance) {bestDistance=d;anchorIndex=points.length;}
      points.push([i,j,c,a,...pred]);
    }
    if(points.length<5) return null;
    const anchor=points[anchorIndex].slice(2), markers={"GVI maximum":0,"LST minimum":0,"Balanced":0};
    for(const p of points){p[4]-=anchor[2];p[5]-=anchor[3];}
    const g=points.map(p=>p[4]), t=points.map(p=>p[5]);
    const gmax=Math.max(...g), tmin=Math.min(...t), dg=gmax-Math.min(...g), dt=Math.max(...t)-tmin;
    if(Math.min(dg,dt)<=1e-9) return null;
    markers["GVI maximum"]=g.indexOf(gmax);markers["LST minimum"]=t.indexOf(tmin);
    let best=Infinity, tie=Infinity;
    points.forEach((p,i)=>{
      const a=(gmax-p[4])/dg,b=(p[5]-tmin)/dt, loss=Math.max(a,b);
      if(loss<best || (loss===best && a+b<tie)){best=loss;tie=a+b;markers.Balanced=i;}
    });
    return {points,markers,anchor:anchor.slice(0,2),localGrids:local.length,localCities:new Set(local.map(r=>r[6])).size};
  }
  return {settingKey,fit};
})();
