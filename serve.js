// Minimal static server so the page runs over http:// (Tesseract.js OCR needs a real origin).
// Usage: node serve.js   →   open http://localhost:8765/ChromeSchedule.html
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=__dirname, PORT=8765;
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml',
  '.json':'application/json','.wasm':'application/wasm','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/ChromeSchedule.html';
  const fp=path.join(ROOT,path.normalize(p));
  if(!fp.startsWith(ROOT)){res.writeHead(403);return res.end('forbidden');}
  fs.readFile(fp,(err,buf)=>{
    if(err){res.writeHead(404);return res.end('not found');}
    res.writeHead(200,{'Content-Type':TYPES[path.extname(fp).toLowerCase()]||'application/octet-stream'});
    res.end(buf);
  });
}).listen(PORT,()=>console.log(`ChromeSchedule serving at http://localhost:${PORT}/ChromeSchedule.html`));
