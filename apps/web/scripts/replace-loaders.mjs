import fs from 'fs';
import path from 'path';

function findFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', '.turbo'].includes(file)) {
        findFiles(filePath, files);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      files.push(filePath);
    }
  }
  return files;
}

const files = findFiles(path.resolve('./app'));
files.push(...findFiles(path.resolve('./components')));

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Loader2')) {
    // Replace <Loader2 className="..." /> with <LottieLoader className="..." />
    // 1. Import LottieLoader if not present. The import must go AFTER any
    //    "use client"/"use server" directive — a directive is only honored when
    //    it is the very first statement, so prepending the import above it would
    //    silently turn the file into a Server Component and break client hooks.
    if (!content.includes('LottieLoader')) {
      const importLine = 'import { LottieLoader } from "@/components/ui/lottie-loader"\n';
      const directive = content.match(/^\s*(["'])use (client|server)\1;?[ \t]*\r?\n/);
      if (directive) {
        const at = directive[0].length;
        content = content.slice(0, at) + importLine + content.slice(at);
      } else {
        content = importLine + content;
      }
    }
    
    // 2. Remove Loader2 from lucide-react import if present
    content = content.replace(/,\s*Loader2/, '');
    content = content.replace(/Loader2,\s*/, '');
    content = content.replace(/import\s*{\s*Loader2\s*}\s*from\s*['"]lucide-react['"]\s*;?\n?/, '');
    
    // 3. Replace JSX tags
    content = content.replace(/<Loader2([^>]*)>/g, '<LottieLoader$1>');
    
    // Remove animate-spin because lottie handles its own animation
    content = content.replace(/animate-spin/g, '');
    
    // If we end up with empty lucide-react imports due to removing Loader2
    content = content.replace(/import\s*{\s*}\s*from\s*['"]lucide-react['"]\s*;?\n?/, '');

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
    count++;
  }
}
console.log(`Finished updating ${count} files.`);
