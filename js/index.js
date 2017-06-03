$(document).ready(function() {
  $.ajaxSetup({ cache: false });

  //API key for openweathermap.org
  var key = "00a2cf3207f821ed4af5ad91123e76bd";
  var uri = "api.openweathermap.org/data/2.5/weather?";
  var latt,
    lonn,
    wind_d_icon,
    temp_c,
    temp_f,
    temp_min,
    temp_min_f,
    temp_max,
    temp_max_f,
    int_1,
    int_2,
    int_3,
    int_4,
    int_5;

  //Click events for refresha and unit buttons
  $("#refresh").on("click", function() {
    load();
    clearTimings();
  });
  $("#unit-icon").on("click", toggle);

  //main function
  load();

  function load() {
    
    //loading animation and text
    setLoading();

    //getting location with ip-api
    $.getJSON("http://ip-api.com/json", function(json) {
      latt = json.lat;
      lonn = json.lon;
      //Building json call for weather with cordinates obtained from ip-api
      var call =
        "http://" +
        uri +
        "lat=" +
        json.lat +
        "&lon=" +
        json.lon +
        "&appid=" +
        key;
      console.log(call);
      
      //getting weather info with openweathermap.org
      $.getJSON(call, function(data) {
        
        //stoping loading animation
        $("#refresh").removeClass("fa-spin");

        //Saving parameters to variables
        var id = data.weather[0].id;
        var country = data.sys.country;
        var city = data.name;
        var description = data.weather[0].description;
        var icon =
          "http://openweathermap.org/img/w/" + data.weather[0].icon + ".png";
        temp_c = Math.floor(data.main.temp - 273);
        var temp_c_class = getTempClass(temp_c);
        temp_f = Math.floor(temp_c * 9 / 5 + 32);
        temp_min = Math.floor(data.main.temp_min - 273);
        temp_min_f = Math.floor(temp_min * 9 / 5 + 32);
        temp_max = Math.floor(data.main.temp_max - 273);
        temp_max_f = Math.floor(temp_max * 9 / 5 + 32);
        var humidity = data.main.humidity;
        var wind_s = data.wind.speed; //in ms-1
        var wind_d = data.wind.deg; //in degrees(meteorological)
        wind_d_icon = "towards-" + Math.floor(wind_d) + "-deg";
        var clouds = data.clouds.all; //cloudness in percentage
        var cloud_class = getCloudClass(clouds);
        var back_id = getBack(id);
        var icon2 = getIcon2(data.weather[0].icon);

        //info text;
        var loc_info_text =
          "Lat: " +
          Number(Math.round(latt + "e2") + "e-2") +
          "<br>Lon: " +
          Number(Math.round(lonn + "e2") + "e-2");
        var cloud_info_text = clouds + " % <br>cloudness";
        var temp_info_text =
          "min: " + temp_min + "&#176 C<br>max: " + temp_max + "&#176 C";
        var humid_info_text = "It is " + humidity + "<br>percent humid!";
        var wind_info_text = "Wind direction<br> " + wind_d + " degrees";
        
        
        //Updating html content
        $("#main-1").attr("src", icon);
        $("#des").html(description);
        $("#main-temp").addClass(temp_c_class);
        $("#temp").html(temp_c + "&#176; C");
        $("#loc").html(city + ", " + "<br>" + country);
        $("#icon2").addClass(icon2);
        $("#humid").html(humidity + " %");
        $("#wind").html(wind_s + " m/s");
        $(".wind-r").addClass(wind_d_icon);

        //info fields
        $("#loc-info").html(loc_info_text);
        $("#cloud-info").html(cloud_info_text);
        $("#temp-info").html(temp_info_text);
        $("#humid-info").html(humid_info_text);
        $("#wind-info").html(wind_info_text);

        //Click events
        $("#loc-d").on("click", showLocInfo);
        $("#loc-info-d").on("click", hideLocInfo);
        $("#des-d").on("click", showDesInfo);
        $("#cloud-info-d").on("click", hideDesInfo);
        $("#temp-d").on("click", showTempInfo);
        $("#temp-info-d").on("click", hideTempInfo);
        $(".main-back").attr("src", back_id);
        $(".main-icon").on("click", flip_next);
        $("#humid-d").on("click", showHumidInfo);
        $("#humid-info-d").on("click", hideHumidInfo);
        $("#wind-d").on("click", showWindInfo);
        $("#wind-info-d").on("click", hideWindInfo);
        $(".fn").on("click", flip_next);
        $(".fb").on("click", flip_back);

        //Timing
        change_loc();
        change_cloud();
        change_temp();
        change_humid();
        change_wind();
      });
    });
  }

  
  //Toggle between C and F units
  function toggle() {
    var cur = $("#unit-icon").attr("class");
    //console.log("current: ");
    if (cur.indexOf("cel") > 0) {
      $("#unit-icon").removeClass();
      $("#unit-icon").addClass("wi wi-fahrenheit");
      $("#temp").html(temp_f + "&#176; F");
      var temp_info_text =
        "min: " + temp_min_f + "&#176; F<br>max: " + temp_max_f + "&#176; F";
      $("#temp-info").html(temp_info_text);
    } else {
      $("#unit-icon").removeClass();
      $("#unit-icon").addClass("wi wi-celsius");
      $("#temp").html(temp_c + "&#176; C");
      var temp_info_text2 =
        "min: " + temp_min + "&#176; C<br>max: " + temp_max + "&#176; C";
      $("#temp-info").html(temp_info_text2);
    }
    //console.log("now: ");
  }

  
  //Timing for showing and hiding info
  function change_loc() {
    int_1 = setInterval(function() {
      showLocInfo();
      setTimeout(hideLocInfo, 4000);
    }, 8000);
  }
  function change_cloud() {
    int_2 = setInterval(function() {
      showDesInfo();
      setTimeout(hideDesInfo, 5000);
    }, 10000);
  }
  function change_temp() {
    int_3 = setInterval(function() {
      showTempInfo();
      setTimeout(hideTempInfo, 5500);
    }, 9500);
  }
  function change_humid() {
    int_4 = setInterval(function() {
      showHumidInfo();
      setTimeout(hideHumidInfo, 5000);
    }, 9000);
  }
  function change_wind() {
    int_5 = setInterval(function() {
      showWindInfo();
      setTimeout(hideWindInfo, 4500);
    }, 8000);
  }

  //Getting background image url
  function getBack(id) {
    // id = 900;
    if (id <= 232) {
      return "https://www.dropbox.com/s/sxfa6g55murow69/200.jpg?dl=1";
    } else if (id <= 399) {
      return "https://www.dropbox.com/s/xxe60etd9rnlj4k/300.jpg?dl=1";
    } else if (id <= 599) {
      return "https://www.dropbox.com/s/wyzvl7utrwnxbz7/500.jpg?dl=1";
    } else if (id <= 699) {
      return "https://www.dropbox.com/s/symwam2zl7io8wq/600.jpg?dl=1";
    } else if (id <= 771) {
      return "https://www.dropbox.com/s/825eup6e7d3st18/701.jpg?dl=1";
    } else if (id == 781) {
      return "https://www.dropbox.com/s/x28hgmd6ac0oybl/781.jpg?dl=1";
    } else if (id == 800) {
      return "https://www.dropbox.com/s/7udvv95k3h0ycnu/800.jpg?dl=1";
    } else if (id == 801) {
      return "https://www.dropbox.com/s/2d2dybcfsf8v95s/1000.jpg?dl=1";
    } else if (id <= 899) {
      return "https://www.dropbox.com/s/xh57ssfvwvnu3zy/801.jpg?dl=1";
    } else if (id <= 902) {
      return "https://www.dropbox.com/s/x28hgmd6ac0oybl/781.jpg?dl=1";
    } else if (id == 903) {
      return "https://www.dropbox.com/s/0oxl9beam5qzk9g/903.jpg?dl=1";
    } else if (id == 904) {
      return "https://www.dropbox.com/s/b0wccsbrrwazbix/904.jpg?dl=1";
    } else if (id == 905) {
      return "https://www.dropbox.com/s/fqa4tatcgh4s2rc/905.jpg?dl=1";
    } else if (id == 906) {
      return "https://www.dropbox.com/s/krne2f5rwgixwdp/906.JPG?dl=1";
    } else if (id == 951) {
      return "https://www.dropbox.com/s/7udvv95k3h0ycnu/800.jpg?dl=1";
    } else if (id <= 956) {
      return "https://www.dropbox.com/s/50r7ucl13fjxjac/952.jpg?dl=1";
    } else {
      return "https://www.dropbox.com/s/fqa4tatcgh4s2rc/905.jpg?dl=1";
    }
  }
  
  //getting temperature icon accoring to the current temperature
  function getTempClass(t) {
    var temp_c_class;
    //determinig temp lass
    if (t > 40) {
      temp_c_class = "fa-thermometer-4";
    } else if (t > 30) {
      temp_c_class = "fa-thermometer-3";
    } else if (t > 20) {
      temp_c_class = "fa-thermometer-2";
    } else if (t > 10) {
      temp_c_class = "fa-thermometer-1";
    } else {
      temp_c_class = "fa-thermometer-empty";
    }
    return temp_c_class;
  }
  
  //getting the correct cloud icon
  function getCloudClass(clouds) {
    //Determining cloudness icon
    if (clouds > 50) {
      return "wi wi-cloudy";
    } else {
      return "wi wi-cloud";
    }
  }
  
  //getting main weather icon
  function getIcon2(id) {
    switch (id) {
      case "01d":
        return "wi-day-sunny";
      case "02d":
        return "wi-day-cloudy";
      case "03d":
        return "wi-cloudy";
      case "04d":
        return "wi-cloud";
      case "09d":
        return "wi-day-showers";
      case "10d":
        return "wi-day-rain";
      case "11d":
        return "wi-day-thunderstorm";
      case "13d":
        return "wi-day-snow";
      case "50d":
        return "wi-smoke";

      case "01n":
        return "wi-night-clear";
      case "02n":
        return "wi-night-alt-cloudy";
      case "03n":
        return "wi-night-cloudy";
      case "04n":
        return "wi-night-partly-cloudy";
      case "09n":
        return "wi-night-showers";
      case "10n":
        return "wi-night-rain";
      case "11n":
        return "wi-night-thunderstorm";
      case "13n":
        return "wi-night-snow";
      case "50n":
        return "wi-smoke";
    }
  }
  
  //showing and hiding info fields
  function showLocInfo() {
    $("#loc-d").removeClass("fadeInDown");
    $("#loc-d").addClass("fadeOutUp");
    $("#loc-info-d").css("display", "inline-block");
    $("#loc-info-d").addClass("fadeInUp");
    $("#loc-info-d").removeClass("fadeOutDown");
  }
  function hideLocInfo() {
    $("#loc-info-d").removeClass("fadeInUp");
    $("#loc-info-d").addClass("fadeOutDown");
    $("#loc-d").removeClass("fadeOutUp");
    $("#loc-d").addClass("fadeInDown");
  }
  function showDesInfo() {
    $("#des-d").removeClass("fadeInDown");
    $("#des-d").addClass("fadeOutUp");
    $("#cloud-info-d").css("display", "inline-block");
    $("#cloud-info-d").addClass("fadeInUp");
    $("#cloud-info-d").removeClass("fadeOutDown");
  }
  function hideDesInfo() {
    $("#cloud-info-d").removeClass("fadeInUp");
    $("#cloud-info-d").addClass("fadeOutDown");
    $("#des-d").removeClass("fadeOutUp");
    $("#des-d").addClass("fadeInDown");
  }
  function showTempInfo() {
    $("#temp-d").removeClass("fadeInDown");
    $("#temp-d").addClass("fadeOutUp");
    $("#temp-info-d").css("display", "inline-block");
    $("#temp-info-d").addClass("fadeInUp");
    $("#temp-info-d").removeClass("fadeOutDown");
  }
  function hideTempInfo() {
    $("#temp-info-d").removeClass("fadeInUp");
    $("#temp-info-d").addClass("fadeOutDown");
    $("#temp-d").removeClass("fadeOutUp");
    $("#temp-d").addClass("fadeInDown");
  }
  function showHumidInfo() {
    $("#humid-d").removeClass("fadeInDown");
    $("#humid-d").addClass("fadeOutUp");
    $("#humid-info-d").css("display", "inline-block");
    $("#humid-info-d").addClass("fadeInUp");
    $("#humid-info-d").removeClass("fadeOutDown");
  }
  function hideHumidInfo() {
    $("#humid-info-d").removeClass("fadeInUp");
    $("#humid-info-d").addClass("fadeOutDown");
    $("#humid-d").removeClass("fadeOutUp");
    $("#humid-d").addClass("fadeInDown");
  }
  function showWindInfo() {
    $("#wind-d").removeClass("fadeInDown");
    $("#wind-d").addClass("fadeOutUp");
    $("#wind-info-d").css("display", "inline-block");
    $("#wind-info-d").addClass("fadeInUp");
    $("#wind-info-d").removeClass("fadeOutDown");

    $("#main-wind").removeClass();
    $("#main-wind").addClass(
      "main-icon fb pos wind-r wi wi-wind " + wind_d_icon + " animated"
    );

    //main-icon fb wi wi-strong-wind animated

    /*$("#main-wind").removeClass("fadeInDown");
    $("#main-wind").addClass("fadeOutUp");   
    $("#wind-dir").css("display","block");
    $("#wind-dir").removeClass("fadeOutDown");
    $("#wind-dir").addClass("fadeIn");*/
  }
  function hideWindInfo() {
    $("#wind-info-d").removeClass("fadeInUp");
    $("#wind-info-d").addClass("fadeOutDown");
    $("#wind-d").removeClass("fadeOutUp");
    $("#wind-d").addClass("fadeInDown");

    $("#main-wind").removeClass();
    $("#main-wind").addClass("main-icon fb wi wi-strong-wind animated");
    /*$("#wind-dir").removeClass("fadeInUp");
    $("#wind-dir").addClass("fadeOutDown");
    $("#main-wind").removeClass("fadeOutUp");
    $("#main-wind").addClass("fadeInDown");*/
  }
  function flip_next() {
    $(".layer-1").removeClass("animated slideInRight");
    $(".layer-2").removeClass("animated slideOutLeft");
    $(".layer-1").addClass("animated slideOutRight");
    $(".layer-2").css("display", "block");
    $(".layer-2").addClass("animated slideInLeft");
  }
  function flip_back() {
    $(".layer-2").removeClass("animated slideInLeft");
    $(".layer-2").addClass("animated slideOutLeft");
    $(".layer-1").removeClass("animated slideOutRight");
    $(".layer-1").addClass("animated slideInRight");
  }
  function clearTimings() {
    clearInterval(int_1);
    clearInterval(int_2);
    clearInterval(int_3);
    clearInterval(int_4);
    clearInterval(int_5);
  }
  function setLoading() {
    $("#des").html("loading...");
    $("#refresh").removeClass();
    $("#refresh").addClass("fa fa-refresh fa-spin");
    $("#unit-icon").removeClass();
    $("#unit-icon").addClass("wi wi-celsius");
  }
});
