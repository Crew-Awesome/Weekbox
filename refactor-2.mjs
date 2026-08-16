import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, 'extensions', 'backend');

// 1. Module settings
const rootPkgPath = path.join(backendDir, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
rootPkg.type = 'module';
if (rootPkg.main === 'main.js') {
    rootPkg.main = 'node/main.js';
}
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));

const nodeDir = path.join(backendDir, 'node');
if (!fs.existsSync(nodeDir)) fs.mkdirSync(nodeDir, { recursive: true });
fs.writeFileSync(path.join(nodeDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getAllFiles(filePath, fileList);
      }
    } else {
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.json')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const files = getAllFiles(backendDir);
const moves = new Map();

// Map new locations
for (const oldPath of files) {
  let relativePath = path.relative(backendDir, oldPath).replace(/\\/g, '/');
  let newRelative = relativePath;

  // We are processing JS/MJS and JSON
  if (newRelative.startsWith('src/backend/')) {
    newRelative = newRelative.replace('src/backend/', '');
  }
  
  if (newRelative.startsWith('services/gamebanana/')) {
    newRelative = newRelative.replace('services/gamebanana/', 'providers/gamebanana/');
  }

  // Skip package-lock.json and package.json if it's the root or node one
  if (oldPath === rootPkgPath || oldPath === path.join(nodeDir, 'package.json')) continue;
  
  // We can drop src/package.json since root handles it now
  if (relativePath === 'src/package.json') {
     // delete it later
     continue;
  }

  if (relativePath !== newRelative) {
    moves.set(oldPath, path.join(backendDir, newRelative));
  }
}

function resolveImport(currentFileDir, importPath) {
  if (!importPath.startsWith('.')) return null; 
  return path.resolve(currentFileDir, importPath);
}

const fileContents = new Map();
for (const file of files) {
  if (file === rootPkgPath || file === path.join(nodeDir, 'package.json') || file.endsWith('src\\package.json') || file.endsWith('src/package.json')) continue;
  
  // Do not parse json files for imports, just move them
  if (file.endsWith('.json')) {
      fileContents.set(file, fs.readFileSync(file, 'utf-8'));
      continue;
  }
  fileContents.set(file, fs.readFileSync(file, 'utf-8'));
}

// Update imports
for (const [file, content] of fileContents.entries()) {
  if (file.endsWith('.json')) continue;

  const currentPath = moves.has(file) ? moves.get(file) : file;
  const currentDir = path.dirname(currentPath);
  const oldDir = path.dirname(file);

  const importRegex = /(import\s+.*?from\s+['"])(.*?)(['"])/g;
  const dynamicImportRegex = /(import\(['"])(.*?)(['"]\))/g;
  const requireRegex = /(require\(['"])(.*?)(['"]\))/g;
  const exportRegex = /(export\s+.*?from\s+['"])(.*?)(['"])/g;

  function replacer(match, p1, p2, p3) {
    if (!p2.startsWith('.')) return match;
    const absoluteOldTarget = resolveImport(oldDir, p2);
    let targetNewAbsolute = moves.get(absoluteOldTarget) || absoluteOldTarget;
    
    let newRelative = path.relative(currentDir, targetNewAbsolute).replace(/\\/g, '/');
    if (!newRelative.startsWith('.')) {
      newRelative = './' + newRelative;
    }
    return p1 + newRelative + p3;
  }

  let newContent = content;
  newContent = newContent.replace(importRegex, replacer);
  newContent = newContent.replace(dynamicImportRegex, replacer);
  newContent = newContent.replace(requireRegex, replacer);
  newContent = newContent.replace(exportRegex, replacer);

  fileContents.set(file, newContent);
}

// Write the files to new locations
for (const [file, content] of fileContents.entries()) {
  const targetPath = moves.has(file) ? moves.get(file) : file;
  if (moves.has(file)) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf-8');
    fs.unlinkSync(file);
  } else {
    fs.writeFileSync(file, content, 'utf-8');
  }
}

// Drop src/package.json
const srcPkg = path.join(backendDir, 'src', 'package.json');
if (fs.existsSync(srcPkg)) fs.unlinkSync(srcPkg);

// Clean up empty directories
function cleanEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  const dirFiles = fs.readdirSync(dir);
  for (const f of dirFiles) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      cleanEmptyDirs(p);
    }
  }
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}
cleanEmptyDirs(backendDir);

console.log('Refactor 2 complete.');
