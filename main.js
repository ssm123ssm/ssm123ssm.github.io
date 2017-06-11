$(document).ready(function(){
    $(".navli").click(function(){
        $(".navli").removeClass("active");
        $(this).addClass("active");
    }); 
    $(".cert").click(function(){
        window.open("https://www.freecodecamp.com/ssm123ssm/front-end-certification", "_blank");
    });
});