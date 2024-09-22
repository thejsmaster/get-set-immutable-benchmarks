import { p } from './main';

export const withJs = () => {
  let ms = 0;
  for (let i = 0; i < 10; i++) {
    let d = Date.now();
    // for (let i = 0; i < 10; i++) {
    const modified = [
      ...p.slice(0, 1000).map((v, i) => ({
        id: i,
        name: 'John updated with js' + i,
        age: 30,
        address: { street: '123 Main St', city: 'Anytown' },
      })),
    ].concat([...p.slice(1000)]);
    ms += Date.now() - d;
  }

  document.getElementById('purejs').innerHTML = ms + ' ms';
  // };
};
