/** Deterministic, side-effect-free plant traits. Every seed can be shared as a URL. */
export function normalizeSeed(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8,16}$/i.test(value)) return '5eed2026';
  return value.toLowerCase();
}
export function createRandom(seed) {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const PALETTES = Object.freeze([
  { name: '晨雾蓝', petal: '#b9dff8', petalInner: '#e7f6ff', leaf: '#83bdb3', center: '#f6db9f' },
  { name: '月光紫', petal: '#c7b8ea', petalInner: '#efe8ff', leaf: '#a6c6c2', center: '#f8dab4' },
  { name: '微光金', petal: '#f6d6a2', petalInner: '#fff1dc', leaf: '#a2c3a2', center: '#e99c7e' },
  { name: '暮云粉', petal: '#f4bac9', petalInner: '#ffe5ed', leaf: '#92bdac', center: '#ebd48f' },
  { name: '流萤白', petal: '#d7ece9', petalInner: '#f4fff6', leaf: '#83aebe', center: '#f7ce9b' },
]);
export function plantFromSeed(seedInput) {
  const seed = normalizeSeed(seedInput);
  const rand = createRandom(seed);
  const palette = PALETTES[Math.floor(rand() * PALETTES.length)];
  const height = 164 + rand() * 86;
  const lean = -46 + rand() * 92;
  const branchCount = 4 + Math.floor(rand() * 4);
  const petals = 5 + Math.floor(rand() * 4);
  const flowerRadius = 21 + rand() * 9;
  const tilt = -23 + rand() * 46;
  const layers = rand() < .35 ? 2 : 1;
  const leaves = Array.from({length:branchCount},(_,i)=>({
    at: .19 + (i / Math.max(1, branchCount - 1)) * .55,
    side: i % 2 === 0 ? -1 : 1,
    length: 19 + rand() * 20,
    width: 8 + rand() * 7,
    rise: 7 + rand() * 15,
  }));
  const messages = ['每一种生长，都有自己的方向。','微小的事物，也会拥有自己的天空。','没有两次夜晚完全相同。','慢慢来。光总会找到叶片。','一点偶然性，就足以长成一朵花。'];
  return {seed, palette, height, lean, branchCount, petals, flowerRadius, tilt, layers, leaves, message:messages[Math.floor(rand() * messages.length)]};
}
