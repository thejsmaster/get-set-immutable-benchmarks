import { produce } from 'immer';
import { r } from './main';

export const withImmer = () => {
  let ms = 0;
  for (let i = 0; i < 10; i++) {
    let d = Date.now();
    produce(r, (p) => {
      for (let i = 0; i < 1000; i++) {
        p[i] = {
          id: i,
          name: 'John updated with immer' + i,
          age: 30,
          address: { street: '123 Main St', city: 'Anytown' },
        };
      }
    });
    ms += Date.now() - d;
  }

  document.getElementById('immer').innerHTML = ms + ' ms';
};
