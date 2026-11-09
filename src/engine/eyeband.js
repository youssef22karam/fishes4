/* EYE BAND (round 6H.2) — the ONE definition of where an eye may sit along the head.
   Used by: the trait sampler / mutation / breeding (genome.js), the engine's fitHead re-fit, the oral/gill repair rule and the
   lineage bound on gill start. Nothing here is keyed to a species.
   Everything is expressed as FRACTIONS OF HEAD LENGTH h, measured against the head's own landmarks:
     forward limit  = the gill-front position (a gill series may never start behind GILL_START_MAX of the head — the repair
                      rules' cap — so the gill-front edge on any built head is ≤ GILL_START_MAX·h), minus the eye's own rear
                      half-extent (+ the second eye of a one-sided plan, 2.3 R behind the first) and a fixed margin;
     rear limit     = the snout (eye radius + margin). The jaw side (mouth corner ≤ eye's front edge, jaw hinge at the eye line)
                      is enforced by the anatomy-law repair in laws.js, which raises eyeU to min(eyeCap, mouth corner + R) where
                      eyeCap = gillStart − 1.08 R − .012 < hi, i.e. always INSIDE this band — and narrows the gape, not the eye,
                      when the two cannot both fit.
   Both limits are measured on the head itself, so the band is never a fixed window that a long head outgrows. */
export const GILL_START_MAX = .78;     /* repair-rule cap on head.gillStart (oral_gill_separation + rayfin bound) */
export const EYE_R_FRAC = .69;         /* eye radius = eyeSize · h · .69 (the audit's own er) */
export const EYE_MARGIN = .004;        /* clearance (body-length units) between the eye's rear edge and the gill front */
export const SEAT_SHIFT = .3;          /* a seated eye on a tapering head sits up to .3 R behind its station (measured .27 R on gar heads) */
export const NODE_HALF = .0025;        /* half a spine node (the audit locates the eye by nearest node, 240 nodes) */
/** total rear clearance for an eye of radius er (body-length units): margin + seat shift + audit node resolution */
export const eyeMargin = er => EYE_MARGIN + SEAT_SHIFT * er + NODE_HALF;
export const SECOND_EYE = 2.3;         /* one-sided plans carry the second eye 2.3 R behind the first */

/** eyeBand(h, eyeSize, eyeSide) → { lo, hi, seat } in head-length fractions (eye centre along the head, 0 = snout tip, 1 = operculum edge).
    hi   = the enforced forward limit (station clears the gill front by the plain margin) — what fitHead / the analytic audit hold;
    seat = hi less the seating allowance (tilt shift + node resolution): the limit for an eye that must still clear the gill front once it is SEATED on
           the built head, i.e. what the sampler draws inside and what fitHead pins an over-forward eye to. */
export function eyeBand(h, eyeSize, eyeSide = 'both') {
  const er = eyeSize * h * EYE_R_FRAC, second = eyeSide === 'both' ? 0 : SECOND_EYE * er;
  const hi = (GILL_START_MAX * h - .5 * er - second - EYE_MARGIN) / h;
  const seat = (GILL_START_MAX * h - .5 * er - second - eyeMargin(er)) / h;
  const lo = (er + .004) / h;
  return { lo: Math.min(lo, seat), hi, seat };
}

/* EYE-SEAT BAND (round 6H.3a) — the ONE definition of how deep an eyeball sits in its local socket/dome surface.
   Shared by eye construction (eyegeo.js / buildEyes) and BOTH audits (classic mesh audit + shared coherence audit):
     resting default : centre EYE_SEAT (.70) radii below the local surface → cornea domes gently proud (protrusion = .15 diameter);
     lower bound     : cornea protrusion ≥ EYE_PROTRUSION_MIN (~.105 diameter, centre ≤ cos(CORNEA_REACH) R deep) + CORNEA_CLEAR (.012 R)
                       clearance above the local surface so the corneal cap is 100% visible (never buried);
     upper bound     : cornea protrusion ≤ EYE_PROTRUSION_MAX (1/3 of eye diameter, centre ≥ 1/3 R inside the socket — never bulging). */
export const LIMBUS = .62;                        /* polar angle (rad) of the corneal rim measured from the optical axis */
export const CORNEA_REACH = LIMBUS + .04;         /* corneal cap reach tested against the local head/dome surface */
export const CORNEA_CLEAR = .012;                 /* clearance (× R) keeping the corneal dome proud of the local surface */
export const BURIAL_MAX = .02;                    /* audit tolerance (× R) on cornea burial depth */
export const CORNEA_VIS_MIN = .97;                /* minimum ray-cast cornea visibility fraction (side / front-quarter) */
export const EYE_SEAT = .70;                      /* resting seat depth (× R) below the local surface */
export const EYE_SEAT_MAX = Math.cos(CORNEA_REACH); /* deepest seat (× R) that keeps the corneal rim above the surface */
export const EYE_SEAT_MIN = 1 / 3;                /* shallowest seat (× R) allowed by the 1/3-diameter protrusion cap */
export const EYE_PROTRUSION = (1 - EYE_SEAT) / 2;         /* resting cornea protrusion ÷ diameter (.15) */
export const EYE_PROTRUSION_MIN = (1 - EYE_SEAT_MAX) / 2; /* lower bound of seat band: cornea clears the surface (~.105) */
export const EYE_PROTRUSION_MAX = (1 - EYE_SEAT_MIN) / 2; /* upper bound of seat band: ≤ 1/3 of eye diameter */
export const SEAT_BAND = {
  seat: EYE_SEAT, seatMin: EYE_SEAT_MIN, seatMax: EYE_SEAT_MAX,
  min: EYE_PROTRUSION_MIN, nom: EYE_PROTRUSION, max: EYE_PROTRUSION_MAX,
  limbus: LIMBUS, reach: CORNEA_REACH, clear: CORNEA_CLEAR, burialMax: BURIAL_MAX, visMin: CORNEA_VIS_MIN,
};
export function seatBand() { return SEAT_BAND; }
