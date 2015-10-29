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
		 * Number of revealed pixels
		 * @var Number
		 */
		revealed: 0,
		
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
			var width = self.options.width || self.$el.children().eq(0).width();
			var element = isSupported ? 'canvas' : 'div';
			
			self.$el.width(width).height(self.options.height);
			self.canvas = document.createElement(element);
			self.canvas.setAttribute('class', 'scratch-overlay scratch-' + element);
			
			var canvasWidth = self.$el.outerWidth();
			var canvasHeight = self.$el.outerHeight();
			
			// Set up overlay element (canvas or div element, depends on browser support)
			if (isSupported) {
				self.canvas.width = canvasWidth;
				self.canvas.height = canvasHeight;
				
				self.ctx = self.canvas.getContext('2d');
				self.ctx.fillStyle = self.options.background;
				self.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
			} else {
				self.canvas.style.backgroundColor = self.options.background;
			}
			
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
			
			// Create the pixel array
			var i, j;
			
			// define array pixel for the current instance
			// prevent prototype modification...
			self.pixels = [];
			
			for (i = 0 ; i < canvasWidth ; i++) {
				for (j = 0 ; j < canvasHeight ; j++) {
					if (!self.pixels[i]) {
						self.pixels[i] = [];
					}
					
					self.pixels[i][j] = 1;
				}
			}
			
			// Enable scratching...
			self.enable();
		},
		
		/**
		 * Get pixels revealed / total pixels percentage
		 * @return Float
		 */
		getPercent: function () {
			var self = this;
			
			if (isSupported) {
				return self.revealed ? self.revealed / (self.canvas.width * self.canvas.height) : 0;
			}
			
			return self.isComplete ? 100 : 0;
		},
		
		/**
		 * Get pixel revealed ratio based on the pixel position
		 * Each pixel has a weight, based on the distance with the container center
		 * @return Float
		 */
		getRevealRatio: function () {
			var self = this;
			var count = 0;
			var i, j, px, py;
			var width = self.pixels.length;
			var height = self.pixels[0].length;
			
			for(i = 0 ; i < width ; i++) {
				for (j = 0 ; j < height ; j++) {
					if (0 === self.pixels[i][j]) {
						px = Math.pow(1-(2*Math.abs(i-width/2)/width),1.5);
						py = Math.pow(1-(2*Math.abs(j-height/2)/height),1.5);
						count +=  px * py;
					}
				}
			}
 
			return count/(width*height);
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
						self.pixels[x+i] && self.pixels[x+i][y+j]
					) {
						self.pixels[x+i][y+j] = 0;
						self.revealed++;
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
			return self.options.revealRatio ? self.getRevealRatio() > self.options.revealRatio : self.getPercent() >= self.options.percent / 100;
		},
		
		/**
		 * Enable scratching
		 * @return void
		 */
		enable: function () {
			var self = this;
			self.$el.find('.scratch-overlay').removeClass('scratch-overlay-disabled').show();
			
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
			self.$el.trigger('scratch.complete', self.getPercent(), self.getRevealRatio());	
		},
		
		/**
		 * Reset the card (reset overlay and pixels etc)
		 * @return void
		 */
		reset: function () {
			var self = this;
			
			self.disable();
			self.revealed = 0;
			self.isComplete = false;
			self.pixels = [];
			
			var i, j;
			
			for(i = 0 ; i < self.pixels.length ; i++) {
				for (j = 0 ; j < self.pixels[i].length ; j++) {
					self.pixels[i][j] = 1;
				}
			}
			
			self.enable();
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
		var self, plg, ret;
		var promises = [];
		
		ret = this.map(function() {
			self = $(this);
			plg = self.data(plgName);
			
			if (!plg) {
				plg = new Plugin(self, options);
				self.data(plgName, plg);
			} else if (typeof options == 'string' && typeof plg[options] == 'function') {
				ret = plg[options].apply(plg, args);
			}
			
			var dfd = $.Deferred();
			
			if (!plg.isComplete) {
				self.one('scratch.complete', dfd.resolve);
			} else {
				dfd.resolve();
			}
			
			promises.push(dfd.promise());
			
			return ret === null || ret === undefined ? this : ret;
		});

		// handle promise
		if (typeof options.onAllComplete === 'function') {
			$.when.apply($, promises).done(options.onAllComplete);
		} else if (options === 'promise' && typeof args[0] === 'function') {
			$.when.apply($, promises).done(args[0]);
		}
		
		return ret.length > 1 ? ret : ret[0];
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