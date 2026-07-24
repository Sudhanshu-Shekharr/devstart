const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-\\[#090909\\]': 'bg-surface',
  'bg-\\[#121212\\]': 'bg-surface-hover',
  'border-\\[#1c1c1c\\]': 'border-border',
  'border-\\[#333\\]': 'border-border-strong',
  'bg-\\[#1c1c1c\\]': 'bg-border',
  'bg-\\[#1f1f1f57\\]': 'bg-surface/50',
  'bg-black': 'bg-background',
  'text-white/60': 'text-muted',
  'text-white/40': 'text-muted/70',
  'text-white/50': 'text-muted/80',
  'text-white/20': 'text-muted/40',
  'text-white/70': 'text-foreground/70',
  'text-white/90': 'text-foreground/90',
  'text-gray-300': 'text-muted',
  'bg-neutral-800': 'bg-border-strong',
  'border-neutral-800': 'border-border-strong',
  'from-neutral-800': 'from-border-strong',
  'to-neutral-800': 'to-border-strong',
  'via-neutral-400': 'via-muted',
  'via-neutral-300': 'via-muted',
  'text-white': 'text-foreground',
  'bg-white': 'bg-foreground', // wait, sometimes bg-white is used for buttons (foreground). 
  'border-white': 'border-foreground',
  'hover:text-white': 'hover:text-foreground',
  'hover:border-white': 'hover:border-foreground',
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
    const regex = new RegExp(key, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, value);
      changed = true;
    }
  }
  
  // Custom manual fix for button bg-white/10
  content = content.replace(/bg-foreground\/(\d+)/g, 'bg-foreground/$1');
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
