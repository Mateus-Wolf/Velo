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
    // Match t('key.path', 'fallback') or t("key.path", "fallback")
    const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys[match[1]] = match[2];
    }
});

console.log(JSON.stringify(keys, null, 2));
