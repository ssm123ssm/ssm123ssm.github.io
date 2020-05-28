console.log('TS');
setTimeout(function () {
    try {
        $("#ad-cut").click()
    } catch (err) {
        setTimeout(function () {
            $("form").submit()
        }, 2000);

    }
}, 1000);
