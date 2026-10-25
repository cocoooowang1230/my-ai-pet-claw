const {db,send,userFor,publicState,errorResponse}=require('../lib/petclaw');
module.exports=async(req,res)=>{let c;try{if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});c=await db();const u=await userFor(req,c);return send(res,200,await publicState(c,u));}catch(e){if(c)await c.end().catch(()=>{});errorResponse(res,e);}};
