/**
 * Scratch plugin for jQuery - 2015
 */
(function ($, document, plgName) {
	'use strict';
	
	var isSupported = checkSupport();
	var isClicked = false;
	
	/**
	 * Check if browser supports canvas
	 */
	function checkSupport() {
		var elem = document.createElement('canvas');
		return !!(elem.getContext && elem.getContext('2d'));
	}
	
	/**
	 * Plugin constructor
	 */
	function Plugin ($el, options) {
		var self = this;
		
		self.$el = $el;
		self.options = $.extend({}, $.fn.scratch.defaults, options);
		self.init();
	}
	
	Plugin.prototype = {
		/**
		 * bidimensional array that contains pixels to scratch
		 * Each pixel has a value : 1 if the pixel is visible, 0 if the pixel is not visible (has been scratched)
		 * @var Array
		 */
		pixels: [],
		
		/**
		 * If the card has been revealed
		 * @var Boolean
		 */
		isComplete: false,
		
		/**
		 * The last position of the user cursor when he was scratching
		 * Can be an object (x: a, y: b) or false if the user is not scratching anymore
		 * @var Boolean | Object
		 */
		lastPos: false,
		
		/**
		 * Canvas element in the DOM (not a jQuery wrapper)
		 * @var DOMElement
		 */
		canvas: null,
		
		/**
		 * Canvas context
		 * @var CanvasRenderingContext2D
		 */
		ctx: null,
		
		/**
		 * The jquery wrapper for the card element (area to scratch, the main container)
		 * @var jQuery element
		 */
		$el: null,
		
		/**
		 * Plugin options
		 * @var Object
		 */
		options: {},
		
		/**
		 * Plugin initialisation
		 * @return void
		 */
		init: function() {
			var self = this;
			self.$el.show();
			var width = self.options.width || self.$el.children().eq(0).width();
			var element = isSupported ? 'canvas' : 'div';
			
			self.$el.width(width).height(self.options.height);
			self.canvas = document.createElement(element);
			self.canvas.setAttribute('class', 'scratch-overlay scratch-' + element);
			
			// Set up overlay element (canvas or div element, depends on browser support)
			if (isSupported) {
				self.canvas.width = self.$el.outerWidth();
				self.canvas.height = self.$el.outerHeight();
				self.ctx = self.canvas.getContext('2d');
			}
			
			self.$el.hide();
			
			self.createOverlay(function () {
				self.$el.show();
				self.enable();
			});
			
			// Append cursor and canvas to the container
			// attach events
			self.$el
				.append(self.canvas)
				.append('<div class="scratch-cursor"/>')
				.on('scratch.complete', self.options.onComplete)
				.on('scratch.scratch', self.options.onScratch)
				.on('scratch.disable', self.options.onDisable)
				.on('scratch.enable', self.options.onEnable)
				.on('scratch.reset', self.options.onReset)
				.find('img').on('dragstart', function () {return false;});
		},
		
		/**
		 * Create overlay (fill overlay with a color or an image background)
		 * @param cb a callback function
		 * @return void
		 */
		createOverlay: function (cb) {
			var self = this;
			
			if (isSupported) {
				self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
				
				if (self.options.background.substr(0,1) === '#') {
					self.ctx.fillStyle = self.options.background;
					self.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
				} else {
					var img = new Image();

					img.onload = function () {
						self.ctx.drawImage(img, 0, 0);

						if ($.isFunction(cb)) {
							cb();
						}
					};
					
					img.src = self.options.background;
				}
			} else {
				if (self.options.background.substr(0,1) === '#') {
					self.canvas.style.backgroundColor = self.options.background;
				} else {
					self.canvas.style.backgroundImage = 'url(' + self.options.background +')';
				}
				
				if ($.isFunction(cb)) {
					cb();
				}
			}
		},
		
		/**
		 * Update canvas pixels status
		 * @return void
		 */
		getPixels: function () {
			// Create the pixel array
			var self = this;
			var i, j, data, alpha;
			var width = self.canvas.width;
			var height = self.canvas.height;
			
			// define array pixel for the current instance
			// prevent prototype modification...
			self.pixels = [];
			
			if (!isSupported) {
				return;
			}
			
			data = self.ctx.getImageData(0, 0, width, height).data;
			
			for (i = 0 ; i < width ; i++) {
				for (j = 0 ; j < height ; j++) {
					if (!self.pixels[i]) {
						self.pixels[i] = [];
					}
					
					alpha = data[j * width + i + 4];
					
					if (alpha < 0.3) {
						self.pixels[i][j] = -1;
					} else {
						self.pixels[i][j] = 1;
					}
				}
			}
		},
		
		/**
		 * Get pixels revealed / total pixels percentage
		 * @param relative if true, the percentage depends on the pixel location
		 * @return Float
		 */
		getRatio: function (relative) {
			var self = this;
			
			if (!isSupported) {
				return self.isComplete ? 1 : 0;
			}
			
			var i, j, px, py;
			var count = 0;
			var width = self.pixels.length;
			var height = self.pixels[0].length;
			var pixels = 0;
			
			for (i = 0 ; i < width ; i++) {
				for (j = 0 ; j < height ; j++) {
					if (-1 === self.pixels[i][j]) {
						continue;
					}
					
					if (0 === self.pixels[i][j]) {
						if (relative) {
							px = Math.pow(1-(2*Math.abs(i-width/2)/width),1.5);
							py = Math.pow(1-(2*Math.abs(j-height/2)/height),1.5);
							count +=  px * py;
						} else {
							count++;
						}
					}
					
					pixels++;
				}
			}
 
			return count/pixels;
		},
		
		/**
		 * Mouse event handler
		 * @return void
		 */
		mousemove: function(e) {
			e.preventDefault();
			
			// get cursor position
			var self = this;
			var offset = self.$el.offset();
			var x = (e.pageX || e.originalEvent.touches[0].pageX) - offset.left;
			var y = (e.pageY || e.originalEvent.touches[0].pageY) - offset.top;
			
			// update cursor div
			self.$el.find('.scratch-cursor').css({
				top: y - self.options.cursorWidth,
				left: x - self.options.cursorWidth,
				display: 'block'
			});

			// abort if user has not the mouse down
			// but coontinue if it is a single click
			if (!isClicked && e.type !== 'click') {
				return;
			}

			// if there's a last pos in memory, calculate the path
			if (self.lastPos) {
				var tmpX, tmpY, min, max, inc;
				
				// equation: x = k
				if (x == self.lastPos.x) {
					min = Math.min(y, self.lastPos.y);
					max = Math.max(y, self.lastPos.y);
					inc = self.options.cursorWidth / 2;
					
					for (tmpY = min ; tmpY < max ; tmpY += inc) {
						self.scratch(x, tmpY);
					}
				}
				// equation: y = ax + b
				else {
					min = Math.min(x, self.lastPos.x);
					max = Math.max(x, self.lastPos.x);
					inc = self.options.cursorWidth / 4;
					
					// calculate the slope (a)
					// (yb - ya) / (xb - xa)
					var coeff = (self.lastPos.y - y) / (self.lastPos.x - x);
					
					// calculate the y intercept (b)
					// y = ax + b => b = y - ax
					var intercept = y - coeff * x;
	
					for (tmpX = min ; tmpX < max ; tmpX += inc) {
						tmpY = coeff * tmpX + intercept;
						self.scratch(tmpX, tmpY);
					}
				}
				
			} else {
				// first scratch since the last mouse down
				// scratch only the current pixel
				self.scratch(x, y);
			}
			
			// mouseup is called before click event, so we don't have to set last pos if it is a click event
			if (e.type !== 'click') {
				// remember self pos
				self.lastPos = {
					x: x,
					y: y
				};
			}
			
			// trigger event
			self.$el.trigger('scratch.scratch');
			
			// if we're full, clear the container and display the card
			if (self.isRevealed()) {
				self.clear();
			}
		},
		
		/**
		 * Scratch the given pixel
		 * @return void
		 */
		scratch: function (x, y) {
			var self = this;
			var i, j;
			
			// delta is the distance where we can draw around the given position
			var delta = Math.round(self.options.cursorWidth / 2);
			
			x = parseInt(x);
			y = parseInt(y);
			
			// start with negative delta: -a 0 -a where 0 is the current position
			for (i = -delta ; i < delta ; i++) {
				for (j = -delta ; j < delta ; j++) {
					if (
						// if it is a circle, we draw only if the pixel is in the disc area
						// eg if distance <= radius
						// formula : Sqrt((xb - xa)² + (yb - ya)²)
						// Sqrt(i² + j²) in our case because xb = x + i and yb = y + j
						(!self.options.isCircle || Math.sqrt(i*i + j*j) <= delta) &&
						// only if the pixel is visible (has not been scratched)
						self.pixels[x+i] && self.pixels[x+i][y+j] === 1
					) {
						self.pixels[x+i][y+j] = 0;
					}
				}
			}
			
			// clear canvas
			if (self.options.isCircle) {
				self.ctx.save();
				self.ctx.globalCompositeOperation = 'destination-out';
				self.ctx.beginPath();
				self.ctx.arc(x, y, delta, 0, 2 * Math.PI);
				self.ctx.closePath();
				self.ctx.fillStyle = "rgba(0, 0, 0, 1)";
				self.ctx.fill();
				self.ctx.restore();
			} else {
				self.ctx.clearRect(x-delta, y-delta, self.options.cursorWidth, self.options.cursorWidth);
			}
		},
		
		/**
		 * Check if the card is revealed
		 * @return void
		 */
		isRevealed: function () {
			var self = this;
			return self.options.revealRatio ? self.getRatio(true) > self.options.revealRatio : self.getRatio() >= self.options.percent / 100;
		},
		
		/**
		 * Enable scratching
		 * @return void
		 */
		enable: function () {
			var self = this;
			self.$el.find('.scratch-overlay').removeClass('scratch-overlay-disabled').show();
			
			self.getPixels();
			
			if (!self.isComplete && !self.isRevealed()) {
				if (isSupported) {
					self.$el.on('mousemove touchmove click', $.proxy(self.mousemove, self));
					self.$el.on('mouseleave', function () {
						self.$el.find('.scratch-cursor').hide();
					});
				} else {
					self.$el.on('click', function () {
						self.$el.find('.scratch-overlay').fadeOut($.proxy(self.clear, self));
					});
				}
				
				self.$el.on('mouseleave mouseup touchend', function () {
					self.lastPos = false;
				});
			}
			
			self.$el.trigger('scratch.enable');
		},
		
		/**
		 * Clear the overlay (reveal the image)
		 * @return void
		 */
		clear: function () {
			var self = this;
			
			self.disable();
			self.isComplete = true;
			self.lastPos = false;
			isClicked = false;
			
			self.$el.find('.scratch-overlay').hide();
			self.$el.trigger('scratch.complete', self.getRatio(), self.getRatio(true));	
		},
		
		/**
		 * Reset the card (reset overlay and pixels etc)
		 * @return void
		 */
		reset: function () {
			var self = this;
			
			self.disable();
			self.isComplete = false;

			self.createOverlay($.proxy(self.enable, self));
			self.$el.trigger('scratch.reset');
		},
		
		/**
		 * Disable scratching
		 * The user can't scratch anymore the card
		 * @return void
		 */
		disable: function () {
			var self = this;
			
			self.$el.find('.scratch-cursor').hide();
			self.$el.off('mousemove touchmove click');
			self.$el.find('.scratch-overlay').addClass('scratch-overlay-disabled');
			self.$el.trigger('scratch.disabled');
		},
		
		/**
		 * Destroy the plugin instance
		 * @return void
		 */
		destroy: function () {
			this.clear();
			this.$el.removeData(plgName)
				.off('scratch.complete')
				.off('scratch.scratch')
				.off('scratch.disable')
				.off('scratch.enable')
				.off('scratch.reset')
				.find('img').off('dragstart');
		}
	};
	
	/**
	 * Plugin definition
	 */
	$.fn[plgName] = function (options) {
		options = options || {};

		var args = [].slice.call(arguments, 1);
		var self, plg, ret, returns;
		var promises = [];
		
		returns = this.map(function() {
			self = $(this);
			
			if (!(plg = self.data(plgName))) {
				plg = new Plugin(self, options);
				self.data(plgName, plg);
			} else if ($.isFunction(plg[options])) {
				ret = plg[options].apply(plg, args);
			} else if (options !== 'promise') {
				throw new Error('Unknown method ' + options);
			}
			
			var dfd = $.Deferred();
			
			if (!plg.isComplete) {
				self.one('scratch.complete', dfd.resolve);
			} else {
				dfd.resolve();
			}
			
			promises.push(dfd.promise());
			
			return typeof ret === 'undefined' ? this : ret;
		});

		// handle promise
		if ($.isFunction(options.onAllComplete)) {
			$.when.apply($, promises).done(options.onAllComplete);
		} else if (options === 'promise' && $.isFunction(args[0])) {
			$.when.apply($, promises).done(args[0]);
		}
		
		return returns.length > 1 ? returns : returns[0];
	};
	
	$.fn[plgName].defaults = {
		background: '#666',
		width: null,
		height: 'auto',
		cursorWidth: 20,
		isCircle: true,
		percent: 90,
		revealRatio: 0.11,
		onComplete: null,
		onScratch: null,
		onDisable: null,
		onEnable: null,
		onReset: null
	};
	
	$(function () {
		$('body')
			.on('mousedown touchstart', function () {isClicked = true;})
			.on('mouseup touchend', function () {isClicked = false;});
	});
})(jQuery, document, 'scratch');