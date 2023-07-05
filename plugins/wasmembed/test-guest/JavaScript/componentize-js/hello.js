import { print } from 'global';

export function echo(name) {
  return `Hello ${name}`;
}

export function add(a, b) {
  print(`add: ${a + b}`)
  console.log("Console Test!")
  return a + b;
}

export function sub(a, b) {
  print(`sub: ${a - b}`)
  return a - b;
}
