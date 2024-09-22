import { create } from './getset';
import { t } from './main';

export const withGetSetUsingSet = () => {
  let ms = 0;

  const myState = create(t);
  console.time('1');
  for (let i = 0; i < 10; i++) {
    let d = Date.now();
    myState
      .set([
        ...myState
          .get()
          .slice(0, 1000)
          .map((item, i) => ({
            id: i,
            name: 'John updated' + i,
            age: 30,
            address: { street: '123 Main St', city: 'Anytown' },
          })),
        ,
      ])
      .concat(myState.get().slice(10000));

    ms += Date.now() - d;
    console.log('ms', ms);
  }
  console.timeEnd('1');

  myState.get()[0].name === 'John updated0' &&
    (document.getElementById('get-set-immutable-set').innerHTML = ms + ' ms');
};
