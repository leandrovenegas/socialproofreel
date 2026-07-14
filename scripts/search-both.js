const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        results = results.concat(searchDir(filePath));
      }
    } else {
      if (file.endsWith('.py') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const hasRawLeads = content.includes('raw_leads');
        const hasLeads = content.includes('leads') && !content.includes('raw_leads_'); // simple check
        if (hasRawLeads && hasLeads) {
          results.push(filePath);
        }
      }
    }
  });
  
  return results;
}

const projectsDir = '\\\\192.168.1.18\\Vicente\\proyects';
console.log('Searching for files referencing both raw_leads and leads...');
const results = searchDir(path.join(projectsDir, 'socialproofreel'))
  .concat(searchDir(path.join(projectsDir, 'SocialProofREEL-Worker')));
console.log('Results:', results);
