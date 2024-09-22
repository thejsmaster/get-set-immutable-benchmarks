import './style.css';
import { withGetSet } from './getSetImmutableBench';
import { withImmer } from './immerBench';
import { withJs } from './pureJavascript';
import { withImmutable } from './immutableBench';
import { withGetSetUsingSet } from './getSetImmutableWithSet';
import { withZustand } from './zustand';
// pure javascript:
// <span id="purejs"></span><br /> immutable js:
// <span id="immutablejs"></span><br />
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
   <b>time taken to update first 1k objects from an array of 10k objects x10 times</b><br /><br />
   <span> get-set-immutable with set: (slice + concat)
  <span  id="get-set-immutable-set"></span></span><br />
  <span > get-set-immutable with update: (proxies + for loop 1k)
   <span  id="get-set-immutable"></span></span><br />
   <br /> pure javascript: (slice + concat)
   <span id="purejs"></span><br />
  
   immer/redux-toolkit: (proxies + for loop 1k)
   <span id="immer"></span><br />
  
   
  </div>
`;

export let s: {
  id: number;
  name: string;
  age: number;
  address: { street: string; city: string };
}[] = [];
for (let i = 0; i < 10000; i++) {
  s.push({
    id: i,
    name: 'John',
    age: 30,
    address: { street: '123 Main St', city: 'Anytown' },
  });
}

console.time('i1');
const i1 = [...s];
console.timeEnd('i1');
export const o = JSON.parse(JSON.stringify(s));
export const p = JSON.parse(JSON.stringify(s));
export const q = JSON.parse(JSON.stringify(s));
export const r = JSON.parse(JSON.stringify(s));
export const t = JSON.parse(JSON.stringify(s));
export const z = JSON.parse(JSON.stringify(s));

console.log('time taken to update first 1k objects out of 10k objects');
console.time('structured clone');
structuredClone(s);
console.timeEnd('structured clone');

console.time(' deep clone');
deepClone(s);
console.timeEnd(' deep clone');
console.time('shallow deep clone');
shallowClone(s);
console.timeEnd('shallow deep clone');

// withImmutable();

withJs();
withImmer();

withGetSet();
withGetSetUsingSet();
function isArr(x) {
  return Array.isArray(x);
}
// function isObject(x) {
//   return typeof x === 'object';
// }

function shallowClone(obj) {
  let clone = Array.isArray(obj) ? [] : {};
  for (let key in obj) {
    let r = obj[key];
    let isArray = isArr(r);
    if (!isArray && isObject(r)) {
      clone[key] = shallowClone(r);
    }
    if (isArray) {
      clone[key] = [];
      for (let i = 0; i < r.length; i++) {
        clone[key][i] = shallowClone(r[i]);
      }
    } else {
      clone[key] = r;
    }
  }
  return clone;
}

function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

function deepClone(obj) {
  if (!isObject(obj)) {
    return obj;
  }

  let clone = Array.isArray(obj) ? [] : {};

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}
