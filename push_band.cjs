
const { execSync } = require('child_process');
const fs = require('fs');

console.log('1. Tarring dist...');
if (fs.existsSync('dist.tar.gz')) fs.unlinkSync('dist.tar.gz');
execSync('tar -czf dist.tar.gz -C dist .', { stdio: 'inherit' });

console.log('2. Uploading dist.tar.gz to VPS...');
const PSCP = '"C:\\Program Files\\PuTTY\\pscp.exe"';
execSync(PSCP + ' -batch -pw mu@ITPC@2026 dist.tar.gz muslim@10.56.3.3:/home/muslim/intkarbala/dist.tar.gz', { stdio: 'inherit' });

console.log('3. Extracting on VPS...');
const PLINK = '"C:\\Program Files\\PuTTY\\plink.exe"';
execSync(PLINK + ' -batch -pw mu@ITPC@2026 muslim@10.56.3.3 'cd /home/muslim/intkarbala && rm -rf dist/* && tar -xzf dist.tar.gz -C dist && rm dist.tar.gz'', { stdio: 'inherit' });

console.log('Done!');

