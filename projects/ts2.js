console.log('TS');
setTimeout(function(){
	try{
    	confAdd(0,2);
    } catch(err){
    	$('#submit3').click();
    }
},3000);
