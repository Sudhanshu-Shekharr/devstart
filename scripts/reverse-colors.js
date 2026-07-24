const fs = require('fs');
const path = require('path');

// Order matters here to prevent substring matches (e.g. bg-surface/50 before bg-surface)
const replacements = {
  'bg-surface-hover': 'bg-[#121212]',
  'bg-surface/50': 'bg-[#1f1f1f57]',
  'bg-surface': 'bg-[#090909]',
  'border-border-strong': 'border-[#333]',
  'border-border': 'border-[#1c1c1c]',
  'bg-background': 'bg-black',
  'bg-border': 'bg-[#1c1c1c]',
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  for (const [key, value] of Object.entries(replacements)) {
    // Escape string for regex if it contains slashes
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // We use a regex that matches the exact token (e.g., using negative lookaheads/lookbehinds if possible, or word boundaries)
    // However, tailwind classes are space-separated, quotes, or backticks separated.
    // Given the ordered replacement, replacing the literal string globally works fine if we order from most specific to least specific.
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'g');
    
    // Wait, \b doesn't work well with slashes like bg-surface/50, because / is not a word character.
    // We can use a simpler approach: splitting by common delimiters, or just a negative lookahead for hyphen/slash.
    const robustRegex = new RegExp(escapedKey + '(?![\\w\\/-])', 'g');
    
    if (robustRegex.test(content)) {
      content = content.replace(robustRegex, value);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
