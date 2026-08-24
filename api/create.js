const db = require('./_lib/db');
const allowed = new Set(['هوش مصنوعی','تکنولوژی','علم','کسب‌وکار']);
module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'روش درخواست پشتیبانی نمی‌شود'});
  if(!process.env.API_SECRET || req.headers['x-api-secret']!==process.env.API_SECRET) return res.status(401).json({error:'دسترسی غیرمجاز'});
  try{
    const body=typeof req.body==='object'?req.body:JSON.parse(req.body||'{}');
    const title=String(body.title||'').trim(), content=String(body.content||'').trim(), url=String(body.url||'').trim(), category=String(body.category||'').trim();
    if(!title||!content||!url||!allowed.has(category)) return res.status(400).json({error:'فیلدهای ضروری ناقص یا نامعتبر هستند'});
    if(title.length>300||content.length>100000||url.length>2048) return res.status(400).json({error:'اندازه داده بیش از حد مجاز است'});
    const payload={title,content,url,category,excerpt:String(body.excerpt||'').trim()||content.replace(/\s+/g,' ').slice(0,160),image_url:String(body.image_url||'').trim()||null,source:String(body.source||'').trim()||null};
    const {data,error}=await db.from('articles').insert(payload).select('id').single();
    if(error) throw error; return res.status(201).json({id:data.id});
  }catch(e){console.error(e); if(e.code==='23505') return res.status(409).json({error:'این خبر قبلاً ثبت شده است'}); return res.status(500).json({error:'خطا در ثبت خبر'});}
};
