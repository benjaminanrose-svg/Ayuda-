const E=require('./engine.js'),C=require('./cases.js');
const extra=['','   ','?','!!!','😭','💀💀','jaja','a','.','123','sí','no','ok','ya','mmm','ah','que','???','me','yo','tu','hola hola hola','asdkjh','no no no','porfa','x','k','todo mal','ayudaaaa','AYUDAME POR FAVOR','no puedo mas','alo?','hay alguien ahi?','sigues ahi?','te fuiste?','hola?? responde'];
const pool=C.map(c=>c[0]).concat(extra);let bad=0,n=0;
for(let r=0;r<400;r++){const b=E.create();for(let i=0;i<12;i++){const m=pool[Math.floor(Math.random()*pool.length)];let res;try{res=b.reply(m)}catch(e){if(bad<3)console.log('CRASH',m,e.message);bad++;break}n++;if(!res.replies.length){bad++;if(bad<15)console.log('VACÍO tras',JSON.stringify(m),res.primary)}}}
console.log('turnos',n,'problemas',bad);
