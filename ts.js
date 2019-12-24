console.log('TS');
setTimout(function(){
	try{
    	confAdd(0,2);
    } catch(err){
    	$('#submit3').click();
    }
},1000);
