// Minimal browser stubs so the (generated) engine module can be imported under Node for verification.
const ctx2d = () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }), putImageData() {}, fillRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), drawImage() {}, fillText() {}, measureText: () => ({ width: 0 }), beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), set fillStyle(v) {}, set strokeStyle(v) {}, set globalAlpha(v) {}, set lineWidth(v) {} });
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true }); } catch (e) { /* already defined */ }
globalThis.innerWidth = 1280; globalThis.innerHeight = 800;
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.localStorage = { getItem() { return null; }, setItem() {} };
globalThis.document = { head: { appendChild() {} }, body: { appendChild() {} }, getElementById() { return null; }, createElement() { return { style: {}, getContext: ctx2d, addEventListener() {} }; }, querySelectorAll() { return []; }, addEventListener() {} };
