const db = require('./_lib/db');
function number(v, fallback, max){ const n=Number.parseInt(v,10); return Number.isFinite(n)?Math.min(Math.max(n,0),max):fallback; }
module.exports = async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'روش درخواست پشتیبانی نمی‌شود'});
  try{
    const limit=number(req.query.limit,12,50), offset=number(req.query.offset,0,10000), category=typeof req.query.category==='string'?req.query.category.trim():'';
    let q=db.from('articles').select('id,title,excerpt,content,url,image_url,source,category,created_at').order('created_at',{ascending:false}).range(offset,offset+limit-1);
    if(category) q=q.eq('category',category);
    const {data,error}=await q; if(error) throw error;
    const items=(data||[]).map(a=>({...a,excerpt:a.excerpt||a.content.replace(/\s+/g,' ').slice(0,160)}));
    return res.status(200).json({items,limit,offset});
  }catch(e){ console.error(e); return res.status(500).json({error:'خطا در دریافت اخبار'}); }
};
