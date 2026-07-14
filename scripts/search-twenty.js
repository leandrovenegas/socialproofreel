const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        results = results.concat(searchDir(filePath, pattern));
      }
    } else {
      if (file.endsWith('.py') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (pattern.test(content)) {
          results.push(filePath);
        }
      }
    }
  });
  
  return results;
}

const projectsDir = '\\\\192.168.1.18\\Vicente\\proyects';
const pattern = /(phone|telef|dup|match|cotej|coincid)/i;

console.log('Searching for matches in SocialProofREEL-Worker...');
const workerResults = searchDir(path.join(projectsDir, 'SocialProofREEL-Worker'), pattern);
console.log('Worker results:', workerResults);

console.log('\nSearching for matches in socialproofreel...');
const crmResults = searchDir(path.join(projectsDir, 'socialproofreel'), pattern);
console.log('CRM results:', crmResults);
