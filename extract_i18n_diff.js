const fs = require('fs');
const path = require('path');

function findFiles(dir, match) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findFiles(fullPath, match));
        } else if (match.test(fullPath)) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = findFiles(path.join(__dirname, 'front/src'), /\.(jsx|js)$/);
const keys = {};

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys[match[1]] = match[2];
    }
});

function unflatten(data) {
    var result = {};
    for (var i in data) {
        var keyParts = i.split('.');
        keyParts.reduce(function (r, e, j) {
            return r[e] || (r[e] = isNaN(Number(keyParts[j + 1])) ? (keyParts.length - 1 == j ? data[i] : {}) : []);
        }, result);
    }
    return result;
}

const nestedKeys = unflatten(keys);

function getMissingKeys(blueprint, target) {
    const missing = {};
    for (const key in blueprint) {
        if (typeof blueprint[key] === 'object' && blueprint[key] !== null && !Array.isArray(blueprint[key])) {
            const result = getMissingKeys(blueprint[key], target[key] || {});
            if (Object.keys(result).length > 0) {
                missing[key] = result;
            }
        } else {
            if (target[key] === undefined) {
                missing[key] = blueprint[key];
            }
        }
    }
    return missing;
}

const ptPath = path.join(__dirname, 'front/src/locales/pt/translation.json');
const enPath = path.join(__dirname, 'front/src/locales/en/translation.json');
const esPath = path.join(__dirname, 'front/src/locales/es/translation.json');

const ptExisting = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
const enExisting = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const esExisting = JSON.parse(fs.readFileSync(esPath, 'utf8'));

const ptMissing = getMissingKeys(nestedKeys, ptExisting);
const enMissing = getMissingKeys(nestedKeys, enExisting);
const esMissing = getMissingKeys(nestedKeys, esExisting);

fs.writeFileSync('missing_pt.json', JSON.stringify(ptMissing, null, 2));
fs.writeFileSync('missing_en.json', JSON.stringify(enMissing, null, 2));
fs.writeFileSync('missing_es.json', JSON.stringify(esMissing, null, 2));

console.log("Written missing to missing_*.json");
