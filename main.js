/**
 * Scratch plugin for jQuery - 2015
 */
(function ($) {
	'use strict';
	
	var isSupported = checkSupport();
	var isClicked = false;
	var storeKey = 'scratch';
	
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
		this.$el = $el;
		this.options = $.extend({}, $.fn.scratch.defaults, options);
		this.init();
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
			var width = this.options.width || this.$el.children().eq(0).width();
			var element = isSupported ? 'canvas' : 'div';
			
			this.$el.width(width).height(this.options.height);
			this.canvas = document.createElement(element);
			this.canvas.setAttribute('class', 'scratch-overlay scratch-' + element);
			
			var canvasWidth = this.$el.outerWidth();
			var canvasHeight = this.$el.outerHeight();
			
			// Set up overlay element (canvas or div element, depends on browser support)
			if (isSupported) {
				this.canvas.width = canvasWidth;
				this.canvas.height = canvasHeight;
				
				this.ctx = this.canvas.getContext('2d');
				this.ctx.fillStyle = this.options.background;
				this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
			} else {
				this.canvas.style.backgroundColor = this.options.background;
			}
			
			// Append cursor and canvas to the container
			// attach events
			this.$el
				.append(this.canvas)
				.append('<div class="scratch-cursor"/>')
				.on('scratch.complete', this.options.onComplete)
				.on('scratch.scratch', this.options.onScratch)
				.on('scratch.disable', this.options.onDisable)
				.on('scratch.enable', this.options.onEnable)
				.on('scratch.reset', this.options.onReset)
				.find('img').on('dragstart', function () {return false;});
			
			// Create the pixel array
			var i, j;
			
			// define array pixel for the current instance
			// prevent prototype modification...
			this.pixels = [];
			
			for (i = 0 ; i < canvasWidth ; i++) {
				for (j = 0 ; j < canvasHeight ; j++) {
					if (!this.pixels[i]) {
						this.pixels[i] = [];
					}
					
					this.pixels[i][j] = 1;
				}
			}
			
			// Enable scratching...
			this.enable();
		},
		
		/**
		 * Get pixels revealed / total pixels percentage
		 * @return Float
		 */
		getPercent: function () {
			if (isSupported) {
				return this.revealed ? this.revealed / (this.canvas.width * this.canvas.height) : 0;
			}
			
			return this.isComplete ? 100 : 0;
		},
		
		/**
		 * Get pixel revealed ratio based on the pixel position
		 * Each pixel has a weight, based on the distance with the container center
		 * @return Float
		 */
		getRevealRatio: function () {
			var count = 0;
			var i, j, px, py;
			var width = this.pixels.length;
			var height = this.pixels[0].length;
			
			for(i = 0 ; i < width ; i++) {
				for (j = 0 ; j < height ; j++) {
					if (0 === this.pixels[i][j]) {
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
			var offset = this.$el.offset();
			var x = (e.pageX || e.originalEvent.touches[0].pageX) - offset.left;
			var y = (e.pageY || e.originalEvent.touches[0].pageY) - offset.top;
			
			// update cursor div
			this.$el.find('.scratch-cursor').css({
				top: y - this.options.cursorWidth,
				left: x - this.options.cursorWidth,
				display: 'block'
			});

			// abort if user has not the mouse down
			// but coontinue if it is a single click
			if (!isClicked && e.type !== 'click') {
				return;
			}

			// if there's a last pos in memory, calculate the path
			if (this.lastPos) {
				var tmpX, tmpY, min, max, inc;
				
				// equation: x = k
				if (x == this.lastPos.x) {
					min = Math.min(y, this.lastPos.y);
					max = Math.max(y, this.lastPos.y);
					inc = this.options.cursorWidth / 2;
					
					for (tmpY = min ; tmpY < max ; tmpY += inc) {
						this.scratch(x, tmpY);
					}
				}
				// equation: y = ax + b
				else {
					min = Math.min(x, this.lastPos.x);
					max = Math.max(x, this.lastPos.x);
					inc = this.options.cursorWidth / 4;
					
					// calculate the slope (a)
					// (yb - ya) / (xb - xa)
					var coeff = (this.lastPos.y - y) / (this.lastPos.x - x);
					
					// calculate the y intercept (b)
					// y = ax + b => b = y - ax
					var intercept = y - coeff * x;
	
					for (tmpX = min ; tmpX < max ; tmpX += inc) {
						tmpY = coeff * tmpX + intercept;
						this.scratch(tmpX, tmpY);
					}
				}
				
			} else {
				// first scratch since the last mouse down
				// scratch only the current pixel
				this.scratch(x, y);
			}
			
			// mouseup is called before click event, so we don't have to set last pos if it is a click event
			if (e.type !== 'click') {
				// remember this pos
				this.lastPos = {
					x: x,
					y: y
				};
			}
			
			// trigger event
			this.$el.trigger('scratch.scratch');
			
			// if we're full, clear the container and display the card
			if (this.isRevealed()) {
				this.clear();
			}
		},
		
		/**
		 * Scratch the given pixel
		 * @return void
		 */
		scratch: function (x, y) {
			var i, j;
			
			// delta is the distance where we can draw around the given position
			var delta = Math.round(this.options.cursorWidth / 2);
			
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
						(!this.options.isCircle || Math.sqrt(i*i + j*j) <= delta)
						// only if the pixel is visible (has not been scratched)
						&& this.pixels[x+i]
						&& this.pixels[x+i][y+j]
					) {
						this.pixels[x+i][y+j] = 0;
						this.revealed++;
					}
				}
			}
			
			// clear canvas
			if (this.options.isCircle) {
				this.ctx.save();
				this.ctx.globalCompositeOperation = 'destination-out';
				this.ctx.beginPath();
				this.ctx.arc(x, y, delta, 0, 2 * Math.PI);
				this.ctx.closePath();
				this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
				this.ctx.fill();
				this.ctx.restore();
			} else {
				this.ctx.clearRect(x-delta, y-delta, this.options.cursorWidth, this.options.cursorWidth);
			}
		},
		
		/**
		 * Check if the card is revealed
		 * @return void
		 */
		isRevealed: function () {
			return this.options.revealRatio ? this.getRevealRatio() > this.options.revealRatio : this.getPercent() >= this.options.percent / 100;
		},
		
		/**
		 * Enable scratching
		 * @return void
		 */
		enable: function () {
			var self = this;
			this.$el.find('.scratch-overlay').removeClass('scratch-overlay-disabled').show();
			
			if (!this.isComplete && !this.isRevealed()) {
				if (isSupported) {
					this.$el.on('mousemove touchmove click', $.proxy(this.mousemove, this));
					this.$el.on('mouseleave', function () {
						self.$el.find('.scratch-cursor').hide();
					});
				} else {
					this.$el.on('click', function () {
						self.$el.find('.scratch-overlay').fadeOut($.proxy(self.clear, self));
					});
				}
				
				this.$el.on('mouseleave mouseup touchend', function () {
					self.lastPos = false;
				});
			}
			
			this.$el.trigger('scratch.enable');
		},
		
		/**
		 * Clear the overlay (reveal the image)
		 * @return void
		 */
		clear: function () {
			this.disable();
			
			this.isComplete = true;
			this.lastPos = false;
			isClicked = false;
			
			this.$el.find('.scratch-overlay').hide();
			this.$el.trigger('scratch.complete', this.getPercent(), this.getRevealRatio());	
		},
		
		/**
		 * Reset the card (reset overlay and pixels etc)
		 * @return void
		 */
		reset: function () {
			this.disable();
			this.revealed = 0;
			this.isComplete = false;
			this.pixels = [];
			
			var i, j;
			
			for(i = 0 ; i < this.pixels.length ; i++) {
				for (j = 0 ; j < this.pixels[i].length ; j++) {
					this.pixels[i][j] = 1;
				}
			}
			
			this.enable();
			this.$el.trigger('scratch.reset');
		},
		
		/**
		 * Disable scratching
		 * The user can't scratch anymore the card
		 * @return void
		 */
		disable: function () {
			this.$el.find('.scratch-cursor').hide();
			this.$el.off('mousemove touchmove click');
			this.$el.find('.scratch-overlay').addClass('scratch-overlay-disabled');
			this.$el.trigger('scratch.disabled');
		},
		
		/**
		 * Destroy the plugin instance
		 * @return void
		 */
		destroy: function () {
			this.clear();
			this.$el.removeData(storeKey)
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
	$.fn.scratch = function (options) {
		options = options || {};

		var args = [].slice.call(arguments, 1);
		var self, plg, ret;
		var promises = [];
		
		ret = this.map(function() {
			self = $(this);
			plg = self.data(storeKey);
			
			if (!plg) {
				plg = new Plugin(self, options);
				self.data(storeKey, plg);
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
	
	$.fn.scratch.defaults = {
		background: '#666',
		width: null,
		height: 'auto',
		cursorWidth: 20,
		isCircle: true,
		percent: 90,
		revealRatio: .11,
		onComplete: null,
		onScratch: null,
		onDisable: null,
		onEnable: null,
		onReset: null
	};
	
	$(function () {
		$('body')
			.on('mousedown touchstart', function () {isClicked = true})
			.on('mouseup touchend', function () {isClicked = false});
	});
})(jQuery);