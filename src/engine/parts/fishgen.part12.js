  applyWave(p, n, ph); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0); vWP = wp.xyz; vLP = p; vN = normalize(mat3(mm)*n); vBody = aBody; vCirc=vec2(cos(aBody.y*6.2831853),sin(aBody.y*6.2831853)); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_BODY = GLSL_COMMON_FS + GLSL_PIGMENT + /* glsl */`
uniform float uLen,uScaleSize,uIrid,uGloss,uPhoto,uTrans,uHeadU,uPreU,uMouthU,uLateral,uElectric,uDetail,uMouthStart,uMouthTipF,uMouthCornerF,uManta,uJawAngle,uJawOpenMax,uGape,uJawU0,uHingeU; uniform float uMLine[40];
uniform float uScaleVis,uMatte,uSheen,uDeep; uniform vec3 uIntLip,uIntThroat;
uniform float uSilver,uLips,uEyeU,uEyeVert,uEyeRU,uEyeRV,uNostrils,uSlits;
uniform float uOpOff,uOpBow,uOpW;   /* round 5A: operculum rear-edge curve (headlaw.opEdgeU: vc .22, vs 1.22); all 0 on non-cover plans */
float opE(float vert){ float q=clamp((vert-.22)/1.22,-1.0,1.0); return uHeadU-uOpOff-uOpBow*q*q; }
uniform int uScale; varying vec3 vN,vWP,vLP; varying vec4 vBody; varying vec2 vCirc;
float skinT0(float t){ return (t>2.95 && t<3.3) ? 1.0 : 0.0; }
float gCirc = 1.0;   /* circuli visibility, killed when scales fall under a pixel */
float gFine = 1.0;   /* high-frequency skin detail visibility (anti-alias guard)     */

vec2 scaleUV(vec2 sc){ vec2 p=sc; if(uScale==2 || uScale==5) p=vec2(sc.x+sc.y,sc.y-sc.x)*.7071; p.x+=mod(floor(p.y),2.0)*.5; return p; }

/* An imbricated scale: a fan whose free (posterior, +x) edge rides over the next scale.
   Real cycloid/ctenoid scales also carry concentric growth rings (circuli) around an
   anterior focus plus radii grooves - those two features are what reads as "fish" up close. */
float scaleHeight(vec2 sc){
  if(uScale==4 || uScale==6) return 0.0;
  vec2 p=scaleUV(sc); vec2 cell=floor(p), q=fract(p)-.5;
  float jitter=hash12(cell+uSeed);
  q+=(vec2(jitter,hash12(cell+uSeed+1.3))-.5)*.035;
  vec2 e=vec2(q.x*.86-.1, q.y*1.05);
  float d=(uScale==2 || uScale==5) ? abs(e.x)+abs(e.y) : length(e);
  if(uScale==1) d+=.02*sin(atan(e.y,e.x)*9.0+jitter*6.0)*step(0.0,e.x);   /* ctenoid comb edge */
  float body=1.0-smoothstep(.40,.50,d);
  float ramp=.35+.65*smoothstep(-.45,.32,e.x);                            /* rises toward the free edge */
  float lip=smoothstep(.30,.44,d)*step(-.05,e.x);                         /* shadowed step over the next scale */
  float h=body*ramp*(.85+.3*jitter)-lip*.35;
  if(gCirc>0.001){
    vec2 f=vec2(e.x+.26,e.y);                                             /* focus sits anterior of centre */
    float fr=length(f*vec2(1.0,1.22));
    float circuli=sin(fr*47.0-jitter*5.0)*.055*smoothstep(.06,.22,fr)*body;
    float radii=sin(atan(f.y,f.x)*13.0+jitter*9.0)*.016*smoothstep(.1,.5,fr)*body;
    h+=(circuli+radii)*gCirc;
  }
  return h;
}
float scaleTone(vec2 sc){ return hash12(floor(scaleUV(sc))+uSeed+9.0); }
/* per-scale guanine (iridophore) platelet coverage: strongest mid-flank, like a real silver fish */
float scaleGuanine(vec2 sc,float vert){ vec2 p=scaleUV(sc); vec2 q=fract(p)-.5; float j=hash12(floor(p)+uSeed+4.2);
  return smoothstep(.46,.12,length(q))*(.45+.55*j)*(1.0-smoothstep(.15,.95,abs(vert-.1))); }

/* non-scale skin relief: pebbled head, fleshy lips with labial plicae, maxillary plate & sulcus, infraorbital canal, opercular bone, paired nares */
float microH(float u,float vert,float head){
  float h=0.0;
  h += (fbm(vec2(u*300.0/max(.6,uFineness), vert*90.0)+uSeed)-.5)*.22*head*gFine;      /* head pebbling   */
  h += (fbm(vec2(u*110.0, vert*30.0)+uSeed*1.7)-.5)*.10*head;                          /* coarse wrinkles */
  /* lips, labial sulcus, and diagonal maxillary bone plate */
  if(u>=uMouthStart && u<=uMouthU*1.06){
    float t=smoothstep(uMouthStart,uMouthU,u);
    float arch=.018*sin(3.14159265*pow(t,.75))*(1.0-t);
    float lvl=mix(uMouthTipF,uMouthCornerF,t)+arch-.015*sin(3.14159265*t);
    float dv=(vert-lvl);
    float fade=smoothstep(uMouthStart,uMouthStart+.012,u)*(1.0-smoothstep(uMouthU*.94,uMouthU*1.05,u));
    float plicae=1.0+.16*uLips*sin(u*440.0/max(.5,uHeadU)+vert*18.0)*gFine;
    float pad=(exp(-pow((dv-.048)/.048,2.0))+exp(-pow((dv+.048)/.048,2.0)))*plicae;
    float sulcus=exp(-pow((dv-.105)/.026,2.0))+exp(-pow((dv+.105)/.026,2.0));
    /* diagonal maxillary paddle ridge & supramaxillary groove above the posterior 75% of the upper lip */
    float mxT=smoothstep(.18,.96,t)*(1.0-smoothstep(.92,1.04,t));
    float mxCenter=.075+.065*t;
    float mxPlate=exp(-pow((dv-mxCenter)/(.032+.024*t),2.0))*mxT;
    float mxGroove=exp(-pow((dv-(mxCenter+.042+.020*t))/.018,2.0))*mxT;
    h += pad*(.22+.58*uLips)*fade + mxPlate*.24 - sulcus*(.14+.22*uLips)*fade - mxGroove*.16;
    h -= exp(-pow(dv/.016,2.0))*(.32+.42*uLips)*fade;
  }
  /* suborbital / infraorbital sensory canal sweeping below the eye (as in cichlids, percoids, bass) */
  if(uEyeRU>0.0 && head>.1){
    float duE=(u-uEyeU)/max(1e-4,uEyeRU), dvE=(vert-uEyeVert)/max(1e-4,uEyeRV);
    float subArch=-1.35-.35*cos(clamp(duE*.75,-1.5,1.5));
    float subCanal=exp(-pow((dvE-subArch)/.22,2.0))*smoothstep(-2.2,-.8,duE)*(1.0-smoothstep(1.2,2.4,duE));
    h -= subCanal*.11*gFine;
    h += exp(-pow((dvE-(subArch+.24))/.16,2.0))*smoothstep(-2.0,-.7,duE)*(1.0-smoothstep(1.1,2.2,duE))*.08*gFine;
  }
  /* operculum: a flat bone plate with radial striae and a raised free margin */
  float eU=opE(vert);
  float op=smoothstep(uPreU,uPreU+(eU-uPreU)*.3,u)*(1.0-smoothstep(eU-.012,eU+.006,u));
  h += op*(.03*sin((u-uPreU)*95.0/max(.12,uHeadU)+vert*7.0)*gFine+.04);
  h += (1.0-smoothstep(.0,.006,abs(u-eU)))*.20;                                        /* free margin ridge */
  h += (1.0-smoothstep(.0,.008,abs(u-uPreU)))*.07;                                     /* preopercular ridge */
  /* paired nares: anterior incurrent pit + posterior excurrent pit with a delicate nasal bridge */
  float nd1=length(vec2((u-uEyeU*.48)/.0095,(vert-.29)/.068));
  float nd2=length(vec2((u-uEyeU*.58)/.011,(vert-.31)/.075));
  h -= ((1.0-smoothstep(.45,1.0,nd1))+(1.0-smoothstep(.45,1.0,nd2)))*.48*uNostrils;
  h += (smoothstep(.7,1.05,nd1)*(1.0-smoothstep(1.05,1.45,nd1)))*.14*uNostrils;
  return h;
}

void main(){
  gZ=vLP.z/uLen;
  float u=vBody.x, ang=fract(atan(vCirc.y,vCirc.x)/6.2831853+1.0), vert=verticalOf(ang);
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; vec3 V=normalize(cameraPosition-vWP);
  vec3 col=skinPigment(u,ang); float tissue=vBody.z;
  /* skin classes: body (0), upper-jaw patch (2) and operculum (3.0-3.2) are ONE skin system - same pigment, scales and relief; 4 = appendage strand */
  bool skinT=tissue<.5 || (tissue>1.9 && tissue<3.3);
  bool strand=tissue>3.9 && tissue<4.1;
  float rimK=clamp((tissue-3.0)/.2,0.0,1.0)*step(2.95,tissue)*step(tissue,3.3);
  if(strand) col=mix(col,mix(col,vec3(.90,.84,.76),.5),smoothstep(.55,1.0,vBody.w));   /* body-coloured, slightly lighter tip */
  float head=1.0-smoothstep(uHeadU*.5,uHeadU*1.08,u);
  /* mouth law: the skin opens only as far as the jaw drops; what shows through is the capped cavity (tissue tag 1), never the far side */
  bool cav=tissue>.9&&tissue<1.1;
  if(cav){ col=vec3(.34,.12,.11)*(.5+.5*fbm(vec2(u*40.0,ang*20.0)+uSeed)); }
#ifndef JAW
  /* round 2: the static skin of the LOWER jaw zone (below the lip line, chin → hinge) is not drawn while the jaw is open: the hinged lower-jaw patch replaces it,
     so nothing is ever cut out above the lip line and the upper lip is a plain skin edge. The discard line is the same table the patch edge is built from. */
  if(uManta<.5 && tissue<.5 && uJawOpenMax>.001 && u>=(uJawU0<.002?0.0:uJawU0) && u<=uHingeU && uJawAngle/uJawOpenMax>.02){
    float fi=clamp((u-uJawU0)/max(1e-6,uHingeU-uJawU0),0.0,1.0)*39.0; int i0=int(floor(fi)); int i1=min(i0+1,39);
    float edge=mix(uMLine[i0],uMLine[i1],fi-float(i0));
    if(vert<edge-.0005) discard;
  }
#endif

  /* screen-space surface frame, reused by every bump layer */
  vec3 ddx=dFdx(vWP), ddy=dFdy(vWP), r1=cross(ddy,N), r2=cross(N,ddx); float det=dot(ddx,r1);
  float relief=uLen*.0015;

  if(uManta<.5 && skinT && u>=uMouthStart && u<=uMouthU){
    float t=smoothstep(uMouthStart,uMouthU,u);
    float level=mix(uMouthTipF,uMouthCornerF,t)-.025*sin(3.14159265*t);
    float fade=smoothstep(uMouthStart,uMouthStart+.012,u)*(1.0-smoothstep(uMouthU-.014,uMouthU,u));
    float crease=exp(-pow((vert-level)/(.023+min(uJawAngle,.08)*.1),2.0))*fade;
    col=mix(col,uBase*.22,crease*.72);
    col=mix(col,mix(col,vec3(.62,.42,.40),.35),(exp(-pow((vert-level-.06)/.05,2.0))+exp(-pow((vert-level+.06)/.05,2.0)))*fade*uLips*.6);
  }

  /* round 4: STATION-GRADED scale field. Rows are lines of constant circumferential angle (they follow the body axis / lateral line); along the body the scale length is
     graded by an exactly integrated density rho(t)=1.7-1.05 sin(pi t): small toward head and tail, largest mid-flank; around the section the row pitch is denser dorsally and
     ventrally than on the flank. The free edge always points tailward (head-ward overlap). Everything lives in body space, so nothing crawls under the swim wave. */
  float st0=uHeadU*.45, span=max(.2,1.0-st0), tb=clamp((u-st0)/span,0.0,1.0), phiS=ang*6.2831853;
  float gx=1.7*tb-1.05*(1.0-cos(3.14159265*tb))/3.14159265+1.7*min(0.0,(u-st0)/span);
  float gy=(phiS+.225*sin(2.0*phiS))/6.2831853;
  vec2 sc=vec2(gx*span*uFineness*34.0, gy*27.0*(1.0+.22*uFineness))/uScaleSize;
  if(uRay>.5) sc.y=gZ*uFineness*40.0/uScaleSize;   /* round 6A: disc scale rows follow the planform (lateral position), not the ring angle */
  if(uScale==3) sc*=2.2; if(uScale==5) sc*=.5;
  float capK=smoothstep(.004,.03,u);                                          /* round 4: angular detail fades in over the snout cap — no clamped-u speckle patch, no seam */
  float fw=length(fwidth(sc)), visible=(1.0-smoothstep(.4,1.7,fw))*uScaleVis*capK;
  gCirc=(1.0-smoothstep(.05,.22,fw))*uDetail*capK;
  gFine=(1.0-smoothstep(.0018,.0065,fwidth(u)))*uDetail*capK;
  float h=scaleHeight(sc), guan=0.0;
  if(uDetail>.4 && skinT && uScale!=4 && uScale!=6){
    float scaleFade=smoothstep(uHeadU*.30,uHeadU*1.20,u);   /* R3: snout / jaws are naked pitted skin; scales appear on the cheek and grow toward the trunk */   /* round 4: head carries the same scale field, graded by station */
    float hx=scaleHeight(sc+dFdx(sc))-h, hy=scaleHeight(sc+dFdy(sc))-h;
    float scaleRelief=uScale==3 ? .00035 : uScale==2 || uScale==5 ? .0015 : .0011;
    vec3 grad=sign(det)*(hx*r1+hy*r2)*(uLen/max(1.25,uFineness))*scaleRelief*uScaleSize*visible*scaleFade*1.5;
    N=normalize(max(abs(det),1e-12)*N-grad);
    float tone=scaleTone(sc);
    guan=scaleGuanine(sc,vert)*visible*scaleFade;
    col*=1.0+.05*(h-.4)*visible*scaleFade+.05*(tone-.5)*visible*scaleFade;
    col=mix(col,col*vec3(1.06,1.07,1.12),guan*uSilver*.5);                 /* platelet lightening */
    col*=1.0-.10*smoothstep(.25,.0,h)*visible*scaleFade;                   /* seated posterior edge */
  }

  /* skin relief that is not scales: pebbling, lips, orbit, opercle, nares */
  if(uDetail>.4 && (tissue<1.95 || skinT)){
    float mh=microH(u,vert,head*capK);
    vec3 mgrad=sign(det)*(dFdx(mh)*r1+dFdy(mh)*r2)*relief;
    N=normalize(max(abs(det),1e-12)*N-mgrad);
    col*=1.0+.10*clamp(mh,-1.0,1.0)*head;
    /* round 2.1: no periorbital ring. The skin simply darkens in the last fraction before the eyeball (d ≈ distance from the eye centre in eye radii; the skin-blend cap spans d .6–1.2) */
    float dEy=uEyeRU>0.0 ? length(vec2((u-uEyeU)/max(1e-4,uEyeRU),(abs(vert)-abs(uEyeVert))/max(1e-4,uEyeRV))) : 9.0;
    col*=1.0-.22*(1.0-smoothstep(.55,1.0,dEy));   /* round 4: lighter, so the body pattern reads straight across the eye-blend patch */
    float eU=opE(vert), bw=uOpW>0.0 ? uOpW*1.8 : .014;
    float behind=smoothstep(eU-.001,eU+.0015,u)*(1.0-smoothstep(eU+.002,eU+bw+.002,u))*(1.0-skinT0(tissue))*(1.0-uRay);   /* no opercular shadow on the fused disc */
    col*=1.0-.40*behind;                                                     /* soft shadow the free margin casts on the trunk */
    col*=1.0-.12*smoothstep(.45,1.0,rimK)-.26*smoothstep(3.22,3.26,tissue)*step(tissue,3.3);   /* crest barely tinted; the rear wall sits in its own shade */                                   /* fine tapered rim of the cover */
    col*=1.0+.05*(1.0-smoothstep(.0,.003,abs(u-eU+.002)))*(1.0-rimK)*(1.0-uRay);
  }

  if(uScale==6){ float rows=min(abs(vert-.9),min(abs(abs(vert)-.35),abs(vert+.9)));
    float plate=(1.0-smoothstep(.015,.1,rows))*pow(.5+.5*sin(u*uFineness*31.0),2.0)*step(uHeadU,u); col*=1.0+.14*plate; }

  /* lateral line: canal groove plus the pored scales that punctuate it */
  float lly=.08*sin(u*3.0), line=exp(-pow((vert-lly)/.018,2.0))*step(uHeadU,u)*uLateral;
  float pore=line*(1.0-smoothstep(.12,.34,abs(fract(u*uFineness*26.0/uScaleSize)-.5)))*visible;
  col*=1.0-.18*line-.35*pore;

  if(tissue>.5 && tissue<1.95){
    float rugae=.92+.08*sin(u*165.0+fbm(vec2(u*45.0,ang*16.0))*3.0);
    col=mix(vec3(.76,.54,.50),vec3(.12,.03,.04),smoothstep(-.15,.92,vBody.y))*rugae;
  }
  if(tissue>5.4 && tissue<6.6){ float dk=clamp((tissue-6.0)*4.0,0.0,1.0), dep=(.42+.40*dk)*(.55+.45*vBody.w);   /* slit throat: shaded depth, darkest at the deep rear wall and mid-length */
    col=mix(col,mix(vec3(.17,.05,.06),vec3(.012,.007,.009),smoothstep(.2,.9,dk)),dep); }
  if(tissue>3.45 && tissue<3.7){ col=mix(col,mix(col,vec3(.72,.58,.55),.35),.6); col*=.90+.10*sin(ang*520.0+(u-uPreU)*26.0); }   /* branchiostegal membrane: fine ray fan */
  if(tissue>1.2 && tissue<1.3) col=mix(vec3(.68,.46,.44),vec3(.38,.06,.07),.65+.35*sin(ang*90.0))*.72;            /* branchial arches: pale raker rim + crimson filament shadow */
  if(tissue>1.4 && tissue<1.6) col=vec3(.74,.48,.46)*(.88+.12*fbm(vec2(u*65.0,ang*20.0)+uSeed));                  /* basihyal tongue: fleshy pink-tan lingual mucosa */
  if(tissue>6.6 && tissue<7.6) col*=.86+.08*step(tissue,7.2);
  if(tissue>7.9) col*=1.0-.30*smoothstep(.0,.85,vBody.w);   /* round 5B: nares / spiracle = a soft pit, at most 30 % darker than the skin around it, fading to nothing at the rim */

  /* material response */
  float tone2=scaleTone(sc);
  float rough=mix(.56,.13,uGloss);
  rough*=1.0+.22*head-.10*(1.0-smoothstep(-.7,-.1,vert));      /* head duller, belly slicker */
  rough+=(tone2-.5)*.10*visible;
  rough-=guan*.08;
  rough=mix(rough,rough*1.4+.1,uMatte); rough*=1.0-.2*uSheen;        /* round 4: wet sheen on cruisers / surface plans, matte on deep-band and benthic plans */
  float metal=clamp(uSilver*guan*1.15,0.0,.85)*(1.0-head*.55);
  float coat=mix(.45,1.0,uWet)*(1.0-.25*head)*(1.0-.55*uMatte+.12*uSheen);
  float sss=uTrans*.9+.12;
  bool inner=tissue>.5 && tissue<1.95;
  if(inner){ rough=.42; metal=0.0; coat=.55; sss=.45; }
  vec3 sheen=mix(uBase,vec3(.8,.88,1.0),.6)*uIrid*(.25+.75*guan);
  vec3 c=pbrSkin(col,N,vWP,rough,metal,sss,coat,sheen);

  /* structural colour: thin-film over the guanine layer, hue rotating with view angle */
  float nv=max(0.0,dot(N,V));
  float filmT=.55+.45*fbm(vec2(u*38.0,vert*13.0)+uSeed);
  vec3 iri=hsv2rgb(vec3(fract(.53+(1.0-nv)*.52*filmT+u*.07),.6,1.0));
  c+=iri*uIrid*(.10+.5*guan)*pow(1.0-nv,2.0)*0.9;

  if(uPhoto>.5) for(int row=0;row<2;row++){
    float rv=row==0 ? -.52 : -.81, n=max(1.0,floor(uPhoto/2.0)), pu=(u-uHeadU)/(1.0-uHeadU)*n;
    float dotp=1.0-smoothstep(.07,.13,length(vec2(fract(pu)-.5,(vert-rv)*n*.36)));
    c+=uGlow*dotp*step(uHeadU,u)*step(u,.99)*( .85+.15*sin(uTime*2.5+floor(pu)))*1.7;
  }
  if(uElectric>.5) c+=vec3(.2,.35,.65)*uElectric*pow(max(0.0,sin(uTime*5.0+u*16.0)),24.0)*smoothstep(.3,.8,u)*.14;
  if(tissue>.5 && tissue<1.95){   /* Multi-zone buccal mucosa: pale fleshy gingival/palatal rim -> salmon buccal wall & tongue -> dark pharyngeal throat */
    float occ=clamp(vBody.y,0.0,1.0);
    vec3 gumCol=mix(uIntLip*1.32,vec3(.82,.64,.60),.38);
    vec3 tn=mix(gumCol,uIntLip,smoothstep(.0,.38,occ));
    tn=mix(tn,uIntThroat,smoothstep(.32,.92,occ));
    if(tissue>1.4 && tissue<1.6) tn=mix(gumCol*1.05,uIntThroat,smoothstep(.22,.95,occ)*.68);
    else if(tissue>1.2 && tissue<1.3) tn=mix(gumCol*.85,uIntThroat*.75,smoothstep(.15,.88,occ));
    float rugae=.93+.07*sin(u*170.0+occ*22.0)+.12*(fbm(vec2(u*45.0,occ*24.0)+uSeed)-.5);
    tn*=rugae;
    c=tn+c*.18*(1.0-.65*occ); }
  c=mix(c,uFogCol,fogAmt(vWP)); gl_FragColor=vec4(c,mix(1.0,.86,uTrans));
}`;
const VS_FIN = GLSL_SWIM + /* glsl */`
attribute vec4 aFin; attribute vec4 aFin2; attribute vec4 aSkin; attribute vec3 aBase; attribute vec4 aHinge; attribute vec3 aAxis; varying vec3 vN, vWP; varying vec4 vFin, vFin2, vSkin; varying vec2 vCirc;
uniform vec4 uPecA, uPecB, uPecP; uniform float uPecDisc, uDiscAmp, uDiscK;
vec3 rotA(vec3 v, vec3 a, float g){ float c=cos(g), s=sin(g); return v*c + cross(a,v)*s + a*dot(a,v)*(1.0-c); }
void main(){ vec3 p = position; vec3 n = normal; float ph = phaseOf(); p += inflateDisp(aBase);
  float kind = aFin.w, lenT = aFin.y, rayT = aFin.x, flex = aFin.z; float u = aSkin.x; float t = uCycle + ph;
  float mobile=smoothstep(.12,.8,lenT), tissue=mix(1.0,.13,aSkin.z);
  float rip = sin(rayT*9.0 + t*8.0 + u*4.0) * flex * mobile*mobile * uLen * .008*tissue;
  if(uMode == 7 && kind == 1.0) rip = sin(rayT*12.0 - t*14.0) * lenT*lenT * uLen * 0.03;
  if((kind == 2.0 || kind == 1.0) && uMode == 0 && flex > 0.9) rip = sin(rayT*14.0 - t*7.0) * lenT*lenT*uLen*0.03;
  p.z += rip*mobile;
  if(kind == 3.0){
    if(uPecDisc > .5){ p.y += sin(u*uDiscK - t*6.2831853) * mobile*mobile * uDiscAmp; }   /* merged disc: travelling wave along the margin, no separate joint */
    else if(aHinge.w != 0.0){                                   /* base joint: sweep + abduction, tip lags the base in phase, ray flex travels outward */
      float sg = aHinge.w; vec4 A = sg > 0.0 ? uPecA : uPecB; float ph0 = sg > 0.0 ? uPecP.x : uPecP.y;
      float th = ph0 - uPecP.z * lenT * (.75 + .25*rayT);
      float sw = clamp(A.x + A.y*cos(th), -.43633, .61087);   /* -25..+35 deg, hard clamp */
      float ab = clamp(A.z + A.w*sin(th), .08727, .95993) - uPecP.w;   /* 5..55 deg abduction, hard clamp */
      float w = smoothstep(0.0, .4, lenT);
      vec3 pr = vec3(p.xy, p.z*sg), nr = vec3(n.xy, n.z*sg), rr = pr - aHinge.xyz;
      rr = rotA(rr, aAxis, ab*w); nr = rotA(nr, aAxis, ab*w); rr = rotA(rr, vec3(0.0,0.0,1.0), sw*w); nr = rotA(nr, vec3(0.0,0.0,1.0), sw*w);
      pr = aHinge.xyz + rr; p = vec3(pr.xy, pr.z*sg); n = vec3(nr.xy, nr.z*sg);
      float pb = .5 + .5*cos(rayT*(aFin2.w-1.0)*6.2831853);   /* individual rays stand proud of the membrane */
      p += normalize(n)*uLen*.0011*pb*smoothstep(.04,.3,lenT)*(1.0-.5*lenT);
    } }
  applyWave(p, n, ph); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0); vWP = wp.xyz; vN = normalize(mat3(mm)*n); vFin = aFin; vFin2 = aFin2; vSkin=aSkin; vCirc=vec2(cos(aSkin.y*6.2831853),sin(aSkin.y*6.2831853)); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_FIN = GLSL_COMMON_FS + GLSL_PIGMENT + /* glsl */`
uniform vec3 uFinCol; uniform float uIrid,uGloss; varying vec3 vN, vWP; varying vec4 vFin, vFin2, vSkin; varying vec2 vCirc;
void main(){ float rayT = vFin.x, lenT = vFin.y, op = vFin2.x, memb = vFin2.y, sf = vFin2.z, R = vFin2.w;
  if(vFin.w>2.5 && vFin.w<3.5) memb = 1.02;                                   /* round 2: a side fin keeps its membrane to the margin between the rays (no bare spikes) */
  float rl = abs(fract(rayT*(R-1.0)+0.5)-0.5); float isSpine = step(rayT, sf - 0.001); float rayW = mix(0.08, 0.16, isSpine)*(1.0-0.5*lenT); float ray = 1.0 - smoothstep(rayW, rayW+0.08, rl);
  if(vSkin.z<.5 && lenT > 1.0-.12*(4.0*rl*rl)) discard;                       /* fin law: trailing edge scalloped between ray tips */
  float branch=1.0-smoothstep(.055,.12,abs(fract(rayT*(R-1.0)*2.0+.5)-.5));
  ray=mix(ray,max(ray*.55,branch*.65),smoothstep(.55,.86,lenT)*(1.0-isSpine));
  if(lenT > memb && ray < .55 && vSkin.z<.5) discard;
  float root=1.0-smoothstep(.08,.62,lenT), ang=fract(atan(vCirc.y,vCirc.x)/6.2831853+1.0);
  vec3 skin=skinPigment(vSkin.x,ang), col=mix(uFinCol,skin,root);
  /* membrane: collagen fibre sheen between the rays, pigment blotches and a clearer distal margin */
  float fibre=.94+.06*sin(rayT*R*18.0+lenT*9.0);
  float blotch=fbm(vec2(rayT*9.0, lenT*5.0)+uSeed*1.3);
  col*=fibre*(.88+.24*blotch);
  col=mix(col, col*vec3(1.15,1.12,1.06), smoothstep(.75,1.0,lenT)*.5*(1.0-vSkin.z));
  if(vSkin.z>.5) col=mix(skin,uFinCol*.9,smoothstep(.28,1.0,lenT)*.18);
  else {
    col*=1.0-.27*ray*(1.0-root); col=mix(col,col*vec3(1.08,1.06,1.02)+.03,(1.0-ray)*(1.0-root)*.22);
    if(uPattern==2 || uPattern==3) col=mix(col,uAccent,(1.0-root)*uPatStrength*.35*smoothstep(.3,.44,abs(fract(rayT*R*.35)-.5)));
  }
  float a=mix(max(.2,(op*(1.0-.3*lenT))*(0.84+.16*ray)+ray*.1),1.0,root);
  if(vSkin.z>.5) a=1.0;
  if(vFin.w>2.5 && vFin.w<3.5){ a=max(a, mix(.9,1.0,ray)); if(rayT<.05||rayT>.97) a=1.0; }
  else if(vFin.w>.5 && vFin.w<7.5 && vSkin.z<.5){ a=max(a, mix(.86,1.0,ray)); }   /* round 3: dorsal / anal / pelvic / caudal membranes read as tissue at rest, never jelly-transparent */   /* side fin: ray structure + a membrane that reads as tissue, never a jelly paddle */
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 c=wetLight(col,N,vWP,uGloss*.38,(1.0-vSkin.z)*(1.0-root)*.6);                 /* matte / satin membrane */
  c+=col*uLightCol*pow(max(0.0,dot(-N,normalize(uLightDir))),2.0)*(1.0-vSkin.z)*(1.0-root)*.15;
  float fog=fogAmt(vWP); c=mix(c,uFogCol,fog); gl_FragColor=vec4(c,a);
}`;
const VS_EYE = GLSL_SWIM + /* glsl */`
attribute vec3 aEye; varying vec3 vN, vWP, vE;
void main(){ vec3 p = position; vec3 n = normal; vE = aEye;
  p += inflateDisp(p); applyWave(p, n, phaseOf()); mat4 mm = modelM(); vec4 wp = mm*vec4(p,1.0);
  vWP = wp.xyz; vN = normalize(mat3(mm)*n); gl_Position = projectionMatrix*viewMatrix*wp; }`;
/* The eyeball is real geometry (sclera shell, recessed iris disc, pupil cup, cornea dome, optional lids); this shader only colours each part
   from its own coordinates (aEye) - nothing here depends on the viewing direction except ordinary lighting. */
const FS_EYE = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uEyeCol; uniform float uCartilage,uSeed;
varying vec3 vN, vWP, vE;
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V = normalize(cameraPosition-vWP), L = normalize(uLightDir), H = normalize(L+V), R = reflect(-V,N);
  float nv = max(dot(N,V),0.0), nl = max(dot(N,L),0.0), kind = vE.z, fres = .04+.96*pow(1.0-nv,4.2);
  vec3 col = vec3(.5); float alpha = 1.0, spec = 0.0, ao = 1.0;
  if(kind < .5){                                   /* sclera: pale connective tissue, vessels, darker toward the limbus */
    float th = vE.x, ph = vE.y;
    col = mix(uEyeCol*.5, vec3(.07,.065,.06), .6) * (.92+.14*vnoise(vec2(ph*3.0,uSeed)));   /* round 2: dark eyeball surface, never a pale sclera ring */
    col *= mix(.48, 1.0, smoothstep(.78, 1.15, th));
  } else if(kind < 1.5){                           /* iris: textured, palette-coloured, darker limbal rim, bright pupil ruff */
    float q = vE.x, ph = vE.y;
    float fibers = .80 + .12*sin(ph*79.0+q*12.0) + .07*sin(ph*131.0-q*7.0) + .05*sin(ph*37.0+3.0);
    float crypt  = .88 + .12*vnoise(vec2(ph*14.0, q*11.0)+uSeed) + .06*fbm(vec2(ph*26.0,q*18.0));
    float collar = 1.0 + .22*(1.0-smoothstep(.0,.16,abs(q-.30)));
    vec3 irisCol = uCartilage>.5 ? mix(uEyeCol*.95, uEyeCol*.55, q)*.8 : mix(uEyeCol*1.0, uEyeCol*.45, q*q);
    col = irisCol*fibers*crypt*collar;
    col += uEyeCol*.45*(1.0-smoothstep(.0,.12,q));
    col *= 1.0 - .66*smoothstep(.78,1.0,q);
    col += uEyeCol*.10*pow(1.0-nv,2.0);        /* metallic sheen of the stroma */
    ao = .70 + .30*smoothstep(.0,.35,1.0-q*.5);                  /* recessed under the cornea */
  } else if(kind < 2.5){                           /* pupil cup: the dark lens, part of the eyeball itself */
    col = vec3(.004,.004,.006) + uEyeCol*.035*(1.0-vE.x); ao = .8;
  } else if(kind < 3.5){                           /* cornea: clear, moist; only a small scene-light highlight */
    alpha = .03 + .22*fres;
    spec = pow(max(dot(N,H),0.0), 320.0)*.9 + pow(max(dot(N,H),0.0), 40.0)*.03;
    col = vec3(1.0);
  } else if(kind < 4.5){                           /* adipose eyelid: clear fatty window, subtle */
    col = vec3(.08); alpha = .05*fres;
  } else if(kind < 5.5){                           /* limbal funnel: dark collar leading down to the iris plane */
    col = uEyeCol*.16 + vec3(.01); ao = .75;
  } else {                                         /* nictitating lower lid: translucent milky membrane */
    col = vec3(.06); alpha = 0.0;
  }
  vec3 c = col*ao*(envDiff(N)*.55 + uLightCol*(.30+.70*nl) + uFillCol*.7);
  if(kind > 2.5 && kind < 3.5){ c = uLightCol*spec + envSpec(R,.035)*fres*.18; alpha = clamp(alpha + spec*.9 + fres*.10, 0.0, 1.0); }
  else c += uLightCol*spec;
  c *= .80 + .20*nv;
  float fog = fogAmt(vWP); c = mix(c, uFogCol, fog); gl_FragColor = vec4(c, alpha); }`;
const VS_SIMPLE = GLSL_SWIM + /* glsl */`
#ifdef TEETH
attribute float aJaw;
varying float vT;
uniform float uJawOpenMax;
${JAW_SPREAD_GLSL}
#endif
varying vec3 vN, vWP;
void main(){ vec3 p = position; vec3 n = normal;
#ifdef TEETH
  vT = position.y;
#endif
#ifdef USE_INSTANCING
  p = (instanceMatrix*vec4(p,1.0)).xyz; n = normalize(mat3(instanceMatrix)*n);
#endif
#ifdef TEETH
  if(aJaw > 0.0){ p = jawSpread(p, (uHeadX - p.x)/uLen, aJaw, clamp(uJawAngle/max(uJawOpenMax,1e-4),0.0,1.0)); vec2 d = p.xy - uJawPivot; float a = -uJawAngle*aJaw; float c = cos(a), s = sin(a); p.xy = uJawPivot + vec2(c*d.x - s*d.y, s*d.x + c*d.y); n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y); p.x += uJawProtrude*aJaw; }
#endif
  applyWave(p, n, phaseOf()); vec4 wp = modelMatrix*vec4(p,1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix)*n); gl_Position = projectionMatrix*viewMatrix*wp; }`;
const FS_SIMPLE = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uColor; varying vec3 vN, vWP;
#ifdef TEETH
varying float vT;
#endif
void main(){ vec3 N = normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 col = uColor; float rough = 0.30, sss = 0.35, coat = 0.75;
#ifdef TEETH
  /* wet vertebrate enamel: pinkish-tan gingival root collar -> warm dentin ivory -> translucent enamel apex */
  float t = clamp(vT,0.0,1.0);
  vec3 rootGum = vec3(.44,.28,.26), dentin = vec3(.72,.67,.58), enamel = vec3(.86,.83,.77);
  col = mix(rootGum, dentin, smoothstep(.0,.28,t));
  col = mix(col, enamel, smoothstep(.28,.88,t));
  col *= .97+.035*sin(t*44.0);
  rough = mix(.48,.22,smoothstep(.15,.75,t)); sss = mix(.18,.34,smoothstep(.3,1.0,t)); coat = .92;
#endif
  vec3 c = pbrSkin(col, N, vWP, rough, 0.0, sss, coat, vec3(0.0));
  float fog = fogAmt(vWP); c = mix(c,uFogCol,fog); gl_FragColor = vec4(c,1.0); }`;
const FS_GLOW = GLSL_COMMON_FS + /* glsl */`
uniform vec3 uGlow; varying vec3 vN, vWP;
void main(){ float fl = 0.75 + 0.25*sin(uTime*5.0) * sin(uTime*2.3+1.0); vec3 N = normalize(vN); vec3 V = normalize(cameraPosition-vWP); float rim = pow(1.0-max(dot(N,V),0.0),2.0); vec3 c = uGlow*fl*(1.2+rim) + vec3(0.3)*rim; float fog = fogAmt(vWP); c = mix(c,uFogCol,fog*0.6); gl_FragColor = vec4(c,1.0); }`;
const hslCol = a => new THREE.Color().setHSL(((a[0] % 360) + 360) % 360 / 360, clamp(a[1], 0, 1), clamp(a[2], 0, 1), THREE.SRGBColorSpace);
function makeUniforms(g, bm) {
  const cvr = GILL.kindOf(bm) === 'cover';
  const lm = bm.lm, s = g.skin;
  /* where the eye sits in (u, circumferential-vertical) skin space, so the fragment shader can
     build an orbital rim, a sunken socket and periorbital pigment that actually line up with it */
  const es = bm.section(lm.eye, {}), yy = bm.eyeY;
  const yr = Math.max(1e-8, yy > 0 ? es.dUp : es.dDn), yn = yy > 0 ? es.nD : es.nV;
  const eyeVert = g.head.eyeSide === 'none' ? 0 : Math.sign(yy || 1) * Math.pow(clamp(Math.abs(yy) / yr, 0, .9), yn / 2);
  const eyeRU = g.head.eyeSide === 'none' ? 0 : bm.eyeR / Math.max(1e-6, bm.L);
  const eyeRV = g.head.eyeSide === 'none' ? 0 : clamp(bm.eyeR / Math.max(1e-6, (es.dUp + es.dDn) * .5), .02, .9);
  const silver = clamp(s.iridescence * .8 + (1 - s.base[1]) * .5 * (s.scale === 'bare' || s.scale === 'denticle' ? .2 : 1), 0, .92);
  const SK = skinLaw(axesOf(g), g), dp = (c, k = 1) => { const l = (c.r * .3 + c.g * .59 + c.b * .11); c.r = (l + (c.r - l) * (1 - .5 * SK.deep)) * (1 - .4 * SK.deep) * k; c.g = (l + (c.g - l) * (1 - .5 * SK.deep)) * (1 - .4 * SK.deep) * k; c.b = (l + (c.b - l) * (1 - .5 * SK.deep)) * (1 - .4 * SK.deep) * k; return c; };
  const cBase = dp(hslCol(s.base)), cBelly = dp(hslCol(s.belly)), cAcc = dp(hslCol(s.accent)), cFin = dp(hslCol(s.base).lerp(hslCol(s.belly), .38).lerp(hslCol(s.fin), .25), .96);   /* round 4: fin membrane tone derives from the body palette */
  return Object.assign({}, ENV, {
    uScaleVis: { value: SK.scaleVis }, uMatte: { value: SK.matte }, uSheen: { value: SK.sheen }, uDeep: { value: SK.deep }, uIntLip: { value: new THREE.Color(...SK.lip) }, uIntThroat: { value: new THREE.Color(...SK.throat) },
