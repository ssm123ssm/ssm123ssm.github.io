console.log('TS');
setTimout(function(){
	try{
    	$("#ad-cut").click()
    } catch(err){
    	$("form").submit()
    }
},1000);
