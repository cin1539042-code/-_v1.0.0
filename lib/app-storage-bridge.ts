const CHANNEL = "moyu-storage-v1";

// The iframe may execute before React installs the parent listener. Repeat the
// same idempotent request briefly so the first load never waits for a timeout.
export const appStorageBridge = `<script>(function(){if(window.MoyuStorage)return;var seq=0,pending=new Map();function call(action,key,value){return new Promise(function(resolve,reject){var id=++seq,msg={channel:'${CHANNEL}',id:id,action:action,key:key,value:value};function send(){parent.postMessage(msg,'*')}var retry=setInterval(send,100);var timeout=setTimeout(function(){var p=pending.get(id);if(!p)return;pending.delete(id);clearInterval(retry);reject(new Error('存档请求超时'))},5000);pending.set(id,{resolve:resolve,reject:reject,retry:retry,timeout:timeout});send()})}window.addEventListener('message',function(e){var m=e.data;if(!m||m.channel!=='${CHANNEL}'||!m.response)return;var p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearInterval(p.retry);clearTimeout(p.timeout);m.ok?p.resolve(m.value):p.reject(new Error(m.error||'存档失败'))});window.MoyuStorage={set:function(k,v){return call('set',k,v)},get:function(k){return call('get',k)},remove:function(k){return call('remove',k)},clear:function(){return call('clear')},keys:function(){return call('keys')}};window.dispatchEvent(new Event('moyu-storage-ready'))})();<\/script>`;

export function injectAppStorageBridge(html:string){
  if(html.includes(CHANNEL))return html;
  const head=/<\/head\s*>/i;
  return head.test(html)?html.replace(head,appStorageBridge+"</head>"):appStorageBridge+html;
}
