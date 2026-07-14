const attributePattern=/(src|href)\s*=\s*(["'])([^"']+)\2/gi;

function withoutRawTextBodies(html:string){
  return html.replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi,(_all,tag,attrs)=>`<${tag}${attrs}></${tag}>`);
}

export function extractStaticAssetRefs(html:string){
  const markup=withoutRawTextBodies(html);return [...markup.matchAll(attributePattern)].map(match=>match[3]);
}

export function rewriteStaticAssetRefs(html:string,rewrite:(ref:string)=>string|null){
  const blocks:string[]=[];
  const masked=html.replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi,(block)=>{
    const openEnd=block.indexOf(">");const opening=block.slice(0,openEnd+1).replace(attributePattern,(all,attr,quote,ref)=>{const next=rewrite(ref);return next?`${attr}=${quote}${next}${quote}`:all});
    blocks.push(opening+block.slice(openEnd+1));return `__MOYU_RAW_BLOCK_${blocks.length-1}__`;
  });
  const rewritten=masked.replace(attributePattern,(all,attr,quote,ref)=>{const next=rewrite(ref);return next?`${attr}=${quote}${next}${quote}`:all});
  return rewritten.replace(/__MOYU_RAW_BLOCK_(\d+)__/g,(_all,index)=>blocks[Number(index)]);
}
