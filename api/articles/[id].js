const db = require('../_lib/db');
module.exports = async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'روش درخواست پشتیبانی نمی‌شود'});
  try{
    const id=Number.parseInt(req.query.id,10); if(!Number.isInteger(id)) return res.status(400).json({error:'شناسه نامعتبر است'});
    const {data,error}=await db.from('articles').select('id,title,excerpt,content,url,image_url,source,category,created_at').eq('id',id).maybeSingle();
    if(error) throw error; if(!data) return res.status(404).json({error:'خبر پیدا نشد'});
    data.excerpt=data.excerpt||data.content.replace(/\s+/g,' ').slice(0,160);
    return res.status(200).json(data);
  }catch(e){console.error(e);return res.status(500).json({error:'خطا در دریافت خبر'});}
};
