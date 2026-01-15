import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./materials.json', 'utf8'));

let count;

if (Array.isArray(data)) {
  count = data.length;
} else {
  count = Object.keys(data).length;
}

console.log(`Total materials: ${count}`);
