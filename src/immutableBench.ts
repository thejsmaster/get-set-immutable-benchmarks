import { List } from 'immutable';
import { q } from './main';
export const withImmutable = () => {
  let d = Date.now();
  const data = List(q);
  data.withMutations((list) => {
    for (let i = 0; i < 10000; i++) {
      list.set(i, {
        id: i,
        name: 'John updated with immer' + i,
        age: 30,
        address: { street: '123 Main St', city: 'Anytown' },
      });
    }
  });

  document.getElementById('immutablejs').innerHTML = Date.now() - d + ' ms';
};
