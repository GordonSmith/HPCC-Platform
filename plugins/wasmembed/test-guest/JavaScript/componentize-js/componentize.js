import { componentize } from '@bytecodealliance/componentize-js';
import { readFile, writeFile } from 'node:fs/promises';
import { metadataShow } from '@bytecodealliance/jco';

const jsSource = await readFile('hello.js', 'utf8');
const witPath = '../../../../guest/test.wit';
const witSource = await readFile(witPath, 'utf8');

const { component } = await componentize(jsSource, witSource);

metadataShow(component).slice(1, -1).forEach(({ range: [start, end] }, i) => {
    writeFile(`hello.core${i === 0 ? "" : i}.wasm`, component.slice(start, end));
});
await writeFile('hello.component.wasm', component);
