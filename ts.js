console.log('TS');
setTimeout(function () {
    try {
        $("#ad-cut").click()
    } catch (err) {
        setTimeout(function () {
            $(".__btn-next").click()
            //$("form").submit()
        }, 2000);

    }
}, 1000);
