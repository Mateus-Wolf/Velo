const fs = require('fs');
const path = require('path');

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key] || {}, source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

const localesDir = path.join(__dirname, 'front/src/locales');
const langs = ['pt', 'en', 'es'];

langs.forEach(lang => {
    const targetPath = path.join(localesDir, lang, 'translation.json');
    const sourcePath = path.join(__dirname, `missing_${lang}.json`);

    if (fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
        const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

        const merged = deepMerge(target, source);
        fs.writeFileSync(targetPath, JSON.stringify(merged, null, 4));
        console.log(`Merged ${lang}`);
    }
});
