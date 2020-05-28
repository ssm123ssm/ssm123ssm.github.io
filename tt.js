console.log('TS');
setTimeout(function(){
	try{
    	$("#ad-cut").click()
    } catch(err){
    	$("form").submit()
    }
},500);
