// Adds the iPhone "Add to Home Screen" settings to the built web app.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/index.html';
let html = readFileSync(file, 'utf8');
if (!html.includes('apple-touch-icon')) {
  html = html.replace(
    /<meta name="viewport"[^>]*>/,
    [
      '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />',
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
      '<meta name="mobile-web-app-capable" content="yes" />',
      '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
      '<meta name="apple-mobile-web-app-title" content="SimplyBudgetPro" />',
      '<link rel="apple-touch-icon" href="/icon-180.png" />',
      '<link rel="manifest" href="/manifest.json" />',
    ].join('\n    '),
  );
  html = html.replace(
    '<style id="expo-reset">',
    '<style id="expo-reset">\n      body { background:#F4F5FA; -webkit-tap-highlight-color: transparent; overscroll-behavior: none; }',
  );
  // A visible "Loading" message (replaced as soon as the app starts) and, if the
  // app ever fails to start, the error printed on screen instead of a blank page.
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><div style="margin:auto;font:600 16px -apple-system,system-ui,sans-serif;color:#6B6F86">Loading SimplyBudgetPro…</div></div>`,
  );
  const guard = `<script>(function(){function show(m){try{var d=document.getElementById('pp-err');if(!d){d=document.createElement('div');d.id='pp-err';d.style.cssText='position:fixed;left:12px;right:12px;top:40px;z-index:99999;background:#fff;border:2px solid #E5484D;border-radius:14px;padding:14px;font:13px/1.4 -apple-system,system-ui,sans-serif;color:#14152B;white-space:pre-wrap;word-break:break-word';(document.body||document.documentElement).appendChild(d);}d.textContent='SimplyBudgetPro couldn\\u2019t start. Please screenshot this:\\n\\n'+m+'\\n\\n'+navigator.userAgent;}catch(e){}}window.addEventListener('error',function(e){show((e.message||'Error')+(e.filename?'\\n'+e.filename+':'+e.lineno:''));});window.addEventListener('unhandledrejection',function(e){show('Promise: '+(e.reason&&(e.reason.stack||e.reason.message)||e.reason));});})();</script>`;
  html = html.replace('</head>', guard + '\n</head>');
  writeFileSync(file, html);
}
if (!html.includes('apple-touch-icon')) throw new Error('postbuild: viewport tag not found');
console.log('postbuild-web: added home-screen settings');
