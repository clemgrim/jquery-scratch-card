!function(e,t,o){"use strict";function s(){var e=t.createElement("canvas");return!(!e.getContext||!e.getContext("2d"))}function a(t,o){var s=this;s.$el=t,s.options=e.extend({},e.fn.scratch.defaults,o),s.init()}var n=s(),c=!1;a.prototype={pixels:[],revealed:0,isComplete:!1,lastPos:!1,canvas:null,ctx:null,$el:null,options:{},init:function(){var e=this,o=e.options.width||e.$el.children().eq(0).width(),s=n?"canvas":"div";e.$el.width(o).height(e.options.height),e.canvas=t.createElement(s),e.canvas.setAttribute("class","scratch-overlay scratch-"+s);var a=e.$el.outerWidth(),c=e.$el.outerHeight();n?(e.canvas.width=a,e.canvas.height=c,e.ctx=e.canvas.getContext("2d"),e.ctx.fillStyle=e.options.background,e.ctx.fillRect(0,0,a,c)):e.canvas.style.backgroundColor=e.options.background,e.$el.append(e.canvas).append('<div class="scratch-cursor"/>').on("scratch.complete",e.options.onComplete).on("scratch.scratch",e.options.onScratch).on("scratch.disable",e.options.onDisable).on("scratch.enable",e.options.onEnable).on("scratch.reset",e.options.onReset).find("img").on("dragstart",function(){return!1});var r,l;for(e.pixels=[],r=0;a>r;r++)for(l=0;c>l;l++)e.pixels[r]||(e.pixels[r]=[]),e.pixels[r][l]=1;e.enable()},getPercent:function(){var e=this;return n?e.revealed?e.revealed/(e.canvas.width*e.canvas.height):0:e.isComplete?100:0},getRevealRatio:function(){var e,t,o,s,a=this,n=0,c=a.pixels.length,r=a.pixels[0].length;for(e=0;c>e;e++)for(t=0;r>t;t++)0===a.pixels[e][t]&&(o=Math.pow(1-2*Math.abs(e-c/2)/c,1.5),s=Math.pow(1-2*Math.abs(t-r/2)/r,1.5),n+=o*s);return n/(c*r)},mousemove:function(e){e.preventDefault();var t=this,o=t.$el.offset(),s=(e.pageX||e.originalEvent.touches[0].pageX)-o.left,a=(e.pageY||e.originalEvent.touches[0].pageY)-o.top;if(t.$el.find(".scratch-cursor").css({top:a-t.options.cursorWidth,left:s-t.options.cursorWidth,display:"block"}),c||"click"===e.type){if(t.lastPos){var n,r,l,i,h;if(s==t.lastPos.x)for(l=Math.min(a,t.lastPos.y),i=Math.max(a,t.lastPos.y),h=t.options.cursorWidth/2,r=l;i>r;r+=h)t.scratch(s,r);else{l=Math.min(s,t.lastPos.x),i=Math.max(s,t.lastPos.x),h=t.options.cursorWidth/4;var p=(t.lastPos.y-a)/(t.lastPos.x-s),u=a-p*s;for(n=l;i>n;n+=h)r=p*n+u,t.scratch(n,r)}}else t.scratch(s,a);"click"!==e.type&&(t.lastPos={x:s,y:a}),t.$el.trigger("scratch.scratch"),t.isRevealed()&&t.clear()}},scratch:function(e,t){var o,s,a=this,n=Math.round(a.options.cursorWidth/2);for(e=parseInt(e),t=parseInt(t),o=-n;n>o;o++)for(s=-n;n>s;s++)(!a.options.isCircle||Math.sqrt(o*o+s*s)<=n)&&a.pixels[e+o]&&a.pixels[e+o][t+s]&&(a.pixels[e+o][t+s]=0,a.revealed++);a.options.isCircle?(a.ctx.save(),a.ctx.globalCompositeOperation="destination-out",a.ctx.beginPath(),a.ctx.arc(e,t,n,0,2*Math.PI),a.ctx.closePath(),a.ctx.fillStyle="rgba(0, 0, 0, 1)",a.ctx.fill(),a.ctx.restore()):a.ctx.clearRect(e-n,t-n,a.options.cursorWidth,a.options.cursorWidth)},isRevealed:function(){var e=this;return e.options.revealRatio?e.getRevealRatio()>e.options.revealRatio:e.getPercent()>=e.options.percent/100},enable:function(){var t=this;t.$el.find(".scratch-overlay").removeClass("scratch-overlay-disabled").show(),t.isComplete||t.isRevealed()||(n?(t.$el.on("mousemove touchmove click",e.proxy(t.mousemove,t)),t.$el.on("mouseleave",function(){t.$el.find(".scratch-cursor").hide()})):t.$el.on("click",function(){t.$el.find(".scratch-overlay").fadeOut(e.proxy(t.clear,t))}),t.$el.on("mouseleave mouseup touchend",function(){t.lastPos=!1})),t.$el.trigger("scratch.enable")},clear:function(){var e=this;e.disable(),e.isComplete=!0,e.lastPos=!1,c=!1,e.$el.find(".scratch-overlay").hide(),e.$el.trigger("scratch.complete",e.getPercent(),e.getRevealRatio())},reset:function(){var e=this;e.disable(),e.revealed=0,e.isComplete=!1,e.pixels=[];var t,o;for(t=0;t<e.pixels.length;t++)for(o=0;o<e.pixels[t].length;o++)e.pixels[t][o]=1;e.enable(),e.$el.trigger("scratch.reset")},disable:function(){var e=this;e.$el.find(".scratch-cursor").hide(),e.$el.off("mousemove touchmove click"),e.$el.find(".scratch-overlay").addClass("scratch-overlay-disabled"),e.$el.trigger("scratch.disabled")},destroy:function(){this.clear(),this.$el.removeData(o).off("scratch.complete").off("scratch.scratch").off("scratch.disable").off("scratch.enable").off("scratch.reset").find("img").off("dragstart")}},e.fn[o]=function(t){t=t||{};var s,n,c,r=[].slice.call(arguments,1),l=[];return c=this.map(function(){s=e(this),n=s.data(o),n?"string"==typeof t&&"function"==typeof n[t]&&(c=n[t].apply(n,r)):(n=new a(s,t),s.data(o,n));var i=e.Deferred();return n.isComplete?i.resolve():s.one("scratch.complete",i.resolve),l.push(i.promise()),null===c||void 0===c?this:c}),"function"==typeof t.onAllComplete?e.when.apply(e,l).done(t.onAllComplete):"promise"===t&&"function"==typeof r[0]&&e.when.apply(e,l).done(r[0]),c.length>1?c:c[0]},e.fn[o].defaults={background:"#666",width:null,height:"auto",cursorWidth:20,isCircle:!0,percent:90,revealRatio:.11,onComplete:null,onScratch:null,onDisable:null,onEnable:null,onReset:null},e(function(){e("body").on("mousedown touchstart",function(){c=!0}).on("mouseup touchend",function(){c=!1})})}(jQuery,document,"scratch");