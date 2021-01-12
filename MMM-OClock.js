//
// MMM-OClock
//
// v2.0

let MAX_LIFETIME = 85;

Module.register("MMM-OClock", {
  defaults: {
    locale: "", //default is system locale, or use like this. "de-DE"
    canvasWidth:1000,
    canvasHeight:1000,
    canvasStyle: "", // CSS style, e.g. "opacity: .7; ..."
    centerColor: "#FFFFFF",
    centerR: 50,
    centerTextFormat: "YYYY",
    centerFont: "bold 20px Roboto",
    centerTextColor:"#000000",
    hands: ["month", "date", "day", "hour", "minute", "second"],
    //"year" or "timer", "month", "date", "week", "day", "hour", "minute", "second"

    handType: "round", //"default", "round"
    handWidth: [40, 40, 40, 40, 40, 40, 40],
    handTextFormat: ["MMM", "Do", "ddd", "h", "m", "s"],
    handFont: "bold 16px Roboto",
    useNail: true,
    nailSize: 40,
    nailBgColor: "#000000",
    nailTextColor: "#FFFFFF", //CSS color or "inherit"
    space: 3,
    colorType: "hsv", //"static", "radiation", "transform", "hsv"
    colorTypeStatic: ["red", "orange", "yellow", "green", "blue", "purple", "goldenrod"],
    colorTypeRadiation: ["#333333", "red"], //Don't use #pattern or colorName.
    colorTypeTransform: ["blue", "red"],
    colorTypeHSV: 0.25, //hsv circle start color : 0~1
    secondsUpdateInterval: 1,  // secs (integer)
    scale: 1, // convenience to scale bar dimensions (font size & nailSize should be
              // adjusted manually)

    birthYear: false,   // e.g. 1901
    birthMonth: 0,      // e.g. 1-12
    lifeExpectancy: MAX_LIFETIME, // default: 85
    linearLife: false,  // set to true to plot life linearly not logarithmically
    timerBarColor: [],  // false for no gradient, empty for default, or
                      // [start, stop] colors, e.g. ['#000', 'white']

    handConversionMap: {
      "timer": "n/a",
      "year": "YYYY",
      "month": "M",
      "date": "D",
      "week": "w", // Local week of year. If you want to use ISO week of year, use "W" instead "w"
      "day": "e", // Local day of week. If you want to use ISO day of week, use "E" instead "e"
      "hour": "h", // 12H system. If you want to 24H system, use "H" instead "h"
      "minute": "m",
      "second": "s"
    }
  },

  getScripts: function() {
    return ["moment.js"]
  },

  start: function() {
    this.center = {
      x: this.getDim('canvasWidth') / 2,
      y: this.getDim('canvasHeight') / 2
    }
    //jeff
    let now = moment();
    console.log(`Now: ${now.format('ll')}`);
    now.add('300', 'seconds');
    this.endtime = now;
    this.totalseconds = 300;
    this.colorRange = {}
  },

  getSecondsLeft: function() {
    let secondsleft = this.endtime.diff(moment(), 'seconds');
    console.log(`Difference in seconds: ${secondsleft}`);
    return secondsleft
  },


  getDim: function(dim, index) {
    if (!(dim in this.config)) throw new Error('Unkown config property in getDim(): ' + dim);
    let value = this.config[dim]
    if (typeof index !== 'undefined') value = value[index]
    return this.config.scale * value
  },

  notificationReceived: function(noti, payload, sender) {
    switch(noti) {
      case "DOM_OBJECTS_CREATED":
        // slight delay to make sure fonts are loaded before first draw
        setTimeout(() => this.updateView(), 1500)
        break
      case "START_TIMER":
        this.totalseconds = payload;
        let now = moment();
        now.add(payload, 'seconds');
        this.endtime = now;
        break
      case "PAUSE_TIMER":
        clearTimeout(this.secondsTimer);
        break
    }
  },

  updateView: function() {
    this.drawFace()
    // update seconds if we have to
    clearTimeout(this.secondsTimer)
    let offset = this.getNow().milliseconds()
    this.secondsTimer = setTimeout( () => this.updateView(), 1000 - offset)
  },

  getDom: function() {
    var wrapper = document.createElement("div")
    wrapper.id = "OCLOCK_WRAPPER"
    wrapper.style = this.config.canvasStyle
    var canvas = document.createElement("canvas")
    canvas.width = this.getDim('canvasWidth')
    canvas.height = this.getDim('canvasHeight')
    canvas.id = "OCLOCK"
    wrapper.appendChild(canvas)
    return wrapper
  },

  getNow: function() {
    return (this.config.locale) ? moment().locale(this.config.locale) : moment()
  },

  getCtx: function() {
    if (this.ctx) return this.ctx
    this.ctx = document.getElementById("OCLOCK").getContext("2d")
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    return this.ctx
  },

  drawFace: function() {
    var ctx = this.getCtx();
    //Clear Everything
    ctx.clearRect(0, 0, this.getDim('canvasWidth'), this.getDim('canvasHeight'))
    var postArc = []
    var distance = 0

    //Draw Center Circle and Fill in
    ctx.beginPath()
    ctx.fillStyle = this.config.centerColor
    ctx.arc(this.center.x, this.center.y, this.getDim('centerR'), 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.font= "bold 80px Roboto",
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(this.totalseconds + ' s', this.center.x, this.center.y)
  
    //Draw Countdown Arc
    distance = this.getDim('centerR') + this.config.space
    distance +=  20
    var cfg = {
      index: 0,
      type: "timer",
      center: this.center,
      distance: distance,
      pros: this.getSecondsLeft() / this.totalseconds,
      width: 40,
      text: this.getSecondsLeft()
    }
    let arcresult=this.drawArc(ctx, cfg);
    this.drawPost(ctx, arcresult)
    
  },

  drawArc: function(ctx, cfg) {
    var progress = function (pro) {
      var r
      if (pro < 0.25) {
        r = (pro * 2) + 1.5
      } else if (pro < 1) {
        r = (pro * 2) - 0.5
      } else if (pro == 1) {
        r = 3.5
      }
      return r * Math.PI
    }

    var startPoint = {
      x : cfg.center.x,
      y : cfg.center.y - cfg.distance
    }

    var radian = progress(cfg.pros)
    var rad0 = 1.5 * Math.PI

    color = "red";
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";

    var sX = cfg.center.x + (Math.cos(radian) * cfg.distance)
    var sY = cfg.center.y + (Math.sin(radian) * cfg.distance)

    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(startPoint.x, startPoint.y, (cfg.width / 2), 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.arc(sX, sY, (cfg.width / 2), 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    
    ctx.beginPath()
    ctx.lineWidth = cfg.width;
    ctx.arc(cfg.center.x, cfg.center.y, cfg.distance, rad0, radian)
    ctx.stroke()
    return {x:sX, y:sY, c:color, h:cfg.type, t:cfg.text}
  },

  drawPost: function(ctx, item) {
    ctx.beginPath()
    ctx.lineWidth=1;
    ctx.fillStyle = "#ff0000";
    ctx.arc(item.x, item.y, 20, 0, 2*Math.PI)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.lineWidth=1;
    ctx.fillStyle = "#000000"
    ctx.arc(item.x, item.y, 20 - 5, 0, 2*Math.PI)
    ctx.closePath()
    ctx.fill()
    
    ctx.font= "bold 16px Roboto",
    ctx.fillStyle = "#FFFFFF" //white
    ctx.fillText(item.t, item.x, item.y)
  },
})
