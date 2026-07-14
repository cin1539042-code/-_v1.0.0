const CHANNEL = "moyu-storage-v1";

export const appStorageBridge = `<script>(function(){if(window.MoyuStorage)return;var seq=0,pending=new Map();function call(action,key,value){return new Promise(function(resolve,reject){var id=++seq;pending.set(id,{resolve:resolve,reject:reject});parent.postMessage({channel:'${CHANNEL}',id:id,action:action,key:key,value:value},'*');setTimeout(function(){if(pending.has(id)){pending.delete(id);reject(new Error('存档请求超时'))}},5000)})}window.addEventListener('message',function(e){var m=e.data;if(!m||m.channel!=='${CHANNEL}'||!m.response)return;var p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.ok?p.resolve(m.value):p.reject(new Error(m.error||'存档失败'))});window.MoyuStorage={set:function(k,v){return call('set',k,v)},get:function(k){return call('get',k)},remove:function(k){return call('remove',k)},clear:function(){return call('clear')},keys:function(){return call('keys')}};window.dispatchEvent(new Event('moyu-storage-ready'))})();<\/script>`;

export function injectAppStorageBridge(html:string){
  if(html.includes(CHANNEL))return html;
  const head=/<\/head\s*>/i;
  return head.test(html)?html.replace(head,appStorageBridge+"</head>"):appStorageBridge+html;
}
