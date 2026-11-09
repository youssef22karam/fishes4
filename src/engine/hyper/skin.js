/* SKIN / PATTERN / EYE SHADER PATCHES (string patches over the engine's FS_BODY, FS_FIN, FS_EYE).
 *
 *  - palette: back / flank / belly / fin / tail / iris come from the hyper palette (genome.js) — coherent by construction.
 *  - 11 pattern layers, each enabled + parameterised by its OWN sub-seed (uHLa/uHLb arrays), blended through masks.
 *  - diamond-grid scale lattice with rear-edge highlights, lateral line (5 path types) with pored scales, myomere chevrons (W/V),
 *    cephalic sensory pores (supra/infra-orbital, preopercular, mandibular, snout), eye-region patterns (bitmask), rear scutes,
 *    wear (scale loss, scars, parasites, algae, bruise) and age tint. Fin + tail patterns (bands, spots, dark edge, base spot, hyaline tip).
 *  The layers evaluate in body coordinates (u along the body, vert around it), so they continue across the cover, fin bases and peduncle. */

const DECL = /* glsl */`
uniform vec4 uHLa[12]; uniform vec4 uHLb[12]; uniform vec3 uHBack,uHFlank,uHBelly,uHCream,uHDark,uHAccent,uHTail;
uniform vec4 uHW, uHW2, uHP, uHLat, uHEye, uHSc, uHPore, uHFin[8];
`;

const FUNCS = /* glsl */`
float hBit(float f,float b){ return mod(floor(f/b+.001),2.0); }
vec2 hVor(vec2 p){ vec2 ip=floor(p), fp=fract(p); float f1=9.0,f2=9.0; for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=vec2(hash12(ip+g+3.1),hash12(ip+g+17.7)); float d=length(g+o-fp); if(d<f1){f2=f1;f1=d;} else if(d<f2) f2=d; } return vec2(f1,f2-f1); }
float hPit(vec2 P, vec2 c, float r){ return 1.0-smoothstep(r*.55,r,length(P-c)); }
float hRim(vec2 P, vec2 c, float r){ float d=length(P-c); return smoothstep(r*.8,r*1.1,d)*(1.0-smoothstep(r*1.2,r*1.7,d)); }
`;

const PIGMENT = /* glsl */`
vec3 hyperPigment(float u, float ang, vec3 col){
  float vert=verticalOf(ang);
  float hb=clamp((u-uHeadU*.75)/(1.0-uHeadU*.75),0.0,1.0);
  vec2 P=vec2(u*uFineness, vert*.62);
  vec2 W=vec2(fbm(P*2.0+uSeed), fbm(P*2.0+uSeed+13.0))-.5;
  float head=1.0-smoothstep(uHeadU*.9,uHeadU*1.1,u);
  float fwu=fwidth(u), lod=1.0-smoothstep(.0008,.004,fwu);        /* fine-detail visibility (anti-alias guard) */
  /* ── countershading: dark back → flank → pearl belly, demarcation soft..sharp ── */
  float dm=mix(.28,.05,uHP.x);
  float backM=smoothstep(.34-dm,.34+dm,vert+W.x*.12);
  col=mix(col,uHFlank,exp(-pow((vert-.05)/.5,2.0))*.5);
  col=mix(col,uHBack,backM*.6);
  col=mix(col,uHBelly,smoothstep(-.18-dm,-.5+dm*.2,vert+W.y*.1)*.55);
  /* ── pattern layers (each independently seeded/enabled) ── */
  vec4 a,b; float m,s;
  a=uHLa[0]; b=uHLb[0]; s=a.x;                                       /* 1 fine speckle / freckles */
  if(s>.01){ vec2 g=P*mix(45.0,120.0,a.y); vec2 c=floor(g), l=fract(g)-.5; vec2 jt=(vec2(hash12(c+1.7),hash12(c+3.1))-.5)*.5; float r=mix(.12,.24,a.z);
    float aaL=1.0-smoothstep(.7,1.6,fwidth(g.x)+fwidth(g.y));        /* round 7 WP5: fade cell patterns out as their cells approach pixel size — no aliased speckle blocks */
    m=(1.0-smoothstep(r*.6,r,length(l-jt)))*step(.55,hash12(c+uSeed))*smoothstep(-.8,.4,vert)*lod*aaL; col=mix(col,uHDark,m*.5*s); }
  a=uHLa[1]; b=uHLb[1]; s=a.x;                                       /* 2 wavy tiger stripes */
  if(s>.01){ float n=mix(5.0,30.0,a.y); float t=hb*n+vert*(a.z-.5)*3.0+W.x*2.2;
    m=smoothstep(.52,.7,.5+.5*sin(t*6.2832))*smoothstep(-.3,.55,vert)*(1.0-head); col=mix(col,uHDark,m*.65*s); }
  a=uHLa[2]; b=uHLb[2]; s=a.x;                                       /* 3 vertical bars (tapering, curved) */
  if(s>.01){ float n=floor(mix(3.0,14.0,a.y)+.5); float x=abs(fract(hb*n+W.x*.15+b.w*vert*.4)-.5);
    float wd=mix(.12,.30,smoothstep(-.3,.9,vert))*(.7+.6*a.z); float sf=max(b.z>.5 ? .015 : .09, fwidth(hb*n)*.9);   /* round 7 WP5: bar edges soften by their own screen-space derivative — never a 1-px digital edge */
    m=(1.0-smoothstep(wd-sf,wd+sf,x))*(1.0-head)*smoothstep(-.9,-.15,vert); col=mix(col,uHDark,m*.7*s); }
  a=uHLa[3]; b=uHLb[3]; s=a.x;                                       /* 4 longitudinal stripes, broken into dashes */
  if(s>.01){ float n=floor(1.0+a.y*8.0+.5); float yy=(vert*.5+.5)*n+W.y*.25; float x=abs(fract(yy)-.5);
    m=(1.0-smoothstep(.05,.15,x))*(1.0-head*.5); if(a.w>.5) m*=step(.35,fract(hb*(14.0+20.0*b.x)+hash12(vec2(floor(yy),uSeed)))); col=mix(col,mix(uHDark,uHAccent,.4),m*.6*s); }
  a=uHLa[4]; b=uHLb[4]; s=a.x;                                       /* 5 spots / ocelli with halo */
  if(s>.01){ float sc=mix(2.5,16.0,sqrt(a.y)); s*=1.0-smoothstep(.7,1.6,fwidth(P.x*sc)+fwidth(P.y*sc));   /* round 7 WP5: cell fade, as layer 1 */
    vec2 g=P*sc; vec2 c=floor(g), l=fract(g)-.5; vec2 jt=(vec2(hash12(c+1.7),hash12(c+3.1))-.5)*.5; l-=jt; float jj=hash12(c+uSeed);
    float rr=mix(.14,.3,jj)*(.6+.8*a.z); float d=length(l*vec2(1.0,1.0+a.w)); float core=1.0-smoothstep(rr-.03,rr,d); float halo=smoothstep(rr,rr+.03,d)*(1.0-smoothstep(rr+.06,rr+.13,d));
    float en=step(.3,jj)*smoothstep(-.8,.2,vert); col=mix(col,uHDark,core*en*.8*s); col=mix(col,uHCream,halo*en*step(.5,a.z)*.5*s);
    col=mix(col,uHAccent*1.2,core*step(.82,jj)*(1.0-smoothstep(rr*.35,rr*.5,d))*.8*s); }
  a=uHLa[5]; b=uHLb[5]; s=a.x;                                       /* 6 reticulation / honeycomb / vermiculate */
  if(s>.01){ if(b.z>.5){ vec2 v=hVor(P*mix(3.0,9.0,a.y)+W*1.2); m=(1.0-smoothstep(.0,.09,v.y)); }
    else { float f=fbm(P*mix(3.0,6.0,a.y)+W*3.0+uSeed); m=1.0-smoothstep(.0,.05,abs(f-.5)); } col=mix(col,uHDark,m*.55*s*(1.0-.4*head)); }
  a=uHLa[6]; b=uHLb[6]; s=a.x;                                       /* 7 camouflage mottle, 3-5 tones, torn edges */
  if(s>.01){ float n=fbm(P*mix(1.6,3.2,a.y)+W*1.5+uSeed*2.0)*.75+fbm(P*7.0+uSeed)*.35+vnoise(P*38.0)*.07*lod;
    col=mix(col,uHDark*1.3,smoothstep(.38,.31,n)*.7*s); col=mix(col,uHAccent,smoothstep(.45,.5,n)*(1.0-smoothstep(.62,.68,n))*.55*s);
    col=mix(col,uHCream,smoothstep(.70,.76,n)*.6*s*(.35+.65*smoothstep(-.2,.9,vert))); }
  a=uHLa[7]; b=uHLb[7]; s=a.x;                                       /* 8 saddles over the back */
  if(s>.01){ float n=floor(mix(3.0,6.0,a.y)+.5); float x=abs(fract(hb*n+.5)-.5); m=(1.0-smoothstep(.09,.2,x+W.x*.12))*smoothstep(.12,.5,vert)*(1.0-head); col=mix(col,a.z>.5 ? uHCream : uHDark,m*.65*s); }
  /* ── head patterns around the eye (bitmask), up to 3 combined ── */
  if(head>.01 && uEyeRU>0.0){
    float dU=(u-uEyeU)/max(uEyeRU,1e-3), dV=(vert-uEyeVert)/max(uEyeRV,1e-3), dE=length(vec2(dU,dV)); float f=uHEye.x; float hs=uHLa[8].x*.9+.1;
    float inHead=head*smoothstep(.0,.03,u);
    if(hBit(f,1.0)>.5){ float m1=exp(-pow((vert-uEyeVert)/.13,2.0))*inHead*(1.0-exp(-dE*dE*.08)); col=mix(col,uHDark,m1*.55*hs); }          /* dark eye stripe through the eye */
    if(hBit(f,2.0)>.5){ float m2=exp(-pow(dU/.8,2.0))*smoothstep(1.0,1.5,abs(dV))*(1.0-smoothstep(3.4,4.5,abs(dV)))*inHead; col=mix(col,uHDark,m2*.6*hs); }  /* vertical bar above/below the eye */
    if(hBit(f,4.0)>.5){ float an=atan(dV,dU); float ry=smoothstep(.82,.96,abs(sin(an*uHEye.y*.5)))*smoothstep(1.2,1.7,dE)*(1.0-smoothstep(3.2,5.5,dE))*inHead; col=mix(col,uHAccent*1.3,ry*.65*hs); } /* radiating lines */
    if(hBit(f,8.0)>.5){ float rg=smoothstep(.95,1.15,dE)*(1.0-smoothstep(1.35,1.9,dE)); col=mix(col,hsv2rgb(vec3(uHEye.z/360.0,.7,.9))*.8,rg*.4*inHead); }   /* coloured orbit halo */
    if(hBit(f,16.0)>.5){ float br=exp(-pow((dV-1.9)/.28,2.0))*smoothstep(-2.5,-.5,dU)*(1.0-smoothstep(1.5,3.0,dU))*inHead; col=mix(col,uHCream,br*.55*hs); }  /* pale eyebrow */
    if(hBit(f,32.0)>.5){ float po=exp(-pow((dU-2.3)/1.3,2.0))*exp(-pow(dV/1.4,2.0))*inHead; col=mix(col,uHDark,po*.6*hs); }                                    /* dark patch behind the eye */
    if(hBit(f,64.0)>.5){ float mo=smoothstep(.46,.56,fbm(P*9.0+uSeed))*smoothstep(5.0,1.5,dE)*inHead; col=mix(col,mix(uHAccent,uHDark,.5),mo*.55*hs); }          /* mottled eye region */
    if(hBit(f,128.0)>.5){ float vm=1.0-smoothstep(.0,.07,abs(fbm(P*14.0+W*4.0+uSeed)-.5)); col=mix(col,uHDark,vm*smoothstep(5.5,1.5,dE)*inHead*.5*hs); }       /* vermiculate lines */
    /* bony orbit rim: pale/dark ring + soft contact shadow where the skin meets the eyeball */
    col*=1.0-.12*(1.0-smoothstep(.9,1.6,dE));   /* soft orbital contact shade only - no painted rim ring */
    /* cephalic sensory pores: pale-rimmed dark pits along the canals */
    if(lod>.05){ vec2 PP=P; float pits=0.0, rims=0.0; vec2 ec=vec2(uEyeU*uFineness, uEyeVert*.62); float R_=uEyeRU*uFineness;
      for(int i=0;i<9;i++){ float t=(float(i)+.5)/8.5; if(float(i)<uHPore.x){ vec2 c=ec+vec2((t-.5)*R_*3.4, uEyeRV*.62*1.75+.012*sin(t*6.0)); pits+=hPit(PP,c,.0075); rims+=hRim(PP,c,.0075); }
        if(float(i)<uHPore.y){ vec2 c=ec+vec2((t-.5)*R_*3.0, -uEyeRV*.62*1.7); pits+=hPit(PP,c,.0075); rims+=hRim(PP,c,.0075); }
        if(float(i)<uHPore.z){ vec2 c=vec2((uPreU-.006)*uFineness, mix(-.55,.42,t)*.62); pits+=hPit(PP,c,.0075); rims+=hRim(PP,c,.0075); }
        if(float(i)<uHPore.w){ vec2 c=vec2(mix(uMouthStart,uMouthU*.95,t)*uFineness, (mix(uMouthTipF,uMouthCornerF,t)-.2)*.62); pits+=hPit(PP,c,.0068); rims+=hRim(PP,c,.0068); }
        if(float(i)<uHEye.w){ vec2 c=vec2((uEyeU*.3+float(i)*.012)*uFineness, (.28+.05*float(i%2))*.62); pits+=hPit(PP,c,.006); rims+=hRim(PP,c,.006); } }
      float paa=1.0-smoothstep(.002,.006,length(fwidth(PP)));   /* pores vanish before they alias into pixel specks */
      col=mix(col,uHCream,clamp(rims,0.0,1.0)*.10*lod*inHead*paa); col=mix(col,uHDark*.7,clamp(pits,0.0,1.0)*.40*lod*inHead*paa); }
  }
  /* ── scale lattice: the SAME station-graded lattice as the engine's scale field, so rims/highlights sit exactly on the relief ── */
  if(uScale!=4 && uScale!=6){ float st0=uHeadU*.45, span=max(.2,1.0-st0), tb=clamp((u-st0)/span,0.0,1.0), phiS=ang*6.2831853;
    float gx=1.7*tb-1.05*(1.0-cos(3.14159265*tb))/3.14159265+1.7*min(0.0,(u-st0)/span); float gy=(phiS+.225*sin(2.0*phiS))/6.2831853;
    vec2 sc=vec2(gx*span*uFineness*34.0, gy*27.0*(1.0+.22*uFineness))/uScaleSize; if(uScale==3) sc*=2.2; if(uScale==5) sc*=.5;
    vec2 p=sc; if(uScale==2 || uScale==5) p=vec2(sc.x+sc.y,sc.y-sc.x)*.7071; p.x+=mod(floor(p.y),2.0)*.5;
    vec2 q=fract(p)-.5; vec2 e=vec2(q.x*.86-.1,q.y*1.05); float dd=(uScale==2||uScale==5) ? abs(e.x)+abs(e.y) : length(e);
    float aa=1.0-smoothstep(.25,1.3,length(fwidth(sc)));
    float ring=smoothstep(.36,.46,dd)*(1.0-smoothstep(.47,.54,dd))*aa;                    /* free margin of each scale */
    float rear=smoothstep(-.05,.35,e.x);
    col*=1.0-uHP.z*(.20+.12*(1.0-rear))*ring*(1.0-.9*head);                               /* shadowed overlap seam */
    col+=col*uHP.z*.38*ring*rear*(.35+.65*smoothstep(-.6,.5,vert))*(1.0-.9*head);         /* highlighted rear edge */
    col*=1.0+(hash12(floor(p)+uSeed)-.5)*.10*aa*(1.0-.9*head);                            /* per-scale tone jitter */ }
  /* ── lateral line: 5 path types, a dark canal + 40-120 pored scales ── */
  { float pth=uHLat.w, hh=hb; float ly=.06;
    if(pth<.5) ly=.04; else if(pth<1.5) ly=.1*sin(hh*3.0)+.02; else if(pth<2.5) ly=mix(.42,-.05,smoothstep(.0,.8,hh)); else if(pth<3.5) ly=.05+.02*sin(hh*40.0); else ly=.06;
    float ln=exp(-pow((vert-ly)/.022,2.0)); if(pth>3.5) ln+=exp(-pow((vert-ly-.3)/.02,2.0))*.7; if(pth>2.5&&pth<3.5) ln*=step(.4,fract(hh*9.0));
    ln*=step(uHeadU*.92,u)*smoothstep(.0,.04,hh)*(1.0-smoothstep(.93,1.0,hh))*uHLat.z*3.0;
    col=mix(col,uHDark*1.5,ln*.45); col*=1.0+.10*ln*uHLat.y;
    float pr=fract(hh*uHLat.x); float pit=ln*(1.0-smoothstep(.1,.22,abs(pr-.5)))*lod; col=mix(col,uHDark*.5,pit*.7); col+=uHCream*.08*pit*ln; }
  /* ── myomere chevrons (W/V muscle segmentation), strongest on the posterior flank ── */
  { float k=hb*uFineness*1.7+abs(vert)*.55-.3*abs(vert)*abs(vert); float ch=abs(fract(k)-.5); col*=1.0-uHP.y*.22*smoothstep(.2,.5,ch)*smoothstep(.2,1.0,hb)*smoothstep(-.6,.2,vert)*(1.0-smoothstep(.55,.95,vert)); }
  /* ── rear flank scutes: shield plates with a keel, along the lateral line (rear half) ── */
  if(uHSc.x>.5){ float n=uHSc.x; float su=smoothstep(.52,.62,hb)*(1.0-smoothstep(.93,.99,hb)); float pu=fract(hb*n*1.0+.0); float shield=(1.0-smoothstep(.34,.5,abs(pu-.5)))*exp(-pow((vert-.04)/.12,2.0)); float edge=smoothstep(.0,.07,abs(pu-.5)-.36)*0.0;
    col*=1.0-.28*su*smoothstep(.2,.5,abs(pu-.5))*exp(-pow((vert-.04)/.13,2.0)); col=mix(col,uHCream*.85,su*shield*.18); col*=1.0+.15*su*(1.0-smoothstep(.0,.05,abs(vert-.04)))*shield; }
  /* ── wear / imperfection + age ── */
  { float wr=uHW.x; float loss=smoothstep(.62,.7,fbm(P*5.0+uSeed*3.0))*uHW.y*30.0*wr; col=mix(col,col*vec3(.65,.6,.6)+vec3(.04),clamp(loss,0.0,1.0)*.6*step(uHeadU,u));
    for(int i=0;i<6;i++){ float fi=float(i); if(fi<uHW.z){ vec2 c=vec2(hash12(vec2(fi,uSeed))*uFineness, (hash12(vec2(fi,uSeed+5.0))-.5)*.9); vec2 dd=(P-c)*vec2(.18,2.0); float sc2=exp(-dot(dd,dd)*28.0); col=mix(col,uHCream*.9+vec3(.08,.02,.02),sc2*.5*wr*4.0); } }
    for(int i=0;i<7;i++){ float fi=float(i); if(fi<uHW.w){ vec2 c=vec2(hash12(vec2(fi+9.0,uSeed))*uFineness*.9+uHeadU*uFineness*.3, (hash12(vec2(fi+3.0,uSeed))-.5)*1.0); col=mix(col,vec3(.03,.02,.02),hPit(P,c,.014)*.8*lod); } }
    col=mix(col,col*vec3(.75,.95,.6),uHW2.x*smoothstep(-.3,-.9,vert)*fbm(P*3.0+uSeed)*.6);
    col=mix(col,col*vec3(1.0,.62,.7)+vec3(.04,.0,.02),uHW2.y*smoothstep(.55,.7,fbm(P*2.5+uSeed+8.0))*.5);
    col*=1.0+(hash12(floor(P*30.0)+uSeed)-.5)*.04*wr*(1.0-smoothstep(.7,1.6,fwidth(P.x*30.0)+fwidth(P.y*30.0))); if(uHW2.w>1.5) col=mix(col,vec3(dot(col,vec3(.33))),.25); }   /* round 7 WP5: the wear cell tint fades at pixel scale too */
  return col;
}
vec3 hyperFin(vec3 col, float rayT, float lenT, float root, float kind, float ray){
  vec4 F=uHFin[int(clamp(kind,0.0,7.0))]; float st=F.x, bands=F.y, fl=F.z, mg=F.w; float open=1.0-root;
  if(kind>4.5 && kind<5.5) col=mix(col,uHTail,.75*open);                                  /* tail colour may differ from the body */
  if(st<.5) col=mix(col,col*1.08+.03,open*.25);                                           /* hyaline: clear, slightly pale */
  else if(st<1.5) col*=1.0-open*ray*.4;                                                   /* dark rays on a clear membrane */
  else if(st<2.5){ vec2 g=vec2(rayT*9.0,lenT*5.5)*(1.0+bands*.2); vec2 c=floor(g), l=fract(g)-.5; l-=(vec2(hash12(c+2.0),hash12(c+8.0))-.5)*.4; float sp=(1.0-smoothstep(.12,.24,length(l)))*step(.4,hash12(c+uSeed)); col=mix(col,uHDark*1.4,sp*.7*open); }
  else if(st<3.5){ float bd=smoothstep(.45,.58,.5+.5*sin((lenT*bands+.12*fbm(vec2(rayT*8.0,lenT*3.0)+uSeed))*3.1416*2.0)); col=mix(col,uHDark*1.5,bd*.5*open*smoothstep(.1,.3,lenT)); }
  else if(st<4.5) col=mix(col,uHDark*1.3,smoothstep(.8,.97,lenT)*.7*open);                 /* dark margin */
  else col=mix(col,uHCream,open*.22*smoothstep(.3,1.0,lenT));                            /* pale */
  if(hBit(fl,1.0)>.5) col=mix(col,uHDark*1.4,smoothstep(.14,.0,rayT)*.7*open);          /* dark leading edge */
  if(hBit(fl,2.0)>.5) col=mix(col,uHCream,smoothstep(.82,1.0,lenT)*.45*open);           /* pale trailing edge */
  if(hBit(fl,4.0)>.5) col=mix(col,uHDark*1.3,(1.0-smoothstep(.05,.3,lenT))*.5*open*(1.0-smoothstep(.2,.6,abs(rayT-.5)*2.0)));  /* basal dark spot */
  if(hBit(fl,8.0)>.5) col=mix(col,vec3(dot(col,vec3(.33)))+.25,smoothstep(.9,1.0,lenT)*.5*open); /* hyaline tip */
  col=mix(col,uHDark,smoothstep(.9,1.0,lenT)*mg*.25*open);
  return col;
}
`;

/** patch the three engine shaders; returns the new sources */
export function patchBody(src) {
  const inject = DECL + FUNCS + PIGMENT;
  let s = src.replace('void main(){\n  gZ=vLP.z/uLen;', inject + 'void main(){\n  gZ=vLP.z/uLen;');
  s = s.replace('vec3 col=skinPigment(u,ang); float tissue=vBody.z;', 'vec3 col=hyperPigment(u,ang,skinPigment(u,ang)); float tissue=vBody.z;');
  if (s === src || !s.includes('hyperPigment(u,ang,skinPigment')) throw new Error('hyper skin patch: FS_BODY anchors not found');
  return s;
}
export function patchFin(src) {
  // the fin shader only needs hBit + hyperFin (the last function of PIGMENT) and the uniform block
  const finFn = PIGMENT.slice(PIGMENT.indexOf('vec3 hyperFin('));
  let s = src.replace('void main(){ float rayT = vFin.x', DECL + 'float hBit(float f,float b){ return mod(floor(f/b+.001),2.0); }\n' + finFn + 'void main(){ float rayT = vFin.x');
  s = s.replace('vec3 skin=skinPigment(vSkin.x,ang), col=mix(uFinCol,skin,root);', 'vec3 skin=skinPigment(vSkin.x,ang), col=mix(uFinCol,skin,root); col=hyperFin(col,rayT,lenT,root,vFin.w,ray);');
  if (!s.includes('hyperFin(col,rayT')) throw new Error('hyper skin patch: FS_FIN anchors not found');
  return s;
}
/* Anatomical teleost iris: argentea (reflective guanine) zone around the pupil, coloured stroma with radial folds,
   peripheral pigment that fades into the dark eyeball (no outlined disc), never a white sclera look. */
const IRIS_GLSL = `    { vec3 ic=uEyeCol; float lum=dot(ic,vec3(.299,.587,.114));
      ic=mix(ic, ic*(.58/max(lum,.001)), smoothstep(.55,.95,lum));                       /* very pale irises become silver-grey, not white */
      float fib=.80+.09*sin(ph*max(uIrisFib,60.0)+q*9.0)+.06*sin(ph*max(uIrisFib,60.0)*2.3-q*15.0)+.08*vnoise(vec2(ph*30.0,q*5.0)+uSeed);
      float mott=fbm(vec2(ph*5.0,q*3.0)+uSeed*1.3);
      vec3 c2=ic*fib;
      c2=mix(c2, ic*1.18+vec3(.035,.032,.02), (1.0-smoothstep(.04,.42,q))*.5);           /* argentea ring next to the pupil */
      c2*=1.0-.30*smoothstep(.5,.78,mott);                                               /* melanophore mottling */
      c2*=mix(1.0,.30,smoothstep(.62,1.0,q));                                            /* peripheral pigment -> dark eyeball, no outline */
      c2*=.50+.50*smoothstep(.0,.06,q);                                                  /* thin dark pupillary margin */
      c2+=ic*.12*pow(1.0-nv,2.0);
      col=c2; }`;
export function patchEye(src) {
  let s = src.replace('ao = .70 + .30*smoothstep(.0,.35,1.0-q*.5);', 'ao = .70 + .30*smoothstep(.0,.35,1.0-q*.5);\n'+IRIS_GLSL).replace('uniform vec3 uEyeCol; uniform float uCartilage,uSeed;', 'uniform vec3 uEyeCol, uIrisRing; uniform float uCartilage,uSeed,uIrisFib,uIrisOn;');
  s = s.replace('float fibers = .80 + .12*sin(ph*79.0+q*12.0) + .07*sin(ph*131.0-q*7.0) + .05*sin(ph*37.0+3.0);',
    'float fibers = mix(.80 + .12*sin(ph*79.0+q*12.0) + .07*sin(ph*131.0-q*7.0) + .05*sin(ph*37.0+3.0), .74 + .15*sin(ph*uIrisFib+q*14.0) + .09*sin(ph*uIrisFib*1.7-q*8.0) + .05*sin(ph*uIrisFib*.45+3.0) + .06*sin(ph*uIrisFib*3.1+q*30.0), uIrisOn);');
  s = s.replace('col = irisCol*fibers*crypt*collar;', 'col = irisCol*fibers*crypt*collar;\n    col = mix(col, uIrisRing*fibers*1.05, uIrisOn*smoothstep(.50,.80,q)*(1.0-smoothstep(.88,1.0,q))*.85);   /* outer metallic ring */\n    col *= mix(1.0, .55 + .45*smoothstep(.0,.2,q), uIrisOn);                                                   /* dark inner pupil ring */');
  s = s.replace('spec = pow(max(dot(N,H),0.0), 320.0)*.9 + pow(max(dot(N,H),0.0), 40.0)*.03;', 'spec = pow(max(dot(N,H),0.0), 320.0)*.9 + pow(max(dot(N,H),0.0), 40.0)*.03 + uIrisOn*(pow(max(dot(N,normalize(normalize(uFillDir)+V)),0.0), 160.0)*.28);');
  if (!s.includes('uIrisFib*1.7')) throw new Error('hyper skin patch: FS_EYE anchors not found');
  return s;
}

/* ───────────── uniforms ───────────── */
const PATH_ID = { straight: 0, curved: 1, arch: 2, broken: 3, double: 4 };
const FIN_STYLE = { hyaline: 0, darkRays: 1, spotted: 2, banded: 3, darkEdge: 4, pale: 5 };
const EYE_BITS = { stripe: 1, bar: 2, rays: 4, ring: 8, brow: 16, postPatch: 32, mottle: 64, vermic: 128 };

/** add the hyper uniforms to an engine uniform set and override the palette-driven ones (so the legacy pattern / scale code is coherent too) */
export function addUniforms(THREE, u, g, bm, H) {
  const P = H.palette, col = a => new THREE.Color().setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace), V4 = (a, b, c, d) => new THREE.Vector4(a, b, c, d);
  const set = (k, v) => { u[k] = { value: v }; };
  set('uHBack', col(P.back)); set('uHFlank', col(P.flank)); set('uHBelly', col(P.belly)); set('uHCream', col(P.cream)); set('uHDark', col(P.dark)); set('uHAccent', col(P.accent)); set('uHTail', col(P.tail));
  const L = H.patterns.layers;
  // packing: a = (strength, a, b, d)   b = (n, c, hard, rot)   — see the layer code in hyperPigment
  set('uHLa', L.map(l => V4(l.on ? l.strength : 0, l.a, l.b, l.d)));
  set('uHLb', L.map(l => V4(l.n, l.c, l.hard, l.rot)));
  const W = H.wear; set('uHW', V4(W.amount, W.scaleLoss, W.scars, W.parasites)); set('uHW2', V4(W.algae, W.bruise, W.mucus, W.age === 'juvenile' ? 0 : W.age === 'adult' ? 1 : 2));
  set('uHP', V4(P.demarcation, H.scales.myomere, H.scales.diamondGrid, 0));
  set('uHLat', V4(H.lateral.pores / 1.0, H.lateral.raised ? 1 : .35, H.lateral.tint, PATH_ID[H.lateral.path] || 0));
  let eb = 0; for (const p of H.eye.patterns) eb |= EYE_BITS[p] || 0; eb &= ~(4 | 8);   /* radiating rays + coloured halo read as a painted target around the eye: disabled */ set('uHEye', V4(eb, H.eye.radialLines, H.eye.ringHue, H.head.pores.snout));
  set('uHSc', V4(H.scutes.count, H.scutes.keels, H.scutes.ridge, H.scutes.napeHump));
  const hp = H.head.pores; set('uHPore', V4(hp.supra, hp.infra, hp.preop, hp.mandib));
  const FK = { 1: 'dorsal', 2: 'anal', 3: 'pectoral', 4: 'pelvic', 5: 'caudal', 6: 'dorsal2', 7: 'dorsal' };
  set('uHFin', Array.from({ length: 8 }, (_, k) => { const f = H.fins[FK[k] || 'dorsal']; return V4(FIN_STYLE[f.style] || 0, f.bands, (f.leadDark ? 1 : 0) + (f.trailPale ? 2 : 0) + (f.baseSpot ? 4 : 0) + (f.hyalineTip ? 8 : 0), f.margin); }));
  // palette overrides on the engine's own uniforms
  if (u.uBase) { u.uBase.value.copy(col(P.back)); u.uBelly.value.copy(col(P.belly)); u.uAccent.value.copy(col(P.accent)); u.uFinCol.value.copy(col(P.fin)); }
  if (u.uPatStrength) u.uPatStrength.value *= .45;
  if (u.uLateral) u.uLateral.value = 0;                                   // the hyper lateral line replaces the legacy one
  const mir = H.scales.chromeMirror;
  if (u.uSilver) u.uSilver.value = Math.max(u.uSilver.value, Math.min(.92, mir * .9));
  if (u.uIrid) u.uIrid.value = Math.max(u.uIrid.value, .25 + mir * .6);
  if (u.uGloss) u.uGloss.value = Math.min(1, Math.max(u.uGloss.value, 1 - H.scales.roughness * 1.4));
  if (u.uScaleVis) u.uScaleVis.value = Math.min(u.uScaleVis.value, .75) * (.75 + .25 * H.scales.diamondGrid);
  // eye extras
  set('uIrisFib', H.eye.irisFibers); set('uIrisOn', 1); set('uIrisRing', col(H.eye.iris).multiplyScalar(1.15));
  return u;
}

/** iris colour for the eye builder (replaces the engine's dark capped iris with palette rule + ring) */
export function irisOf(THREE, H) {
  /* teleost irises are guanine-silver, gold, copper, red or dark brown; saturated cyan/blue/violet or chalk-white irises are not
     plausible, so the palette iris is pulled into the natural gamut (hue kept where it is plausible, value capped so the eye never reads as a white disc) */
  const c = new THREE.Color().setRGB(H.eye.iris[0], H.eye.iris[1], H.eye.iris[2], THREE.SRGBColorSpace), hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace);
  let hh = hsl.h * 360, ss = hsl.s, ll = hsl.l;
  if (hh > 75 && hh < 330) { ss *= .18; hh = 42; }                   /* green-blue-violet -> neutral silver with a faint brass cast */
  ss = Math.min(ss, .70); ll = Math.min(Math.max(ll, .14), .40);
  return c.setHSL(hh / 360, ss, ll, THREE.SRGBColorSpace);
}
