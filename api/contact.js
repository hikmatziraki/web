const db = require('./_lib/db');
module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'روش درخواست پشتیبانی نمی‌شود'});
  try{
    const body=typeof req.body==='object'?req.body:JSON.parse(req.body||'{}');
    const name=String(body.name||'').trim(), message=String(body.message||'').trim();
    if(name.length<2||name.length>120||message.length<5||message.length>5000) return res.status(400).json({error:'اطلاعات فرم نامعتبر است'});
    const {error}=await db.from('contact_messages').insert({name,message}); if(error) throw error;
    return res.status(201).json({ok:true});
  }catch(e){console.error(e);return res.status(500).json({error:'ارسال پیام ناموفق بود'});}
};
