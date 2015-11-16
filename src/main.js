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
	
	function queue(next) {
		next();
	}
	
	/**
	 * Plugin constructor
	 */
	function Plugin ($el, options) {
		var self = this;
		
		self.$el = $el.queue(plgName, [queue]);
		
		self.options = $.extend({}, $.fn.scratch.defaults, options);
		self.imagesLoaded().done($.proxy(self.init, self));
	}
	
	Plugin.prototype = {
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
		cnv: null,
		
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
		 * Number of scratchable pixels in the canvas
		 */
		scratchablePx: 0,
		
		/**
		 * Plugin initialisation
		 * @return void
		 */
		init: function() {
			var self = this, width, element;
			
			self.$el.show();
			
			width = self.options.width || self.$el.children().eq(0).width();
			element = isSupported ? 'canvas' : 'div';
			
			self.$el.width(width).height(self.options.height);
			self.cnv = document.createElement(element);
			self.cnv.setAttribute('class', 'scratch-overlay scratch-' + element);
			
			// Set up overlay element (canvas or div element, depends on browser support)
			if (isSupported) {
				self.cnv.width = self.$el.outerWidth();
				self.cnv.height = self.$el.outerHeight();
				self.ctx = self.cnv.getContext('2d');
			}
			
			self.$el.hide();
			
			self.createOverlay(function () {
				self.$el.show();
				self.scratchablePx = self.getVisiblePixels();
				self.enable();
			});
			
			// Append cursor and canvas to the container
			// attach events
			self.$el
				.append(self.cnv)
				.append('<div class="scratch-cursor"/>')
				.on(plgName + '.complete', self.options.onComplete)
				.on(plgName + '.scratch', self.options.onScratch)
				.on(plgName + '.disable', self.options.onDisable)
				.on(plgName + '.enable', self.options.onEnable)
				.on(plgName + '.reset', self.options.onReset)
				.find('img').on('dragstart', function () {return false;});				
		},
		
		/**
		 * Load images in the container before initialization
		 */
		imagesLoaded: function () {
			var type = 'scratch.loaded', images = this.$el.find('img');
			
			return images.each(function () {
				images.queue(type, queue);
				var img = new Image();
				
				img.onload = images.dequeue.bind(images, type);
				img.src = this.src;
			}).promise(type);
		},
		
		/**
		 * Create overlay (fill overlay with a color or an image background)
		 * @param cb a callback function
		 * @return void
		 */
		createOverlay: function (cb) {
			var self = this;
			var background = self.options.background;
			var width = self.cnv.width;
			var height = self.cnv.height;
			
			if (isSupported) {
				self.ctx.clearRect(0, 0, width, height);
				
				if (background.substr(0,1) === '#') {
					self.ctx.fillStyle = background;
					self.ctx.fillRect(0, 0, width, height);
				} else {
					var img = new Image();

					img.onload = function () {
						self.ctx.drawImage(img, 0, 0, width, height);

						if ($.isFunction(cb)) {
							cb();
						}
					};
					
					img.src = background;
				}
			} else {
				if (background.substr(0,1) === '#') {
					self.cnv.style.backgroundColor = background;
				} else {
					self.cnv.style.backgroundImage = 'url(' + background +')';
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
		getVisiblePixels: function () {
			try {
				var self = this;
				var data = self.ctx.getImageData(0, 0, self.cnv.width, self.cnv.height).data;
				var pixels = 0;
				var i;
				
				for (i = 0 ; i < data.length ; i+=4) {
					if (data[i+3] > 0.3) {
						pixels++;
					}
				}
				
				return pixels;
			} catch (e) {
				console.log('Cannot determine visible pixels for this scratch card');
				return 0;
			}
		},
		
		/**
		 * Get pixels revealed / total pixels ratio
		 * @return Float
		 */
		getRatio: function () {
			var self = this;
			
			if (!isSupported) {
				return self.isComplete ? 1 : 0;
			} 

			return 1 - self.getVisiblePixels() / self.scratchablePx;
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
			self.trigger('scratch');
			
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
			var ctx = this.ctx;
			var options = this.options;
			
			// delta is the distance where we can draw around the given position
			var delta = Math.round(options.cursorWidth / 2);
			
			x = parseInt(x);
			y = parseInt(y);
			
			// clear canvas
			if (options.isCircle) {
				ctx.save();
				ctx.globalCompositeOperation = 'destination-out';
				ctx.beginPath();
				ctx.arc(x, y, delta, 0, 2 * Math.PI);
				ctx.closePath();
				ctx.fillStyle = "rgba(0, 0, 0, 1)";
				ctx.fill();
				ctx.restore();
			} else {
				ctx.clearRect(x-delta, y-delta, options.cursorWidth, options.cursorWidth);
			}
		},
		
		/**
		 * Check if the card is revealed
		 * @return void
		 */
		isRevealed: function () {
			return this.getRatio() >= this.options.percent / 100;
		},
		
		/**
		 * Trigger an event on the element
		 */
		trigger: function (evt) {
			return this.$el.trigger(plgName + '.' + evt, [].slice.call(arguments, 1));
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
			
			self.trigger('enable');
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
			self.trigger('complete', self.getRatio()).dequeue(plgName);	
		},
		
		/**
		 * Reset the card (reset overlay and pixels etc)
		 * @return void
		 */
		reset: function () {
			var self = this;
			
			self.disable();
			self.isComplete = false;
			self.createOverlay(function () {
				self.$el.show();
				self.scratchablePx = self.getVisiblePixels();
				self.enable();
			});
			self.trigger('reset').queue(plgName, [queue]);
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
			self.trigger('disabled');
		},
		
		/**
		 * Destroy the plugin instance
		 * @return void
		 */
		destroy: function () {
			this.clear();
			this.$el.removeData(plgName)
				.off(plgName + '.complete')
				.off(plgName + '.scratch')
				.off(plgName + '.disable')
				.off(plgName + '.enable')
				.off(plgName + '.reset')
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
		
		returns = this.map(function() {
			self = $(this);
			
			if (!(plg = self.data(plgName))) {
				plg = new Plugin(self, options);
				self.data(plgName, plg);
			} else if ($.isFunction(plg[options])) {
				ret = plg[options].apply(plg, args);
			}
			
			return typeof ret === 'undefined' ? this : ret;
		});
		
		return returns.length > 1 ? returns : returns[0];
	};
	
	$.fn[plgName].defaults = {
		background: '#666',
		width: null,
		height: 'auto',
		cursorWidth: 20,
		isCircle: true,
		percent: 65,
		onComplete: null,
		onScratch: null,
		onDisable: null,
		onEnable: null,
		onReset: null
	};
	
	$(function () {
		$(document)
			.on('mousedown touchstart', function () {isClicked = true;})
			.on('mouseup touchend', function () {isClicked = false;});
	});
})(jQuery, document, 'scratch');