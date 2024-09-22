import { i } from 'get-set-immutable';
import { s } from './main';

export const withGetSet = () => {
  let ms = 0;

  const myState = i(s);
  for (let i = 0; i < 10; i++) {
    let d = Date.now();
    myState.update((state) => {
      for (let i = 0; i < 1000; i++) {
        state[i] = {
          id: i,
          name: 'John updated' + i,
          age: 30,
          address: { street: '123 Main St', city: 'Anytown' },
        };
      }
    });
    ms += Date.now() - d;
  }

  document.getElementById('get-set-immutable').innerHTML = ms + ' ms';
};
