import test from 'node:test';
import assert from 'node:assert/strict';
import {plantFromSeed, createRandom, normalizeSeed, PALETTES} from '../docs/a-seed/seed-core.mjs';

test('identical seeds produce identical plants',()=>{
  assert.deepEqual(plantFromSeed('0123abcd'),plantFromSeed('0123abcd'));
});
test('distinct seeds vary, with non-zero diversity',()=>{
  const variants=new Set(Array.from({length:100},(_,i)=>{
    const p=plantFromSeed(i.toString(16).padStart(8,'0'));
    return p.palette.name+'/'+p.height.toFixed(3)+'/'+p.petals;
  }));
  assert.ok(variants.size>95);
});
test('all generated measurements stay within viewBox-safe ranges',()=>{
  for(let i=0;i<2000;i++){
    const p=plantFromSeed(i.toString(16).padStart(8,'0'));
    assert.ok(p.height>=164&&p.height<250);
    assert.ok(p.lean>=-46&&p.lean<46);
    assert.ok(p.branchCount>=4&&p.branchCount<=7);
    assert.ok(p.leaves.length===p.branchCount);
    assert.ok(p.petals>=5&&p.petals<=8);
    assert.ok(PALETTES.includes(p.palette));
    for (const leaf of p.leaves) assert.ok(leaf.at>.15 && leaf.at<.78);
  }
});
test('share seeds are canonical and invalid values are rejected',()=>{
  assert.equal(normalizeSeed('AB12ab34'),'ab12ab34');
  assert.equal(normalizeSeed('hello?<>'),'5eed2026');
  assert.equal(normalizeSeed(''),'5eed2026');
});
test('PRNG is deterministic and bounded',()=>{
  const a=createRandom('abcdef89'),b=createRandom('abcdef89');
  for(let i=0;i<100;i++){
    const v=a();assert.equal(v,b());assert.ok(v>=0&&v<1);
  }
});
