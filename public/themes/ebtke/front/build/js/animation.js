/**
 * jquery.slitslider.js v1.1.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2012, Codrops
 * http://www.codrops.com
 */

;( function( $, window, undefined ) {
	
	'use strict';

	/*
	* debouncedresize: special jQuery event that happens once after a window resize
	*
	* latest version and complete README available on Github:
	* https://github.com/louisremi/jquery-smartresize/blob/master/jquery.debouncedresize.js
	*
	* Copyright 2011 @louis_remi
	* Licensed under the MIT license.
	*/
	var $event = $.event,
	$special,
	resizeTimeout;

	$special = $event.special.debouncedresize = {
		setup: function() {
			$( this ).on( "resize", $special.handler );
		},
		teardown: function() {
			$( this ).off( "resize", $special.handler );
		},
		handler: function( event, execAsap ) {
			// Save the context
			var context = this,
				args = arguments,
				dispatch = function() {
					// set correct event type
					event.type = "debouncedresize";
					$event.dispatch.apply( context, args );
				};

			if ( resizeTimeout ) {
				clearTimeout( resizeTimeout );
			}

			execAsap ?
				dispatch() :
				resizeTimeout = setTimeout( dispatch, $special.threshold );
		},
		threshold: 20
	};

	// global
	var $window = $( window ),
		$document = $( document ),
		Modernizr = window.Modernizr;

	$.Slitslider = function( options, element ) {
		
		this.$elWrapper = $( element );
		this._init( options );
		
	};

	$.Slitslider.defaults = {
		// transitions speed
		speed : 800,
		// if true the item's slices will also animate the opacity value
		optOpacity : false,
		// amount (%) to translate both slices - adjust as necessary
		translateFactor : 230,
		// maximum possible angle
		maxAngle : 25,
		// maximum possible scale
		maxScale : 2,
		// slideshow on / off
		autoplay : false,
		// keyboard navigation
		keyboard : true,
		// time between transitions
		interval : 4000,
		// callbacks
		onBeforeChange : function( slide, idx ) { return false; },
		onAfterChange : function( slide, idx ) { return false; }
	};

	$.Slitslider.prototype = {

		_init : function( options ) {
			
			// options
			this.options = $.extend( true, {}, $.Slitslider.defaults, options );

			// https://github.com/twitter/bootstrap/issues/2870
			this.transEndEventNames = {
				'WebkitTransition' : 'webkitTransitionEnd',
				'MozTransition' : 'transitionend',
				'OTransition' : 'oTransitionEnd',
				'msTransition' : 'MSTransitionEnd',
				'transition' : 'transitionend'
			};
			this.transEndEventName = this.transEndEventNames[ Modernizr.prefixed( 'transition' ) ];
			// suport for css 3d transforms and css transitions
			this.support = Modernizr.csstransitions && Modernizr.csstransforms3d;
			// the slider
			this.$el = this.$elWrapper.children( '.sl-slider' );
			// the slides
			this.$slides = this.$el.children( '.sl-slide' ).hide();
			// total slides
			this.slidesCount = this.$slides.length;
			// current slide
			this.current = 0;
			// control if it's animating
			this.isAnimating = false;
			// get container size
			this._getSize();
			// layout
			this._layout();
			// load some events
			this._loadEvents();
			// slideshow
			if( this.options.autoplay ) {
			
				this._startSlideshow();
			
			}

		},
		// gets the current container width & height
		_getSize : function() {

			this.size = {
				width : this.$elWrapper.outerWidth( true ),
				height : this.$elWrapper.outerHeight( true )
			};

		},
		_layout : function() {
			
			this.$slideWrapper = $( '<div class="sl-slides-wrapper" />' );
			
			// wrap the slides
			this.$slides.wrapAll( this.$slideWrapper ).each( function( i ) {
				
				var $slide = $( this ),
					// vertical || horizontal
					orientation = $slide.data( 'orientation' );
					
				$slide.addClass( 'sl-slide-' + orientation )
					  .children()
					  .wrapAll( '<div class="sl-content-wrapper" />' )
					  .wrapAll( '<div class="sl-content" />' );
			
			} );
			
			// set the right size of the slider/slides for the current window size
			this._setSize();
			// show first slide
			this.$slides.eq( this.current ).show();
			
		},
		_navigate : function( dir, pos ) {
			
			if( this.isAnimating || this.slidesCount < 2 ) {
			
				return false;
			
			}

			this.isAnimating = true;

			var self = this,
				$currentSlide = this.$slides.eq( this.current );

			// if position is passed
			if( pos !== undefined ) {

				this.current = pos;

			}
			// if not check the boundaries
			else if( dir === 'next' ) {

				this.current = this.current < this.slidesCount - 1 ? ++this.current : 0;

			}
			else if( dir === 'prev' ) {

				this.current = this.current > 0 ? --this.current : this.slidesCount - 1;

			}

			this.options.onBeforeChange( $currentSlide, this.current );
			
			// next slide to be shown
			var $nextSlide = this.$slides.eq( this.current ),
				// the slide we want to cut and animate
				$movingSlide = ( dir === 'next' ) ? $currentSlide : $nextSlide,
				
				// the following are the data attrs set for each slide
				configData = $movingSlide.data(),
				config = {};
			
			config.orientation = configData.orientation || 'horizontal',
			config.slice1angle = configData.slice1Rotation || 0,
			config.slice1scale = configData.slice1Scale || 1,
			config.slice2angle = configData.slice2Rotation || 0,
			config.slice2scale = configData.slice2Scale || 1;
				
			this._validateValues( config );
			
			var cssStyle = config.orientation === 'horizontal' ? {
					marginTop : -this.size.height / 2
				} : {
					marginLeft : -this.size.width / 2
				},
				// default slide's slices style
				resetStyle = {
					'transform' : 'translate(0%,0%) rotate(0deg) scale(1)',
					opacity : 1 
				},
				// slice1 style
				slice1Style	= config.orientation === 'horizontal' ? {
					'transform' : 'translateY(-' + this.options.translateFactor + '%) rotate(' + config.slice1angle + 'deg) scale(' + config.slice1scale + ')'
				} : {
					'transform' : 'translateX(-' + this.options.translateFactor + '%) rotate(' + config.slice1angle + 'deg) scale(' + config.slice1scale + ')'
				},
				// slice2 style
				slice2Style	= config.orientation === 'horizontal' ? {
					'transform' : 'translateY(' + this.options.translateFactor + '%) rotate(' + config.slice2angle + 'deg) scale(' + config.slice2scale + ')'
				} : {
					'transform' : 'translateX(' + this.options.translateFactor + '%) rotate(' + config.slice2angle + 'deg) scale(' + config.slice2scale + ')'
				};
			
			if( this.options.optOpacity ) {
			
				slice1Style.opacity = 0;
				slice2Style.opacity = 0;
			
			}
			
			// we are adding the classes sl-trans-elems and sl-trans-back-elems to the slide that is either coming "next"
			// or going "prev" according to the direction.
			// the idea is to make it more interesting by giving some animations to the respective slide's elements
			//( dir === 'next' ) ? $nextSlide.addClass( 'sl-trans-elems' ) : $currentSlide.addClass( 'sl-trans-back-elems' );
			
			$currentSlide.removeClass( 'sl-trans-elems' );

			var transitionProp = {
				'transition' : 'all ' + this.options.speed + 'ms ease-in-out'
			};

			// add the 2 slices and animate them
			$movingSlide.css( 'z-index', this.slidesCount )
						.find( 'div.sl-content-wrapper' )
						.wrap( $( '<div class="sl-content-slice" />' ).css( transitionProp ) )
						.parent()
						.cond(
							dir === 'prev', 
							function() {
							
								var slice = this;
								this.css( slice1Style );
								setTimeout( function() {
									
									slice.css( resetStyle );

								}, 50 );
										 
							}, 
							function() {
								
								var slice = this;
								setTimeout( function() {
									
									slice.css( slice1Style );

								}, 50 );
						
							}
						)
						.clone()
						.appendTo( $movingSlide )
						.cond(
							dir === 'prev', 
							function() {
								
								var slice = this;
								this.css( slice2Style );
								setTimeout( function() {

									$currentSlide.addClass( 'sl-trans-back-elems' );

									if( self.support ) {

										slice.css( resetStyle ).on( self.transEndEventName, function() {

											self._onEndNavigate( slice, $currentSlide, dir );

										} );

									}
									else {

										self._onEndNavigate( slice, $currentSlide, dir );

									}

								}, 50 );
						
							},
							function() {
								
								var slice = this;
								setTimeout( function() {

									$nextSlide.addClass( 'sl-trans-elems' );
									
									if( self.support ) {

										slice.css( slice2Style ).on( self.transEndEventName, function() {

											self._onEndNavigate( slice, $currentSlide, dir );

										} );

									}
									else {

										self._onEndNavigate( slice, $currentSlide, dir );

									}

								}, 50 );
								
							}
						)
						.find( 'div.sl-content-wrapper' )
						.css( cssStyle );
			
			$nextSlide.show();
			
		},
		_validateValues : function( config ) {
			
			// OK, so we are restricting the angles and scale values here.
			// This is to avoid the slices wrong sides to be shown.
			// you can adjust these values as you wish but make sure you also ajust the
			// paddings of the slides and also the options.translateFactor value and scale data attrs
			if( config.slice1angle > this.options.maxAngle || config.slice1angle < -this.options.maxAngle ) {
				
				config.slice1angle = this.options.maxAngle;
			
			}
			if( config.slice2angle > this.options.maxAngle  || config.slice2angle < -this.options.maxAngle ) {
				
				config.slice2angle = this.options.maxAngle;
			
			}
			if( config.slice1scale > this.options.maxScale || config.slice1scale <= 0 ) {
			
				config.slice1scale = this.options.maxScale;
			
			}
			if( config.slice2scale > this.options.maxScale || config.slice2scale <= 0 ) {
				
				config.slice2scale = this.options.maxScale;
			
			}
			if( config.orientation !== 'vertical' && config.orientation !== 'horizontal' ) {
			
				config.orientation = 'horizontal'
			
			}
			
		},
		_onEndNavigate : function( $slice, $oldSlide, dir ) {
			
			// reset previous slide's style after next slide is shown
			var $slide = $slice.parent(),
				removeClasses = 'sl-trans-elems sl-trans-back-elems';
			
			// remove second slide's slice
			$slice.remove();
			// unwrap..
			$slide.css( 'z-index', 1 )
				  .find( 'div.sl-content-wrapper' )
				  .unwrap();
			
			// hide previous current slide
			$oldSlide.hide().removeClass( removeClasses );
			$slide.removeClass( removeClasses );
			// now we can navigate again..
			this.isAnimating = false;
			this.options.onAfterChange( $slide, this.current );
			
		},
		_setSize : function() {
		
			// the slider and content wrappers will have the window's width and height
			var cssStyle = {
				width : this.size.width,
				height : this.size.height
			};
			
			this.$el.css( cssStyle ).find( 'div.sl-content-wrapper' ).css( cssStyle );
		
		},
		_loadEvents : function() {
			
			var self = this;
			
			$window.on( 'debouncedresize.slitslider', function( event ) {
				
				// update size values
				self._getSize();
				// set the sizes again
				self._setSize();
				
			} );

			if ( this.options.keyboard ) {
				
				$document.on( 'keydown.slitslider', function(e) {

					var keyCode = e.keyCode || e.which,
						arrow = {
							left: 37,
							up: 38,
							right: 39,
							down: 40
						};

					switch (keyCode) {
						
						case arrow.left :

							self._stopSlideshow();
							self._navigate( 'prev' );
							break;
						
						case arrow.right :
							
							self._stopSlideshow();
							self._navigate( 'next' );
							break;

					}

				} );

			}
		
		},
		_startSlideshow: function() {

			var self = this;

			this.slideshow = setTimeout( function() {

				self._navigate( 'next' );

				if ( self.options.autoplay ) {

					self._startSlideshow();

				}

			}, this.options.interval );

		},
		_stopSlideshow: function() {

			if ( this.options.autoplay ) {

				clearTimeout( this.slideshow );
				this.isPlaying = false;
				this.options.autoplay = false;

			}

		},
		_destroy : function( callback ) {
			
			this.$el.off( '.slitslider' ).removeData( 'slitslider' );
			$window.off( '.slitslider' );
			$document.off( '.slitslider' );
			this.$slides.each( function( i ) {

				var $slide = $( this ),
					$content = $slide.find( 'div.sl-content' ).children();

				$content.appendTo( $slide );
				$slide.children( 'div.sl-content-wrapper' ).remove();

			} );
			this.$slides.unwrap( this.$slideWrapper ).hide();
			this.$slides.eq( 0 ).show();
			if( callback ) {

				callback.call();

			}

		},
		// public methos: adds more slides to the slider
		add : function( $slides, callback ) {

			this.$slides = this.$slides.add( $slides );

			var self = this;
			
			
			$slides.each( function( i ) {

				var $slide = $( this ),
					// vertical || horizontal
					orientation = $slide.data( 'orientation' );

				$slide.hide().addClass( 'sl-slide-' + orientation )
					  .children()
					  .wrapAll( '<div class="sl-content-wrapper" />' )
					  .wrapAll( '<div class="sl-content" />' )
					  .end()
					  .appendTo( self.$el.find( 'div.sl-slides-wrapper' ) );

			} );

			this._setSize();

			this.slidesCount = this.$slides.length;
			
			if ( callback ) {

				callback.call( $items );

			}

		},
		// public method: shows next slide
		next : function() {

			this._stopSlideshow();
			this._navigate( 'next' );

		},
		// public method: shows previous slide
		previous : function() {

			this._stopSlideshow();
			this._navigate( 'prev' );

		},
		// public method: goes to a specific slide
		jump : function( pos ) {

			pos -= 1;

			if( pos === this.current || pos >= this.slidesCount || pos < 0 ) {

				return false;

			}

			this._stopSlideshow();
			this._navigate( pos > this.current ? 'next' : 'prev', pos );

		},
		// public method: starts the slideshow
		// any call to next(), previous() or jump() will stop the slideshow
		play : function() {

			if( !this.isPlaying ) {

				this.isPlaying = true;

				this._navigate( 'next' );
				this.options.autoplay = true;
				this._startSlideshow();

			}

		},
		// public method: pauses the slideshow
		pause : function() {

			if( this.isPlaying ) {

				this._stopSlideshow();

			}

		},
		// public method: check if isAnimating is true
		isActive : function() {

			return this.isAnimating;

		},
		// publicc methos: destroys the slicebox instance
		destroy : function( callback ) {

			this._destroy( callback );
		
		}

	};
	
	var logError = function( message ) {

		if ( window.console ) {

			window.console.error( message );
		
		}

	};
	
	$.fn.slitslider = function( options ) {

		var self = $.data( this, 'slitslider' );
		
		if ( typeof options === 'string' ) {
			
			var args = Array.prototype.slice.call( arguments, 1 );
			
			this.each(function() {
			
				if ( !self ) {

					logError( "cannot call methods on slitslider prior to initialization; " +
					"attempted to call method '" + options + "'" );
					return;
				
				}
				
				if ( !$.isFunction( self[options] ) || options.charAt(0) === "_" ) {

					logError( "no such method '" + options + "' for slitslider self" );
					return;
				
				}
				
				self[ options ].apply( self, args );
			
			});
		
		} 
		else {
		
			this.each(function() {
				
				if ( self ) {

					self._init();
				
				}
				else {

					self = $.data( this, 'slitslider', new $.Slitslider( options, this ) );
				
				}

			});
		
		}
		
		return self;
		
	};
	
} )( jQuery, window );

$(function() {
			
	var Page = (function() {

		var $navArrows = $( '#nav-arrows' ),
			$nav = $( '#nav-dots > span' ),
			slitslider = $( '#slider' ).slitslider( {
				onBeforeChange : function( slide, pos ) {

					$nav.removeClass( 'nav-dot-current' );
					$nav.eq( pos ).addClass( 'nav-dot-current' );

				}
			} ),

			init = function() {

				initEvents();
				
			},
			initEvents = function() {

				// add navigation events
				$navArrows.children( ':last' ).on( 'click', function() {

					slitslider.next();
					return false;

				} );

				$navArrows.children( ':first' ).on( 'click', function() {
					
					slitslider.previous();
					return false;

				} );

				$nav.each( function( i ) {
				
					$( this ).on( 'click', function( event ) {
						
						var $dot = $( this );
						
						if( !slitslider.isActive() ) {

							$nav.removeClass( 'nav-dot-current' );
							$dot.addClass( 'nav-dot-current' );
						
						}
						
						slitslider.jump( i + 1 );
						return false;
					
					} );
					
				} );

			};

			return { init : init };

	})();

	Page.init();

	/**
	 * Notes: 
	 * 
	 * example how to add items:
	 */

	/*
	
	var $items  = $('<div class="sl-slide sl-slide-color-2" data-orientation="horizontal" data-slice1-rotation="-5" data-slice2-rotation="10" data-slice1-scale="2" data-slice2-scale="1"><div class="sl-slide-inner bg-1"><div class="sl-deco" data-icon="t"></div><h2>some text</h2><blockquote><p>bla bla</p><cite>Margi Clarke</cite></blockquote></div></div>');
	
	// call the plugin's add method
	ss.add($items);

	*/

});
eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('7(A 3c.3q!=="9"){3c.3q=9(e){9 t(){}t.5S=e;p 5R t}}(9(e,t,n){h r={1N:9(t,n){h r=c;r.$k=e(n);r.6=e.4M({},e.37.2B.6,r.$k.v(),t);r.2A=t;r.4L()},4L:9(){9 r(e){h n,r="";7(A t.6.33==="9"){t.6.33.R(c,[e])}l{1A(n 38 e.d){7(e.d.5M(n)){r+=e.d[n].1K}}t.$k.2y(r)}t.3t()}h t=c,n;7(A t.6.2H==="9"){t.6.2H.R(c,[t.$k])}7(A t.6.2O==="2Y"){n=t.6.2O;e.5K(n,r)}l{t.3t()}},3t:9(){h e=c;e.$k.v("d-4I",e.$k.2x("2w")).v("d-4F",e.$k.2x("H"));e.$k.z({2u:0});e.2t=e.6.q;e.4E();e.5v=0;e.1X=14;e.23()},23:9(){h e=c;7(e.$k.25().N===0){p b}e.1M();e.4C();e.$S=e.$k.25();e.E=e.$S.N;e.4B();e.$G=e.$k.17(".d-1K");e.$K=e.$k.17(".d-1p");e.3u="U";e.13=0;e.26=[0];e.m=0;e.4A();e.4z()},4z:9(){h e=c;e.2V();e.2W();e.4t();e.30();e.4r();e.4q();e.2p();e.4o();7(e.6.2o!==b){e.4n(e.6.2o)}7(e.6.O===j){e.6.O=4Q}e.19();e.$k.17(".d-1p").z("4i","4h");7(!e.$k.2m(":3n")){e.3o()}l{e.$k.z("2u",1)}e.5O=b;e.2l();7(A e.6.3s==="9"){e.6.3s.R(c,[e.$k])}},2l:9(){h e=c;7(e.6.1Z===j){e.1Z()}7(e.6.1B===j){e.1B()}e.4g();7(A e.6.3w==="9"){e.6.3w.R(c,[e.$k])}},3x:9(){h e=c;7(A e.6.3B==="9"){e.6.3B.R(c,[e.$k])}e.3o();e.2V();e.2W();e.4f();e.30();e.2l();7(A e.6.3D==="9"){e.6.3D.R(c,[e.$k])}},3F:9(){h e=c;t.1c(9(){e.3x()},0)},3o:9(){h e=c;7(e.$k.2m(":3n")===b){e.$k.z({2u:0});t.18(e.1C);t.18(e.1X)}l{p b}e.1X=t.4d(9(){7(e.$k.2m(":3n")){e.3F();e.$k.4b({2u:1},2M);t.18(e.1X)}},5x)},4B:9(){h e=c;e.$S.5n(\'<L H="d-1p">\').4a(\'<L H="d-1K"></L>\');e.$k.17(".d-1p").4a(\'<L H="d-1p-49">\');e.1H=e.$k.17(".d-1p-49");e.$k.z("4i","4h")},1M:9(){h e=c,t=e.$k.1I(e.6.1M),n=e.$k.1I(e.6.2i);7(!t){e.$k.I(e.6.1M)}7(!n){e.$k.I(e.6.2i)}},2V:9(){h t=c,n,r;7(t.6.2Z===b){p b}7(t.6.48===j){t.6.q=t.2t=1;t.6.1h=b;t.6.1s=b;t.6.1O=b;t.6.22=b;t.6.1Q=b;t.6.1R=b;p b}n=e(t.6.47).1f();7(n>(t.6.1s[0]||t.2t)){t.6.q=t.2t}7(t.6.1h!==b){t.6.1h.5g(9(e,t){p e[0]-t[0]});1A(r=0;r<t.6.1h.N;r+=1){7(t.6.1h[r][0]<=n){t.6.q=t.6.1h[r][1]}}}l{7(n<=t.6.1s[0]&&t.6.1s!==b){t.6.q=t.6.1s[1]}7(n<=t.6.1O[0]&&t.6.1O!==b){t.6.q=t.6.1O[1]}7(n<=t.6.22[0]&&t.6.22!==b){t.6.q=t.6.22[1]}7(n<=t.6.1Q[0]&&t.6.1Q!==b){t.6.q=t.6.1Q[1]}7(n<=t.6.1R[0]&&t.6.1R!==b){t.6.q=t.6.1R[1]}}7(t.6.q>t.E&&t.6.46===j){t.6.q=t.E}},4r:9(){h n=c,r,i;7(n.6.2Z!==j){p b}i=e(t).1f();n.3d=9(){7(e(t).1f()!==i){7(n.6.O!==b){t.18(n.1C)}t.5d(r);r=t.1c(9(){i=e(t).1f();n.3x()},n.6.45)}};e(t).44(n.3d)},4f:9(){h e=c;e.2g(e.m);7(e.6.O!==b){e.3j()}},43:9(){h t=c,n=0,r=t.E-t.6.q;t.$G.2f(9(i){h s=e(c);s.z({1f:t.M}).v("d-1K",3p(i));7(i%t.6.q===0||i===r){7(!(i>r)){n+=1}}s.v("d-24",n)})},42:9(){h e=c,t=e.$G.N*e.M;e.$K.z({1f:t*2,T:0});e.43()},2W:9(){h e=c;e.40();e.42();e.3Z();e.3v()},40:9(){h e=c;e.M=1F.4O(e.$k.1f()/e.6.q)},3v:9(){h e=c,t=(e.E*e.M-e.6.q*e.M)*-1;7(e.6.q>e.E){e.D=0;t=0;e.3z=0}l{e.D=e.E-e.6.q;e.3z=t}p t},3Y:9(){p 0},3Z:9(){h t=c,n=0,r=0,i,s,o;t.J=[0];t.3E=[];1A(i=0;i<t.E;i+=1){r+=t.M;t.J.2D(-r);7(t.6.12===j){s=e(t.$G[i]);o=s.v("d-24");7(o!==n){t.3E[n]=t.J[i];n=o}}}},4t:9(){h t=c;7(t.6.2a===j||t.6.1v===j){t.B=e(\'<L H="d-5A"/>\').5m("5l",!t.F.15).5c(t.$k)}7(t.6.1v===j){t.3T()}7(t.6.2a===j){t.3S()}},3S:9(){h t=c,n=e(\'<L H="d-4U"/>\');t.B.1o(n);t.1u=e("<L/>",{"H":"d-1n",2y:t.6.2U[0]||""});t.1q=e("<L/>",{"H":"d-U",2y:t.6.2U[1]||""});n.1o(t.1u).1o(t.1q);n.w("2X.B 21.B",\'L[H^="d"]\',9(e){e.1l()});n.w("2n.B 28.B",\'L[H^="d"]\',9(n){n.1l();7(e(c).1I("d-U")){t.U()}l{t.1n()}})},3T:9(){h t=c;t.1k=e(\'<L H="d-1v"/>\');t.B.1o(t.1k);t.1k.w("2n.B 28.B",".d-1j",9(n){n.1l();7(3p(e(c).v("d-1j"))!==t.m){t.1g(3p(e(c).v("d-1j")),j)}})},3P:9(){h t=c,n,r,i,s,o,u;7(t.6.1v===b){p b}t.1k.2y("");n=0;r=t.E-t.E%t.6.q;1A(s=0;s<t.E;s+=1){7(s%t.6.q===0){n+=1;7(r===s){i=t.E-t.6.q}o=e("<L/>",{"H":"d-1j"});u=e("<3N></3N>",{4R:t.6.39===j?n:"","H":t.6.39===j?"d-59":""});o.1o(u);o.v("d-1j",r===s?i:s);o.v("d-24",n);t.1k.1o(o)}}t.35()},35:9(){h t=c;7(t.6.1v===b){p b}t.1k.17(".d-1j").2f(9(){7(e(c).v("d-24")===e(t.$G[t.m]).v("d-24")){t.1k.17(".d-1j").Z("2d");e(c).I("2d")}})},3e:9(){h e=c;7(e.6.2a===b){p b}7(e.6.2e===b){7(e.m===0&&e.D===0){e.1u.I("1b");e.1q.I("1b")}l 7(e.m===0&&e.D!==0){e.1u.I("1b");e.1q.Z("1b")}l 7(e.m===e.D){e.1u.Z("1b");e.1q.I("1b")}l 7(e.m!==0&&e.m!==e.D){e.1u.Z("1b");e.1q.Z("1b")}}},30:9(){h e=c;e.3P();e.3e();7(e.B){7(e.6.q>=e.E){e.B.3K()}l{e.B.3J()}}},55:9(){h e=c;7(e.B){e.B.3k()}},U:9(e){h t=c;7(t.1E){p b}t.m+=t.6.12===j?t.6.q:1;7(t.m>t.D+(t.6.12===j?t.6.q-1:0)){7(t.6.2e===j){t.m=0;e="2k"}l{t.m=t.D;p b}}t.1g(t.m,e)},1n:9(e){h t=c;7(t.1E){p b}7(t.6.12===j&&t.m>0&&t.m<t.6.q){t.m=0}l{t.m-=t.6.12===j?t.6.q:1}7(t.m<0){7(t.6.2e===j){t.m=t.D;e="2k"}l{t.m=0;p b}}t.1g(t.m,e)},1g:9(e,n,r){h i=c,s;7(i.1E){p b}7(A i.6.1Y==="9"){i.6.1Y.R(c,[i.$k])}7(e>=i.D){e=i.D}l 7(e<=0){e=0}i.m=i.d.m=e;7(i.6.2o!==b&&r!=="4e"&&i.6.q===1&&i.F.1x===j){i.1t(0);7(i.F.1x===j){i.1L(i.J[e])}l{i.1r(i.J[e],1)}i.2r();i.4l();p b}s=i.J[e];7(i.F.1x===j){i.1T=b;7(n===j){i.1t("1w");t.1c(9(){i.1T=j},i.6.1w)}l 7(n==="2k"){i.1t(i.6.2v);t.1c(9(){i.1T=j},i.6.2v)}l{i.1t("1m");t.1c(9(){i.1T=j},i.6.1m)}i.1L(s)}l{7(n===j){i.1r(s,i.6.1w)}l 7(n==="2k"){i.1r(s,i.6.2v)}l{i.1r(s,i.6.1m)}}i.2r()},2g:9(e){h t=c;7(A t.6.1Y==="9"){t.6.1Y.R(c,[t.$k])}7(e>=t.D||e===-1){e=t.D}l 7(e<=0){e=0}t.1t(0);7(t.F.1x===j){t.1L(t.J[e])}l{t.1r(t.J[e],1)}t.m=t.d.m=e;t.2r()},2r:9(){h e=c;e.26.2D(e.m);e.13=e.d.13=e.26[e.26.N-2];e.26.5f(0);7(e.13!==e.m){e.35();e.3e();e.2l();7(e.6.O!==b){e.3j()}}7(A e.6.3y==="9"&&e.13!==e.m){e.6.3y.R(c,[e.$k])}},X:9(){h e=c;e.3A="X";t.18(e.1C)},3j:9(){h e=c;7(e.3A!=="X"){e.19()}},19:9(){h e=c;e.3A="19";7(e.6.O===b){p b}t.18(e.1C);e.1C=t.4d(9(){e.U(j)},e.6.O)},1t:9(e){h t=c;7(e==="1m"){t.$K.z(t.2z(t.6.1m))}l 7(e==="1w"){t.$K.z(t.2z(t.6.1w))}l 7(A e!=="2Y"){t.$K.z(t.2z(e))}},2z:9(e){p{"-1G-1a":"2C "+e+"1z 2s","-1W-1a":"2C "+e+"1z 2s","-o-1a":"2C "+e+"1z 2s",1a:"2C "+e+"1z 2s"}},3H:9(){p{"-1G-1a":"","-1W-1a":"","-o-1a":"",1a:""}},3I:9(e){p{"-1G-P":"1i("+e+"V, C, C)","-1W-P":"1i("+e+"V, C, C)","-o-P":"1i("+e+"V, C, C)","-1z-P":"1i("+e+"V, C, C)",P:"1i("+e+"V, C,C)"}},1L:9(e){h t=c;t.$K.z(t.3I(e))},3L:9(e){h t=c;t.$K.z({T:e})},1r:9(e,t){h n=c;n.29=b;n.$K.X(j,j).4b({T:e},{54:t||n.6.1m,3M:9(){n.29=j}})},4E:9(){h e=c,r="1i(C, C, C)",i=n.56("L"),s,o,u,a;i.2w.3O="  -1W-P:"+r+"; -1z-P:"+r+"; -o-P:"+r+"; -1G-P:"+r+"; P:"+r;s=/1i\\(C, C, C\\)/g;o=i.2w.3O.5i(s);u=o!==14&&o.N===1;a="5z"38 t||t.5Q.4P;e.F={1x:u,15:a}},4q:9(){h e=c;7(e.6.27!==b||e.6.1U!==b){e.3Q();e.3R()}},4C:9(){h e=c,t=["s","e","x"];e.16={};7(e.6.27===j&&e.6.1U===j){t=["2X.d 21.d","2N.d 3U.d","2n.d 3V.d 28.d"]}l 7(e.6.27===b&&e.6.1U===j){t=["2X.d","2N.d","2n.d 3V.d"]}l 7(e.6.27===j&&e.6.1U===b){t=["21.d","3U.d","28.d"]}e.16.3W=t[0];e.16.2K=t[1];e.16.2J=t[2]},3R:9(){h t=c;t.$k.w("5y.d",9(e){e.1l()});t.$k.w("21.3X",9(t){p e(t.1d).2m("5C, 5E, 5F, 5N")})},3Q:9(){9 s(e){7(e.2b!==W){p{x:e.2b[0].2c,y:e.2b[0].41}}7(e.2b===W){7(e.2c!==W){p{x:e.2c,y:e.41}}7(e.2c===W){p{x:e.52,y:e.53}}}}9 o(t){7(t==="w"){e(n).w(r.16.2K,a);e(n).w(r.16.2J,f)}l 7(t==="Q"){e(n).Q(r.16.2K);e(n).Q(r.16.2J)}}9 u(n){h u=n.3h||n||t.3g,a;7(u.5a===3){p b}7(r.E<=r.6.q){p}7(r.29===b&&!r.6.3f){p b}7(r.1T===b&&!r.6.3f){p b}7(r.6.O!==b){t.18(r.1C)}7(r.F.15!==j&&!r.$K.1I("3b")){r.$K.I("3b")}r.11=0;r.Y=0;e(c).z(r.3H());a=e(c).2h();i.2S=a.T;i.2R=s(u).x-a.T;i.2P=s(u).y-a.5o;o("w");i.2j=b;i.2L=u.1d||u.4c}9 a(o){h u=o.3h||o||t.3g,a,f;r.11=s(u).x-i.2R;r.2I=s(u).y-i.2P;r.Y=r.11-i.2S;7(A r.6.2E==="9"&&i.3C!==j&&r.Y!==0){i.3C=j;r.6.2E.R(r,[r.$k])}7((r.Y>8||r.Y<-8)&&r.F.15===j){7(u.1l!==W){u.1l()}l{u.5L=b}i.2j=j}7((r.2I>10||r.2I<-10)&&i.2j===b){e(n).Q("2N.d")}a=9(){p r.Y/5};f=9(){p r.3z+r.Y/5};r.11=1F.3v(1F.3Y(r.11,a()),f());7(r.F.1x===j){r.1L(r.11)}l{r.3L(r.11)}}9 f(n){h s=n.3h||n||t.3g,u,a,f;s.1d=s.1d||s.4c;i.3C=b;7(r.F.15!==j){r.$K.Z("3b")}7(r.Y<0){r.1y=r.d.1y="T"}l{r.1y=r.d.1y="3i"}7(r.Y!==0){u=r.4j();r.1g(u,b,"4e");7(i.2L===s.1d&&r.F.15!==j){e(s.1d).w("3a.4k",9(t){t.4S();t.4T();t.1l();e(t.1d).Q("3a.4k")});a=e.4N(s.1d,"4V").3a;f=a.4W();a.4X(0,0,f)}}o("Q")}h r=c,i={2R:0,2P:0,4Y:0,2S:0,2h:14,4Z:14,50:14,2j:14,51:14,2L:14};r.29=j;r.$k.w(r.16.3W,".d-1p",u)},4j:9(){h e=c,t=e.4m();7(t>e.D){e.m=e.D;t=e.D}l 7(e.11>=0){t=0;e.m=0}p t},4m:9(){h t=c,n=t.6.12===j?t.3E:t.J,r=t.11,i=14;e.2f(n,9(s,o){7(r-t.M/20>n[s+1]&&r-t.M/20<o&&t.34()==="T"){i=o;7(t.6.12===j){t.m=e.4p(i,t.J)}l{t.m=s}}l 7(r+t.M/20<o&&r+t.M/20>(n[s+1]||n[s]-t.M)&&t.34()==="3i"){7(t.6.12===j){i=n[s+1]||n[n.N-1];t.m=e.4p(i,t.J)}l{i=n[s+1];t.m=s+1}}});p t.m},34:9(){h e=c,t;7(e.Y<0){t="3i";e.3u="U"}l{t="T";e.3u="1n"}p t},4A:9(){h e=c;e.$k.w("d.U",9(){e.U()});e.$k.w("d.1n",9(){e.1n()});e.$k.w("d.19",9(t,n){e.6.O=n;e.19();e.32="19"});e.$k.w("d.X",9(){e.X();e.32="X"});e.$k.w("d.1g",9(t,n){e.1g(n)});e.$k.w("d.2g",9(t,n){e.2g(n)})},2p:9(){h e=c;7(e.6.2p===j&&e.F.15!==j&&e.6.O!==b){e.$k.w("57",9(){e.X()});e.$k.w("58",9(){7(e.32!=="X"){e.19()}})}},1Z:9(){h t=c,n,r,i,s,o;7(t.6.1Z===b){p b}1A(n=0;n<t.E;n+=1){r=e(t.$G[n]);7(r.v("d-1e")==="1e"){4s}i=r.v("d-1K");s=r.17(".5b");7(A s.v("1J")!=="2Y"){r.v("d-1e","1e");4s}7(r.v("d-1e")===W){s.3K();r.I("4u").v("d-1e","5e")}7(t.6.4v===j){o=i>=t.m}l{o=j}7(o&&i<t.m+t.6.q&&s.N){t.4w(r,s)}}},4w:9(e,n){9 o(){e.v("d-1e","1e").Z("4u");n.5h("v-1J");7(r.6.4x==="4y"){n.5j(5k)}l{n.3J()}7(A r.6.2T==="9"){r.6.2T.R(c,[r.$k])}}9 u(){i+=1;7(r.2Q(n.3l(0))||s===j){o()}l 7(i<=2q){t.1c(u,2q)}l{o()}}h r=c,i=0,s;7(n.5p("5q")==="5r"){n.z("5s-5t","5u("+n.v("1J")+")");s=j}l{n[0].1J=n.v("1J")}u()},1B:9(){9 s(){h r=e(n.$G[n.m]).2G();n.1H.z("2G",r+"V");7(!n.1H.1I("1B")){t.1c(9(){n.1H.I("1B")},0)}}9 o(){i+=1;7(n.2Q(r.3l(0))){s()}l 7(i<=2q){t.1c(o,2q)}l{n.1H.z("2G","")}}h n=c,r=e(n.$G[n.m]).17("5w"),i;7(r.3l(0)!==W){i=0;o()}l{s()}},2Q:9(e){h t;7(!e.3M){p b}t=A e.4D;7(t!=="W"&&e.4D===0){p b}p j},4g:9(){h t=c,n;7(t.6.2F===j){t.$G.Z("2d")}t.1D=[];1A(n=t.m;n<t.m+t.6.q;n+=1){t.1D.2D(n);7(t.6.2F===j){e(t.$G[n]).I("2d")}}t.d.1D=t.1D},4n:9(e){h t=c;t.4G="d-"+e+"-5B";t.4H="d-"+e+"-38"},4l:9(){9 a(e){p{2h:"5D",T:e+"V"}}h e=c,t=e.4G,n=e.4H,r=e.$G.1S(e.m),i=e.$G.1S(e.13),s=1F.4J(e.J[e.m])+e.J[e.13],o=1F.4J(e.J[e.m])+e.M/2,u="5G 5H 5I 5J";e.1E=j;e.$K.I("d-1P").z({"-1G-P-1P":o+"V","-1W-4K-1P":o+"V","4K-1P":o+"V"});i.z(a(s,10)).I(t).w(u,9(){e.3m=j;i.Q(u);e.31(i,t)});r.I(n).w(u,9(){e.36=j;r.Q(u);e.31(r,n)})},31:9(e,t){h n=c;e.z({2h:"",T:""}).Z(t);7(n.3m&&n.36){n.$K.Z("d-1P");n.3m=b;n.36=b;n.1E=b}},4o:9(){h e=c;e.d={2A:e.2A,5P:e.$k,S:e.$S,G:e.$G,m:e.m,13:e.13,1D:e.1D,15:e.F.15,F:e.F,1y:e.1y}},3G:9(){h r=c;r.$k.Q(".d d 21.3X");e(n).Q(".d d");e(t).Q("44",r.3d)},1V:9(){h e=c;7(e.$k.25().N!==0){e.$K.3r();e.$S.3r().3r();7(e.B){e.B.3k()}}e.3G();e.$k.2x("2w",e.$k.v("d-4I")||"").2x("H",e.$k.v("d-4F"))},5T:9(){h e=c;e.X();t.18(e.1X);e.1V();e.$k.5U()},5V:9(t){h n=c,r=e.4M({},n.2A,t);n.1V();n.1N(r,n.$k)},5W:9(e,t){h n=c,r;7(!e){p b}7(n.$k.25().N===0){n.$k.1o(e);n.23();p b}n.1V();7(t===W||t===-1){r=-1}l{r=t}7(r>=n.$S.N||r===-1){n.$S.1S(-1).5X(e)}l{n.$S.1S(r).5Y(e)}n.23()},5Z:9(e){h t=c,n;7(t.$k.25().N===0){p b}7(e===W||e===-1){n=-1}l{n=e}t.1V();t.$S.1S(n).3k();t.23()}};e.37.2B=9(t){p c.2f(9(){7(e(c).v("d-1N")===j){p b}e(c).v("d-1N",j);h n=3c.3q(r);n.1N(t,c);e.v(c,"2B",n)})};e.37.2B.6={q:5,1h:b,1s:[60,4],1O:[61,3],22:[62,2],1Q:b,1R:[63,1],48:b,46:b,1m:2M,1w:64,2v:65,O:b,2p:b,2a:b,2U:["1n","U"],2e:j,12:b,1v:j,39:b,2Z:j,45:2M,47:t,1M:"d-66",2i:"d-2i",1Z:b,4v:j,4x:"4y",1B:b,2O:b,33:b,3f:j,27:j,1U:j,2F:b,2o:b,3B:b,3D:b,2H:b,3s:b,1Y:b,3y:b,3w:b,2E:b,2T:b}})(67,68,69)',62,382,'||||||options|if||function||false|this|owl||||var||true|elem|else|currentItem|||return|items|||||data|on|||css|typeof|owlControls|0px|maximumItem|itemsAmount|browser|owlItems|class|addClass|positionsInArray|owlWrapper|div|itemWidth|length|autoPlay|transform|off|apply|userItems|left|next|px|undefined|stop|newRelativeX|removeClass||newPosX|scrollPerPage|prevItem|null|isTouch|ev_types|find|clearInterval|play|transition|disabled|setTimeout|target|loaded|width|goTo|itemsCustom|translate3d|page|paginationWrapper|preventDefault|slideSpeed|prev|append|wrapper|buttonNext|css2slide|itemsDesktop|swapSpeed|buttonPrev|pagination|paginationSpeed|support3d|dragDirection|ms|for|autoHeight|autoPlayInterval|visibleItems|isTransition|Math|webkit|wrapperOuter|hasClass|src|item|transition3d|baseClass|init|itemsDesktopSmall|origin|itemsTabletSmall|itemsMobile|eq|isCss3Finish|touchDrag|unWrap|moz|checkVisible|beforeMove|lazyLoad||mousedown|itemsTablet|setVars|roundPages|children|prevArr|mouseDrag|mouseup|isCssFinish|navigation|touches|pageX|active|rewindNav|each|jumpTo|position|theme|sliding|rewind|eachMoveUpdate|is|touchend|transitionStyle|stopOnHover|100|afterGo|ease|orignalItems|opacity|rewindSpeed|style|attr|html|addCssSpeed|userOptions|owlCarousel|all|push|startDragging|addClassActive|height|beforeInit|newPosY|end|move|targetElement|200|touchmove|jsonPath|offsetY|completeImg|offsetX|relativePos|afterLazyLoad|navigationText|updateItems|calculateAll|touchstart|string|responsive|updateControls|clearTransStyle|hoverStatus|jsonSuccess|moveDirection|checkPagination|endCurrent|fn|in|paginationNumbers|click|grabbing|Object|resizer|checkNavigation|dragBeforeAnimFinish|event|originalEvent|right|checkAp|remove|get|endPrev|visible|watchVisibility|Number|create|unwrap|afterInit|logIn|playDirection|max|afterAction|updateVars|afterMove|maximumPixels|apStatus|beforeUpdate|dragging|afterUpdate|pagesInArray|reload|clearEvents|removeTransition|doTranslate|show|hide|css2move|complete|span|cssText|updatePagination|gestures|disabledEvents|buildButtons|buildPagination|mousemove|touchcancel|start|disableTextSelect|min|loops|calculateWidth|pageY|appendWrapperSizes|appendItemsSizes|resize|responsiveRefreshRate|itemsScaleUp|responsiveBaseWidth|singleItem|outer|wrap|animate|srcElement|setInterval|drag|updatePosition|onVisibleItems|block|display|getNewPosition|disable|singleItemTransition|closestItem|transitionTypes|owlStatus|inArray|moveEvents|response|continue|buildControls|loading|lazyFollow|lazyPreload|lazyEffect|fade|onStartup|customEvents|wrapItems|eventTypes|naturalWidth|checkBrowser|originalClasses|outClass|inClass|originalStyles|abs|perspective|loadContent|extend|_data|round|msMaxTouchPoints|5e3|text|stopImmediatePropagation|stopPropagation|buttons|events|pop|splice|baseElWidth|minSwipe|maxSwipe|dargging|clientX|clientY|duration|destroyControls|createElement|mouseover|mouseout|numbers|which|lazyOwl|appendTo|clearTimeout|checked|shift|sort|removeAttr|match|fadeIn|400|clickable|toggleClass|wrapAll|top|prop|tagName|DIV|background|image|url|wrapperWidth|img|500|dragstart|ontouchstart|controls|out|input|relative|textarea|select|webkitAnimationEnd|oAnimationEnd|MSAnimationEnd|animationend|getJSON|returnValue|hasOwnProperty|option|onstartup|baseElement|navigator|new|prototype|destroy|removeData|reinit|addItem|after|before|removeItem|1199|979|768|479|800|1e3|carousel|jQuery|window|document'.split('|'),0,{}))
/*! Stellar.js v0.6.2 | Copyright 2014, Mark Dalgleish | http://markdalgleish.com/projects/stellar.js | http://markdalgleish.mit-license.org */
!function(a,b,c,d){function e(b,c){this.element=b,this.options=a.extend({},g,c),this._defaults=g,this._name=f,this.init()}var f="stellar",g={scrollProperty:"scroll",positionProperty:"position",horizontalScrolling:!0,verticalScrolling:!0,horizontalOffset:0,verticalOffset:0,responsive:!1,parallaxBackgrounds:!0,parallaxElements:!0,hideDistantElements:!0,hideElement:function(a){a.hide()},showElement:function(a){a.show()}},h={scroll:{getLeft:function(a){return a.scrollLeft()},setLeft:function(a,b){a.scrollLeft(b)},getTop:function(a){return a.scrollTop()},setTop:function(a,b){a.scrollTop(b)}},position:{getLeft:function(a){return-1*parseInt(a.css("left"),10)},getTop:function(a){return-1*parseInt(a.css("top"),10)}},margin:{getLeft:function(a){return-1*parseInt(a.css("margin-left"),10)},getTop:function(a){return-1*parseInt(a.css("margin-top"),10)}},transform:{getLeft:function(a){var b=getComputedStyle(a[0])[k];return"none"!==b?-1*parseInt(b.match(/(-?[0-9]+)/g)[4],10):0},getTop:function(a){var b=getComputedStyle(a[0])[k];return"none"!==b?-1*parseInt(b.match(/(-?[0-9]+)/g)[5],10):0}}},i={position:{setLeft:function(a,b){a.css("left",b)},setTop:function(a,b){a.css("top",b)}},transform:{setPosition:function(a,b,c,d,e){a[0].style[k]="translate3d("+(b-c)+"px, "+(d-e)+"px, 0)"}}},j=function(){var b,c=/^(Moz|Webkit|Khtml|O|ms|Icab)(?=[A-Z])/,d=a("script")[0].style,e="";for(b in d)if(c.test(b)){e=b.match(c)[0];break}return"WebkitOpacity"in d&&(e="Webkit"),"KhtmlOpacity"in d&&(e="Khtml"),function(a){return e+(e.length>0?a.charAt(0).toUpperCase()+a.slice(1):a)}}(),k=j("transform"),l=a("<div />",{style:"background:#fff"}).css("background-position-x")!==d,m=l?function(a,b,c){a.css({"background-position-x":b,"background-position-y":c})}:function(a,b,c){a.css("background-position",b+" "+c)},n=l?function(a){return[a.css("background-position-x"),a.css("background-position-y")]}:function(a){return a.css("background-position").split(" ")},o=b.requestAnimationFrame||b.webkitRequestAnimationFrame||b.mozRequestAnimationFrame||b.oRequestAnimationFrame||b.msRequestAnimationFrame||function(a){setTimeout(a,1e3/60)};e.prototype={init:function(){this.options.name=f+"_"+Math.floor(1e9*Math.random()),this._defineElements(),this._defineGetters(),this._defineSetters(),this._handleWindowLoadAndResize(),this._detectViewport(),this.refresh({firstLoad:!0}),"scroll"===this.options.scrollProperty?this._handleScrollEvent():this._startAnimationLoop()},_defineElements:function(){this.element===c.body&&(this.element=b),this.$scrollElement=a(this.element),this.$element=this.element===b?a("body"):this.$scrollElement,this.$viewportElement=this.options.viewportElement!==d?a(this.options.viewportElement):this.$scrollElement[0]===b||"scroll"===this.options.scrollProperty?this.$scrollElement:this.$scrollElement.parent()},_defineGetters:function(){var a=this,b=h[a.options.scrollProperty];this._getScrollLeft=function(){return b.getLeft(a.$scrollElement)},this._getScrollTop=function(){return b.getTop(a.$scrollElement)}},_defineSetters:function(){var b=this,c=h[b.options.scrollProperty],d=i[b.options.positionProperty],e=c.setLeft,f=c.setTop;this._setScrollLeft="function"==typeof e?function(a){e(b.$scrollElement,a)}:a.noop,this._setScrollTop="function"==typeof f?function(a){f(b.$scrollElement,a)}:a.noop,this._setPosition=d.setPosition||function(a,c,e,f,g){b.options.horizontalScrolling&&d.setLeft(a,c,e),b.options.verticalScrolling&&d.setTop(a,f,g)}},_handleWindowLoadAndResize:function(){var c=this,d=a(b);c.options.responsive&&d.bind("load."+this.name,function(){c.refresh()}),d.bind("resize."+this.name,function(){c._detectViewport(),c.options.responsive&&c.refresh()})},refresh:function(c){var d=this,e=d._getScrollLeft(),f=d._getScrollTop();c&&c.firstLoad||this._reset(),this._setScrollLeft(0),this._setScrollTop(0),this._setOffsets(),this._findParticles(),this._findBackgrounds(),c&&c.firstLoad&&/WebKit/.test(navigator.userAgent)&&a(b).load(function(){var a=d._getScrollLeft(),b=d._getScrollTop();d._setScrollLeft(a+1),d._setScrollTop(b+1),d._setScrollLeft(a),d._setScrollTop(b)}),this._setScrollLeft(e),this._setScrollTop(f)},_detectViewport:function(){var a=this.$viewportElement.offset(),b=null!==a&&a!==d;this.viewportWidth=this.$viewportElement.width(),this.viewportHeight=this.$viewportElement.height(),this.viewportOffsetTop=b?a.top:0,this.viewportOffsetLeft=b?a.left:0},_findParticles:function(){{var b=this;this._getScrollLeft(),this._getScrollTop()}if(this.particles!==d)for(var c=this.particles.length-1;c>=0;c--)this.particles[c].$element.data("stellar-elementIsActive",d);this.particles=[],this.options.parallaxElements&&this.$element.find("[data-stellar-ratio]").each(function(){var c,e,f,g,h,i,j,k,l,m=a(this),n=0,o=0,p=0,q=0;if(m.data("stellar-elementIsActive")){if(m.data("stellar-elementIsActive")!==this)return}else m.data("stellar-elementIsActive",this);b.options.showElement(m),m.data("stellar-startingLeft")?(m.css("left",m.data("stellar-startingLeft")),m.css("top",m.data("stellar-startingTop"))):(m.data("stellar-startingLeft",m.css("left")),m.data("stellar-startingTop",m.css("top"))),f=m.position().left,g=m.position().top,h="auto"===m.css("margin-left")?0:parseInt(m.css("margin-left"),10),i="auto"===m.css("margin-top")?0:parseInt(m.css("margin-top"),10),k=m.offset().left-h,l=m.offset().top-i,m.parents().each(function(){var b=a(this);return b.data("stellar-offset-parent")===!0?(n=p,o=q,j=b,!1):(p+=b.position().left,void(q+=b.position().top))}),c=m.data("stellar-horizontal-offset")!==d?m.data("stellar-horizontal-offset"):j!==d&&j.data("stellar-horizontal-offset")!==d?j.data("stellar-horizontal-offset"):b.horizontalOffset,e=m.data("stellar-vertical-offset")!==d?m.data("stellar-vertical-offset"):j!==d&&j.data("stellar-vertical-offset")!==d?j.data("stellar-vertical-offset"):b.verticalOffset,b.particles.push({$element:m,$offsetParent:j,isFixed:"fixed"===m.css("position"),horizontalOffset:c,verticalOffset:e,startingPositionLeft:f,startingPositionTop:g,startingOffsetLeft:k,startingOffsetTop:l,parentOffsetLeft:n,parentOffsetTop:o,stellarRatio:m.data("stellar-ratio")!==d?m.data("stellar-ratio"):1,width:m.outerWidth(!0),height:m.outerHeight(!0),isHidden:!1})})},_findBackgrounds:function(){var b,c=this,e=this._getScrollLeft(),f=this._getScrollTop();this.backgrounds=[],this.options.parallaxBackgrounds&&(b=this.$element.find("[data-stellar-background-ratio]"),this.$element.data("stellar-background-ratio")&&(b=b.add(this.$element)),b.each(function(){var b,g,h,i,j,k,l,o=a(this),p=n(o),q=0,r=0,s=0,t=0;if(o.data("stellar-backgroundIsActive")){if(o.data("stellar-backgroundIsActive")!==this)return}else o.data("stellar-backgroundIsActive",this);o.data("stellar-backgroundStartingLeft")?m(o,o.data("stellar-backgroundStartingLeft"),o.data("stellar-backgroundStartingTop")):(o.data("stellar-backgroundStartingLeft",p[0]),o.data("stellar-backgroundStartingTop",p[1])),h="auto"===o.css("margin-left")?0:parseInt(o.css("margin-left"),10),i="auto"===o.css("margin-top")?0:parseInt(o.css("margin-top"),10),j=o.offset().left-h-e,k=o.offset().top-i-f,o.parents().each(function(){var b=a(this);return b.data("stellar-offset-parent")===!0?(q=s,r=t,l=b,!1):(s+=b.position().left,void(t+=b.position().top))}),b=o.data("stellar-horizontal-offset")!==d?o.data("stellar-horizontal-offset"):l!==d&&l.data("stellar-horizontal-offset")!==d?l.data("stellar-horizontal-offset"):c.horizontalOffset,g=o.data("stellar-vertical-offset")!==d?o.data("stellar-vertical-offset"):l!==d&&l.data("stellar-vertical-offset")!==d?l.data("stellar-vertical-offset"):c.verticalOffset,c.backgrounds.push({$element:o,$offsetParent:l,isFixed:"fixed"===o.css("background-attachment"),horizontalOffset:b,verticalOffset:g,startingValueLeft:p[0],startingValueTop:p[1],startingBackgroundPositionLeft:isNaN(parseInt(p[0],10))?0:parseInt(p[0],10),startingBackgroundPositionTop:isNaN(parseInt(p[1],10))?0:parseInt(p[1],10),startingPositionLeft:o.position().left,startingPositionTop:o.position().top,startingOffsetLeft:j,startingOffsetTop:k,parentOffsetLeft:q,parentOffsetTop:r,stellarRatio:o.data("stellar-background-ratio")===d?1:o.data("stellar-background-ratio")})}))},_reset:function(){var a,b,c,d,e;for(e=this.particles.length-1;e>=0;e--)a=this.particles[e],b=a.$element.data("stellar-startingLeft"),c=a.$element.data("stellar-startingTop"),this._setPosition(a.$element,b,b,c,c),this.options.showElement(a.$element),a.$element.data("stellar-startingLeft",null).data("stellar-elementIsActive",null).data("stellar-backgroundIsActive",null);for(e=this.backgrounds.length-1;e>=0;e--)d=this.backgrounds[e],d.$element.data("stellar-backgroundStartingLeft",null).data("stellar-backgroundStartingTop",null),m(d.$element,d.startingValueLeft,d.startingValueTop)},destroy:function(){this._reset(),this.$scrollElement.unbind("resize."+this.name).unbind("scroll."+this.name),this._animationLoop=a.noop,a(b).unbind("load."+this.name).unbind("resize."+this.name)},_setOffsets:function(){var c=this,d=a(b);d.unbind("resize.horizontal-"+this.name).unbind("resize.vertical-"+this.name),"function"==typeof this.options.horizontalOffset?(this.horizontalOffset=this.options.horizontalOffset(),d.bind("resize.horizontal-"+this.name,function(){c.horizontalOffset=c.options.horizontalOffset()})):this.horizontalOffset=this.options.horizontalOffset,"function"==typeof this.options.verticalOffset?(this.verticalOffset=this.options.verticalOffset(),d.bind("resize.vertical-"+this.name,function(){c.verticalOffset=c.options.verticalOffset()})):this.verticalOffset=this.options.verticalOffset},_repositionElements:function(){var a,b,c,d,e,f,g,h,i,j,k=this._getScrollLeft(),l=this._getScrollTop(),n=!0,o=!0;if(this.currentScrollLeft!==k||this.currentScrollTop!==l||this.currentWidth!==this.viewportWidth||this.currentHeight!==this.viewportHeight){for(this.currentScrollLeft=k,this.currentScrollTop=l,this.currentWidth=this.viewportWidth,this.currentHeight=this.viewportHeight,j=this.particles.length-1;j>=0;j--)a=this.particles[j],b=a.isFixed?1:0,this.options.horizontalScrolling?(f=(k+a.horizontalOffset+this.viewportOffsetLeft+a.startingPositionLeft-a.startingOffsetLeft+a.parentOffsetLeft)*-(a.stellarRatio+b-1)+a.startingPositionLeft,h=f-a.startingPositionLeft+a.startingOffsetLeft):(f=a.startingPositionLeft,h=a.startingOffsetLeft),this.options.verticalScrolling?(g=(l+a.verticalOffset+this.viewportOffsetTop+a.startingPositionTop-a.startingOffsetTop+a.parentOffsetTop)*-(a.stellarRatio+b-1)+a.startingPositionTop,i=g-a.startingPositionTop+a.startingOffsetTop):(g=a.startingPositionTop,i=a.startingOffsetTop),this.options.hideDistantElements&&(o=!this.options.horizontalScrolling||h+a.width>(a.isFixed?0:k)&&h<(a.isFixed?0:k)+this.viewportWidth+this.viewportOffsetLeft,n=!this.options.verticalScrolling||i+a.height>(a.isFixed?0:l)&&i<(a.isFixed?0:l)+this.viewportHeight+this.viewportOffsetTop),o&&n?(a.isHidden&&(this.options.showElement(a.$element),a.isHidden=!1),this._setPosition(a.$element,f,a.startingPositionLeft,g,a.startingPositionTop)):a.isHidden||(this.options.hideElement(a.$element),a.isHidden=!0);for(j=this.backgrounds.length-1;j>=0;j--)c=this.backgrounds[j],b=c.isFixed?0:1,d=this.options.horizontalScrolling?(k+c.horizontalOffset-this.viewportOffsetLeft-c.startingOffsetLeft+c.parentOffsetLeft-c.startingBackgroundPositionLeft)*(b-c.stellarRatio)+"px":c.startingValueLeft,e=this.options.verticalScrolling?(l+c.verticalOffset-this.viewportOffsetTop-c.startingOffsetTop+c.parentOffsetTop-c.startingBackgroundPositionTop)*(b-c.stellarRatio)+"px":c.startingValueTop,m(c.$element,d,e)}},_handleScrollEvent:function(){var a=this,b=!1,c=function(){a._repositionElements(),b=!1},d=function(){b||(o(c),b=!0)};this.$scrollElement.bind("scroll."+this.name,d),d()},_startAnimationLoop:function(){var a=this;this._animationLoop=function(){o(a._animationLoop),a._repositionElements()},this._animationLoop()}},a.fn[f]=function(b){var c=arguments;return b===d||"object"==typeof b?this.each(function(){a.data(this,"plugin_"+f)||a.data(this,"plugin_"+f,new e(this,b))}):"string"==typeof b&&"_"!==b[0]&&"init"!==b?this.each(function(){var d=a.data(this,"plugin_"+f);d instanceof e&&"function"==typeof d[b]&&d[b].apply(d,Array.prototype.slice.call(c,1)),"destroy"===b&&a.data(this,"plugin_"+f,null)}):void 0},a[f]=function(){var c=a(b);return c.stellar.apply(c,Array.prototype.slice.call(arguments,0))},a[f].scrollProperty=h,a[f].positionProperty=i,b.Stellar=e}(jQuery,this,document);
/*! WOW - v1.0.3 - 2015-01-14
http://mynameismatthieu.com/WOW/docs.html
* Copyright (c) 2015 Matthieu Aussaguel; Licensed MIT */(function(){var a,b,c,d,e,f=function(a,b){return function(){return a.apply(b,arguments)}},g=[].indexOf||function(a){for(var b=0,c=this.length;c>b;b++)if(b in this&&this[b]===a)return b;return-1};b=function(){function a(){}return a.prototype.extend=function(a,b){var c,d;for(c in b)d=b[c],null==a[c]&&(a[c]=d);return a},a.prototype.isMobile=function(a){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(a)},a.prototype.addEvent=function(a,b,c){return null!=a.addEventListener?a.addEventListener(b,c,!1):null!=a.attachEvent?a.attachEvent("on"+b,c):a[b]=c},a.prototype.removeEvent=function(a,b,c){return null!=a.removeEventListener?a.removeEventListener(b,c,!1):null!=a.detachEvent?a.detachEvent("on"+b,c):delete a[b]},a.prototype.innerHeight=function(){return"innerHeight"in window?window.innerHeight:document.documentElement.clientHeight},a}(),c=this.WeakMap||this.MozWeakMap||(c=function(){function a(){this.keys=[],this.values=[]}return a.prototype.get=function(a){var b,c,d,e,f;for(f=this.keys,b=d=0,e=f.length;e>d;b=++d)if(c=f[b],c===a)return this.values[b]},a.prototype.set=function(a,b){var c,d,e,f,g;for(g=this.keys,c=e=0,f=g.length;f>e;c=++e)if(d=g[c],d===a)return void(this.values[c]=b);return this.keys.push(a),this.values.push(b)},a}()),a=this.MutationObserver||this.WebkitMutationObserver||this.MozMutationObserver||(a=function(){function a(){"undefined"!=typeof console&&null!==console&&console.warn("MutationObserver is not supported by your browser."),"undefined"!=typeof console&&null!==console&&console.warn("WOW.js cannot detect dom mutations, please call .sync() after loading new content.")}return a.notSupported=!0,a.prototype.observe=function(){},a}()),d=this.getComputedStyle||function(a){return this.getPropertyValue=function(b){var c;return"float"===b&&(b="styleFloat"),e.test(b)&&b.replace(e,function(a,b){return b.toUpperCase()}),(null!=(c=a.currentStyle)?c[b]:void 0)||null},this},e=/(\-([a-z]){1})/g,this.WOW=function(){function e(a){null==a&&(a={}),this.scrollCallback=f(this.scrollCallback,this),this.scrollHandler=f(this.scrollHandler,this),this.start=f(this.start,this),this.scrolled=!0,this.config=this.util().extend(a,this.defaults),this.animationNameCache=new c}return e.prototype.defaults={boxClass:"wow",animateClass:"animated",offset:0,mobile:!0,live:!0,callback:null},e.prototype.init=function(){var a;return this.element=window.document.documentElement,"interactive"===(a=document.readyState)||"complete"===a?this.start():this.util().addEvent(document,"DOMContentLoaded",this.start),this.finished=[]},e.prototype.start=function(){var b,c,d,e;if(this.stopped=!1,this.boxes=function(){var a,c,d,e;for(d=this.element.querySelectorAll("."+this.config.boxClass),e=[],a=0,c=d.length;c>a;a++)b=d[a],e.push(b);return e}.call(this),this.all=function(){var a,c,d,e;for(d=this.boxes,e=[],a=0,c=d.length;c>a;a++)b=d[a],e.push(b);return e}.call(this),this.boxes.length)if(this.disabled())this.resetStyle();else for(e=this.boxes,c=0,d=e.length;d>c;c++)b=e[c],this.applyStyle(b,!0);return this.disabled()||(this.util().addEvent(window,"scroll",this.scrollHandler),this.util().addEvent(window,"resize",this.scrollHandler),this.interval=setInterval(this.scrollCallback,50)),this.config.live?new a(function(a){return function(b){var c,d,e,f,g;for(g=[],e=0,f=b.length;f>e;e++)d=b[e],g.push(function(){var a,b,e,f;for(e=d.addedNodes||[],f=[],a=0,b=e.length;b>a;a++)c=e[a],f.push(this.doSync(c));return f}.call(a));return g}}(this)).observe(document.body,{childList:!0,subtree:!0}):void 0},e.prototype.stop=function(){return this.stopped=!0,this.util().removeEvent(window,"scroll",this.scrollHandler),this.util().removeEvent(window,"resize",this.scrollHandler),null!=this.interval?clearInterval(this.interval):void 0},e.prototype.sync=function(){return a.notSupported?this.doSync(this.element):void 0},e.prototype.doSync=function(a){var b,c,d,e,f;if(null==a&&(a=this.element),1===a.nodeType){for(a=a.parentNode||a,e=a.querySelectorAll("."+this.config.boxClass),f=[],c=0,d=e.length;d>c;c++)b=e[c],g.call(this.all,b)<0?(this.boxes.push(b),this.all.push(b),this.stopped||this.disabled()?this.resetStyle():this.applyStyle(b,!0),f.push(this.scrolled=!0)):f.push(void 0);return f}},e.prototype.show=function(a){return this.applyStyle(a),a.className=""+a.className+" "+this.config.animateClass,null!=this.config.callback?this.config.callback(a):void 0},e.prototype.applyStyle=function(a,b){var c,d,e;return d=a.getAttribute("data-wow-duration"),c=a.getAttribute("data-wow-delay"),e=a.getAttribute("data-wow-iteration"),this.animate(function(f){return function(){return f.customStyle(a,b,d,c,e)}}(this))},e.prototype.animate=function(){return"requestAnimationFrame"in window?function(a){return window.requestAnimationFrame(a)}:function(a){return a()}}(),e.prototype.resetStyle=function(){var a,b,c,d,e;for(d=this.boxes,e=[],b=0,c=d.length;c>b;b++)a=d[b],e.push(a.style.visibility="visible");return e},e.prototype.customStyle=function(a,b,c,d,e){return b&&this.cacheAnimationName(a),a.style.visibility=b?"hidden":"visible",c&&this.vendorSet(a.style,{animationDuration:c}),d&&this.vendorSet(a.style,{animationDelay:d}),e&&this.vendorSet(a.style,{animationIterationCount:e}),this.vendorSet(a.style,{animationName:b?"none":this.cachedAnimationName(a)}),a},e.prototype.vendors=["moz","webkit"],e.prototype.vendorSet=function(a,b){var c,d,e,f;f=[];for(c in b)d=b[c],a[""+c]=d,f.push(function(){var b,f,g,h;for(g=this.vendors,h=[],b=0,f=g.length;f>b;b++)e=g[b],h.push(a[""+e+c.charAt(0).toUpperCase()+c.substr(1)]=d);return h}.call(this));return f},e.prototype.vendorCSS=function(a,b){var c,e,f,g,h,i;for(e=d(a),c=e.getPropertyCSSValue(b),i=this.vendors,g=0,h=i.length;h>g;g++)f=i[g],c=c||e.getPropertyCSSValue("-"+f+"-"+b);return c},e.prototype.animationName=function(a){var b;try{b=this.vendorCSS(a,"animation-name").cssText}catch(c){b=d(a).getPropertyValue("animation-name")}return"none"===b?"":b},e.prototype.cacheAnimationName=function(a){return this.animationNameCache.set(a,this.animationName(a))},e.prototype.cachedAnimationName=function(a){return this.animationNameCache.get(a)},e.prototype.scrollHandler=function(){return this.scrolled=!0},e.prototype.scrollCallback=function(){var a;return!this.scrolled||(this.scrolled=!1,this.boxes=function(){var b,c,d,e;for(d=this.boxes,e=[],b=0,c=d.length;c>b;b++)a=d[b],a&&(this.isVisible(a)?this.show(a):e.push(a));return e}.call(this),this.boxes.length||this.config.live)?void 0:this.stop()},e.prototype.offsetTop=function(a){for(var b;void 0===a.offsetTop;)a=a.parentNode;for(b=a.offsetTop;a=a.offsetParent;)b+=a.offsetTop;return b},e.prototype.isVisible=function(a){var b,c,d,e,f;return c=a.getAttribute("data-wow-offset")||this.config.offset,f=window.pageYOffset,e=f+Math.min(this.element.clientHeight,this.util().innerHeight())-c,d=this.offsetTop(a),b=d+a.clientHeight,e>=d&&b>=f},e.prototype.util=function(){return null!=this._util?this._util:this._util=new b},e.prototype.disabled=function(){return!this.config.mobile&&this.util().isMobile(navigator.userAgent)},e}()}).call(this);
// Generated by CoffeeScript 1.6.2
/*!
jQuery Waypoints - v2.0.5
Copyright (c) 2011-2014 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/
(function(){var t=[].indexOf||function(t){for(var e=0,n=this.length;e<n;e++){if(e in this&&this[e]===t)return e}return-1},e=[].slice;(function(t,e){if(typeof define==="function"&&define.amd){return define("waypoints",["jquery"],function(n){return e(n,t)})}else{return e(t.jQuery,t)}})(window,function(n,r){var i,o,l,s,f,u,c,a,h,d,p,y,v,w,g,m;i=n(r);a=t.call(r,"ontouchstart")>=0;s={horizontal:{},vertical:{}};f=1;c={};u="waypoints-context-id";p="resize.waypoints";y="scroll.waypoints";v=1;w="waypoints-waypoint-ids";g="waypoint";m="waypoints";o=function(){function t(t){var e=this;this.$element=t;this.element=t[0];this.didResize=false;this.didScroll=false;this.id="context"+f++;this.oldScroll={x:t.scrollLeft(),y:t.scrollTop()};this.waypoints={horizontal:{},vertical:{}};this.element[u]=this.id;c[this.id]=this;t.bind(y,function(){var t;if(!(e.didScroll||a)){e.didScroll=true;t=function(){e.doScroll();return e.didScroll=false};return r.setTimeout(t,n[m].settings.scrollThrottle)}});t.bind(p,function(){var t;if(!e.didResize){e.didResize=true;t=function(){n[m]("refresh");return e.didResize=false};return r.setTimeout(t,n[m].settings.resizeThrottle)}})}t.prototype.doScroll=function(){var t,e=this;t={horizontal:{newScroll:this.$element.scrollLeft(),oldScroll:this.oldScroll.x,forward:"right",backward:"left"},vertical:{newScroll:this.$element.scrollTop(),oldScroll:this.oldScroll.y,forward:"down",backward:"up"}};if(a&&(!t.vertical.oldScroll||!t.vertical.newScroll)){n[m]("refresh")}n.each(t,function(t,r){var i,o,l;l=[];o=r.newScroll>r.oldScroll;i=o?r.forward:r.backward;n.each(e.waypoints[t],function(t,e){var n,i;if(r.oldScroll<(n=e.offset)&&n<=r.newScroll){return l.push(e)}else if(r.newScroll<(i=e.offset)&&i<=r.oldScroll){return l.push(e)}});l.sort(function(t,e){return t.offset-e.offset});if(!o){l.reverse()}return n.each(l,function(t,e){if(e.options.continuous||t===l.length-1){return e.trigger([i])}})});return this.oldScroll={x:t.horizontal.newScroll,y:t.vertical.newScroll}};t.prototype.refresh=function(){var t,e,r,i=this;r=n.isWindow(this.element);e=this.$element.offset();this.doScroll();t={horizontal:{contextOffset:r?0:e.left,contextScroll:r?0:this.oldScroll.x,contextDimension:this.$element.width(),oldScroll:this.oldScroll.x,forward:"right",backward:"left",offsetProp:"left"},vertical:{contextOffset:r?0:e.top,contextScroll:r?0:this.oldScroll.y,contextDimension:r?n[m]("viewportHeight"):this.$element.height(),oldScroll:this.oldScroll.y,forward:"down",backward:"up",offsetProp:"top"}};return n.each(t,function(t,e){return n.each(i.waypoints[t],function(t,r){var i,o,l,s,f;i=r.options.offset;l=r.offset;o=n.isWindow(r.element)?0:r.$element.offset()[e.offsetProp];if(n.isFunction(i)){i=i.apply(r.element)}else if(typeof i==="string"){i=parseFloat(i);if(r.options.offset.indexOf("%")>-1){i=Math.ceil(e.contextDimension*i/100)}}r.offset=o-e.contextOffset+e.contextScroll-i;if(r.options.onlyOnScroll&&l!=null||!r.enabled){return}if(l!==null&&l<(s=e.oldScroll)&&s<=r.offset){return r.trigger([e.backward])}else if(l!==null&&l>(f=e.oldScroll)&&f>=r.offset){return r.trigger([e.forward])}else if(l===null&&e.oldScroll>=r.offset){return r.trigger([e.forward])}})})};t.prototype.checkEmpty=function(){if(n.isEmptyObject(this.waypoints.horizontal)&&n.isEmptyObject(this.waypoints.vertical)){this.$element.unbind([p,y].join(" "));return delete c[this.id]}};return t}();l=function(){function t(t,e,r){var i,o;if(r.offset==="bottom-in-view"){r.offset=function(){var t;t=n[m]("viewportHeight");if(!n.isWindow(e.element)){t=e.$element.height()}return t-n(this).outerHeight()}}this.$element=t;this.element=t[0];this.axis=r.horizontal?"horizontal":"vertical";this.callback=r.handler;this.context=e;this.enabled=r.enabled;this.id="waypoints"+v++;this.offset=null;this.options=r;e.waypoints[this.axis][this.id]=this;s[this.axis][this.id]=this;i=(o=this.element[w])!=null?o:[];i.push(this.id);this.element[w]=i}t.prototype.trigger=function(t){if(!this.enabled){return}if(this.callback!=null){this.callback.apply(this.element,t)}if(this.options.triggerOnce){return this.destroy()}};t.prototype.disable=function(){return this.enabled=false};t.prototype.enable=function(){this.context.refresh();return this.enabled=true};t.prototype.destroy=function(){delete s[this.axis][this.id];delete this.context.waypoints[this.axis][this.id];return this.context.checkEmpty()};t.getWaypointsByElement=function(t){var e,r;r=t[w];if(!r){return[]}e=n.extend({},s.horizontal,s.vertical);return n.map(r,function(t){return e[t]})};return t}();d={init:function(t,e){var r;e=n.extend({},n.fn[g].defaults,e);if((r=e.handler)==null){e.handler=t}this.each(function(){var t,r,i,s;t=n(this);i=(s=e.context)!=null?s:n.fn[g].defaults.context;if(!n.isWindow(i)){i=t.closest(i)}i=n(i);r=c[i[0][u]];if(!r){r=new o(i)}return new l(t,r,e)});n[m]("refresh");return this},disable:function(){return d._invoke.call(this,"disable")},enable:function(){return d._invoke.call(this,"enable")},destroy:function(){return d._invoke.call(this,"destroy")},prev:function(t,e){return d._traverse.call(this,t,e,function(t,e,n){if(e>0){return t.push(n[e-1])}})},next:function(t,e){return d._traverse.call(this,t,e,function(t,e,n){if(e<n.length-1){return t.push(n[e+1])}})},_traverse:function(t,e,i){var o,l;if(t==null){t="vertical"}if(e==null){e=r}l=h.aggregate(e);o=[];this.each(function(){var e;e=n.inArray(this,l[t]);return i(o,e,l[t])});return this.pushStack(o)},_invoke:function(t){this.each(function(){var e;e=l.getWaypointsByElement(this);return n.each(e,function(e,n){n[t]();return true})});return this}};n.fn[g]=function(){var t,r;r=arguments[0],t=2<=arguments.length?e.call(arguments,1):[];if(d[r]){return d[r].apply(this,t)}else if(n.isFunction(r)){return d.init.apply(this,arguments)}else if(n.isPlainObject(r)){return d.init.apply(this,[null,r])}else if(!r){return n.error("jQuery Waypoints needs a callback function or handler option.")}else{return n.error("The "+r+" method does not exist in jQuery Waypoints.")}};n.fn[g].defaults={context:r,continuous:true,enabled:true,horizontal:false,offset:0,triggerOnce:false};h={refresh:function(){return n.each(c,function(t,e){return e.refresh()})},viewportHeight:function(){var t;return(t=r.innerHeight)!=null?t:i.height()},aggregate:function(t){var e,r,i;e=s;if(t){e=(i=c[n(t)[0][u]])!=null?i.waypoints:void 0}if(!e){return[]}r={horizontal:[],vertical:[]};n.each(r,function(t,i){n.each(e[t],function(t,e){return i.push(e)});i.sort(function(t,e){return t.offset-e.offset});r[t]=n.map(i,function(t){return t.element});return r[t]=n.unique(r[t])});return r},above:function(t){if(t==null){t=r}return h._filter(t,"vertical",function(t,e){return e.offset<=t.oldScroll.y})},below:function(t){if(t==null){t=r}return h._filter(t,"vertical",function(t,e){return e.offset>t.oldScroll.y})},left:function(t){if(t==null){t=r}return h._filter(t,"horizontal",function(t,e){return e.offset<=t.oldScroll.x})},right:function(t){if(t==null){t=r}return h._filter(t,"horizontal",function(t,e){return e.offset>t.oldScroll.x})},enable:function(){return h._invoke("enable")},disable:function(){return h._invoke("disable")},destroy:function(){return h._invoke("destroy")},extendFn:function(t,e){return d[t]=e},_invoke:function(t){var e;e=n.extend({},s.vertical,s.horizontal);return n.each(e,function(e,n){n[t]();return true})},_filter:function(t,e,r){var i,o;i=c[n(t)[0][u]];if(!i){return[]}o=[];n.each(i.waypoints[e],function(t,e){if(r(i,e)){return o.push(e)}});o.sort(function(t,e){return t.offset-e.offset});return n.map(o,function(t){return t.element})}};n[m]=function(){var t,n;n=arguments[0],t=2<=arguments.length?e.call(arguments,1):[];if(h[n]){return h[n].apply(null,t)}else{return h.aggregate.call(null,n)}};n[m].settings={resizeThrottle:100,scrollThrottle:30};return i.on("load.waypoints",function(){return n[m]("refresh")})})}).call(this);
// SmoothScroll for websites v1.2.1
// Source (current script): https://gist.github.com/theroyalstudent/4e6ec834be19bf077298
// Original: https://gist.github.com/galambalazs/6477177/
// Licensed under the terms of the MIT license.
 
// People involved
//  - Balazs Galambosi (maintainer)  
//  - Michael Herf     (Pulse Algorithm)
//  - Edwin Ang (optimzation and added support)
 
(function(){
  
// Scroll Variables (tweakable)
var defaultOptions = {
 
    // Scrolling Core
    frameRate        : 150, // [Hz]
    animationTime    : 800, // [px]
    stepSize         : 120, // [px]
 
    // Pulse (less tweakable)
    // ratio of "tail" to "acceleration"
    pulseAlgorithm   : true,
    pulseScale       : 8,
    pulseNormalize   : 1,
 
    // Acceleration
    accelerationDelta : 20,  // 20
    accelerationMax   : 1,   // 1
 
    // Keyboard Settings
    keyboardSupport   : true,  // option
    arrowScroll       : 50,     // [px]
 
    // Other
    touchpadSupport   : true,
    fixedBackground   : true, 
    excluded          : ""    
};
 
var options = defaultOptions;
 
 
// Other Variables
var isExcluded = false;
var isFrame = false;
var direction = { x: 0, y: 0 };
var initDone  = false;
var root = document.documentElement;
var activeElement;
var observer;
var deltaBuffer = [ 120, 120, 120 ];
 
var key = { left: 37, up: 38, right: 39, down: 40, spacebar: 32, 
            pageup: 33, pagedown: 34, end: 35, home: 36 };
 
 
/***********************************************
 * SETTINGS
 ***********************************************/
 
var options = defaultOptions;
 
 
/***********************************************
 * INITIALIZE
 ***********************************************/
 
/**
 * Tests if smooth scrolling is allowed. Shuts down everything if not.
 */
function initTest() {
 
    var disableKeyboard = false; 
    
    // disable keyboard support if anything above requested it
    if (disableKeyboard) {
        removeEvent("keydown", keydown);
    }
 
    if (options.keyboardSupport && !disableKeyboard) {
        addEvent("keydown", keydown);
    }
}
 
/**
 * Sets up scrolls array, determines if frames are involved.
 */
function init() {
  
    if (!document.body) return;
 
    var body = document.body;
    var html = document.documentElement;
    var windowHeight = window.innerHeight; 
    var scrollHeight = body.scrollHeight;
    
    // check compat mode for root element
    root = (document.compatMode.indexOf('CSS') >= 0) ? html : body;
    activeElement = body;
    
    initTest();
    initDone = true;
 
    // Checks if this script is running in a frame
    if (top != self) {
        isFrame = true;
    }
 
    /**
     * This fixes a bug where the areas left and right to 
     * the content does not trigger the onmousewheel event
     * on some pages. e.g.: html, body { height: 100% }
     */
    else if (scrollHeight > windowHeight &&
            (body.offsetHeight <= windowHeight || 
             html.offsetHeight <= windowHeight)) {
 
        // DOMChange (throttle): fix height
        var pending = false;
        var refresh = function () {
            if (!pending && html.scrollHeight != document.height) {
                pending = true; // add a new pending action
                setTimeout(function () {
                    html.style.height = document.height + 'px';
                    pending = false;
                }, 500); // act rarely to stay fast
            }
        };
        html.style.height = 'auto';
        setTimeout(refresh, 10);
 
        // clearfix
        if (root.offsetHeight <= windowHeight) {
            var underlay = document.createElement("div");   
            underlay.style.clear = "both";
            body.appendChild(underlay);
        }
    }
 
    // disable fixed background
    if (!options.fixedBackground && !isExcluded) {
        body.style.backgroundAttachment = "scroll";
        html.style.backgroundAttachment = "scroll";
    }
}
 
 
/************************************************
 * SCROLLING 
 ************************************************/
 
var que = [];
var pending = false;
var lastScroll = +new Date;
 
/**
 * Pushes scroll actions to the scrolling queue.
 */
function scrollArray(elem, left, top, delay) {
    
    delay || (delay = 1000);
    directionCheck(left, top);
 
    if (options.accelerationMax != 1) {
        var now = +new Date;
        var elapsed = now - lastScroll;
        if (elapsed < options.accelerationDelta) {
            var factor = (1 + (30 / elapsed)) / 2;
            if (factor > 1) {
                factor = Math.min(factor, options.accelerationMax);
                left *= factor;
                top  *= factor;
            }
        }
        lastScroll = +new Date;
    }          
    
    // push a scroll command
    que.push({
        x: left, 
        y: top, 
        lastX: (left < 0) ? 0.99 : -0.99,
        lastY: (top  < 0) ? 0.99 : -0.99, 
        start: +new Date
    });
        
    // don't act if there's a pending queue
    if (pending) {
        return;
    }  
 
    var scrollWindow = (elem === document.body);
    
    var step = function (time) {
        
        var now = +new Date;
        var scrollX = 0;
        var scrollY = 0; 
    
        for (var i = 0; i < que.length; i++) {
            
            var item = que[i];
            var elapsed  = now - item.start;
            var finished = (elapsed >= options.animationTime);
            
            // scroll position: [0, 1]
            var position = (finished) ? 1 : elapsed / options.animationTime;
            
            // easing [optional]
            if (options.pulseAlgorithm) {
                position = pulse(position);
            }
            
            // only need the difference
            var x = (item.x * position - item.lastX) >> 0;
            var y = (item.y * position - item.lastY) >> 0;
            
            // add this to the total scrolling
            scrollX += x;
            scrollY += y;            
            
            // update last values
            item.lastX += x;
            item.lastY += y;
        
            // delete and step back if it's over
            if (finished) {
                que.splice(i, 1); i--;
            }           
        }
 
        // scroll left and top
        if (scrollWindow) {
            window.scrollBy(scrollX, scrollY);
        } 
        else {
            if (scrollX) elem.scrollLeft += scrollX;
            if (scrollY) elem.scrollTop  += scrollY;                    
        }
        
        // clean up if there's nothing left to do
        if (!left && !top) {
            que = [];
        }
        
        if (que.length) { 
            requestFrame(step, elem, (delay / options.frameRate + 1)); 
        } else { 
            pending = false;
        }
    };
    
    // start a new queue of actions
    requestFrame(step, elem, 0);
    pending = true;
}
 
 
/***********************************************
 * EVENTS
 ***********************************************/
 
/**
 * Mouse wheel handler.
 * @param {Object} event
 */
function wheel(event) {
 
    if (!initDone) {
        init();
    }
    
    var target = event.target;
    var overflowing = overflowingAncestor(target);
    
    // use default if there's no overflowing
    // element or default action is prevented    
    if (!overflowing || event.defaultPrevented ||
        isNodeName(activeElement, "embed") ||
       (isNodeName(target, "embed") && /\.pdf/i.test(target.src))) {
        return true;
    }
 
    var deltaX = event.wheelDeltaX || 0;
    var deltaY = event.wheelDeltaY || 0;
    
    // use wheelDelta if deltaX/Y is not available
    if (!deltaX && !deltaY) {
        deltaY = event.wheelDelta || 0;
    }
 
    // check if it's a touchpad scroll that should be ignored
    if (!options.touchpadSupport && isTouchpad(deltaY)) {
        return true;
    }
 
    // scale by step size
    // delta is 120 most of the time
    // synaptics seems to send 1 sometimes
    if (Math.abs(deltaX) > 1.2) {
        deltaX *= options.stepSize / 120;
    }
    if (Math.abs(deltaY) > 1.2) {
        deltaY *= options.stepSize / 120;
    }
    
    scrollArray(overflowing, -deltaX, -deltaY);
    event.preventDefault();
}
 
/**
 * Keydown event handler.
 * @param {Object} event
 */
function keydown(event) {
 
    var target   = event.target;
    var modifier = event.ctrlKey || event.altKey || event.metaKey || 
                  (event.shiftKey && event.keyCode !== key.spacebar);
    
    // do nothing if user is editing text
    // or using a modifier key (except shift)
    // or in a dropdown
    if ( /input|textarea|select|embed/i.test(target.nodeName) ||
         target.isContentEditable || 
         event.defaultPrevented   ||
         modifier ) {
      return true;
    }
    // spacebar should trigger button press
    if (isNodeName(target, "button") &&
        event.keyCode === key.spacebar) {
      return true;
    }
    
    var shift, x = 0, y = 0;
    var elem = overflowingAncestor(activeElement);
    var clientHeight = elem.clientHeight;
 
    if (elem == document.body) {
        clientHeight = window.innerHeight;
    }
 
    switch (event.keyCode) {
        case key.up:
            y = -options.arrowScroll;
            break;
        case key.down:
            y = options.arrowScroll;
            break;         
        case key.spacebar: // (+ shift)
            shift = event.shiftKey ? 1 : -1;
            y = -shift * clientHeight * 0.9;
            break;
        case key.pageup:
            y = -clientHeight * 0.9;
            break;
        case key.pagedown:
            y = clientHeight * 0.9;
            break;
        case key.home:
            y = -elem.scrollTop;
            break;
        case key.end:
            var damt = elem.scrollHeight - elem.scrollTop - clientHeight;
            y = (damt > 0) ? damt+10 : 0;
            break;
        case key.left:
            x = -options.arrowScroll;
            break;
        case key.right:
            x = options.arrowScroll;
            break;            
        default:
            return true; // a key we don't care about
    }
 
    scrollArray(elem, x, y);
    event.preventDefault();
}
 
/**
 * Mousedown event only for updating activeElement
 */
function mousedown(event) {
    activeElement = event.target;
}
 
 
/***********************************************
 * OVERFLOW
 ***********************************************/
 
var cache = {}; // cleared out every once in while
setInterval(function () { cache = {}; }, 10 * 1000);
 
var uniqueID = (function () {
    var i = 0;
    return function (el) {
        return el.uniqueID || (el.uniqueID = i++);
    };
})();
 
function setCache(elems, overflowing) {
    for (var i = elems.length; i--;)
        cache[uniqueID(elems[i])] = overflowing;
    return overflowing;
}
 
function overflowingAncestor(el) {
    var elems = [];
    var rootScrollHeight = root.scrollHeight;
    do {
        var cached = cache[uniqueID(el)];
        if (cached) {
            return setCache(elems, cached);
        }
        elems.push(el);
        if (rootScrollHeight === el.scrollHeight) {
            if (!isFrame || root.clientHeight + 10 < rootScrollHeight) {
                return setCache(elems, document.body); // scrolling root in WebKit
            }
        } else if (el.clientHeight + 10 < el.scrollHeight) {
            overflow = getComputedStyle(el, "").getPropertyValue("overflow-y");
            if (overflow === "scroll" || overflow === "auto") {
                return setCache(elems, el);
            }
        }
    } while (el = el.parentNode);
}
 
 
/***********************************************
 * HELPERS
 ***********************************************/
 
function addEvent(type, fn, bubble) {
    window.addEventListener(type, fn, (bubble||false));
}
 
function removeEvent(type, fn, bubble) {
    window.removeEventListener(type, fn, (bubble||false));  
}
 
function isNodeName(el, tag) {
    return (el.nodeName||"").toLowerCase() === tag.toLowerCase();
}
 
function directionCheck(x, y) {
    x = (x > 0) ? 1 : -1;
    y = (y > 0) ? 1 : -1;
    if (direction.x !== x || direction.y !== y) {
        direction.x = x;
        direction.y = y;
        que = [];
        lastScroll = 0;
    }
}
 
var deltaBufferTimer;
 
function isTouchpad(deltaY) {
    if (!deltaY) return;
    deltaY = Math.abs(deltaY)
    deltaBuffer.push(deltaY);
    deltaBuffer.shift();
    clearTimeout(deltaBufferTimer);
    var allDivisable = (isDivisible(deltaBuffer[0], 120) &&
                        isDivisible(deltaBuffer[1], 120) &&
                        isDivisible(deltaBuffer[2], 120));
    return !allDivisable;
} 
 
function isDivisible(n, divisor) {
    return (Math.floor(n / divisor) == n / divisor);
}
 
var requestFrame = (function () {
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              function (callback, element, delay) {
                  window.setTimeout(callback, delay || (1000/60));
              };
})();
 
 
/***********************************************
 * PULSE
 ***********************************************/
 
/**
 * Viscous fluid with a pulse for part and decay for the rest.
 * - Applies a fixed force over an interval (a damped acceleration), and
 * - Lets the exponential bleed away the velocity over a longer interval
 * - Michael Herf, http://stereopsis.com/stopping/
 */
function pulse_(x) {
    var val, start, expx;
    // test
    x = x * options.pulseScale;
    if (x < 1) { // acceleartion
        val = x - (1 - Math.exp(-x));
    } else {     // tail
        // the previous animation ended here:
        start = Math.exp(-1);
        // simple viscous drag
        x -= 1;
        expx = 1 - Math.exp(-x);
        val = start + (expx * (1 - start));
    }
    return val * options.pulseNormalize;
}
 
function pulse(x) {
    if (x >= 1) return 1;
    if (x <= 0) return 0;
 
    if (options.pulseNormalize == 1) {
        options.pulseNormalize /= pulse_(1);
    }
    return pulse_(x);
}
 
var isSupportedBrowser = /chrome/i.test(window.navigator.userAgent) ? true : /safari/i.test(window.navigator.userAgent);
var wheelEvent = null;
if ("onwheel" in document.createElement("div"))
    wheelEvent = "wheel";
else if ("onmousewheel" in document.createElement("div"))
    wheelEvent = "mousewheel";
 
if (wheelEvent && isSupportedBrowser) {
    addEvent(wheelEvent, wheel);
    addEvent("mousedown", mousedown);
    addEvent("load", init);
}
 
})();
/////////////////////////////////////////////////////////////////////
// jQuery for page scrolling feature - requires jQuery Easing plugin
/////////////////////////////////////////////////////////////////////

$('.page-scroll').bind('click', function(event) {
    var $anchor = $(this);
    $('html, body').stop().animate({
        scrollTop: $($anchor.attr('href')).offset().top -64
    }, 1500, 'easeInOutExpo');
    event.preventDefault();
});

var cbpAnimatedHeader = (function() {

    var docElem = document.documentElement,
        header = document.querySelector( '.navbar-fixed-top' ),
        didScroll = false,
        changeHeaderOn = 10;

    function scrollY() {
        return window.pageYOffset || docElem.scrollTop;
    }

});

$('body').scrollspy({
    target: '.navbar',
    offset: 65
})

// Intro text carousel
$("#owl-intro-text").owlCarousel({
    singleItem : true,
    autoPlay : 6000,
    stopOnHover : true,
    navigation : false,
    navigationText : false,
    pagination : true
})


// Partner carousel
$("#owl-partners").owlCarousel({
    items : 4,
    itemsDesktop : [1199,3],
    itemsDesktopSmall : [980,2],
    itemsTablet: [768,2],
    autoPlay : 5000,
    stopOnHover : true,
    pagination : false
})

// Testimonials carousel
$("#owl-testimonial").owlCarousel({
    singleItem : true,
    pagination : true,
    autoHeight : true
})

$.stellar({
    // Set scrolling to be in either one or both directions
    horizontalScrolling: false,
    verticalScrolling: true,
});

new WOW().init();

$(window).load(function() {
    $('.portfolio_menu ul li').click(function(){
    	$('.portfolio_menu ul li').removeClass('active_prot_menu');
    	$(this).addClass('active_prot_menu');
    });
});

// Check to see if the window is top if not then display button
$(window).scroll(function(){
    if ($(this).scrollTop() > 100) {
        $('.scrolltotop').fadeIn();
    } else {
        $('.scrolltotop').fadeOut();
    }
});

// Click event to scroll to top
$('.scrolltotop').click(function(){
    $('html, body').animate({scrollTop : 0}, 1500, 'easeInOutExpo');
    return false;
});

$(document).on('click','.navbar-collapse.in',function(e) {
    if( $(e.target).is('a') && $(e.target).attr('class') != 'dropdown-toggle' ) {
        $(this).collapse('hide');
    }
});


//! moment.js
//! version : 2.18.1
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com
!function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b():"function"==typeof define&&define.amd?define(b):a.moment=b()}(this,function(){"use strict";function a(){return sd.apply(null,arguments)}function b(a){sd=a}function c(a){return a instanceof Array||"[object Array]"===Object.prototype.toString.call(a)}function d(a){return null!=a&&"[object Object]"===Object.prototype.toString.call(a)}function e(a){var b;for(b in a)return!1;return!0}function f(a){return void 0===a}function g(a){return"number"==typeof a||"[object Number]"===Object.prototype.toString.call(a)}function h(a){return a instanceof Date||"[object Date]"===Object.prototype.toString.call(a)}function i(a,b){var c,d=[];for(c=0;c<a.length;++c)d.push(b(a[c],c));return d}function j(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function k(a,b){for(var c in b)j(b,c)&&(a[c]=b[c]);return j(b,"toString")&&(a.toString=b.toString),j(b,"valueOf")&&(a.valueOf=b.valueOf),a}function l(a,b,c,d){return sb(a,b,c,d,!0).utc()}function m(){return{empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1,parsedDateParts:[],meridiem:null,rfc2822:!1,weekdayMismatch:!1}}function n(a){return null==a._pf&&(a._pf=m()),a._pf}function o(a){if(null==a._isValid){var b=n(a),c=ud.call(b.parsedDateParts,function(a){return null!=a}),d=!isNaN(a._d.getTime())&&b.overflow<0&&!b.empty&&!b.invalidMonth&&!b.invalidWeekday&&!b.nullInput&&!b.invalidFormat&&!b.userInvalidated&&(!b.meridiem||b.meridiem&&c);if(a._strict&&(d=d&&0===b.charsLeftOver&&0===b.unusedTokens.length&&void 0===b.bigHour),null!=Object.isFrozen&&Object.isFrozen(a))return d;a._isValid=d}return a._isValid}function p(a){var b=l(NaN);return null!=a?k(n(b),a):n(b).userInvalidated=!0,b}function q(a,b){var c,d,e;if(f(b._isAMomentObject)||(a._isAMomentObject=b._isAMomentObject),f(b._i)||(a._i=b._i),f(b._f)||(a._f=b._f),f(b._l)||(a._l=b._l),f(b._strict)||(a._strict=b._strict),f(b._tzm)||(a._tzm=b._tzm),f(b._isUTC)||(a._isUTC=b._isUTC),f(b._offset)||(a._offset=b._offset),f(b._pf)||(a._pf=n(b)),f(b._locale)||(a._locale=b._locale),vd.length>0)for(c=0;c<vd.length;c++)d=vd[c],e=b[d],f(e)||(a[d]=e);return a}function r(b){q(this,b),this._d=new Date(null!=b._d?b._d.getTime():NaN),this.isValid()||(this._d=new Date(NaN)),wd===!1&&(wd=!0,a.updateOffset(this),wd=!1)}function s(a){return a instanceof r||null!=a&&null!=a._isAMomentObject}function t(a){return a<0?Math.ceil(a)||0:Math.floor(a)}function u(a){var b=+a,c=0;return 0!==b&&isFinite(b)&&(c=t(b)),c}function v(a,b,c){var d,e=Math.min(a.length,b.length),f=Math.abs(a.length-b.length),g=0;for(d=0;d<e;d++)(c&&a[d]!==b[d]||!c&&u(a[d])!==u(b[d]))&&g++;return g+f}function w(b){a.suppressDeprecationWarnings===!1&&"undefined"!=typeof console&&console.warn&&console.warn("Deprecation warning: "+b)}function x(b,c){var d=!0;return k(function(){if(null!=a.deprecationHandler&&a.deprecationHandler(null,b),d){for(var e,f=[],g=0;g<arguments.length;g++){if(e="","object"==typeof arguments[g]){e+="\n["+g+"] ";for(var h in arguments[0])e+=h+": "+arguments[0][h]+", ";e=e.slice(0,-2)}else e=arguments[g];f.push(e)}w(b+"\nArguments: "+Array.prototype.slice.call(f).join("")+"\n"+(new Error).stack),d=!1}return c.apply(this,arguments)},c)}function y(b,c){null!=a.deprecationHandler&&a.deprecationHandler(b,c),xd[b]||(w(c),xd[b]=!0)}function z(a){return a instanceof Function||"[object Function]"===Object.prototype.toString.call(a)}function A(a){var b,c;for(c in a)b=a[c],z(b)?this[c]=b:this["_"+c]=b;this._config=a,this._dayOfMonthOrdinalParseLenient=new RegExp((this._dayOfMonthOrdinalParse.source||this._ordinalParse.source)+"|"+/\d{1,2}/.source)}function B(a,b){var c,e=k({},a);for(c in b)j(b,c)&&(d(a[c])&&d(b[c])?(e[c]={},k(e[c],a[c]),k(e[c],b[c])):null!=b[c]?e[c]=b[c]:delete e[c]);for(c in a)j(a,c)&&!j(b,c)&&d(a[c])&&(e[c]=k({},e[c]));return e}function C(a){null!=a&&this.set(a)}function D(a,b,c){var d=this._calendar[a]||this._calendar.sameElse;return z(d)?d.call(b,c):d}function E(a){var b=this._longDateFormat[a],c=this._longDateFormat[a.toUpperCase()];return b||!c?b:(this._longDateFormat[a]=c.replace(/MMMM|MM|DD|dddd/g,function(a){return a.slice(1)}),this._longDateFormat[a])}function F(){return this._invalidDate}function G(a){return this._ordinal.replace("%d",a)}function H(a,b,c,d){var e=this._relativeTime[c];return z(e)?e(a,b,c,d):e.replace(/%d/i,a)}function I(a,b){var c=this._relativeTime[a>0?"future":"past"];return z(c)?c(b):c.replace(/%s/i,b)}function J(a,b){var c=a.toLowerCase();Hd[c]=Hd[c+"s"]=Hd[b]=a}function K(a){return"string"==typeof a?Hd[a]||Hd[a.toLowerCase()]:void 0}function L(a){var b,c,d={};for(c in a)j(a,c)&&(b=K(c),b&&(d[b]=a[c]));return d}function M(a,b){Id[a]=b}function N(a){var b=[];for(var c in a)b.push({unit:c,priority:Id[c]});return b.sort(function(a,b){return a.priority-b.priority}),b}function O(b,c){return function(d){return null!=d?(Q(this,b,d),a.updateOffset(this,c),this):P(this,b)}}function P(a,b){return a.isValid()?a._d["get"+(a._isUTC?"UTC":"")+b]():NaN}function Q(a,b,c){a.isValid()&&a._d["set"+(a._isUTC?"UTC":"")+b](c)}function R(a){return a=K(a),z(this[a])?this[a]():this}function S(a,b){if("object"==typeof a){a=L(a);for(var c=N(a),d=0;d<c.length;d++)this[c[d].unit](a[c[d].unit])}else if(a=K(a),z(this[a]))return this[a](b);return this}function T(a,b,c){var d=""+Math.abs(a),e=b-d.length,f=a>=0;return(f?c?"+":"":"-")+Math.pow(10,Math.max(0,e)).toString().substr(1)+d}function U(a,b,c,d){var e=d;"string"==typeof d&&(e=function(){return this[d]()}),a&&(Md[a]=e),b&&(Md[b[0]]=function(){return T(e.apply(this,arguments),b[1],b[2])}),c&&(Md[c]=function(){return this.localeData().ordinal(e.apply(this,arguments),a)})}function V(a){return a.match(/\[[\s\S]/)?a.replace(/^\[|\]$/g,""):a.replace(/\\/g,"")}function W(a){var b,c,d=a.match(Jd);for(b=0,c=d.length;b<c;b++)Md[d[b]]?d[b]=Md[d[b]]:d[b]=V(d[b]);return function(b){var e,f="";for(e=0;e<c;e++)f+=z(d[e])?d[e].call(b,a):d[e];return f}}function X(a,b){return a.isValid()?(b=Y(b,a.localeData()),Ld[b]=Ld[b]||W(b),Ld[b](a)):a.localeData().invalidDate()}function Y(a,b){function c(a){return b.longDateFormat(a)||a}var d=5;for(Kd.lastIndex=0;d>=0&&Kd.test(a);)a=a.replace(Kd,c),Kd.lastIndex=0,d-=1;return a}function Z(a,b,c){ce[a]=z(b)?b:function(a,d){return a&&c?c:b}}function $(a,b){return j(ce,a)?ce[a](b._strict,b._locale):new RegExp(_(a))}function _(a){return aa(a.replace("\\","").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(a,b,c,d,e){return b||c||d||e}))}function aa(a){return a.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}function ba(a,b){var c,d=b;for("string"==typeof a&&(a=[a]),g(b)&&(d=function(a,c){c[b]=u(a)}),c=0;c<a.length;c++)de[a[c]]=d}function ca(a,b){ba(a,function(a,c,d,e){d._w=d._w||{},b(a,d._w,d,e)})}function da(a,b,c){null!=b&&j(de,a)&&de[a](b,c._a,c,a)}function ea(a,b){return new Date(Date.UTC(a,b+1,0)).getUTCDate()}function fa(a,b){return a?c(this._months)?this._months[a.month()]:this._months[(this._months.isFormat||oe).test(b)?"format":"standalone"][a.month()]:c(this._months)?this._months:this._months.standalone}function ga(a,b){return a?c(this._monthsShort)?this._monthsShort[a.month()]:this._monthsShort[oe.test(b)?"format":"standalone"][a.month()]:c(this._monthsShort)?this._monthsShort:this._monthsShort.standalone}function ha(a,b,c){var d,e,f,g=a.toLocaleLowerCase();if(!this._monthsParse)for(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[],d=0;d<12;++d)f=l([2e3,d]),this._shortMonthsParse[d]=this.monthsShort(f,"").toLocaleLowerCase(),this._longMonthsParse[d]=this.months(f,"").toLocaleLowerCase();return c?"MMM"===b?(e=ne.call(this._shortMonthsParse,g),e!==-1?e:null):(e=ne.call(this._longMonthsParse,g),e!==-1?e:null):"MMM"===b?(e=ne.call(this._shortMonthsParse,g),e!==-1?e:(e=ne.call(this._longMonthsParse,g),e!==-1?e:null)):(e=ne.call(this._longMonthsParse,g),e!==-1?e:(e=ne.call(this._shortMonthsParse,g),e!==-1?e:null))}function ia(a,b,c){var d,e,f;if(this._monthsParseExact)return ha.call(this,a,b,c);for(this._monthsParse||(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[]),d=0;d<12;d++){if(e=l([2e3,d]),c&&!this._longMonthsParse[d]&&(this._longMonthsParse[d]=new RegExp("^"+this.months(e,"").replace(".","")+"$","i"),this._shortMonthsParse[d]=new RegExp("^"+this.monthsShort(e,"").replace(".","")+"$","i")),c||this._monthsParse[d]||(f="^"+this.months(e,"")+"|^"+this.monthsShort(e,""),this._monthsParse[d]=new RegExp(f.replace(".",""),"i")),c&&"MMMM"===b&&this._longMonthsParse[d].test(a))return d;if(c&&"MMM"===b&&this._shortMonthsParse[d].test(a))return d;if(!c&&this._monthsParse[d].test(a))return d}}function ja(a,b){var c;if(!a.isValid())return a;if("string"==typeof b)if(/^\d+$/.test(b))b=u(b);else if(b=a.localeData().monthsParse(b),!g(b))return a;return c=Math.min(a.date(),ea(a.year(),b)),a._d["set"+(a._isUTC?"UTC":"")+"Month"](b,c),a}function ka(b){return null!=b?(ja(this,b),a.updateOffset(this,!0),this):P(this,"Month")}function la(){return ea(this.year(),this.month())}function ma(a){return this._monthsParseExact?(j(this,"_monthsRegex")||oa.call(this),a?this._monthsShortStrictRegex:this._monthsShortRegex):(j(this,"_monthsShortRegex")||(this._monthsShortRegex=re),this._monthsShortStrictRegex&&a?this._monthsShortStrictRegex:this._monthsShortRegex)}function na(a){return this._monthsParseExact?(j(this,"_monthsRegex")||oa.call(this),a?this._monthsStrictRegex:this._monthsRegex):(j(this,"_monthsRegex")||(this._monthsRegex=se),this._monthsStrictRegex&&a?this._monthsStrictRegex:this._monthsRegex)}function oa(){function a(a,b){return b.length-a.length}var b,c,d=[],e=[],f=[];for(b=0;b<12;b++)c=l([2e3,b]),d.push(this.monthsShort(c,"")),e.push(this.months(c,"")),f.push(this.months(c,"")),f.push(this.monthsShort(c,""));for(d.sort(a),e.sort(a),f.sort(a),b=0;b<12;b++)d[b]=aa(d[b]),e[b]=aa(e[b]);for(b=0;b<24;b++)f[b]=aa(f[b]);this._monthsRegex=new RegExp("^("+f.join("|")+")","i"),this._monthsShortRegex=this._monthsRegex,this._monthsStrictRegex=new RegExp("^("+e.join("|")+")","i"),this._monthsShortStrictRegex=new RegExp("^("+d.join("|")+")","i")}function pa(a){return qa(a)?366:365}function qa(a){return a%4===0&&a%100!==0||a%400===0}function ra(){return qa(this.year())}function sa(a,b,c,d,e,f,g){var h=new Date(a,b,c,d,e,f,g);return a<100&&a>=0&&isFinite(h.getFullYear())&&h.setFullYear(a),h}function ta(a){var b=new Date(Date.UTC.apply(null,arguments));return a<100&&a>=0&&isFinite(b.getUTCFullYear())&&b.setUTCFullYear(a),b}function ua(a,b,c){var d=7+b-c,e=(7+ta(a,0,d).getUTCDay()-b)%7;return-e+d-1}function va(a,b,c,d,e){var f,g,h=(7+c-d)%7,i=ua(a,d,e),j=1+7*(b-1)+h+i;return j<=0?(f=a-1,g=pa(f)+j):j>pa(a)?(f=a+1,g=j-pa(a)):(f=a,g=j),{year:f,dayOfYear:g}}function wa(a,b,c){var d,e,f=ua(a.year(),b,c),g=Math.floor((a.dayOfYear()-f-1)/7)+1;return g<1?(e=a.year()-1,d=g+xa(e,b,c)):g>xa(a.year(),b,c)?(d=g-xa(a.year(),b,c),e=a.year()+1):(e=a.year(),d=g),{week:d,year:e}}function xa(a,b,c){var d=ua(a,b,c),e=ua(a+1,b,c);return(pa(a)-d+e)/7}function ya(a){return wa(a,this._week.dow,this._week.doy).week}function za(){return this._week.dow}function Aa(){return this._week.doy}function Ba(a){var b=this.localeData().week(this);return null==a?b:this.add(7*(a-b),"d")}function Ca(a){var b=wa(this,1,4).week;return null==a?b:this.add(7*(a-b),"d")}function Da(a,b){return"string"!=typeof a?a:isNaN(a)?(a=b.weekdaysParse(a),"number"==typeof a?a:null):parseInt(a,10)}function Ea(a,b){return"string"==typeof a?b.weekdaysParse(a)%7||7:isNaN(a)?null:a}function Fa(a,b){return a?c(this._weekdays)?this._weekdays[a.day()]:this._weekdays[this._weekdays.isFormat.test(b)?"format":"standalone"][a.day()]:c(this._weekdays)?this._weekdays:this._weekdays.standalone}function Ga(a){return a?this._weekdaysShort[a.day()]:this._weekdaysShort}function Ha(a){return a?this._weekdaysMin[a.day()]:this._weekdaysMin}function Ia(a,b,c){var d,e,f,g=a.toLocaleLowerCase();if(!this._weekdaysParse)for(this._weekdaysParse=[],this._shortWeekdaysParse=[],this._minWeekdaysParse=[],d=0;d<7;++d)f=l([2e3,1]).day(d),this._minWeekdaysParse[d]=this.weekdaysMin(f,"").toLocaleLowerCase(),this._shortWeekdaysParse[d]=this.weekdaysShort(f,"").toLocaleLowerCase(),this._weekdaysParse[d]=this.weekdays(f,"").toLocaleLowerCase();return c?"dddd"===b?(e=ne.call(this._weekdaysParse,g),e!==-1?e:null):"ddd"===b?(e=ne.call(this._shortWeekdaysParse,g),e!==-1?e:null):(e=ne.call(this._minWeekdaysParse,g),e!==-1?e:null):"dddd"===b?(e=ne.call(this._weekdaysParse,g),e!==-1?e:(e=ne.call(this._shortWeekdaysParse,g),e!==-1?e:(e=ne.call(this._minWeekdaysParse,g),e!==-1?e:null))):"ddd"===b?(e=ne.call(this._shortWeekdaysParse,g),e!==-1?e:(e=ne.call(this._weekdaysParse,g),e!==-1?e:(e=ne.call(this._minWeekdaysParse,g),e!==-1?e:null))):(e=ne.call(this._minWeekdaysParse,g),e!==-1?e:(e=ne.call(this._weekdaysParse,g),e!==-1?e:(e=ne.call(this._shortWeekdaysParse,g),e!==-1?e:null)))}function Ja(a,b,c){var d,e,f;if(this._weekdaysParseExact)return Ia.call(this,a,b,c);for(this._weekdaysParse||(this._weekdaysParse=[],this._minWeekdaysParse=[],this._shortWeekdaysParse=[],this._fullWeekdaysParse=[]),d=0;d<7;d++){if(e=l([2e3,1]).day(d),c&&!this._fullWeekdaysParse[d]&&(this._fullWeekdaysParse[d]=new RegExp("^"+this.weekdays(e,"").replace(".",".?")+"$","i"),this._shortWeekdaysParse[d]=new RegExp("^"+this.weekdaysShort(e,"").replace(".",".?")+"$","i"),this._minWeekdaysParse[d]=new RegExp("^"+this.weekdaysMin(e,"").replace(".",".?")+"$","i")),this._weekdaysParse[d]||(f="^"+this.weekdays(e,"")+"|^"+this.weekdaysShort(e,"")+"|^"+this.weekdaysMin(e,""),this._weekdaysParse[d]=new RegExp(f.replace(".",""),"i")),c&&"dddd"===b&&this._fullWeekdaysParse[d].test(a))return d;if(c&&"ddd"===b&&this._shortWeekdaysParse[d].test(a))return d;if(c&&"dd"===b&&this._minWeekdaysParse[d].test(a))return d;if(!c&&this._weekdaysParse[d].test(a))return d}}function Ka(a){if(!this.isValid())return null!=a?this:NaN;var b=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=a?(a=Da(a,this.localeData()),this.add(a-b,"d")):b}function La(a){if(!this.isValid())return null!=a?this:NaN;var b=(this.day()+7-this.localeData()._week.dow)%7;return null==a?b:this.add(a-b,"d")}function Ma(a){if(!this.isValid())return null!=a?this:NaN;if(null!=a){var b=Ea(a,this.localeData());return this.day(this.day()%7?b:b-7)}return this.day()||7}function Na(a){return this._weekdaysParseExact?(j(this,"_weekdaysRegex")||Qa.call(this),a?this._weekdaysStrictRegex:this._weekdaysRegex):(j(this,"_weekdaysRegex")||(this._weekdaysRegex=ye),this._weekdaysStrictRegex&&a?this._weekdaysStrictRegex:this._weekdaysRegex)}function Oa(a){return this._weekdaysParseExact?(j(this,"_weekdaysRegex")||Qa.call(this),a?this._weekdaysShortStrictRegex:this._weekdaysShortRegex):(j(this,"_weekdaysShortRegex")||(this._weekdaysShortRegex=ze),this._weekdaysShortStrictRegex&&a?this._weekdaysShortStrictRegex:this._weekdaysShortRegex)}function Pa(a){return this._weekdaysParseExact?(j(this,"_weekdaysRegex")||Qa.call(this),a?this._weekdaysMinStrictRegex:this._weekdaysMinRegex):(j(this,"_weekdaysMinRegex")||(this._weekdaysMinRegex=Ae),this._weekdaysMinStrictRegex&&a?this._weekdaysMinStrictRegex:this._weekdaysMinRegex)}function Qa(){function a(a,b){return b.length-a.length}var b,c,d,e,f,g=[],h=[],i=[],j=[];for(b=0;b<7;b++)c=l([2e3,1]).day(b),d=this.weekdaysMin(c,""),e=this.weekdaysShort(c,""),f=this.weekdays(c,""),g.push(d),h.push(e),i.push(f),j.push(d),j.push(e),j.push(f);for(g.sort(a),h.sort(a),i.sort(a),j.sort(a),b=0;b<7;b++)h[b]=aa(h[b]),i[b]=aa(i[b]),j[b]=aa(j[b]);this._weekdaysRegex=new RegExp("^("+j.join("|")+")","i"),this._weekdaysShortRegex=this._weekdaysRegex,this._weekdaysMinRegex=this._weekdaysRegex,this._weekdaysStrictRegex=new RegExp("^("+i.join("|")+")","i"),this._weekdaysShortStrictRegex=new RegExp("^("+h.join("|")+")","i"),this._weekdaysMinStrictRegex=new RegExp("^("+g.join("|")+")","i")}function Ra(){return this.hours()%12||12}function Sa(){return this.hours()||24}function Ta(a,b){U(a,0,0,function(){return this.localeData().meridiem(this.hours(),this.minutes(),b)})}function Ua(a,b){return b._meridiemParse}function Va(a){return"p"===(a+"").toLowerCase().charAt(0)}function Wa(a,b,c){return a>11?c?"pm":"PM":c?"am":"AM"}function Xa(a){return a?a.toLowerCase().replace("_","-"):a}function Ya(a){for(var b,c,d,e,f=0;f<a.length;){for(e=Xa(a[f]).split("-"),b=e.length,c=Xa(a[f+1]),c=c?c.split("-"):null;b>0;){if(d=Za(e.slice(0,b).join("-")))return d;if(c&&c.length>=b&&v(e,c,!0)>=b-1)break;b--}f++}return null}function Za(a){var b=null;if(!Fe[a]&&"undefined"!=typeof module&&module&&module.exports)try{b=Be._abbr,require("./locale/"+a),$a(b)}catch(a){}return Fe[a]}function $a(a,b){var c;return a&&(c=f(b)?bb(a):_a(a,b),c&&(Be=c)),Be._abbr}function _a(a,b){if(null!==b){var c=Ee;if(b.abbr=a,null!=Fe[a])y("defineLocaleOverride","use moment.updateLocale(localeName, config) to change an existing locale. moment.defineLocale(localeName, config) should only be used for creating a new locale See http://momentjs.com/guides/#/warnings/define-locale/ for more info."),c=Fe[a]._config;else if(null!=b.parentLocale){if(null==Fe[b.parentLocale])return Ge[b.parentLocale]||(Ge[b.parentLocale]=[]),Ge[b.parentLocale].push({name:a,config:b}),null;c=Fe[b.parentLocale]._config}return Fe[a]=new C(B(c,b)),Ge[a]&&Ge[a].forEach(function(a){_a(a.name,a.config)}),$a(a),Fe[a]}return delete Fe[a],null}function ab(a,b){if(null!=b){var c,d=Ee;null!=Fe[a]&&(d=Fe[a]._config),b=B(d,b),c=new C(b),c.parentLocale=Fe[a],Fe[a]=c,$a(a)}else null!=Fe[a]&&(null!=Fe[a].parentLocale?Fe[a]=Fe[a].parentLocale:null!=Fe[a]&&delete Fe[a]);return Fe[a]}function bb(a){var b;if(a&&a._locale&&a._locale._abbr&&(a=a._locale._abbr),!a)return Be;if(!c(a)){if(b=Za(a))return b;a=[a]}return Ya(a)}function cb(){return Ad(Fe)}function db(a){var b,c=a._a;return c&&n(a).overflow===-2&&(b=c[fe]<0||c[fe]>11?fe:c[ge]<1||c[ge]>ea(c[ee],c[fe])?ge:c[he]<0||c[he]>24||24===c[he]&&(0!==c[ie]||0!==c[je]||0!==c[ke])?he:c[ie]<0||c[ie]>59?ie:c[je]<0||c[je]>59?je:c[ke]<0||c[ke]>999?ke:-1,n(a)._overflowDayOfYear&&(b<ee||b>ge)&&(b=ge),n(a)._overflowWeeks&&b===-1&&(b=le),n(a)._overflowWeekday&&b===-1&&(b=me),n(a).overflow=b),a}function eb(a){var b,c,d,e,f,g,h=a._i,i=He.exec(h)||Ie.exec(h);if(i){for(n(a).iso=!0,b=0,c=Ke.length;b<c;b++)if(Ke[b][1].exec(i[1])){e=Ke[b][0],d=Ke[b][2]!==!1;break}if(null==e)return void(a._isValid=!1);if(i[3]){for(b=0,c=Le.length;b<c;b++)if(Le[b][1].exec(i[3])){f=(i[2]||" ")+Le[b][0];break}if(null==f)return void(a._isValid=!1)}if(!d&&null!=f)return void(a._isValid=!1);if(i[4]){if(!Je.exec(i[4]))return void(a._isValid=!1);g="Z"}a._f=e+(f||"")+(g||""),lb(a)}else a._isValid=!1}function fb(a){var b,c,d,e,f,g,h,i,j={" GMT":" +0000"," EDT":" -0400"," EST":" -0500"," CDT":" -0500"," CST":" -0600"," MDT":" -0600"," MST":" -0700"," PDT":" -0700"," PST":" -0800"},k="YXWVUTSRQPONZABCDEFGHIKLM";if(b=a._i.replace(/\([^\)]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").replace(/^\s|\s$/g,""),c=Ne.exec(b)){if(d=c[1]?"ddd"+(5===c[1].length?", ":" "):"",e="D MMM "+(c[2].length>10?"YYYY ":"YY "),f="HH:mm"+(c[4]?":ss":""),c[1]){var l=new Date(c[2]),m=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][l.getDay()];if(c[1].substr(0,3)!==m)return n(a).weekdayMismatch=!0,void(a._isValid=!1)}switch(c[5].length){case 2:0===i?h=" +0000":(i=k.indexOf(c[5][1].toUpperCase())-12,h=(i<0?" -":" +")+(""+i).replace(/^-?/,"0").match(/..$/)[0]+"00");break;case 4:h=j[c[5]];break;default:h=j[" GMT"]}c[5]=h,a._i=c.splice(1).join(""),g=" ZZ",a._f=d+e+f+g,lb(a),n(a).rfc2822=!0}else a._isValid=!1}function gb(b){var c=Me.exec(b._i);return null!==c?void(b._d=new Date(+c[1])):(eb(b),void(b._isValid===!1&&(delete b._isValid,fb(b),b._isValid===!1&&(delete b._isValid,a.createFromInputFallback(b)))))}function hb(a,b,c){return null!=a?a:null!=b?b:c}function ib(b){var c=new Date(a.now());return b._useUTC?[c.getUTCFullYear(),c.getUTCMonth(),c.getUTCDate()]:[c.getFullYear(),c.getMonth(),c.getDate()]}function jb(a){var b,c,d,e,f=[];if(!a._d){for(d=ib(a),a._w&&null==a._a[ge]&&null==a._a[fe]&&kb(a),null!=a._dayOfYear&&(e=hb(a._a[ee],d[ee]),(a._dayOfYear>pa(e)||0===a._dayOfYear)&&(n(a)._overflowDayOfYear=!0),c=ta(e,0,a._dayOfYear),a._a[fe]=c.getUTCMonth(),a._a[ge]=c.getUTCDate()),b=0;b<3&&null==a._a[b];++b)a._a[b]=f[b]=d[b];for(;b<7;b++)a._a[b]=f[b]=null==a._a[b]?2===b?1:0:a._a[b];24===a._a[he]&&0===a._a[ie]&&0===a._a[je]&&0===a._a[ke]&&(a._nextDay=!0,a._a[he]=0),a._d=(a._useUTC?ta:sa).apply(null,f),null!=a._tzm&&a._d.setUTCMinutes(a._d.getUTCMinutes()-a._tzm),a._nextDay&&(a._a[he]=24)}}function kb(a){var b,c,d,e,f,g,h,i;if(b=a._w,null!=b.GG||null!=b.W||null!=b.E)f=1,g=4,c=hb(b.GG,a._a[ee],wa(tb(),1,4).year),d=hb(b.W,1),e=hb(b.E,1),(e<1||e>7)&&(i=!0);else{f=a._locale._week.dow,g=a._locale._week.doy;var j=wa(tb(),f,g);c=hb(b.gg,a._a[ee],j.year),d=hb(b.w,j.week),null!=b.d?(e=b.d,(e<0||e>6)&&(i=!0)):null!=b.e?(e=b.e+f,(b.e<0||b.e>6)&&(i=!0)):e=f}d<1||d>xa(c,f,g)?n(a)._overflowWeeks=!0:null!=i?n(a)._overflowWeekday=!0:(h=va(c,d,e,f,g),a._a[ee]=h.year,a._dayOfYear=h.dayOfYear)}function lb(b){if(b._f===a.ISO_8601)return void eb(b);if(b._f===a.RFC_2822)return void fb(b);b._a=[],n(b).empty=!0;var c,d,e,f,g,h=""+b._i,i=h.length,j=0;for(e=Y(b._f,b._locale).match(Jd)||[],c=0;c<e.length;c++)f=e[c],d=(h.match($(f,b))||[])[0],d&&(g=h.substr(0,h.indexOf(d)),g.length>0&&n(b).unusedInput.push(g),h=h.slice(h.indexOf(d)+d.length),j+=d.length),Md[f]?(d?n(b).empty=!1:n(b).unusedTokens.push(f),da(f,d,b)):b._strict&&!d&&n(b).unusedTokens.push(f);n(b).charsLeftOver=i-j,h.length>0&&n(b).unusedInput.push(h),b._a[he]<=12&&n(b).bigHour===!0&&b._a[he]>0&&(n(b).bigHour=void 0),n(b).parsedDateParts=b._a.slice(0),n(b).meridiem=b._meridiem,b._a[he]=mb(b._locale,b._a[he],b._meridiem),jb(b),db(b)}function mb(a,b,c){var d;return null==c?b:null!=a.meridiemHour?a.meridiemHour(b,c):null!=a.isPM?(d=a.isPM(c),d&&b<12&&(b+=12),d||12!==b||(b=0),b):b}function nb(a){var b,c,d,e,f;if(0===a._f.length)return n(a).invalidFormat=!0,void(a._d=new Date(NaN));for(e=0;e<a._f.length;e++)f=0,b=q({},a),null!=a._useUTC&&(b._useUTC=a._useUTC),b._f=a._f[e],lb(b),o(b)&&(f+=n(b).charsLeftOver,f+=10*n(b).unusedTokens.length,n(b).score=f,(null==d||f<d)&&(d=f,c=b));k(a,c||b)}function ob(a){if(!a._d){var b=L(a._i);a._a=i([b.year,b.month,b.day||b.date,b.hour,b.minute,b.second,b.millisecond],function(a){return a&&parseInt(a,10)}),jb(a)}}function pb(a){var b=new r(db(qb(a)));return b._nextDay&&(b.add(1,"d"),b._nextDay=void 0),b}function qb(a){var b=a._i,d=a._f;return a._locale=a._locale||bb(a._l),null===b||void 0===d&&""===b?p({nullInput:!0}):("string"==typeof b&&(a._i=b=a._locale.preparse(b)),s(b)?new r(db(b)):(h(b)?a._d=b:c(d)?nb(a):d?lb(a):rb(a),o(a)||(a._d=null),a))}function rb(b){var e=b._i;f(e)?b._d=new Date(a.now()):h(e)?b._d=new Date(e.valueOf()):"string"==typeof e?gb(b):c(e)?(b._a=i(e.slice(0),function(a){return parseInt(a,10)}),jb(b)):d(e)?ob(b):g(e)?b._d=new Date(e):a.createFromInputFallback(b)}function sb(a,b,f,g,h){var i={};return f!==!0&&f!==!1||(g=f,f=void 0),(d(a)&&e(a)||c(a)&&0===a.length)&&(a=void 0),i._isAMomentObject=!0,i._useUTC=i._isUTC=h,i._l=f,i._i=a,i._f=b,i._strict=g,pb(i)}function tb(a,b,c,d){return sb(a,b,c,d,!1)}function ub(a,b){var d,e;if(1===b.length&&c(b[0])&&(b=b[0]),!b.length)return tb();for(d=b[0],e=1;e<b.length;++e)b[e].isValid()&&!b[e][a](d)||(d=b[e]);return d}function vb(){var a=[].slice.call(arguments,0);return ub("isBefore",a)}function wb(){var a=[].slice.call(arguments,0);return ub("isAfter",a)}function xb(a){for(var b in a)if(Re.indexOf(b)===-1||null!=a[b]&&isNaN(a[b]))return!1;for(var c=!1,d=0;d<Re.length;++d)if(a[Re[d]]){if(c)return!1;parseFloat(a[Re[d]])!==u(a[Re[d]])&&(c=!0)}return!0}function yb(){return this._isValid}function zb(){return Sb(NaN)}function Ab(a){var b=L(a),c=b.year||0,d=b.quarter||0,e=b.month||0,f=b.week||0,g=b.day||0,h=b.hour||0,i=b.minute||0,j=b.second||0,k=b.millisecond||0;this._isValid=xb(b),this._milliseconds=+k+1e3*j+6e4*i+1e3*h*60*60,this._days=+g+7*f,this._months=+e+3*d+12*c,this._data={},this._locale=bb(),this._bubble()}function Bb(a){return a instanceof Ab}function Cb(a){return a<0?Math.round(-1*a)*-1:Math.round(a)}function Db(a,b){U(a,0,0,function(){var a=this.utcOffset(),c="+";return a<0&&(a=-a,c="-"),c+T(~~(a/60),2)+b+T(~~a%60,2)})}function Eb(a,b){var c=(b||"").match(a);if(null===c)return null;var d=c[c.length-1]||[],e=(d+"").match(Se)||["-",0,0],f=+(60*e[1])+u(e[2]);return 0===f?0:"+"===e[0]?f:-f}function Fb(b,c){var d,e;return c._isUTC?(d=c.clone(),e=(s(b)||h(b)?b.valueOf():tb(b).valueOf())-d.valueOf(),d._d.setTime(d._d.valueOf()+e),a.updateOffset(d,!1),d):tb(b).local()}function Gb(a){return 15*-Math.round(a._d.getTimezoneOffset()/15)}function Hb(b,c,d){var e,f=this._offset||0;if(!this.isValid())return null!=b?this:NaN;if(null!=b){if("string"==typeof b){if(b=Eb(_d,b),null===b)return this}else Math.abs(b)<16&&!d&&(b=60*b);return!this._isUTC&&c&&(e=Gb(this)),this._offset=b,this._isUTC=!0,null!=e&&this.add(e,"m"),f!==b&&(!c||this._changeInProgress?Xb(this,Sb(b-f,"m"),1,!1):this._changeInProgress||(this._changeInProgress=!0,a.updateOffset(this,!0),this._changeInProgress=null)),this}return this._isUTC?f:Gb(this)}function Ib(a,b){return null!=a?("string"!=typeof a&&(a=-a),this.utcOffset(a,b),this):-this.utcOffset()}function Jb(a){return this.utcOffset(0,a)}function Kb(a){return this._isUTC&&(this.utcOffset(0,a),this._isUTC=!1,a&&this.subtract(Gb(this),"m")),this}function Lb(){if(null!=this._tzm)this.utcOffset(this._tzm,!1,!0);else if("string"==typeof this._i){var a=Eb($d,this._i);null!=a?this.utcOffset(a):this.utcOffset(0,!0)}return this}function Mb(a){return!!this.isValid()&&(a=a?tb(a).utcOffset():0,(this.utcOffset()-a)%60===0)}function Nb(){return this.utcOffset()>this.clone().month(0).utcOffset()||this.utcOffset()>this.clone().month(5).utcOffset()}function Ob(){if(!f(this._isDSTShifted))return this._isDSTShifted;var a={};if(q(a,this),a=qb(a),a._a){var b=a._isUTC?l(a._a):tb(a._a);this._isDSTShifted=this.isValid()&&v(a._a,b.toArray())>0}else this._isDSTShifted=!1;return this._isDSTShifted}function Pb(){return!!this.isValid()&&!this._isUTC}function Qb(){return!!this.isValid()&&this._isUTC}function Rb(){return!!this.isValid()&&(this._isUTC&&0===this._offset)}function Sb(a,b){var c,d,e,f=a,h=null;return Bb(a)?f={ms:a._milliseconds,d:a._days,M:a._months}:g(a)?(f={},b?f[b]=a:f.milliseconds=a):(h=Te.exec(a))?(c="-"===h[1]?-1:1,f={y:0,d:u(h[ge])*c,h:u(h[he])*c,m:u(h[ie])*c,s:u(h[je])*c,ms:u(Cb(1e3*h[ke]))*c}):(h=Ue.exec(a))?(c="-"===h[1]?-1:1,f={y:Tb(h[2],c),M:Tb(h[3],c),w:Tb(h[4],c),d:Tb(h[5],c),h:Tb(h[6],c),m:Tb(h[7],c),s:Tb(h[8],c)}):null==f?f={}:"object"==typeof f&&("from"in f||"to"in f)&&(e=Vb(tb(f.from),tb(f.to)),f={},f.ms=e.milliseconds,f.M=e.months),d=new Ab(f),Bb(a)&&j(a,"_locale")&&(d._locale=a._locale),d}function Tb(a,b){var c=a&&parseFloat(a.replace(",","."));return(isNaN(c)?0:c)*b}function Ub(a,b){var c={milliseconds:0,months:0};return c.months=b.month()-a.month()+12*(b.year()-a.year()),a.clone().add(c.months,"M").isAfter(b)&&--c.months,c.milliseconds=+b-+a.clone().add(c.months,"M"),c}function Vb(a,b){var c;return a.isValid()&&b.isValid()?(b=Fb(b,a),a.isBefore(b)?c=Ub(a,b):(c=Ub(b,a),c.milliseconds=-c.milliseconds,c.months=-c.months),c):{milliseconds:0,months:0}}function Wb(a,b){return function(c,d){var e,f;return null===d||isNaN(+d)||(y(b,"moment()."+b+"(period, number) is deprecated. Please use moment()."+b+"(number, period). See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info."),f=c,c=d,d=f),c="string"==typeof c?+c:c,e=Sb(c,d),Xb(this,e,a),this}}function Xb(b,c,d,e){var f=c._milliseconds,g=Cb(c._days),h=Cb(c._months);b.isValid()&&(e=null==e||e,f&&b._d.setTime(b._d.valueOf()+f*d),g&&Q(b,"Date",P(b,"Date")+g*d),h&&ja(b,P(b,"Month")+h*d),e&&a.updateOffset(b,g||h))}function Yb(a,b){var c=a.diff(b,"days",!0);return c<-6?"sameElse":c<-1?"lastWeek":c<0?"lastDay":c<1?"sameDay":c<2?"nextDay":c<7?"nextWeek":"sameElse"}function Zb(b,c){var d=b||tb(),e=Fb(d,this).startOf("day"),f=a.calendarFormat(this,e)||"sameElse",g=c&&(z(c[f])?c[f].call(this,d):c[f]);return this.format(g||this.localeData().calendar(f,this,tb(d)))}function $b(){return new r(this)}function _b(a,b){var c=s(a)?a:tb(a);return!(!this.isValid()||!c.isValid())&&(b=K(f(b)?"millisecond":b),"millisecond"===b?this.valueOf()>c.valueOf():c.valueOf()<this.clone().startOf(b).valueOf())}function ac(a,b){var c=s(a)?a:tb(a);return!(!this.isValid()||!c.isValid())&&(b=K(f(b)?"millisecond":b),"millisecond"===b?this.valueOf()<c.valueOf():this.clone().endOf(b).valueOf()<c.valueOf())}function bc(a,b,c,d){return d=d||"()",("("===d[0]?this.isAfter(a,c):!this.isBefore(a,c))&&(")"===d[1]?this.isBefore(b,c):!this.isAfter(b,c))}function cc(a,b){var c,d=s(a)?a:tb(a);return!(!this.isValid()||!d.isValid())&&(b=K(b||"millisecond"),"millisecond"===b?this.valueOf()===d.valueOf():(c=d.valueOf(),this.clone().startOf(b).valueOf()<=c&&c<=this.clone().endOf(b).valueOf()))}function dc(a,b){return this.isSame(a,b)||this.isAfter(a,b)}function ec(a,b){return this.isSame(a,b)||this.isBefore(a,b)}function fc(a,b,c){var d,e,f,g;return this.isValid()?(d=Fb(a,this),d.isValid()?(e=6e4*(d.utcOffset()-this.utcOffset()),b=K(b),"year"===b||"month"===b||"quarter"===b?(g=gc(this,d),"quarter"===b?g/=3:"year"===b&&(g/=12)):(f=this-d,g="second"===b?f/1e3:"minute"===b?f/6e4:"hour"===b?f/36e5:"day"===b?(f-e)/864e5:"week"===b?(f-e)/6048e5:f),c?g:t(g)):NaN):NaN}function gc(a,b){var c,d,e=12*(b.year()-a.year())+(b.month()-a.month()),f=a.clone().add(e,"months");return b-f<0?(c=a.clone().add(e-1,"months"),d=(b-f)/(f-c)):(c=a.clone().add(e+1,"months"),d=(b-f)/(c-f)),-(e+d)||0}function hc(){return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")}function ic(){if(!this.isValid())return null;var a=this.clone().utc();return a.year()<0||a.year()>9999?X(a,"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]"):z(Date.prototype.toISOString)?this.toDate().toISOString():X(a,"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")}function jc(){if(!this.isValid())return"moment.invalid(/* "+this._i+" */)";var a="moment",b="";this.isLocal()||(a=0===this.utcOffset()?"moment.utc":"moment.parseZone",b="Z");var c="["+a+'("]',d=0<=this.year()&&this.year()<=9999?"YYYY":"YYYYYY",e="-MM-DD[T]HH:mm:ss.SSS",f=b+'[")]';return this.format(c+d+e+f)}function kc(b){b||(b=this.isUtc()?a.defaultFormatUtc:a.defaultFormat);var c=X(this,b);return this.localeData().postformat(c)}function lc(a,b){return this.isValid()&&(s(a)&&a.isValid()||tb(a).isValid())?Sb({to:this,from:a}).locale(this.locale()).humanize(!b):this.localeData().invalidDate()}function mc(a){return this.from(tb(),a)}function nc(a,b){return this.isValid()&&(s(a)&&a.isValid()||tb(a).isValid())?Sb({from:this,to:a}).locale(this.locale()).humanize(!b):this.localeData().invalidDate()}function oc(a){return this.to(tb(),a)}function pc(a){var b;return void 0===a?this._locale._abbr:(b=bb(a),null!=b&&(this._locale=b),this)}function qc(){return this._locale}function rc(a){switch(a=K(a)){case"year":this.month(0);case"quarter":case"month":this.date(1);case"week":case"isoWeek":case"day":case"date":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}return"week"===a&&this.weekday(0),"isoWeek"===a&&this.isoWeekday(1),"quarter"===a&&this.month(3*Math.floor(this.month()/3)),this}function sc(a){return a=K(a),void 0===a||"millisecond"===a?this:("date"===a&&(a="day"),this.startOf(a).add(1,"isoWeek"===a?"week":a).subtract(1,"ms"))}function tc(){return this._d.valueOf()-6e4*(this._offset||0)}function uc(){return Math.floor(this.valueOf()/1e3)}function vc(){return new Date(this.valueOf())}function wc(){var a=this;return[a.year(),a.month(),a.date(),a.hour(),a.minute(),a.second(),a.millisecond()]}function xc(){var a=this;return{years:a.year(),months:a.month(),date:a.date(),hours:a.hours(),minutes:a.minutes(),seconds:a.seconds(),milliseconds:a.milliseconds()}}function yc(){return this.isValid()?this.toISOString():null}function zc(){return o(this)}function Ac(){
return k({},n(this))}function Bc(){return n(this).overflow}function Cc(){return{input:this._i,format:this._f,locale:this._locale,isUTC:this._isUTC,strict:this._strict}}function Dc(a,b){U(0,[a,a.length],0,b)}function Ec(a){return Ic.call(this,a,this.week(),this.weekday(),this.localeData()._week.dow,this.localeData()._week.doy)}function Fc(a){return Ic.call(this,a,this.isoWeek(),this.isoWeekday(),1,4)}function Gc(){return xa(this.year(),1,4)}function Hc(){var a=this.localeData()._week;return xa(this.year(),a.dow,a.doy)}function Ic(a,b,c,d,e){var f;return null==a?wa(this,d,e).year:(f=xa(a,d,e),b>f&&(b=f),Jc.call(this,a,b,c,d,e))}function Jc(a,b,c,d,e){var f=va(a,b,c,d,e),g=ta(f.year,0,f.dayOfYear);return this.year(g.getUTCFullYear()),this.month(g.getUTCMonth()),this.date(g.getUTCDate()),this}function Kc(a){return null==a?Math.ceil((this.month()+1)/3):this.month(3*(a-1)+this.month()%3)}function Lc(a){var b=Math.round((this.clone().startOf("day")-this.clone().startOf("year"))/864e5)+1;return null==a?b:this.add(a-b,"d")}function Mc(a,b){b[ke]=u(1e3*("0."+a))}function Nc(){return this._isUTC?"UTC":""}function Oc(){return this._isUTC?"Coordinated Universal Time":""}function Pc(a){return tb(1e3*a)}function Qc(){return tb.apply(null,arguments).parseZone()}function Rc(a){return a}function Sc(a,b,c,d){var e=bb(),f=l().set(d,b);return e[c](f,a)}function Tc(a,b,c){if(g(a)&&(b=a,a=void 0),a=a||"",null!=b)return Sc(a,b,c,"month");var d,e=[];for(d=0;d<12;d++)e[d]=Sc(a,d,c,"month");return e}function Uc(a,b,c,d){"boolean"==typeof a?(g(b)&&(c=b,b=void 0),b=b||""):(b=a,c=b,a=!1,g(b)&&(c=b,b=void 0),b=b||"");var e=bb(),f=a?e._week.dow:0;if(null!=c)return Sc(b,(c+f)%7,d,"day");var h,i=[];for(h=0;h<7;h++)i[h]=Sc(b,(h+f)%7,d,"day");return i}function Vc(a,b){return Tc(a,b,"months")}function Wc(a,b){return Tc(a,b,"monthsShort")}function Xc(a,b,c){return Uc(a,b,c,"weekdays")}function Yc(a,b,c){return Uc(a,b,c,"weekdaysShort")}function Zc(a,b,c){return Uc(a,b,c,"weekdaysMin")}function $c(){var a=this._data;return this._milliseconds=df(this._milliseconds),this._days=df(this._days),this._months=df(this._months),a.milliseconds=df(a.milliseconds),a.seconds=df(a.seconds),a.minutes=df(a.minutes),a.hours=df(a.hours),a.months=df(a.months),a.years=df(a.years),this}function _c(a,b,c,d){var e=Sb(b,c);return a._milliseconds+=d*e._milliseconds,a._days+=d*e._days,a._months+=d*e._months,a._bubble()}function ad(a,b){return _c(this,a,b,1)}function bd(a,b){return _c(this,a,b,-1)}function cd(a){return a<0?Math.floor(a):Math.ceil(a)}function dd(){var a,b,c,d,e,f=this._milliseconds,g=this._days,h=this._months,i=this._data;return f>=0&&g>=0&&h>=0||f<=0&&g<=0&&h<=0||(f+=864e5*cd(fd(h)+g),g=0,h=0),i.milliseconds=f%1e3,a=t(f/1e3),i.seconds=a%60,b=t(a/60),i.minutes=b%60,c=t(b/60),i.hours=c%24,g+=t(c/24),e=t(ed(g)),h+=e,g-=cd(fd(e)),d=t(h/12),h%=12,i.days=g,i.months=h,i.years=d,this}function ed(a){return 4800*a/146097}function fd(a){return 146097*a/4800}function gd(a){if(!this.isValid())return NaN;var b,c,d=this._milliseconds;if(a=K(a),"month"===a||"year"===a)return b=this._days+d/864e5,c=this._months+ed(b),"month"===a?c:c/12;switch(b=this._days+Math.round(fd(this._months)),a){case"week":return b/7+d/6048e5;case"day":return b+d/864e5;case"hour":return 24*b+d/36e5;case"minute":return 1440*b+d/6e4;case"second":return 86400*b+d/1e3;case"millisecond":return Math.floor(864e5*b)+d;default:throw new Error("Unknown unit "+a)}}function hd(){return this.isValid()?this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*u(this._months/12):NaN}function id(a){return function(){return this.as(a)}}function jd(a){return a=K(a),this.isValid()?this[a+"s"]():NaN}function kd(a){return function(){return this.isValid()?this._data[a]:NaN}}function ld(){return t(this.days()/7)}function md(a,b,c,d,e){return e.relativeTime(b||1,!!c,a,d)}function nd(a,b,c){var d=Sb(a).abs(),e=uf(d.as("s")),f=uf(d.as("m")),g=uf(d.as("h")),h=uf(d.as("d")),i=uf(d.as("M")),j=uf(d.as("y")),k=e<=vf.ss&&["s",e]||e<vf.s&&["ss",e]||f<=1&&["m"]||f<vf.m&&["mm",f]||g<=1&&["h"]||g<vf.h&&["hh",g]||h<=1&&["d"]||h<vf.d&&["dd",h]||i<=1&&["M"]||i<vf.M&&["MM",i]||j<=1&&["y"]||["yy",j];return k[2]=b,k[3]=+a>0,k[4]=c,md.apply(null,k)}function od(a){return void 0===a?uf:"function"==typeof a&&(uf=a,!0)}function pd(a,b){return void 0!==vf[a]&&(void 0===b?vf[a]:(vf[a]=b,"s"===a&&(vf.ss=b-1),!0))}function qd(a){if(!this.isValid())return this.localeData().invalidDate();var b=this.localeData(),c=nd(this,!a,b);return a&&(c=b.pastFuture(+this,c)),b.postformat(c)}function rd(){if(!this.isValid())return this.localeData().invalidDate();var a,b,c,d=wf(this._milliseconds)/1e3,e=wf(this._days),f=wf(this._months);a=t(d/60),b=t(a/60),d%=60,a%=60,c=t(f/12),f%=12;var g=c,h=f,i=e,j=b,k=a,l=d,m=this.asSeconds();return m?(m<0?"-":"")+"P"+(g?g+"Y":"")+(h?h+"M":"")+(i?i+"D":"")+(j||k||l?"T":"")+(j?j+"H":"")+(k?k+"M":"")+(l?l+"S":""):"P0D"}var sd,td;td=Array.prototype.some?Array.prototype.some:function(a){for(var b=Object(this),c=b.length>>>0,d=0;d<c;d++)if(d in b&&a.call(this,b[d],d,b))return!0;return!1};var ud=td,vd=a.momentProperties=[],wd=!1,xd={};a.suppressDeprecationWarnings=!1,a.deprecationHandler=null;var yd;yd=Object.keys?Object.keys:function(a){var b,c=[];for(b in a)j(a,b)&&c.push(b);return c};var zd,Ad=yd,Bd={sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},Cd={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},Dd="Invalid date",Ed="%d",Fd=/\d{1,2}/,Gd={future:"in %s",past:"%s ago",s:"a few seconds",ss:"%d seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},Hd={},Id={},Jd=/(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,Kd=/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,Ld={},Md={},Nd=/\d/,Od=/\d\d/,Pd=/\d{3}/,Qd=/\d{4}/,Rd=/[+-]?\d{6}/,Sd=/\d\d?/,Td=/\d\d\d\d?/,Ud=/\d\d\d\d\d\d?/,Vd=/\d{1,3}/,Wd=/\d{1,4}/,Xd=/[+-]?\d{1,6}/,Yd=/\d+/,Zd=/[+-]?\d+/,$d=/Z|[+-]\d\d:?\d\d/gi,_d=/Z|[+-]\d\d(?::?\d\d)?/gi,ae=/[+-]?\d+(\.\d{1,3})?/,be=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,ce={},de={},ee=0,fe=1,ge=2,he=3,ie=4,je=5,ke=6,le=7,me=8;zd=Array.prototype.indexOf?Array.prototype.indexOf:function(a){var b;for(b=0;b<this.length;++b)if(this[b]===a)return b;return-1};var ne=zd;U("M",["MM",2],"Mo",function(){return this.month()+1}),U("MMM",0,0,function(a){return this.localeData().monthsShort(this,a)}),U("MMMM",0,0,function(a){return this.localeData().months(this,a)}),J("month","M"),M("month",8),Z("M",Sd),Z("MM",Sd,Od),Z("MMM",function(a,b){return b.monthsShortRegex(a)}),Z("MMMM",function(a,b){return b.monthsRegex(a)}),ba(["M","MM"],function(a,b){b[fe]=u(a)-1}),ba(["MMM","MMMM"],function(a,b,c,d){var e=c._locale.monthsParse(a,d,c._strict);null!=e?b[fe]=e:n(c).invalidMonth=a});var oe=/D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,pe="January_February_March_April_May_June_July_August_September_October_November_December".split("_"),qe="Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),re=be,se=be;U("Y",0,0,function(){var a=this.year();return a<=9999?""+a:"+"+a}),U(0,["YY",2],0,function(){return this.year()%100}),U(0,["YYYY",4],0,"year"),U(0,["YYYYY",5],0,"year"),U(0,["YYYYYY",6,!0],0,"year"),J("year","y"),M("year",1),Z("Y",Zd),Z("YY",Sd,Od),Z("YYYY",Wd,Qd),Z("YYYYY",Xd,Rd),Z("YYYYYY",Xd,Rd),ba(["YYYYY","YYYYYY"],ee),ba("YYYY",function(b,c){c[ee]=2===b.length?a.parseTwoDigitYear(b):u(b)}),ba("YY",function(b,c){c[ee]=a.parseTwoDigitYear(b)}),ba("Y",function(a,b){b[ee]=parseInt(a,10)}),a.parseTwoDigitYear=function(a){return u(a)+(u(a)>68?1900:2e3)};var te=O("FullYear",!0);U("w",["ww",2],"wo","week"),U("W",["WW",2],"Wo","isoWeek"),J("week","w"),J("isoWeek","W"),M("week",5),M("isoWeek",5),Z("w",Sd),Z("ww",Sd,Od),Z("W",Sd),Z("WW",Sd,Od),ca(["w","ww","W","WW"],function(a,b,c,d){b[d.substr(0,1)]=u(a)});var ue={dow:0,doy:6};U("d",0,"do","day"),U("dd",0,0,function(a){return this.localeData().weekdaysMin(this,a)}),U("ddd",0,0,function(a){return this.localeData().weekdaysShort(this,a)}),U("dddd",0,0,function(a){return this.localeData().weekdays(this,a)}),U("e",0,0,"weekday"),U("E",0,0,"isoWeekday"),J("day","d"),J("weekday","e"),J("isoWeekday","E"),M("day",11),M("weekday",11),M("isoWeekday",11),Z("d",Sd),Z("e",Sd),Z("E",Sd),Z("dd",function(a,b){return b.weekdaysMinRegex(a)}),Z("ddd",function(a,b){return b.weekdaysShortRegex(a)}),Z("dddd",function(a,b){return b.weekdaysRegex(a)}),ca(["dd","ddd","dddd"],function(a,b,c,d){var e=c._locale.weekdaysParse(a,d,c._strict);null!=e?b.d=e:n(c).invalidWeekday=a}),ca(["d","e","E"],function(a,b,c,d){b[d]=u(a)});var ve="Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),we="Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),xe="Su_Mo_Tu_We_Th_Fr_Sa".split("_"),ye=be,ze=be,Ae=be;U("H",["HH",2],0,"hour"),U("h",["hh",2],0,Ra),U("k",["kk",2],0,Sa),U("hmm",0,0,function(){return""+Ra.apply(this)+T(this.minutes(),2)}),U("hmmss",0,0,function(){return""+Ra.apply(this)+T(this.minutes(),2)+T(this.seconds(),2)}),U("Hmm",0,0,function(){return""+this.hours()+T(this.minutes(),2)}),U("Hmmss",0,0,function(){return""+this.hours()+T(this.minutes(),2)+T(this.seconds(),2)}),Ta("a",!0),Ta("A",!1),J("hour","h"),M("hour",13),Z("a",Ua),Z("A",Ua),Z("H",Sd),Z("h",Sd),Z("k",Sd),Z("HH",Sd,Od),Z("hh",Sd,Od),Z("kk",Sd,Od),Z("hmm",Td),Z("hmmss",Ud),Z("Hmm",Td),Z("Hmmss",Ud),ba(["H","HH"],he),ba(["k","kk"],function(a,b,c){var d=u(a);b[he]=24===d?0:d}),ba(["a","A"],function(a,b,c){c._isPm=c._locale.isPM(a),c._meridiem=a}),ba(["h","hh"],function(a,b,c){b[he]=u(a),n(c).bigHour=!0}),ba("hmm",function(a,b,c){var d=a.length-2;b[he]=u(a.substr(0,d)),b[ie]=u(a.substr(d)),n(c).bigHour=!0}),ba("hmmss",function(a,b,c){var d=a.length-4,e=a.length-2;b[he]=u(a.substr(0,d)),b[ie]=u(a.substr(d,2)),b[je]=u(a.substr(e)),n(c).bigHour=!0}),ba("Hmm",function(a,b,c){var d=a.length-2;b[he]=u(a.substr(0,d)),b[ie]=u(a.substr(d))}),ba("Hmmss",function(a,b,c){var d=a.length-4,e=a.length-2;b[he]=u(a.substr(0,d)),b[ie]=u(a.substr(d,2)),b[je]=u(a.substr(e))});var Be,Ce=/[ap]\.?m?\.?/i,De=O("Hours",!0),Ee={calendar:Bd,longDateFormat:Cd,invalidDate:Dd,ordinal:Ed,dayOfMonthOrdinalParse:Fd,relativeTime:Gd,months:pe,monthsShort:qe,week:ue,weekdays:ve,weekdaysMin:xe,weekdaysShort:we,meridiemParse:Ce},Fe={},Ge={},He=/^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,Ie=/^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,Je=/Z|[+-]\d\d(?::?\d\d)?/,Ke=[["YYYYYY-MM-DD",/[+-]\d{6}-\d\d-\d\d/],["YYYY-MM-DD",/\d{4}-\d\d-\d\d/],["GGGG-[W]WW-E",/\d{4}-W\d\d-\d/],["GGGG-[W]WW",/\d{4}-W\d\d/,!1],["YYYY-DDD",/\d{4}-\d{3}/],["YYYY-MM",/\d{4}-\d\d/,!1],["YYYYYYMMDD",/[+-]\d{10}/],["YYYYMMDD",/\d{8}/],["GGGG[W]WWE",/\d{4}W\d{3}/],["GGGG[W]WW",/\d{4}W\d{2}/,!1],["YYYYDDD",/\d{7}/]],Le=[["HH:mm:ss.SSSS",/\d\d:\d\d:\d\d\.\d+/],["HH:mm:ss,SSSS",/\d\d:\d\d:\d\d,\d+/],["HH:mm:ss",/\d\d:\d\d:\d\d/],["HH:mm",/\d\d:\d\d/],["HHmmss.SSSS",/\d\d\d\d\d\d\.\d+/],["HHmmss,SSSS",/\d\d\d\d\d\d,\d+/],["HHmmss",/\d\d\d\d\d\d/],["HHmm",/\d\d\d\d/],["HH",/\d\d/]],Me=/^\/?Date\((\-?\d+)/i,Ne=/^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d?\d\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(?:\d\d)?\d\d\s)(\d\d:\d\d)(\:\d\d)?(\s(?:UT|GMT|[ECMP][SD]T|[A-IK-Za-ik-z]|[+-]\d{4}))$/;a.createFromInputFallback=x("value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.",function(a){a._d=new Date(a._i+(a._useUTC?" UTC":""))}),a.ISO_8601=function(){},a.RFC_2822=function(){};var Oe=x("moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var a=tb.apply(null,arguments);return this.isValid()&&a.isValid()?a<this?this:a:p()}),Pe=x("moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var a=tb.apply(null,arguments);return this.isValid()&&a.isValid()?a>this?this:a:p()}),Qe=function(){return Date.now?Date.now():+new Date},Re=["year","quarter","month","week","day","hour","minute","second","millisecond"];Db("Z",":"),Db("ZZ",""),Z("Z",_d),Z("ZZ",_d),ba(["Z","ZZ"],function(a,b,c){c._useUTC=!0,c._tzm=Eb(_d,a)});var Se=/([\+\-]|\d\d)/gi;a.updateOffset=function(){};var Te=/^(\-)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/,Ue=/^(-)?P(?:(-?[0-9,.]*)Y)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)W)?(?:(-?[0-9,.]*)D)?(?:T(?:(-?[0-9,.]*)H)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)S)?)?$/;Sb.fn=Ab.prototype,Sb.invalid=zb;var Ve=Wb(1,"add"),We=Wb(-1,"subtract");a.defaultFormat="YYYY-MM-DDTHH:mm:ssZ",a.defaultFormatUtc="YYYY-MM-DDTHH:mm:ss[Z]";var Xe=x("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.",function(a){return void 0===a?this.localeData():this.locale(a)});U(0,["gg",2],0,function(){return this.weekYear()%100}),U(0,["GG",2],0,function(){return this.isoWeekYear()%100}),Dc("gggg","weekYear"),Dc("ggggg","weekYear"),Dc("GGGG","isoWeekYear"),Dc("GGGGG","isoWeekYear"),J("weekYear","gg"),J("isoWeekYear","GG"),M("weekYear",1),M("isoWeekYear",1),Z("G",Zd),Z("g",Zd),Z("GG",Sd,Od),Z("gg",Sd,Od),Z("GGGG",Wd,Qd),Z("gggg",Wd,Qd),Z("GGGGG",Xd,Rd),Z("ggggg",Xd,Rd),ca(["gggg","ggggg","GGGG","GGGGG"],function(a,b,c,d){b[d.substr(0,2)]=u(a)}),ca(["gg","GG"],function(b,c,d,e){c[e]=a.parseTwoDigitYear(b)}),U("Q",0,"Qo","quarter"),J("quarter","Q"),M("quarter",7),Z("Q",Nd),ba("Q",function(a,b){b[fe]=3*(u(a)-1)}),U("D",["DD",2],"Do","date"),J("date","D"),M("date",9),Z("D",Sd),Z("DD",Sd,Od),Z("Do",function(a,b){return a?b._dayOfMonthOrdinalParse||b._ordinalParse:b._dayOfMonthOrdinalParseLenient}),ba(["D","DD"],ge),ba("Do",function(a,b){b[ge]=u(a.match(Sd)[0],10)});var Ye=O("Date",!0);U("DDD",["DDDD",3],"DDDo","dayOfYear"),J("dayOfYear","DDD"),M("dayOfYear",4),Z("DDD",Vd),Z("DDDD",Pd),ba(["DDD","DDDD"],function(a,b,c){c._dayOfYear=u(a)}),U("m",["mm",2],0,"minute"),J("minute","m"),M("minute",14),Z("m",Sd),Z("mm",Sd,Od),ba(["m","mm"],ie);var Ze=O("Minutes",!1);U("s",["ss",2],0,"second"),J("second","s"),M("second",15),Z("s",Sd),Z("ss",Sd,Od),ba(["s","ss"],je);var $e=O("Seconds",!1);U("S",0,0,function(){return~~(this.millisecond()/100)}),U(0,["SS",2],0,function(){return~~(this.millisecond()/10)}),U(0,["SSS",3],0,"millisecond"),U(0,["SSSS",4],0,function(){return 10*this.millisecond()}),U(0,["SSSSS",5],0,function(){return 100*this.millisecond()}),U(0,["SSSSSS",6],0,function(){return 1e3*this.millisecond()}),U(0,["SSSSSSS",7],0,function(){return 1e4*this.millisecond()}),U(0,["SSSSSSSS",8],0,function(){return 1e5*this.millisecond()}),U(0,["SSSSSSSSS",9],0,function(){return 1e6*this.millisecond()}),J("millisecond","ms"),M("millisecond",16),Z("S",Vd,Nd),Z("SS",Vd,Od),Z("SSS",Vd,Pd);var _e;for(_e="SSSS";_e.length<=9;_e+="S")Z(_e,Yd);for(_e="S";_e.length<=9;_e+="S")ba(_e,Mc);var af=O("Milliseconds",!1);U("z",0,0,"zoneAbbr"),U("zz",0,0,"zoneName");var bf=r.prototype;bf.add=Ve,bf.calendar=Zb,bf.clone=$b,bf.diff=fc,bf.endOf=sc,bf.format=kc,bf.from=lc,bf.fromNow=mc,bf.to=nc,bf.toNow=oc,bf.get=R,bf.invalidAt=Bc,bf.isAfter=_b,bf.isBefore=ac,bf.isBetween=bc,bf.isSame=cc,bf.isSameOrAfter=dc,bf.isSameOrBefore=ec,bf.isValid=zc,bf.lang=Xe,bf.locale=pc,bf.localeData=qc,bf.max=Pe,bf.min=Oe,bf.parsingFlags=Ac,bf.set=S,bf.startOf=rc,bf.subtract=We,bf.toArray=wc,bf.toObject=xc,bf.toDate=vc,bf.toISOString=ic,bf.inspect=jc,bf.toJSON=yc,bf.toString=hc,bf.unix=uc,bf.valueOf=tc,bf.creationData=Cc,bf.year=te,bf.isLeapYear=ra,bf.weekYear=Ec,bf.isoWeekYear=Fc,bf.quarter=bf.quarters=Kc,bf.month=ka,bf.daysInMonth=la,bf.week=bf.weeks=Ba,bf.isoWeek=bf.isoWeeks=Ca,bf.weeksInYear=Hc,bf.isoWeeksInYear=Gc,bf.date=Ye,bf.day=bf.days=Ka,bf.weekday=La,bf.isoWeekday=Ma,bf.dayOfYear=Lc,bf.hour=bf.hours=De,bf.minute=bf.minutes=Ze,bf.second=bf.seconds=$e,bf.millisecond=bf.milliseconds=af,bf.utcOffset=Hb,bf.utc=Jb,bf.local=Kb,bf.parseZone=Lb,bf.hasAlignedHourOffset=Mb,bf.isDST=Nb,bf.isLocal=Pb,bf.isUtcOffset=Qb,bf.isUtc=Rb,bf.isUTC=Rb,bf.zoneAbbr=Nc,bf.zoneName=Oc,bf.dates=x("dates accessor is deprecated. Use date instead.",Ye),bf.months=x("months accessor is deprecated. Use month instead",ka),bf.years=x("years accessor is deprecated. Use year instead",te),bf.zone=x("moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/",Ib),bf.isDSTShifted=x("isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information",Ob);var cf=C.prototype;cf.calendar=D,cf.longDateFormat=E,cf.invalidDate=F,cf.ordinal=G,cf.preparse=Rc,cf.postformat=Rc,cf.relativeTime=H,cf.pastFuture=I,cf.set=A,cf.months=fa,cf.monthsShort=ga,cf.monthsParse=ia,cf.monthsRegex=na,cf.monthsShortRegex=ma,cf.week=ya,cf.firstDayOfYear=Aa,cf.firstDayOfWeek=za,cf.weekdays=Fa,cf.weekdaysMin=Ha,cf.weekdaysShort=Ga,cf.weekdaysParse=Ja,cf.weekdaysRegex=Na,cf.weekdaysShortRegex=Oa,cf.weekdaysMinRegex=Pa,cf.isPM=Va,cf.meridiem=Wa,$a("en",{dayOfMonthOrdinalParse:/\d{1,2}(th|st|nd|rd)/,ordinal:function(a){var b=a%10,c=1===u(a%100/10)?"th":1===b?"st":2===b?"nd":3===b?"rd":"th";return a+c}}),a.lang=x("moment.lang is deprecated. Use moment.locale instead.",$a),a.langData=x("moment.langData is deprecated. Use moment.localeData instead.",bb);var df=Math.abs,ef=id("ms"),ff=id("s"),gf=id("m"),hf=id("h"),jf=id("d"),kf=id("w"),lf=id("M"),mf=id("y"),nf=kd("milliseconds"),of=kd("seconds"),pf=kd("minutes"),qf=kd("hours"),rf=kd("days"),sf=kd("months"),tf=kd("years"),uf=Math.round,vf={ss:44,s:45,m:45,h:22,d:26,M:11},wf=Math.abs,xf=Ab.prototype;return xf.isValid=yb,xf.abs=$c,xf.add=ad,xf.subtract=bd,xf.as=gd,xf.asMilliseconds=ef,xf.asSeconds=ff,xf.asMinutes=gf,xf.asHours=hf,xf.asDays=jf,xf.asWeeks=kf,xf.asMonths=lf,xf.asYears=mf,xf.valueOf=hd,xf._bubble=dd,xf.get=jd,xf.milliseconds=nf,xf.seconds=of,xf.minutes=pf,xf.hours=qf,xf.days=rf,xf.weeks=ld,xf.months=sf,xf.years=tf,xf.humanize=qd,xf.toISOString=rd,xf.toString=rd,xf.toJSON=rd,xf.locale=pc,xf.localeData=qc,xf.toIsoString=x("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)",rd),xf.lang=Xe,U("X",0,0,"unix"),U("x",0,0,"valueOf"),Z("x",Zd),Z("X",ae),ba("X",function(a,b,c){c._d=new Date(1e3*parseFloat(a,10))}),ba("x",function(a,b,c){c._d=new Date(u(a))}),a.version="2.18.1",b(tb),a.fn=bf,a.min=vb,a.max=wb,a.now=Qe,a.utc=l,a.unix=Pc,a.months=Vc,a.isDate=h,a.locale=$a,a.invalid=p,a.duration=Sb,a.isMoment=s,a.weekdays=Xc,a.parseZone=Qc,a.localeData=bb,a.isDuration=Bb,a.monthsShort=Wc,a.weekdaysMin=Zc,a.defineLocale=_a,a.updateLocale=ab,a.locales=cb,a.weekdaysShort=Yc,a.normalizeUnits=K,a.relativeTimeRounding=od,a.relativeTimeThreshold=pd,a.calendarFormat=Yb,a.prototype=bf,a});
/*!
 * FullCalendar v2.7.1
 * Docs & License: http://fullcalendar.io/
 * (c) 2016 Adam Shaw
 */
!function(a){"function"==typeof define&&define.amd?define(["jquery","moment"],a):"object"==typeof exports?// Node/CommonJS
module.exports=a(require("jquery"),require("moment")):a(jQuery,moment)}(function(a,b){
// Merges an array of option objects into a single object
function c(a){return U(a,Va)}
// Given options specified for the calendar's constructor, massages any legacy options into a non-legacy form.
// Converts View-Option-Hashes into the View-Specific-Options format.
function d(b){var c,d={views:b.views||{}};
// iterate through all option override properties (except `views`)
return a.each(b,function(b,e){"views"!=b&&(
// could the value be a legacy View-Option-Hash?
a.isPlainObject(e)&&!/(time|duration|interval)$/i.test(b)&&-1==a.inArray(b,Va)?(c=null,a.each(e,function(a,e){/^(month|week|day|default|basic(Week|Day)?|agenda(Week|Day)?)$/.test(a)?(d.views[a]||(d.views[a]={}),d.views[a][b]=e):(c||(c={}),c[a]=e)}),c&&(d[b]=c)):d[b]=e)}),d}/* FullCalendar-specific DOM Utilities
----------------------------------------------------------------------------------------------------------------------*/
// Given the scrollbar widths of some other container, create borders/margins on rowEls in order to match the left
// and right space that was offset by the scrollbars. A 1-pixel border first, then margin beyond that.
function e(a,b){b.left&&a.css({"border-left-width":1,"margin-left":b.left-1}),b.right&&a.css({"border-right-width":1,"margin-right":b.right-1})}
// Undoes compensateScroll and restores all borders/margins
function f(a){a.css({"margin-left":"","margin-right":"","border-left-width":"","border-right-width":""})}
// Make the mouse cursor express that an event is not allowed in the current area
function g(){a("body").addClass("fc-not-allowed")}
// Returns the mouse cursor to its original look
function h(){a("body").removeClass("fc-not-allowed")}
// Given a total available height to fill, have `els` (essentially child rows) expand to accomodate.
// By default, all elements that are shorter than the recommended height are expanded uniformly, not considering
// any other els that are already too tall. if `shouldRedistribute` is on, it considers these tall rows and 
// reduces the available height.
function i(b,c,d){
// *FLOORING NOTE*: we floor in certain places because zoom can give inaccurate floating-point dimensions,
// and it is better to be shorter than taller, to avoid creating unnecessary scrollbars.
var e=Math.floor(c/b.length),f=Math.floor(c-e*(b.length-1)),g=[],h=[],i=[],k=0;j(b),// give all elements their natural height
// find elements that are below the recommended height (expandable).
// important to query for heights in a single first pass (to avoid reflow oscillation).
b.each(function(c,d){var j=c===b.length-1?f:e,l=a(d).outerHeight(!0);j>l?(g.push(d),h.push(l),i.push(a(d).height())):
// this element stretches past recommended height (non-expandable). mark the space as occupied.
k+=l}),
// readjust the recommended height to only consider the height available to non-maxed-out rows.
d&&(c-=k,e=Math.floor(c/g.length),f=Math.floor(c-e*(g.length-1))),
// assign heights to all expandable elements
a(g).each(function(b,c){var d=b===g.length-1?f:e,j=h[b],k=i[b],l=d-(j-k);// subtract the margin/padding
d>j&&// we check this again because redistribution might have changed things
a(c).height(l)})}
// Undoes distrubuteHeight, restoring all els to their natural height
function j(a){a.height("")}
// Given `els`, a jQuery set of <td> cells, find the cell with the largest natural width and set the widths of all the
// cells to be that width.
// PREREQUISITE: if you want a cell to take up width, it needs to have a single inner element w/ display:inline
function k(b){var c=0;// sometimes not accurate of width the text needs to stay on one line. insurance
return b.find("> span").each(function(b,d){var e=a(d).outerWidth();e>c&&(c=e)}),c++,b.width(c),c}
// Given one element that resides inside another,
// Subtracts the height of the inner element from the outer element.
function l(a,b){var c,d=a.add(b);// undo hack
// effin' IE8/9/10/11 sometimes returns 0 for dimensions. this weird hack was the only thing that worked
// grab the dimensions
return d.css({position:"relative",// cause a reflow, which will force fresh dimension recalculation
left:-1}),c=a.outerHeight()-b.outerHeight(),d.css({position:"",left:""}),c}
// borrowed from https://github.com/jquery/jquery-ui/blob/1.11.0/ui/core.js#L51
function m(b){var c=b.css("position"),d=b.parents().filter(function(){var b=a(this);return/(auto|scroll)/.test(b.css("overflow")+b.css("overflow-y")+b.css("overflow-x"))}).eq(0);return"fixed"!==c&&d.length?d:a(b[0].ownerDocument||document)}
// Queries the outer bounding area of a jQuery element.
// Returns a rectangle with absolute coordinates: left, right (exclusive), top, bottom (exclusive).
// Origin is optional.
function n(a,b){var c=a.offset(),d=c.left-(b?b.left:0),e=c.top-(b?b.top:0);return{left:d,right:d+a.outerWidth(),top:e,bottom:e+a.outerHeight()}}
// Queries the area within the margin/border/scrollbars of a jQuery element. Does not go within the padding.
// Returns a rectangle with absolute coordinates: left, right (exclusive), top, bottom (exclusive).
// Origin is optional.
// NOTE: should use clientLeft/clientTop, but very unreliable cross-browser.
function o(a,b){var c=a.offset(),d=q(a),e=c.left+t(a,"border-left-width")+d.left-(b?b.left:0),f=c.top+t(a,"border-top-width")+d.top-(b?b.top:0);return{left:e,right:e+a[0].clientWidth,// clientWidth includes padding but NOT scrollbars
top:f,bottom:f+a[0].clientHeight}}
// Queries the area within the margin/border/padding of a jQuery element. Assumed not to have scrollbars.
// Returns a rectangle with absolute coordinates: left, right (exclusive), top, bottom (exclusive).
// Origin is optional.
function p(a,b){var c=a.offset(),d=c.left+t(a,"border-left-width")+t(a,"padding-left")-(b?b.left:0),e=c.top+t(a,"border-top-width")+t(a,"padding-top")-(b?b.top:0);return{left:d,right:d+a.width(),top:e,bottom:e+a.height()}}
// Returns the computed left/right/top/bottom scrollbar widths for the given jQuery element.
// NOTE: should use clientLeft/clientTop, but very unreliable cross-browser.
function q(a){var b=a.innerWidth()-a[0].clientWidth,c={left:0,right:0,top:0,bottom:a.innerHeight()-a[0].clientHeight};// is the scrollbar on the left side?
return r()&&"rtl"==a.css("direction")?c.left=b:c.right=b,c}function r(){// responsible for caching the computation
return null===Wa&&(Wa=s()),Wa}function s(){// creates an offscreen test element, then removes it
var b=a("<div><div/></div>").css({position:"absolute",top:-1e3,left:0,border:0,padding:0,overflow:"scroll",direction:"rtl"}).appendTo("body"),c=b.children(),d=c.offset().left>b.offset().left;// is the inner div shifted to accommodate a left scrollbar?
return b.remove(),d}
// Retrieves a jQuery element's computed CSS value as a floating-point number.
// If the queried value is non-numeric (ex: IE can return "medium" for border width), will just return zero.
function t(a,b){return parseFloat(a.css(b))||0}
// Returns a boolean whether this was a left mouse click and no ctrl key (which means right click on Mac)
function u(a){return 1==a.which&&!a.ctrlKey}function v(a){if(void 0!==a.pageX)return a.pageX;var b=a.originalEvent.touches;return b?b[0].pageX:void 0}function w(a){if(void 0!==a.pageY)return a.pageY;var b=a.originalEvent.touches;return b?b[0].pageY:void 0}function x(a){return/^touch/.test(a.type)}function y(a){a.addClass("fc-unselectable").on("selectstart",z)}
// Stops a mouse/touch event from doing it's native browser action
function z(a){a.preventDefault()}
// Returns a new rectangle that is the intersection of the two rectangles. If they don't intersect, returns false
function A(a,b){var c={left:Math.max(a.left,b.left),right:Math.min(a.right,b.right),top:Math.max(a.top,b.top),bottom:Math.min(a.bottom,b.bottom)};return c.left<c.right&&c.top<c.bottom?c:!1}
// Returns a new point that will have been moved to reside within the given rectangle
function B(a,b){return{left:Math.min(Math.max(a.left,b.left),b.right),top:Math.min(Math.max(a.top,b.top),b.bottom)}}
// Returns a point that is the center of the given rectangle
function C(a){return{left:(a.left+a.right)/2,top:(a.top+a.bottom)/2}}
// Subtracts point2's coordinates from point1's coordinates, returning a delta
function D(a,b){return{left:a.left-b.left,top:a.top-b.top}}function E(b){var c,d,e=[],f=[];for("string"==typeof b?f=b.split(/\s*,\s*/):"function"==typeof b?f=[b]:a.isArray(b)&&(f=b),c=0;c<f.length;c++)d=f[c],"string"==typeof d?e.push("-"==d.charAt(0)?{field:d.substring(1),order:-1}:{field:d,order:1}):"function"==typeof d&&e.push({func:d});return e}function F(a,b,c){var d,e;for(d=0;d<c.length;d++)if(e=G(a,b,c[d]))return e;return 0}function G(a,b,c){return c.func?c.func(a,b):H(a[c.field],b[c.field])*(c.order||1)}function H(b,c){return b||c?null==c?-1:null==b?1:"string"===a.type(b)||"string"===a.type(c)?String(b).localeCompare(String(c)):b-c:0}/* FullCalendar-specific Misc Utilities
----------------------------------------------------------------------------------------------------------------------*/
// Computes the intersection of the two ranges. Returns undefined if no intersection.
// Expects all dates to be normalized to the same timezone beforehand.
// TODO: move to date section?
function I(a,b){var c,d,e,f,g=a.start,h=a.end,i=b.start,j=b.end;// in bounds at all?
return h>i&&j>g?(g>=i?(c=g.clone(),e=!0):(c=i.clone(),e=!1),j>=h?(d=h.clone(),f=!0):(d=j.clone(),f=!1),{start:c,end:d,isStart:e,isEnd:f}):void 0}
// Diffs the two moments into a Duration where full-days are recorded first, then the remaining time.
// Moments will have their timezones normalized.
function J(a,c){return b.duration({days:a.clone().stripTime().diff(c.clone().stripTime(),"days"),ms:a.time()-c.time()})}
// Diffs the two moments via their start-of-day (regardless of timezone). Produces whole-day durations.
function K(a,c){return b.duration({days:a.clone().stripTime().diff(c.clone().stripTime(),"days")})}
// Diffs two moments, producing a duration, made of a whole-unit-increment of the given unit. Uses rounding.
function L(a,c,d){// returnFloat=true
return b.duration(Math.round(a.diff(c,d,!0)),d)}
// Computes the unit name of the largest whole-unit period of time.
// For example, 48 hours will be "days" whereas 49 hours will be "hours".
// Accepts start/end, a range object, or an original duration object.
function M(a,b){var c,d,e;for(c=0;c<Ya.length&&(d=Ya[c],e=N(d,a,b),!(e>=1&&fa(e)));c++);return d}
// Computes the number of units (like "hours") in the given range.
// Range can be a {start,end} object, separate start/end args, or a Duration.
// Results are based on Moment's .as() and .diff() methods, so results can depend on internal handling
// of month-diffing logic (which tends to vary from version to version).
function N(a,c,d){return null!=d?d.diff(c,a,!0):b.isDuration(c)?c.as(a):c.end.diff(c.start,a,!0)}
// Intelligently divides a range (specified by a start/end params) by a duration
function O(a,b,c){var d;return R(c)?(b-a)/c:(d=c.asMonths(),Math.abs(d)>=1&&fa(d)?b.diff(a,"months",!0)/d:b.diff(a,"days",!0)/c.asDays())}
// Intelligently divides one duration by another
function P(a,b){var c,d;return R(a)||R(b)?a/b:(c=a.asMonths(),d=b.asMonths(),Math.abs(c)>=1&&fa(c)&&Math.abs(d)>=1&&fa(d)?c/d:a.asDays()/b.asDays())}
// Intelligently multiplies a duration by a number
function Q(a,c){var d;return R(a)?b.duration(a*c):(d=a.asMonths(),Math.abs(d)>=1&&fa(d)?b.duration({months:d*c}):b.duration({days:a.asDays()*c}))}
// Returns a boolean about whether the given duration has any time parts (hours/minutes/seconds/ms)
function R(a){return Boolean(a.hours()||a.minutes()||a.seconds()||a.milliseconds())}function S(a){return"[object Date]"===Object.prototype.toString.call(a)||a instanceof Date}
// Returns a boolean about whether the given input is a time string, like "06:40:00" or "06:00"
function T(a){return/^\d+\:\d+(?:\:\d+\.?(?:\d{3})?)?$/.test(a)}
// Merges an array of objects into a single object.
// The second argument allows for an array of property names who's object values will be merged together.
function U(a,b){var c,d,e,f,g,h,i={};if(b)for(c=0;c<b.length;c++){
// collect the trailing object values, stopping when a non-object is discovered
for(d=b[c],e=[],f=a.length-1;f>=0;f--)if(g=a[f][d],"object"==typeof g)e.unshift(g);else if(void 0!==g){i[d]=g;// if there were no objects, this value will be used
break}
// if the trailing values were objects, use the merged value
e.length&&(i[d]=U(e))}
// copy values into the destination, going from last to first
for(c=a.length-1;c>=0;c--){h=a[c];for(d in h)d in i||(// if already assigned by previous props or complex props, don't reassign
i[d]=h[d])}return i}
// Create an object that has the given prototype. Just like Object.create
function V(a){var b=function(){};return b.prototype=a,new b}function W(a,b){for(var c in a)Y(a,c)&&(b[c]=a[c])}
// Copies over certain methods with the same names as Object.prototype methods. Overcomes an IE<=8 bug:
// https://developer.mozilla.org/en-US/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
function X(a,b){var c,d,e=["constructor","toString","valueOf"];for(c=0;c<e.length;c++)d=e[c],a[d]!==Object.prototype[d]&&(b[d]=a[d])}function Y(a,b){return ab.call(a,b)}
// Is the given value a non-object non-function value?
function Z(b){return/undefined|null|boolean|number|string/.test(a.type(b))}function $(b,c,d){if(a.isFunction(b)&&(b=[b]),b){var e,f;for(e=0;e<b.length;e++)f=b[e].apply(c,d)||f;return f}}function _(){for(var a=0;a<arguments.length;a++)if(void 0!==arguments[a])return arguments[a]}function aa(a){return(a+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&#039;").replace(/"/g,"&quot;").replace(/\n/g,"<br />")}function ba(a){return a.replace(/&.*?;/g,"")}
// Given a hash of CSS properties, returns a string of CSS.
// Uses property names as-is (no camel-case conversion). Will not make statements for null/undefined values.
function ca(b){var c=[];return a.each(b,function(a,b){null!=b&&c.push(a+":"+b)}),c.join(";")}function da(a){return a.charAt(0).toUpperCase()+a.slice(1)}function ea(a,b){// for .sort()
return a-b}function fa(a){return a%1===0}
// Returns a method bound to the given object context.
// Just like one of the jQuery.proxy signatures, but without the undesired behavior of treating the same method with
// different contexts as identical when binding/unbinding events.
function ga(a,b){var c=a[b];return function(){return c.apply(a,arguments)}}
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
// https://github.com/jashkenas/underscore/blob/1.6.0/underscore.js#L714
function ha(a,b,c){var d,e,f,g,h,i=function(){var j=+new Date-g;b>j?d=setTimeout(i,b-j):(d=null,c||(h=a.apply(f,e),f=e=null))};return function(){f=this,e=arguments,g=+new Date;var j=c&&!d;return d||(d=setTimeout(i,b)),j&&(h=a.apply(f,e),f=e=null),h}}
// Builds an enhanced moment from args. When given an existing moment, it clones. When given a
// native Date, or called with no arguments (the current time), the resulting moment will be local.
// Anything else needs to be "parsed" (a string or an array), and will be affected by:
//    parseAsUTC - if there is no zone information, should we parse the input in UTC?
//    parseZone - if there is zone information, should we force the zone of the moment?
function ia(c,d,e){var f,g,h,i,j=c[0],k=1==c.length&&"string"==typeof j;// flag for extended functionality
// clone it
// "parsing" is required
// accept strings like '2014-05', but convert to the first of the month
// for when we pass it on to moment's constructor
// no time part?
// arrays have no timezone information, so assume ambiguous zone
// otherwise, probably a string with a format
// let's record the inputted zone somehow
return b.isMoment(j)?(i=b.apply(null,c),ka(j,i)):S(j)||void 0===j?i=b.apply(null,c):(f=!1,g=!1,k?bb.test(j)?(j+="-01",c=[j],f=!0,g=!0):(h=cb.exec(j))&&(f=!h[5],g=!0):a.isArray(j)&&(g=!0),i=d||f?b.utc.apply(b,c):b.apply(null,c),f?(i._ambigTime=!0,i._ambigZone=!0):e&&(g?i._ambigZone=!0:k&&(i.utcOffset?i.utcOffset(j):i.zone(j)))),i._fullCalendar=!0,i}
// Misc Internals
// -------------------------------------------------------------------------------------------------
// given an array of moment-like inputs, return a parallel array w/ moments similarly ambiguated.
// for example, of one moment has ambig time, but not others, all moments will have their time stripped.
// set `preserveTime` to `true` to keep times, but only normalize zone ambiguity.
// returns the original moments if no modifications are necessary.
function ja(a,c){var d,e,f=!1,g=!1,h=a.length,i=[];
// parse inputs into real moments and query their ambig flags
for(d=0;h>d;d++)e=a[d],b.isMoment(e)||(e=Ta.moment.parseZone(e)),f=f||e._ambigTime,g=g||e._ambigZone,i.push(e);
// strip each moment down to lowest common ambiguity
// use clones to avoid modifying the original moments
for(d=0;h>d;d++)e=i[d],c||!f||e._ambigTime?g&&!e._ambigZone&&(i[d]=e.clone().stripZone()):i[d]=e.clone().stripTime();return i}
// Transfers all the flags related to ambiguous time/zone from the `src` moment to the `dest` moment
// TODO: look into moment.momentProperties for this.
function ka(a,b){a._ambigTime?b._ambigTime=!0:b._ambigTime&&(b._ambigTime=!1),a._ambigZone?b._ambigZone=!0:b._ambigZone&&(b._ambigZone=!1)}
// Sets the year/month/date/etc values of the moment from the given array.
// Inefficient because it calls each individual setter.
function la(a,b){a.year(b[0]||0).month(b[1]||0).date(b[2]||0).hours(b[3]||0).minutes(b[4]||0).seconds(b[5]||0).milliseconds(b[6]||0)}
// Single Date Formatting
// -------------------------------------------------------------------------------------------------
// call this if you want Moment's original format method to be used
function ma(a,b){return eb.format.call(a,b)}
// Formats `date` with a Moment formatting string, but allow our non-zero areas and
// additional token.
function na(a,b){return oa(a,ta(b))}function oa(a,b){var c,d="";for(c=0;c<b.length;c++)d+=pa(a,b[c]);return d}function pa(a,b){var c,d;// a token, like "YYYY"
// a grouping of other chunks that must be non-zero
return"string"==typeof b?b:(c=b.token)?fb[c]?fb[c](a):ma(a,c):b.maybe&&(d=oa(a,b.maybe),d.match(/[1-9]/))?d:""}
// Date Range Formatting
// -------------------------------------------------------------------------------------------------
// TODO: make it work with timezone offset
// Using a formatting string meant for a single date, generate a range string, like
// "Sep 2 - 9 2013", that intelligently inserts a separator where the dates differ.
// If the dates are the same as far as the format string is concerned, just return a single
// rendering of one date, without any separator.
function qa(a,b,c,d,e){var f;// works with moment-pre-2.8
// Expand localized format strings, like "LL" -> "MMMM D YYYY"
// BTW, this is not important for `formatDate` because it is impossible to put custom tokens
// or non-zero areas in Moment's localized format strings.
return a=Ta.moment.parseZone(a),b=Ta.moment.parseZone(b),f=(a.localeData||a.lang).call(a),c=f.longDateFormat(c)||c,d=d||" - ",ra(a,b,ta(c),d,e)}// expose
function ra(a,b,c,d,e){var f,g,h,i,j=a.clone().stripZone(),k=b.clone().stripZone(),l="",m="",n="",o="",p="";
// Start at the leftmost side of the formatting string and continue until you hit a token
// that is not the same between dates.
for(g=0;g<c.length&&(f=sa(a,b,j,k,c[g]),f!==!1);g++)l+=f;
// Similarly, start at the rightmost side of the formatting string and move left
for(h=c.length-1;h>g&&(f=sa(a,b,j,k,c[h]),f!==!1);h--)m=f+m;
// The area in the middle is different for both of the dates.
// Collect them distinctly so we can jam them together later.
for(i=g;h>=i;i++)n+=pa(a,c[i]),o+=pa(b,c[i]);return(n||o)&&(p=e?o+d+n:n+d+o),l+p+m}
// TODO: week maybe?
// Given a formatting chunk, and given that both dates are similar in the regard the
// formatting chunk is concerned, format date1 against `chunk`. Otherwise, return `false`.
function sa(a,b,c,d,e){var f,g;return"string"==typeof e?e:(f=e.token)&&(g=gb[f.charAt(0)],g&&c.isSame(d,g))?ma(a,f):!1}function ta(a){return a in hb?hb[a]:hb[a]=ua(a)}
// Break the formatting string into an array of chunks
function ua(a){for(var b,c=[],d=/\[([^\]]*)\]|\(([^\)]*)\)|(LTS|LT|(\w)\4*o?)|([^\w\[\(]+)/g;b=d.exec(a);)b[1]?// a literal string inside [ ... ]
c.push(b[1]):b[2]?// non-zero formatting inside ( ... )
c.push({maybe:ua(b[2])}):b[3]?// a formatting token
c.push({token:b[3]}):b[5]&&// an unenclosed literal string
c.push(b[5]);return c}// export
// Class that all other classes will inherit from
function va(){}function wa(a,b){var c;
// ensure a constructor for the subclass, forwarding all arguments to the super-constructor if it doesn't exist
// build the base prototype for the subclass, which is an new object chained to the superclass's prototype
// copy each member variable/method onto the the subclass's prototype
// hack for IE8
// copy over all class variables/methods to the subclass, such as `extend` and `mixin`
return Y(b,"constructor")&&(c=b.constructor),"function"!=typeof c&&(c=b.constructor=function(){a.apply(this,arguments)}),c.prototype=V(a.prototype),W(b,c.prototype),X(b,c.prototype),W(a,c),c}function xa(a,b){W(b,a.prototype)}
// Returns `true` if the hits are identically equal. `false` otherwise. Must be from the same component.
// Two null values will be considered equal, as two "out of the component" states are the same.
function ya(a,b){return a||b?a&&b?a.component===b.component&&za(a,b)&&za(b,a):!1:!0}
// Returns true if all of subHit's non-standard properties are within superHit
function za(a,b){for(var c in a)if(!/^(component|left|right|top|bottom)$/.test(c)&&a[c]!==b[c])return!1;return!0}/* Utilities
----------------------------------------------------------------------------------------------------------------------*/
function Aa(a){// returns true if background OR inverse-background
var b=Ca(a);return"background"===b||"inverse-background"===b}// export
function Ba(a){return"inverse-background"===Ca(a)}function Ca(a){return _((a.source||{}).rendering,a.rendering)}function Da(a){var b,c,d={};for(b=0;b<a.length;b++)c=a[b],(d[c._id]||(d[c._id]=[])).push(c);return d}
// A cmp function for determining which non-inverted "ranges" (see above) happen earlier
function Ea(a,b){return a.start-b.start}
// Given a jQuery element that might represent a dragged FullCalendar event, returns an intermediate data structure
// to be used for Event Object creation.
// A defined `.eventProps`, even when empty, indicates that an event should be created.
function Fa(c){var d,e,f,g,h=Ta.dataAttrPrefix;
// pluck special-cased date/time properties
// accept 'time' as well
// fallback to standalone attribute values for each of the date/time properties
// accept 'time' as well
// massage into correct data types
return h&&(h+="-"),d=c.data(h+"event")||null,d&&(d="object"==typeof d?a.extend({},d):{},e=d.start,null==e&&(e=d.time),f=d.duration,g=d.stick,delete d.start,delete d.time,delete d.duration,delete d.stick),null==e&&(e=c.data(h+"start")),null==e&&(e=c.data(h+"time")),null==f&&(f=c.data(h+"duration")),null==g&&(g=c.data(h+"stick")),e=null!=e?b.duration(e):null,f=null!=f?b.duration(f):null,g=Boolean(g),{eventProps:d,startTime:e,duration:f,stick:g}}
// Computes whether two segments' columns collide. They are assumed to be in the same row.
function Ga(a,b){var c,d;for(c=0;c<b.length;c++)if(d=b[c],d.leftCol<=a.rightCol&&d.rightCol>=a.leftCol)return!0;return!1}
// A cmp function for determining the leftmost event
function Ha(a,b){return a.leftCol-b.leftCol}
// Builds an array of segments "levels". The first level will be the leftmost tier of segments if the calendar is
// left-to-right, or the rightmost if the calendar is right-to-left. Assumes the segments are already ordered by date.
function Ia(a){var b,c,d,e=[];for(b=0;b<a.length;b++){
// go through all the levels and stop on the first level where there are no collisions
for(c=a[b],d=0;d<e.length&&La(c,e[d]).length;d++);c.level=d,(e[d]||(e[d]=[])).push(c)}return e}
// For every segment, figure out the other segments that are in subsequent
// levels that also occupy the same vertical space. Accumulate in seg.forwardSegs
function Ja(a){var b,c,d,e,f;for(b=0;b<a.length;b++)for(c=a[b],d=0;d<c.length;d++)for(e=c[d],e.forwardSegs=[],f=b+1;f<a.length;f++)La(e,a[f],e.forwardSegs)}
// Figure out which path forward (via seg.forwardSegs) results in the longest path until
// the furthest edge is reached. The number of segments in this path will be seg.forwardPressure
function Ka(a){var b,c,d=a.forwardSegs,e=0;if(void 0===a.forwardPressure){// not already computed
for(b=0;b<d.length;b++)c=d[b],Ka(c),e=Math.max(e,1+c.forwardPressure);a.forwardPressure=e}}
// Find all the segments in `otherSegs` that vertically collide with `seg`.
// Append into an optionally-supplied `results` array and return.
function La(a,b,c){c=c||[];for(var d=0;d<b.length;d++)Ma(a,b[d])&&c.push(b[d]);return c}
// Do these segments occupy the same vertical space?
function Ma(a,b){return a.bottom>b.top&&a.top<b.bottom}function Na(c,d){function e(){T?h()&&(
// mainly for the public API
k(),i()):f()}function f(){U=O.theme?"ui":"fc",c.addClass("fc"),c.addClass(N.isTouch?"fc-touch":"fc-cursor"),O.isRTL?c.addClass("fc-rtl"):c.addClass("fc-ltr"),O.theme?c.addClass("ui-widget"):c.addClass("fc-unthemed"),T=a("<div class='fc-view-container'/>").prependTo(c),R=N.header=new Qa(N,O),S=R.render(),S&&c.prepend(S),i(O.defaultView),O.handleWindowResize&&(Y=ha(m,O.windowResizeDelay),a(window).resize(Y))}function g(){W&&W.removeElement(),R.removeElement(),T.remove(),c.removeClass("fc fc-touch fc-cursor fc-ltr fc-rtl fc-unthemed ui-widget"),Y&&a(window).unbind("resize",Y)}function h(){return c.is(":visible")}
// View Rendering
// -----------------------------------------------------------------------------------
// Renders a view because of a date change, view-type change, or for the first time.
// If not given a viewType, keep the current view but render different dates.
function i(b){ca++,
// if viewType is changing, remove the old view's rendering
W&&b&&W.type!==b&&(R.deactivateButton(W.type),H(),// prevent a scroll jump when view element is removed
W.removeElement(),W=N.view=null),
// if viewType changed, or the view was never created, create a fresh view
!W&&b&&(W=N.view=ba[b]||(ba[b]=N.instantiateView(b)),W.setElement(a("<div class='fc-view fc-"+b+"-view' />").appendTo(T)),R.activateButton(b)),W&&(Z=W.massageCurrentDate(Z),W.displaying&&Z.isWithin(W.intervalStart,W.intervalEnd)||h()&&(W.display(Z),I(),u(),v(),q())),I(),// undo any lone freezeContentHeight calls
ca--}function j(a){// isResize=true. will poll getSuggestedViewHeight() and isHeightAuto()
return h()?(a&&l(),ca++,W.updateSize(!0),ca--,!0):void 0}function k(){h()&&l()}function l(){// assumes elementVisible
X="number"==typeof O.contentHeight?O.contentHeight:"number"==typeof O.height?O.height-(S?S.outerHeight(!0):0):Math.round(T.width()/Math.max(O.aspectRatio,.5))}function m(a){!ca&&a.target===window&&W.start&&j(!0)&&W.trigger("windowResize",aa)}/* Event Fetching/Rendering
	-----------------------------------------------------------------------------*/
// TODO: going forward, most of this stuff should be directly handled by the view
function n(){// can be called as an API method
p(),// so that events are cleared before user starts waiting for AJAX
r()}function o(){// destroys old events if previously rendered
h()&&(H(),W.displayEvents(da),I())}function p(){H(),W.clearEvents(),I()}function q(){!O.lazyFetching||$(W.start,W.end)?r():o()}function r(){_(W.start,W.end)}
// called when event data arrives
function s(a){da=a,o()}
// called when a single event's data has been changed
function t(){o()}/* Header Updating
	-----------------------------------------------------------------------------*/
function u(){R.updateTitle(W.title)}function v(){var a=N.getNow();a.isWithin(W.intervalStart,W.intervalEnd)?R.disableButton("today"):R.enableButton("today")}/* Selection
	-----------------------------------------------------------------------------*/
// this public method receives start/end dates in any format, with any timezone
function w(a,b){W.select(N.buildSelectSpan.apply(N,arguments))}function x(){// safe to be called before renderView
W&&W.unselect()}/* Date
	-----------------------------------------------------------------------------*/
function y(){Z=W.computePrevDate(Z),i()}function z(){Z=W.computeNextDate(Z),i()}function A(){Z.add(-1,"years"),i()}function B(){Z.add(1,"years"),i()}function C(){Z=N.getNow(),i()}function D(a){Z=N.moment(a).stripZone(),i()}function E(a){Z.add(b.duration(a)),i()}
// Forces navigation to a view for the given date.
// `viewType` can be a specific view name or a generic one like "week" or "day".
function F(a,b){var c;b=b||"day",c=N.getViewSpec(b)||N.getUnitViewSpec(b),Z=a.clone(),i(c?c.type:null)}
// for external API
function G(){return N.applyTimezone(Z)}function H(){T.css({width:"100%",height:T.height(),overflow:"hidden"})}function I(){T.css({width:"",height:"",overflow:""})}/* Misc
	-----------------------------------------------------------------------------*/
function J(){return N}function K(){return W}function L(a,b){return void 0===b?O[a]:void("height"!=a&&"contentHeight"!=a&&"aspectRatio"!=a||(O[a]=b,j(!0)))}function M(a,b){// overrides the Emitter's trigger method :(
var c=Array.prototype.slice.call(arguments,2);return b=b||aa,this.triggerWith(a,b,c),O[a]?O[a].apply(b,c):void 0}var N=this;N.initOptions(d||{});var O=this.options;
// Exports
// -----------------------------------------------------------------------------------
N.render=e,N.destroy=g,N.refetchEvents=n,N.reportEvents=s,N.reportEventChange=t,N.rerenderEvents=o,// `renderEvents` serves as a rerender. an API method
N.changeView=i,// `renderView` will switch to another view
N.select=w,N.unselect=x,N.prev=y,N.next=z,N.prevYear=A,N.nextYear=B,N.today=C,N.gotoDate=D,N.incrementDate=E,N.zoomTo=F,N.getDate=G,N.getCalendar=J,N.getView=K,N.option=L,N.trigger=M;
// Language-data Internals
// -----------------------------------------------------------------------------------
// Apply overrides to the current language's data
var P=V(// make a cheap copy
Pa(O.lang));if(O.monthNames&&(P._months=O.monthNames),O.monthNamesShort&&(P._monthsShort=O.monthNamesShort),O.dayNames&&(P._weekdays=O.dayNames),O.dayNamesShort&&(P._weekdaysShort=O.dayNamesShort),null!=O.firstDay){var Q=V(P._week);// _week: { dow: # }
Q.dow=O.firstDay,P._week=Q}
// assign a normalized value, to be used by our .week() moment extension
P._fullCalendar_weekCalc=function(a){return"function"==typeof a?a:"local"===a?a:"iso"===a||"ISO"===a?"ISO":void 0}(O.weekNumberCalculation),
// Calendar-specific Date Utilities
// -----------------------------------------------------------------------------------
N.defaultAllDayEventDuration=b.duration(O.defaultAllDayEventDuration),N.defaultTimedEventDuration=b.duration(O.defaultTimedEventDuration),
// Builds a moment using the settings of the current calendar: timezone and language.
// Accepts anything the vanilla moment() constructor accepts.
N.moment=function(){var a;
// Force the moment to be local, because FC.moment doesn't guarantee it.
// don't give ambiguously-timed moments a local zone
// moment 2.8 and above
// pre-moment-2.8
return"local"===O.timezone?(a=Ta.moment.apply(null,arguments),a.hasTime()&&a.local()):a="UTC"===O.timezone?Ta.moment.utc.apply(null,arguments):Ta.moment.parseZone.apply(null,arguments),"_locale"in a?a._locale=P:a._lang=P,a},
// Returns a boolean about whether or not the calendar knows how to calculate
// the timezone offset of arbitrary dates in the current timezone.
N.getIsAmbigTimezone=function(){return"local"!==O.timezone&&"UTC"!==O.timezone},
// Returns a copy of the given date in the current timezone. Has no effect on dates without times.
N.applyTimezone=function(a){if(!a.hasTime())return a.clone();var b,c=N.moment(a.toArray()),d=a.time()-c.time();
// Safari sometimes has problems with this coersion when near DST. Adjust if necessary. (bug #2396)
// is the time result different than expected?
// add milliseconds
// does it match perfectly now?
return d&&(b=c.clone().add(d),a.time()-b.time()===0&&(c=b)),c},
// Returns a moment for the current date, as defined by the client's computer or from the `now` option.
// Will return an moment with an ambiguous timezone.
N.getNow=function(){var a=O.now;return"function"==typeof a&&(a=a()),N.moment(a).stripZone()},
// Get an event's normalized end date. If not present, calculate it from the defaults.
N.getEventEnd=function(a){return a.end?a.end.clone():N.getDefaultEventEnd(a.allDay,a.start)},
// Given an event's allDay status and start date, return what its fallback end date should be.
// TODO: rename to computeDefaultEventEnd
N.getDefaultEventEnd=function(a,b){var c=b.clone();return a?c.stripTime().add(N.defaultAllDayEventDuration):c.add(N.defaultTimedEventDuration),N.getIsAmbigTimezone()&&c.stripZone(),c},
// Produces a human-readable string for the given duration.
// Side-effect: changes the locale of the given duration.
N.humanizeDuration=function(a){return(a.locale||a.lang).call(a,O.lang).humanize()},
// Imports
// -----------------------------------------------------------------------------------
Ra.call(N,O);var R,S,T,U,W,X,Y,Z,$=N.isFetchNeeded,_=N.fetchEvents,aa=c[0],ba={},ca=0,da=[];// unzoned
// Main Rendering
// -----------------------------------------------------------------------------------
// compute the initial ambig-timezone date
Z=null!=O.defaultDate?N.moment(O.defaultDate).stripZone():N.getNow(),N.getSuggestedViewHeight=function(){return void 0===X&&k(),X},N.isHeightAuto=function(){return"auto"===O.contentHeight||"auto"===O.height},N.freezeContentHeight=H,N.unfreezeContentHeight=I,N.initialize()}function Oa(b){a.each(zb,function(a,c){null==b[a]&&(b[a]=c(b))})}
// Returns moment's internal locale data. If doesn't exist, returns English.
// Works with moment-pre-2.8
function Pa(a){var c=b.localeData||b.langData;return c.call(b,a)||c.call(b,"en")}/* Top toolbar area with buttons and title
----------------------------------------------------------------------------------------------------------------------*/
// TODO: rename all header-related things to "toolbar"
function Qa(b,c){function d(){var b=c.header;return n=c.theme?"ui":"fc",b?o=a("<div class='fc-toolbar'/>").append(f("left")).append(f("right")).append(f("center")).append('<div class="fc-clear"/>'):void 0}function e(){o.remove(),o=a()}function f(d){var e=a('<div class="fc-'+d+'"/>'),f=c.header[d];return f&&a.each(f.split(" "),function(d){var f,g=a(),h=!0;a.each(this.split(","),function(d,e){var f,i,j,k,l,m,o,q,r,s;// the element
"title"==e?(g=g.add(a("<h2>&nbsp;</h2>")),h=!1):((f=(b.options.customButtons||{})[e])?(j=function(a){f.click&&f.click.call(s[0],a)},k="",l=f.text):(i=b.getViewSpec(e))?(j=function(){b.changeView(e)},p.push(e),k=i.buttonTextOverride,l=i.buttonTextDefault):b[e]&&(j=function(){b[e]()},k=(b.overrides.buttonText||{})[e],l=c.buttonText[e]),j&&(m=f?f.themeIcon:c.themeButtonIcons[e],o=f?f.icon:c.buttonIcons[e],q=k?aa(k):m&&c.theme?"<span class='ui-icon ui-icon-"+m+"'></span>":o&&!c.theme?"<span class='fc-icon fc-icon-"+o+"'></span>":aa(l),r=["fc-"+e+"-button",n+"-button",n+"-state-default"],s=a('<button type="button" class="'+r.join(" ")+'">'+q+"</button>").click(function(a){s.hasClass(n+"-state-disabled")||(j(a),(s.hasClass(n+"-state-active")||s.hasClass(n+"-state-disabled"))&&s.removeClass(n+"-state-hover"))}).mousedown(function(){s.not("."+n+"-state-active").not("."+n+"-state-disabled").addClass(n+"-state-down")}).mouseup(function(){s.removeClass(n+"-state-down")}).hover(function(){s.not("."+n+"-state-active").not("."+n+"-state-disabled").addClass(n+"-state-hover")},function(){s.removeClass(n+"-state-hover").removeClass(n+"-state-down")}),g=g.add(s)))}),h&&g.first().addClass(n+"-corner-left").end().last().addClass(n+"-corner-right").end(),g.length>1?(f=a("<div/>"),h&&f.addClass("fc-button-group"),f.append(g),e.append(f)):e.append(g)}),e}function g(a){o.find("h2").text(a)}function h(a){o.find(".fc-"+a+"-button").addClass(n+"-state-active")}function i(a){o.find(".fc-"+a+"-button").removeClass(n+"-state-active")}function j(a){o.find(".fc-"+a+"-button").attr("disabled","disabled").addClass(n+"-state-disabled")}function k(a){o.find(".fc-"+a+"-button").removeAttr("disabled").removeClass(n+"-state-disabled")}function l(){return p}var m=this;
// exports
m.render=d,m.removeElement=e,m.updateTitle=g,m.activateButton=h,m.deactivateButton=i,m.disableButton=j,m.enableButton=k,m.getViewsWithButtons=l;
// locals
var n,o=a(),p=[]}function Ra(c){/* Fetching
	-----------------------------------------------------------------------------*/
// start and end are assumed to be unzoned
function d(a,b){// nothing has been fetched yet?
return!I||I>a||b>M}function e(a,b){I=a,M=b,S=[];var c=++Q,d=P.length;R=d;for(var e=0;d>e;e++)f(P[e],c)}function f(b,c){g(b,function(d){var e,f,g,h=a.isArray(b.events);if(c==Q){if(d)for(e=0;e<d.length;e++)f=d[e],g=h?f:s(f,b),g&&S.push.apply(S,w(g));R--,R||N(S)}})}function g(b,d){var e,f,h=Ta.sourceFetchers;for(e=0;e<h.length;e++){if(f=h[e].call(H,// this, the Calendar object
b,I.clone(),M.clone(),c.timezone,d),f===!0)
// the fetcher is in charge. made its own async request
return;if("object"==typeof f)
// the fetcher returned a new source. process it
return void g(f,d)}var i=b.events;if(i)a.isFunction(i)?(H.pushLoading(),i.call(H,// this, the Calendar object
I.clone(),M.clone(),c.timezone,function(a){d(a),H.popLoading()})):a.isArray(i)?d(i):d();else{var j=b.url;if(j){var k,l=b.success,m=b.error,n=b.complete;k=a.isFunction(b.data)?b.data():b.data;
// use a copy of the custom data so we can modify the parameters
// and not affect the passed-in object.
var o=a.extend({},k||{}),p=_(b.startParam,c.startParam),q=_(b.endParam,c.endParam),r=_(b.timezoneParam,c.timezoneParam);p&&(o[p]=I.format()),q&&(o[q]=M.format()),c.timezone&&"local"!=c.timezone&&(o[r]=c.timezone),H.pushLoading(),a.ajax(a.extend({},Ab,b,{data:o,success:function(b){b=b||[];var c=$(l,this,arguments);a.isArray(c)&&(b=c),d(b)},error:function(){$(m,this,arguments),d()},complete:function(){$(n,this,arguments),H.popLoading()}}))}else d()}}/* Sources
	-----------------------------------------------------------------------------*/
function h(a){var b=i(a);b&&(P.push(b),R++,f(b,Q))}function i(b){// will return undefined if invalid source
var c,d,e=Ta.sourceNormalizers;if(a.isFunction(b)||a.isArray(b)?c={events:b}:"string"==typeof b?c={url:b}:"object"==typeof b&&(c=a.extend({},b)),c){for(
// TODO: repeat code, same code for event classNames
c.className?"string"==typeof c.className&&(c.className=c.className.split(/\s+/)):c.className=[],
// for array sources, we convert to standard Event Objects up front
a.isArray(c.events)&&(c.origArray=c.events,// for removeEventSource
c.events=a.map(c.events,function(a){return s(a,c)})),d=0;d<e.length;d++)e[d].call(H,c);return c}}function j(b){P=a.grep(P,function(a){return!k(a,b)}),S=a.grep(S,function(a){return!k(a.source,b)}),N(S)}function k(a,b){return a&&b&&l(a)==l(b)}function l(a){// a normalized event source?
// get the primitive
return("object"==typeof a?a.origArray||a.googleCalendarId||a.url||a.events:null)||a}/* Manipulation
	-----------------------------------------------------------------------------*/
// Only ever called from the externally-facing API
function m(a){
// massage start/end values, even if date string values
a.start=H.moment(a.start),a.end?a.end=H.moment(a.end):a.end=null,x(a,n(a)),// will handle start/end/allDay normalization
N(S)}
// Returns a hash of misc event properties that should be copied over to related events.
function n(b){var c={};return a.each(b,function(a,b){o(a)&&void 0!==b&&Z(b)&&(// a defined non-object
c[a]=b)}),c}
// non-date-related, non-id-related, non-secret
function o(a){return!/^_|^(id|allDay|start|end)$/.test(a)}
// returns the expanded events that were created
function p(a,b){var c,d,e,f=s(a);if(f){for(c=w(f),d=0;d<c.length;d++)e=c[d],e.source||(b&&(O.events.push(e),e.source=O),S.push(e));return N(S),c}return[]}function q(b){var c,d;// inverse=true
// Remove events from array sources.
// This works because they have been converted to official Event Objects up front.
// (and as a result, event._id has been calculated).
for(null==b?// null or undefined. remove all events
b=function(){return!0}:a.isFunction(b)||(c=b+"",b=function(a){return a._id==c}),S=a.grep(S,b,!0),d=0;d<P.length;d++)a.isArray(P[d].events)&&(P[d].events=a.grep(P[d].events,b,!0));N(S)}function r(b){// not null, not undefined. an event ID
return a.isFunction(b)?a.grep(S,b):null!=b?(b+="",a.grep(S,function(a){return a._id==b})):S}/* Event Normalization
	-----------------------------------------------------------------------------*/
// Given a raw object with key/value properties, returns an "abstract" Event object.
// An "abstract" event is an event that, if recurring, will not have been expanded yet.
// Will return `false` when input is invalid.
// `source` is optional
function s(d,e){var f,g,h,i={};if(c.eventDataTransform&&(d=c.eventDataTransform(d)),e&&e.eventDataTransform&&(d=e.eventDataTransform(d)),
// Copy all properties over to the resulting object.
// The special-case properties will be copied over afterwards.
a.extend(i,d),e&&(i.source=e),i._id=d._id||(void 0===d.id?"_fc"+Bb++:d.id+""),d.className?"string"==typeof d.className?i.className=d.className.split(/\s+/):i.className=d.className:i.className=[],f=d.start||d.date,g=d.end,T(f)&&(f=b.duration(f)),T(g)&&(g=b.duration(g)),d.dow||b.isDuration(f)||b.isDuration(g))
// the event is "abstract" (recurring) so don't calculate exact start/end dates just yet
i.start=f?b.duration(f):null,// will be a Duration or null
i.end=g?b.duration(g):null,// will be a Duration or null
i._recurring=!0;else{if(f&&(f=H.moment(f),!f.isValid()))return!1;g&&(g=H.moment(g),g.isValid()||(g=null)),h=d.allDay,void 0===h&&(// still undefined? fallback to default
h=_(e?e.allDayDefault:void 0,c.allDayDefault)),t(f,g,h,i)}return i}
// Normalizes and assigns the given dates to the given partially-formed event object.
// NOTE: mutates the given start/end moments. does not make a copy.
function t(a,b,c,d){d.start=a,d.end=b,d.allDay=c,u(d),Sa(d)}
// Ensures proper values for allDay/start/end. Accepts an Event object, or a plain object with event-ish properties.
// NOTE: Will modify the given object.
function u(a){v(a),a.end&&!a.end.isAfter(a.start)&&(a.end=null),a.end||(c.forceEventDuration?a.end=H.getDefaultEventEnd(a.allDay,a.start):a.end=null)}
// Ensures the allDay property exists and the timeliness of the start/end dates are consistent
function v(a){null==a.allDay&&(a.allDay=!(a.start.hasTime()||a.end&&a.end.hasTime())),a.allDay?(a.start.stripTime(),a.end&&
// TODO: consider nextDayThreshold here? If so, will require a lot of testing and adjustment
a.end.stripTime()):(a.start.hasTime()||(a.start=H.applyTimezone(a.start.time(0))),a.end&&!a.end.hasTime()&&(a.end=H.applyTimezone(a.end.time(0))))}
// If the given event is a recurring event, break it down into an array of individual instances.
// If not a recurring event, return an array with the single original event.
// If given a falsy input (probably because of a failed buildEventFromInput call), returns an empty array.
// HACK: can override the recurring window by providing custom rangeStart/rangeEnd (for businessHours).
function w(b,c,d){var e,f,g,h,i,j,k,l,m,n=[];if(c=c||I,d=d||M,b)if(b._recurring){
// make a boolean hash as to whether the event occurs on each day-of-week
if(f=b.dow)for(e={},g=0;g<f.length;g++)e[f[g]]=!0;// holds the date of the current day
for(
// iterate through every day in the current range
h=c.clone().stripTime();h.isBefore(d);)e&&!e[h.day()]||(i=b.start,j=b.end,k=h.clone(),l=null,i&&(k=k.time(i)),j&&(l=h.clone().time(j)),m=a.extend({},b),t(k,l,!i&&!j,m),n.push(m)),h.add(1,"days")}else n.push(b);return n}/* Event Modification Math
	-----------------------------------------------------------------------------------------*/
// Modifies an event and all related events by applying the given properties.
// Special date-diffing logic is used for manipulation of dates.
// If `props` does not contain start/end dates, the updated values are assumed to be the event's current start/end.
// All date comparisons are done against the event's pristine _start and _end dates.
// Returns an object with delta information and a function to undo all operations.
// For making computations in a granularity greater than day/time, specify largeUnit.
// NOTE: The given `newProps` might be mutated for normalization purposes.
function x(b,c,d){
// diffs the dates in the appropriate way, returning a duration
function e(a,b){// date1 - date0
// date1 - date0
return d?L(a,b,d):c.allDay?K(a,b):J(a,b)}var f,g,h,i,j,k,l={};
// normalize new date-related properties
// is null or undefined?
// create normalized versions of the original props to compare against
// need a real end value, for diffing
// need to clear the end date if explicitly changed to null
// compute the delta for moving the start date
// compute the delta for moving the end date
// gather all non-date-related properties
// apply the operations to the event and all related events
// get events with this ID
return c=c||{},c.start||(c.start=b.start.clone()),void 0===c.end&&(c.end=b.end?b.end.clone():null),null==c.allDay&&(c.allDay=b.allDay),u(c),f={start:b._start.clone(),end:b._end?b._end.clone():H.getDefaultEventEnd(b._allDay,b._start),allDay:c.allDay},u(f),g=null!==b._end&&null===c.end,h=e(c.start,f.start),c.end?(i=e(c.end,f.end),j=i.subtract(h)):j=null,a.each(c,function(a,b){o(a)&&void 0!==b&&(l[a]=b)}),k=y(r(b._id),g,c.allDay,h,j,l),{dateDelta:h,durationDelta:j,undo:k}}
// Modifies an array of events in the following ways (operations are in order):
// - clear the event's `end`
// - convert the event to allDay
// - add `dateDelta` to the start and end
// - add `durationDelta` to the event's duration
// - assign `miscProps` to the event
//
// Returns a function that can be called to undo all the operations.
//
// TODO: don't use so many closures. possible memory issues when lots of events with same ID.
//
function y(b,c,d,e,f,g){var h=H.getIsAmbigTimezone(),i=[];
// normalize zero-length deltas to be null
return e&&!e.valueOf()&&(e=null),f&&!f.valueOf()&&(f=null),a.each(b,function(b,j){var k,l;k={start:j.start.clone(),end:j.end?j.end.clone():null,allDay:j.allDay},a.each(g,function(a){k[a]=j[a]}),l={start:j._start,end:j._end,allDay:d},u(l),c?l.end=null:f&&!l.end&&(l.end=H.getDefaultEventEnd(l.allDay,l.start)),e&&(l.start.add(e),l.end&&l.end.add(e)),f&&l.end.add(f),h&&!l.allDay&&(e||f)&&(l.start.stripZone(),l.end&&l.end.stripZone()),a.extend(j,g,l),Sa(j),i.push(function(){a.extend(j,k),Sa(j)})}),function(){for(var a=0;a<i.length;a++)i[a]()}}
// Returns an array of events as to when the business hours occur in the given view.
// Abuse of our event system :(
function z(b){var d,e=c.businessHours,f={className:"fc-nonbusiness",start:"09:00",end:"17:00",dow:[1,2,3,4,5],// monday - friday
rendering:"inverse-background"},g=H.getView();// `true` (which means "use the defaults") or an override object
// copy to a new object in either case
// if a whole-day series is requested, clear the start/end times
return e&&(d=a.extend({},f,"object"==typeof e?e:{})),d?(b&&(d.start=null,d.end=null),w(s(d),g.start,g.end)):[]}
// Determines if the given event can be relocated to the given span (unzoned start/end with other misc data)
function A(a,b){var d=b.source||{},e=_(b.constraint,d.constraint,c.eventConstraint),f=_(b.overlap,d.overlap,c.eventOverlap);return D(a,e,f,b)}
// Determines if an external event can be relocated to the given span (unzoned start/end with other misc data)
function B(b,c,d){var e,f;
// note: very similar logic is in View's reportExternalDrop
return d&&(e=a.extend({},d,c),f=w(s(e))[0]),f?A(b,f):C(b)}
// Determines the given span (unzoned start/end with other misc data) can be selected.
function C(a){return D(a,c.selectConstraint,c.selectOverlap)}
// Returns true if the given span (caused by an event drop/resize or a selection) is allowed to exist
// according to the constraint/overlap settings.
// `event` is not required if checking a selection.
function D(a,b,c,d){var e,f,g,h,i,j;
// the range must be fully contained by at least one of produced constraint events
if(null!=b){for(e=E(b),f=!1,h=0;h<e.length;h++)if(F(e[h],a)){f=!0;break}if(!f)return!1}for(g=H.getPeerEvents(a,d),h=0;h<g.length;h++)
// there needs to be an actual intersection before disallowing anything
if(i=g[h],G(i,a)){
// evaluate overlap for the given range and short-circuit if necessary
if(c===!1)return!1;if("function"==typeof c&&!c(i,d))return!1;
// if we are computing if the given range is allowable for an event, consider the other event's
// EventObject-specific or Source-specific `overlap` property
if(d){if(j=_(i.overlap,(i.source||{}).overlap),j===!1)return!1;
// if the peer event's overlap is a test function, pass the subject event as the first param
if("function"==typeof j&&!j(d,i))return!1}}return!0}
// Given an event input from the API, produces an array of event objects. Possible event inputs:
// 'businessHours'
// An event ID (number or string)
// An object with specific start/end dates or a recurring event (like what businessHours accepts)
function E(a){return"businessHours"===a?z():"object"==typeof a?w(s(a)):r(a)}
// Does the event's date range fully contain the given range?
// start/end already assumed to have stripped zones :(
function F(a,b){var c=a.start.clone().stripZone(),d=H.getEventEnd(a).stripZone();return b.start>=c&&b.end<=d}
// Does the event's date range intersect with the given range?
// start/end already assumed to have stripped zones :(
function G(a,b){var c=a.start.clone().stripZone(),d=H.getEventEnd(a).stripZone();return b.start<d&&b.end>c}// assumed to be a calendar
var H=this;
// exports
H.isFetchNeeded=d,H.fetchEvents=e,H.addEventSource=h,H.removeEventSource=j,H.updateEvent=m,H.renderEvent=p,H.removeEvents=q,H.clientEvents=r,H.mutateEvent=x,H.normalizeEventDates=u,H.normalizeEventTimes=v;
// imports
var I,M,N=H.reportEvents,O={events:[]},P=[O],Q=0,R=0,S=[];// holds events that have already been expanded
a.each((c.events?[c.events]:[]).concat(c.eventSources||[]),function(a,b){var c=i(b);c&&P.push(c)}),/* Business Hours
	-----------------------------------------------------------------------------------------*/
H.getBusinessHoursEvents=z,/* Overlapping / Constraining
	-----------------------------------------------------------------------------------------*/
H.isEventSpanAllowed=A,H.isExternalSpanAllowed=B,H.isSelectionSpanAllowed=C,H.getEventCache=function(){return S}}
// updates the "backup" properties, which are preserved in order to compute diffs later on.
function Sa(a){a._allDay=a.allDay,a._start=a.start.clone(),a._end=a.end?a.end.clone():null}var Ta=a.fullCalendar={version:"2.7.1",internalApiVersion:3},Ua=Ta.views={};Ta.isTouch="ontouchstart"in document,a.fn.fullCalendar=function(b){var c=Array.prototype.slice.call(arguments,1),d=this;// what this function will return (this jQuery object by default)
return this.each(function(e,f){// loop each DOM element involved
var g,h=a(f),i=h.data("fullCalendar");// the returned value of this single method call
// a method call
"string"==typeof b?i&&a.isFunction(i[b])&&(g=i[b].apply(i,c),e||(d=g),"destroy"===b&&h.removeData("fullCalendar")):i||(i=new vb(h,b),h.data("fullCalendar",i),i.render())}),d};var Va=[// names of options that are objects whose properties should be combined
"header","buttonText","buttonIcons","themeButtonIcons"];
// exports
Ta.intersectRanges=I,Ta.applyAll=$,Ta.debounce=ha,Ta.isInt=fa,Ta.htmlEscape=aa,Ta.cssToStr=ca,Ta.proxy=ga,Ta.capitaliseFirstLetter=da,/* Element Geom Utilities
----------------------------------------------------------------------------------------------------------------------*/
Ta.getOuterRect=n,Ta.getClientRect=o,Ta.getContentRect=p,Ta.getScrollbarWidths=q;
// Logic for determining if, when the element is right-to-left, the scrollbar appears on the left side
var Wa=null;/* Mouse / Touch Utilities
----------------------------------------------------------------------------------------------------------------------*/
Ta.preventDefault=z,/* General Geometry Utils
----------------------------------------------------------------------------------------------------------------------*/
Ta.intersectRects=A,/* Object Ordering by Field
----------------------------------------------------------------------------------------------------------------------*/
Ta.parseFieldSpecs=E,Ta.compareByFieldSpecs=F,Ta.compareByFieldSpec=G,Ta.flexibleCompare=H,/* Date Utilities
----------------------------------------------------------------------------------------------------------------------*/
Ta.computeIntervalUnit=M,Ta.divideRangeByDuration=O,Ta.divideDurationByDuration=P,Ta.multiplyDuration=Q,Ta.durationHasTime=R;var Xa=["sun","mon","tue","wed","thu","fri","sat"],Ya=["year","month","week","day","hour","minute","second","millisecond"];/* Logging and Debug
----------------------------------------------------------------------------------------------------------------------*/
Ta.log=function(){var a=window.console;return a&&a.log?a.log.apply(a,arguments):void 0},Ta.warn=function(){var a=window.console;return a&&a.warn?a.warn.apply(a,arguments):Ta.log.apply(Ta,arguments)};/* General Utilities
----------------------------------------------------------------------------------------------------------------------*/
var Za,$a,_a,ab={}.hasOwnProperty,bb=/^\s*\d{4}-\d\d$/,cb=/^\s*\d{4}-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?)?$/,db=b.fn,eb=a.extend({},db);// function defined below
// Creating
// -------------------------------------------------------------------------------------------------
// Creates a new moment, similar to the vanilla moment(...) constructor, but with
// extra features (ambiguous time, enhanced formatting). When given an existing moment,
// it will function as a clone (and retain the zone of the moment). Anything else will
// result in a moment in the local zone.
Ta.moment=function(){return ia(arguments)},
// Sames as FC.moment, but forces the resulting moment to be in the UTC timezone.
Ta.moment.utc=function(){var a=ia(arguments,!0);
// Force it into UTC because makeMoment doesn't guarantee it
// (if given a pre-existing moment for example)
// don't give ambiguously-timed moments a UTC zone
return a.hasTime()&&a.utc(),a},
// Same as FC.moment, but when given an ISO8601 string, the timezone offset is preserved.
// ISO8601 strings with no timezone offset will become ambiguously zoned.
Ta.moment.parseZone=function(){return ia(arguments,!0,!0)},
// A clone method that works with the flags related to our enhanced functionality.
// In the future, use moment.momentProperties
db.clone=function(){var a=eb.clone.apply(this,arguments);
// these flags weren't transfered with the clone
return ka(this,a),this._fullCalendar&&(a._fullCalendar=!0),a},
// Week Number
// -------------------------------------------------------------------------------------------------
// Returns the week number, considering the locale's custom week number calcuation
// `weeks` is an alias for `week`
db.week=db.weeks=function(a){var b=(this._locale||this._lang)._fullCalendar_weekCalc;return null==a&&"function"==typeof b?b(this):"ISO"===b?eb.isoWeek.apply(this,arguments):eb.week.apply(this,arguments)},
// Time-of-day
// -------------------------------------------------------------------------------------------------
// GETTER
// Returns a Duration with the hours/minutes/seconds/ms values of the moment.
// If the moment has an ambiguous time, a duration of 00:00 will be returned.
//
// SETTER
// You can supply a Duration, a Moment, or a Duration-like argument.
// When setting the time, and the moment has an ambiguous time, it then becomes unambiguous.
db.time=function(a){
// Fallback to the original method (if there is one) if this moment wasn't created via FullCalendar.
// `time` is a generic enough method name where this precaution is necessary to avoid collisions w/ other plugins.
if(!this._fullCalendar)return eb.time.apply(this,arguments);if(null==a)// getter
return b.duration({hours:this.hours(),minutes:this.minutes(),seconds:this.seconds(),milliseconds:this.milliseconds()});// setter
this._ambigTime=!1,// mark that the moment now has a time
b.isDuration(a)||b.isMoment(a)||(a=b.duration(a));
// The day value should cause overflow (so 24 hours becomes 00:00:00 of next day).
// Only for Duration times, not Moment times.
var c=0;
// We need to set the individual fields.
// Can't use startOf('day') then add duration. In case of DST at start of day.
return b.isDuration(a)&&(c=24*Math.floor(a.asDays())),this.hours(c+a.hours()).minutes(a.minutes()).seconds(a.seconds()).milliseconds(a.milliseconds())},
// Converts the moment to UTC, stripping out its time-of-day and timezone offset,
// but preserving its YMD. A moment with a stripped time will display no time
// nor timezone offset when .format() is called.
db.stripTime=function(){var a;
// get the values before any conversion happens
// array of y/m/d/h/m/s/ms
// TODO: use keepLocalTime in the future
// set the internal UTC flag (will clear the ambig flags)
// set the year/month/date. time will be zero
// Mark the time as ambiguous. This needs to happen after the .utc() call, which might call .utcOffset(),
// which clears all ambig flags. Same with setUTCValues with moment-timezone.
return this._ambigTime||(a=this.toArray(),this.utc(),$a(this,a.slice(0,3)),this._ambigTime=!0,this._ambigZone=!0),this},
// Returns if the moment has a non-ambiguous time (boolean)
db.hasTime=function(){return!this._ambigTime},
// Timezone
// -------------------------------------------------------------------------------------------------
// Converts the moment to UTC, stripping out its timezone offset, but preserving its
// YMD and time-of-day. A moment with a stripped timezone offset will display no
// timezone offset when .format() is called.
// TODO: look into Moment's keepLocalTime functionality
db.stripZone=function(){var a,b;
// get the values before any conversion happens
// array of y/m/d/h/m/s/ms
// set the internal UTC flag (might clear the ambig flags, depending on Moment internals)
// will set the year/month/date/hours/minutes/seconds/ms
// the above call to .utc()/.utcOffset() unfortunately might clear the ambig flags, so restore
// Mark the zone as ambiguous. This needs to happen after the .utc() call, which might call .utcOffset(),
// which clears the ambig flags. Same with setUTCValues with moment-timezone.
return this._ambigZone||(a=this.toArray(),b=this._ambigTime,this.utc(),$a(this,a),this._ambigTime=b||!1,this._ambigZone=!0),this},
// Returns of the moment has a non-ambiguous timezone offset (boolean)
db.hasZone=function(){return!this._ambigZone},
// this method implicitly marks a zone
db.local=function(){var a=this.toArray(),b=this._ambigZone;
// ensure non-ambiguous
// this probably already happened via local() -> utcOffset(), but don't rely on Moment's internals
// If the moment was ambiguously zoned, the date fields were stored as UTC.
// We want to preserve these, but in local time.
// TODO: look into Moment's keepLocalTime functionality
return eb.local.apply(this,arguments),this._ambigTime=!1,this._ambigZone=!1,b&&_a(this,a),this},
// implicitly marks a zone
db.utc=function(){
// ensure non-ambiguous
// this probably already happened via utc() -> utcOffset(), but don't rely on Moment's internals
return eb.utc.apply(this,arguments),this._ambigTime=!1,this._ambigZone=!1,this},
// methods for arbitrarily manipulating timezone offset.
// should clear time/zone ambiguity when called.
a.each(["zone",// only in moment-pre-2.9. deprecated afterwards
"utcOffset"],function(a,b){eb[b]&&(// original method exists?
// this method implicitly marks a zone (will probably get called upon .utc() and .local())
db[b]=function(a){// setter
// these assignments needs to happen before the original zone method is called.
// I forget why, something to do with a browser crash.
return null!=a&&(this._ambigTime=!1,this._ambigZone=!1),eb[b].apply(this,arguments)})}),
// Formatting
// -------------------------------------------------------------------------------------------------
db.format=function(){return this._fullCalendar&&arguments[0]?na(this,arguments[0]):this._ambigTime?ma(this,"YYYY-MM-DD"):this._ambigZone?ma(this,"YYYY-MM-DD[T]HH:mm:ss"):eb.format.apply(this,arguments)},db.toISOString=function(){return this._ambigTime?ma(this,"YYYY-MM-DD"):this._ambigZone?ma(this,"YYYY-MM-DD[T]HH:mm:ss"):eb.toISOString.apply(this,arguments)},
// Querying
// -------------------------------------------------------------------------------------------------
// Is the moment within the specified range? `end` is exclusive.
// FYI, this method is not a standard Moment method, so always do our enhanced logic.
db.isWithin=function(a,b){var c=ja([this,a,b]);return c[0]>=c[1]&&c[0]<c[2]},
// When isSame is called with units, timezone ambiguity is normalized before the comparison happens.
// If no units specified, the two moments must be identically the same, with matching ambig flags.
db.isSame=function(a,b){var c;
// only do custom logic if this is an enhanced moment
// only do custom logic if this is an enhanced moment
return this._fullCalendar?b?(c=ja([this,a],!0),eb.isSame.call(c[0],c[1],b)):(a=Ta.moment.parseZone(a),eb.isSame.call(this,a)&&Boolean(this._ambigTime)===Boolean(a._ambigTime)&&Boolean(this._ambigZone)===Boolean(a._ambigZone)):eb.isSame.apply(this,arguments)},
// Make these query methods work with ambiguous moments
a.each(["isBefore","isAfter"],function(a,b){db[b]=function(a,c){var d;
// only do custom logic if this is an enhanced moment
// only do custom logic if this is an enhanced moment
return this._fullCalendar?(d=ja([this,a]),eb[b].call(d[0],d[1],c)):eb[b].apply(this,arguments)}}),Za="_d"in b()&&"updateOffset"in b,$a=Za?function(a,c){a._d.setTime(Date.UTC.apply(Date,c)),b.updateOffset(a,!1)}:la,_a=Za?function(a,c){a._d.setTime(+new Date(c[0]||0,c[1]||0,c[2]||0,c[3]||0,c[4]||0,c[5]||0,c[6]||0)),b.updateOffset(a,!1)}:la;
// addition formatting tokens we want recognized
var fb={t:function(a){// "a" or "p"
return ma(a,"a").charAt(0)},T:function(a){// "A" or "P"
return ma(a,"A").charAt(0)}};Ta.formatRange=qa;var gb={Y:"year",M:"month",D:"day",// day of month
d:"day",// day of week
// prevents a separator between anything time-related...
A:"second",// AM/PM
a:"second",// am/pm
T:"second",// A/P
t:"second",// a/p
H:"second",// hour (24)
h:"second",// hour (12)
m:"second",// minute
s:"second"},hb={};Ta.Class=va,
// Called on a class to create a subclass.
// Last argument contains instance methods. Any argument before the last are considered mixins.
va.extend=function(){var a,b,c=arguments.length;for(a=0;c>a;a++)b=arguments[a],c-1>a&&xa(this,b);return wa(this,b||{})},
// Adds new member variables/methods to the class's prototype.
// Can be called with another class, or a plain object hash containing new members.
va.mixin=function(a){xa(this,a)};var ib=Ta.EmitterMixin={callbackHash:null,on:function(a,b){return this.loopCallbacks(a,"add",[b]),this},off:function(a,b){return this.loopCallbacks(a,"remove",[b]),this},trigger:function(a){// args...
var b=Array.prototype.slice.call(arguments,1);return this.triggerWith(a,this,b),this},triggerWith:function(a,b,c){return this.loopCallbacks(a,"fireWith",[b,c]),this},/*
	Given an event name string with possible namespaces,
	call the given methodName on all the internal Callback object with the given arguments.
	*/
loopCallbacks:function(a,b,c){var d,e,f,g=a.split(".");for(d=0;d<g.length;d++)e=g[d],e&&(f=this.ensureCallbackObj((d?".":"")+e),f[b].apply(f,c))},ensureCallbackObj:function(b){return this.callbackHash||(this.callbackHash={}),this.callbackHash[b]||(this.callbackHash[b]=a.Callbacks()),this.callbackHash[b]}},jb=Ta.ListenerMixin=function(){var b=0,c={listenerId:null,/*
		Given an `other` object that has on/off methods, bind the given `callback` to an event by the given name.
		The `callback` will be called with the `this` context of the object that .listenTo is being called on.
		Can be called:
			.listenTo(other, eventName, callback)
		OR
			.listenTo(other, {
				eventName1: callback1,
				eventName2: callback2
			})
		*/
listenTo:function(b,c,d){if("object"==typeof c)// given dictionary of callbacks
for(var e in c)c.hasOwnProperty(e)&&this.listenTo(b,e,c[e]);else"string"==typeof c&&b.on(c+"."+this.getListenerNamespace(),// use event namespacing to identify this object
a.proxy(d,this))},/*
		Causes the current object to stop listening to events on the `other` object.
		`eventName` is optional. If omitted, will stop listening to ALL events on `other`.
		*/
stopListeningTo:function(a,b){a.off((b||"")+"."+this.getListenerNamespace())},/*
		Returns a string, unique to this object, to be used for event namespacing
		*/
getListenerNamespace:function(){return null==this.listenerId&&(this.listenerId=b++),"_listener"+this.listenerId}};return c}(),kb=va.extend(jb,{isHidden:!0,options:null,el:null,// the container element for the popover. generated by this object
margin:10,// the space required between the popover and the edges of the scroll container
constructor:function(a){this.options=a||{}},
// Shows the popover on the specified position. Renders it if not already
show:function(){this.isHidden&&(this.el||this.render(),this.el.show(),this.position(),this.isHidden=!1,this.trigger("show"))},
// Hides the popover, through CSS, but does not remove it from the DOM
hide:function(){this.isHidden||(this.el.hide(),this.isHidden=!0,this.trigger("hide"))},
// Creates `this.el` and renders content inside of it
render:function(){var b=this,c=this.options;this.el=a('<div class="fc-popover"/>').addClass(c.className||"").css({
// position initially to the top left to avoid creating scrollbars
top:0,left:0}).append(c.content).appendTo(c.parentEl),
// when a click happens on anything inside with a 'fc-close' className, hide the popover
this.el.on("click",".fc-close",function(){b.hide()}),c.autoHide&&this.listenTo(a(document),"mousedown",this.documentMousedown)},
// Triggered when the user clicks *anywhere* in the document, for the autoHide feature
documentMousedown:function(b){
// only hide the popover if the click happened outside the popover
this.el&&!a(b.target).closest(this.el).length&&this.hide()},
// Hides and unregisters any handlers
removeElement:function(){this.hide(),this.el&&(this.el.remove(),this.el=null),this.stopListeningTo(a(document),"mousedown")},
// Positions the popover optimally, using the top/left/right options
position:function(){var b,c,d,e,f,g=this.options,h=this.el.offsetParent().offset(),i=this.el.outerWidth(),j=this.el.outerHeight(),k=a(window),l=m(this.el);e=g.top||0,f=void 0!==g.left?g.left:void 0!==g.right?g.right-i:0,l.is(window)||l.is(document)?(l=k,b=0,c=0):(d=l.offset(),b=d.top,c=d.left),b+=k.scrollTop(),c+=k.scrollLeft(),g.viewportConstrain!==!1&&(e=Math.min(e,b+l.outerHeight()-j-this.margin),e=Math.max(e,b+this.margin),f=Math.min(f,c+l.outerWidth()-i-this.margin),f=Math.max(f,c+this.margin)),this.el.css({top:e-h.top,left:f-h.left})},
// Triggers a callback. Calls a function in the option hash of the same name.
// Arguments beyond the first `name` are forwarded on.
// TODO: better code reuse for this. Repeat code
trigger:function(a){this.options[a]&&this.options[a].apply(this,Array.prototype.slice.call(arguments,1))}}),lb=Ta.CoordCache=va.extend({els:null,// jQuery set (assumed to be siblings)
forcedOffsetParentEl:null,// options can override the natural offsetParent
origin:null,// {left,top} position of offsetParent of els
boundingRect:null,// constrain cordinates to this rectangle. {left,right,top,bottom} or null
isHorizontal:!1,// whether to query for left/right/width
isVertical:!1,// whether to query for top/bottom/height
// arrays of coordinates (offsets from topleft of document)
lefts:null,rights:null,tops:null,bottoms:null,constructor:function(b){this.els=a(b.els),this.isHorizontal=b.isHorizontal,this.isVertical=b.isVertical,this.forcedOffsetParentEl=b.offsetParent?a(b.offsetParent):null},
// Queries the els for coordinates and stores them.
// Call this method before using and of the get* methods below.
build:function(){var a=this.forcedOffsetParentEl||this.els.eq(0).offsetParent();this.origin=a.offset(),this.boundingRect=this.queryBoundingRect(),this.isHorizontal&&this.buildElHorizontals(),this.isVertical&&this.buildElVerticals()},
// Destroys all internal data about coordinates, freeing memory
clear:function(){this.origin=null,this.boundingRect=null,this.lefts=null,this.rights=null,this.tops=null,this.bottoms=null},
// When called, if coord caches aren't built, builds them
ensureBuilt:function(){this.origin||this.build()},
// Compute and return what the elements' bounding rectangle is, from the user's perspective.
// Right now, only returns a rectangle if constrained by an overflow:scroll element.
queryBoundingRect:function(){var a=m(this.els.eq(0));return a.is(document)?void 0:o(a)},
// Populates the left/right internal coordinate arrays
buildElHorizontals:function(){var b=[],c=[];this.els.each(function(d,e){var f=a(e),g=f.offset().left,h=f.outerWidth();b.push(g),c.push(g+h)}),this.lefts=b,this.rights=c},
// Populates the top/bottom internal coordinate arrays
buildElVerticals:function(){var b=[],c=[];this.els.each(function(d,e){var f=a(e),g=f.offset().top,h=f.outerHeight();b.push(g),c.push(g+h)}),this.tops=b,this.bottoms=c},
// Given a left offset (from document left), returns the index of the el that it horizontally intersects.
// If no intersection is made, or outside of the boundingRect, returns undefined.
getHorizontalIndex:function(a){this.ensureBuilt();var b,c=this.boundingRect,d=this.lefts,e=this.rights,f=d.length;if(!c||a>=c.left&&a<c.right)for(b=0;f>b;b++)if(a>=d[b]&&a<e[b])return b},
// Given a top offset (from document top), returns the index of the el that it vertically intersects.
// If no intersection is made, or outside of the boundingRect, returns undefined.
getVerticalIndex:function(a){this.ensureBuilt();var b,c=this.boundingRect,d=this.tops,e=this.bottoms,f=d.length;if(!c||a>=c.top&&a<c.bottom)for(b=0;f>b;b++)if(a>=d[b]&&a<e[b])return b},
// Gets the left offset (from document left) of the element at the given index
getLeftOffset:function(a){return this.ensureBuilt(),this.lefts[a]},
// Gets the left position (from offsetParent left) of the element at the given index
getLeftPosition:function(a){return this.ensureBuilt(),this.lefts[a]-this.origin.left},
// Gets the right offset (from document left) of the element at the given index.
// This value is NOT relative to the document's right edge, like the CSS concept of "right" would be.
getRightOffset:function(a){return this.ensureBuilt(),this.rights[a]},
// Gets the right position (from offsetParent left) of the element at the given index.
// This value is NOT relative to the offsetParent's right edge, like the CSS concept of "right" would be.
getRightPosition:function(a){return this.ensureBuilt(),this.rights[a]-this.origin.left},
// Gets the width of the element at the given index
getWidth:function(a){return this.ensureBuilt(),this.rights[a]-this.lefts[a]},
// Gets the top offset (from document top) of the element at the given index
getTopOffset:function(a){return this.ensureBuilt(),this.tops[a]},
// Gets the top position (from offsetParent top) of the element at the given position
getTopPosition:function(a){return this.ensureBuilt(),this.tops[a]-this.origin.top},
// Gets the bottom offset (from the document top) of the element at the given index.
// This value is NOT relative to the offsetParent's bottom edge, like the CSS concept of "bottom" would be.
getBottomOffset:function(a){return this.ensureBuilt(),this.bottoms[a]},
// Gets the bottom position (from the offsetParent top) of the element at the given index.
// This value is NOT relative to the offsetParent's bottom edge, like the CSS concept of "bottom" would be.
getBottomPosition:function(a){return this.ensureBuilt(),this.bottoms[a]-this.origin.top},
// Gets the height of the element at the given index
getHeight:function(a){return this.ensureBuilt(),this.bottoms[a]-this.tops[a]}}),mb=Ta.DragListener=va.extend(jb,{options:null,
// for IE8 bug-fighting behavior
subjectEl:null,subjectHref:null,
// coordinates of the initial mousedown
originX:null,originY:null,scrollEl:null,isInteracting:!1,isDistanceSurpassed:!1,isDelayEnded:!1,isDragging:!1,isTouch:!1,delay:null,delayTimeoutId:null,minDistance:null,constructor:function(a){this.options=a||{}},
// Interaction (high-level)
// -----------------------------------------------------------------------------------------------------------------
startInteraction:function(b,c){var d=x(b);if("mousedown"===b.type){if(!u(b))return;b.preventDefault()}this.isInteracting||(c=c||{},this.delay=_(c.delay,this.options.delay,0),this.minDistance=_(c.distance,this.options.distance,0),this.subjectEl=this.options.subjectEl,this.isInteracting=!0,this.isTouch=d,this.isDelayEnded=!1,this.isDistanceSurpassed=!1,this.originX=v(b),this.originY=w(b),this.scrollEl=m(a(b.target)),this.bindHandlers(),this.initAutoScroll(),this.handleInteractionStart(b),this.startDelay(b),this.minDistance||this.handleDistanceSurpassed(b))},handleInteractionStart:function(a){this.trigger("interactionStart",a)},endInteraction:function(a){this.isInteracting&&(this.endDrag(a),this.delayTimeoutId&&(clearTimeout(this.delayTimeoutId),this.delayTimeoutId=null),this.destroyAutoScroll(),this.unbindHandlers(),this.isInteracting=!1,this.handleInteractionEnd(a))},handleInteractionEnd:function(a){this.trigger("interactionEnd",a)},
// Binding To DOM
// -----------------------------------------------------------------------------------------------------------------
bindHandlers:function(){var b=this,c=1;this.isTouch?(this.listenTo(a(document),{touchmove:this.handleTouchMove,touchend:this.endInteraction,touchcancel:this.endInteraction,
// Sometimes touchend doesn't fire
// (can't figure out why. touchcancel doesn't fire either. has to do with scrolling?)
// If another touchstart happens, we know it's bogus, so cancel the drag.
// touchend will continue to be broken until user does a shorttap/scroll, but this is best we can do.
touchstart:function(a){c?// bindHandlers is called from within a touchstart,
c--:b.endInteraction(a)}}),this.scrollEl&&this.listenTo(this.scrollEl,"scroll",this.handleTouchScroll)):this.listenTo(a(document),{mousemove:this.handleMouseMove,mouseup:this.endInteraction}),this.listenTo(a(document),{selectstart:z,// don't allow selection while dragging
contextmenu:z})},unbindHandlers:function(){this.stopListeningTo(a(document)),this.scrollEl&&this.stopListeningTo(this.scrollEl)},
// Drag (high-level)
// -----------------------------------------------------------------------------------------------------------------
// extraOptions ignored if drag already started
startDrag:function(a,b){this.startInteraction(a,b),// ensure interaction began
this.isDragging||(this.isDragging=!0,this.handleDragStart(a))},handleDragStart:function(a){this.trigger("dragStart",a),this.initHrefHack()},handleMove:function(a){var b,c=v(a)-this.originX,d=w(a)-this.originY,e=this.minDistance;// current distance from the origin, squared
this.isDistanceSurpassed||(b=c*c+d*d,b>=e*e&&this.handleDistanceSurpassed(a)),this.isDragging&&this.handleDrag(c,d,a)},
// Called while the mouse is being moved and when we know a legitimate drag is taking place
handleDrag:function(a,b,c){this.trigger("drag",a,b,c),this.updateAutoScroll(c)},endDrag:function(a){this.isDragging&&(this.isDragging=!1,this.handleDragEnd(a))},handleDragEnd:function(a){this.trigger("dragEnd",a),this.destroyHrefHack()},
// Delay
// -----------------------------------------------------------------------------------------------------------------
startDelay:function(a){var b=this;this.delay?this.delayTimeoutId=setTimeout(function(){b.handleDelayEnd(a)},this.delay):this.handleDelayEnd(a)},handleDelayEnd:function(a){this.isDelayEnded=!0,this.isDistanceSurpassed&&this.startDrag(a)},
// Distance
// -----------------------------------------------------------------------------------------------------------------
handleDistanceSurpassed:function(a){this.isDistanceSurpassed=!0,this.isDelayEnded&&this.startDrag(a)},
// Mouse / Touch
// -----------------------------------------------------------------------------------------------------------------
handleTouchMove:function(a){
// prevent inertia and touchmove-scrolling while dragging
this.isDragging&&a.preventDefault(),this.handleMove(a)},handleMouseMove:function(a){this.handleMove(a)},
// Scrolling (unrelated to auto-scroll)
// -----------------------------------------------------------------------------------------------------------------
handleTouchScroll:function(a){
// if the drag is being initiated by touch, but a scroll happens before
// the drag-initiating delay is over, cancel the drag
this.isDragging||this.endInteraction(a)},
// <A> HREF Hack
// -----------------------------------------------------------------------------------------------------------------
initHrefHack:function(){var a=this.subjectEl;
// remove a mousedown'd <a>'s href so it is not visited (IE8 bug)
(this.subjectHref=a?a.attr("href"):null)&&a.removeAttr("href")},destroyHrefHack:function(){var a=this.subjectEl,b=this.subjectHref;
// restore a mousedown'd <a>'s href (for IE8 bug)
setTimeout(function(){// must be outside of the click's execution
b&&a.attr("href",b)},0)},
// Utils
// -----------------------------------------------------------------------------------------------------------------
// Triggers a callback. Calls a function in the option hash of the same name.
// Arguments beyond the first `name` are forwarded on.
trigger:function(a){this.options[a]&&this.options[a].apply(this,Array.prototype.slice.call(arguments,1)),
// makes _methods callable by event name. TODO: kill this
this["_"+a]&&this["_"+a].apply(this,Array.prototype.slice.call(arguments,1))}});/*
this.scrollEl is set in DragListener
*/
mb.mixin({isAutoScroll:!1,scrollBounds:null,// { top, bottom, left, right }
scrollTopVel:null,// pixels per second
scrollLeftVel:null,// pixels per second
scrollIntervalId:null,// ID of setTimeout for scrolling animation loop
// defaults
scrollSensitivity:30,// pixels from edge for scrolling to start
scrollSpeed:200,// pixels per second, at maximum speed
scrollIntervalMs:50,// millisecond wait between scroll increment
initAutoScroll:function(){var a=this.scrollEl;this.isAutoScroll=this.options.scroll&&a&&!a.is(window)&&!a.is(document),this.isAutoScroll&&
// debounce makes sure rapid calls don't happen
this.listenTo(a,"scroll",ha(this.handleDebouncedScroll,100))},destroyAutoScroll:function(){this.endAutoScroll(),// kill any animation loop
// remove the scroll handler if there is a scrollEl
this.isAutoScroll&&this.stopListeningTo(this.scrollEl,"scroll")},
// Computes and stores the bounding rectangle of scrollEl
computeScrollBounds:function(){this.isAutoScroll&&(this.scrollBounds=n(this.scrollEl))},
// Called when the dragging is in progress and scrolling should be updated
updateAutoScroll:function(a){var b,c,d,e,f=this.scrollSensitivity,g=this.scrollBounds,h=0,i=0;g&&(b=(f-(w(a)-g.top))/f,c=(f-(g.bottom-w(a)))/f,d=(f-(v(a)-g.left))/f,e=(f-(g.right-v(a)))/f,b>=0&&1>=b?h=b*this.scrollSpeed*-1:c>=0&&1>=c&&(h=c*this.scrollSpeed),d>=0&&1>=d?i=d*this.scrollSpeed*-1:e>=0&&1>=e&&(i=e*this.scrollSpeed)),this.setScrollVel(h,i)},
// Sets the speed-of-scrolling for the scrollEl
setScrollVel:function(a,b){this.scrollTopVel=a,this.scrollLeftVel=b,this.constrainScrollVel(),// massages into realistic values
// if there is non-zero velocity, and an animation loop hasn't already started, then START
!this.scrollTopVel&&!this.scrollLeftVel||this.scrollIntervalId||(this.scrollIntervalId=setInterval(ga(this,"scrollIntervalFunc"),// scope to `this`
this.scrollIntervalMs))},
// Forces scrollTopVel and scrollLeftVel to be zero if scrolling has already gone all the way
constrainScrollVel:function(){var a=this.scrollEl;this.scrollTopVel<0?// scrolling up?
a.scrollTop()<=0&&(// already scrolled all the way up?
this.scrollTopVel=0):this.scrollTopVel>0&&a.scrollTop()+a[0].clientHeight>=a[0].scrollHeight&&(// already scrolled all the way down?
this.scrollTopVel=0),this.scrollLeftVel<0?// scrolling left?
a.scrollLeft()<=0&&(// already scrolled all the left?
this.scrollLeftVel=0):this.scrollLeftVel>0&&a.scrollLeft()+a[0].clientWidth>=a[0].scrollWidth&&(// already scrolled all the way right?
this.scrollLeftVel=0)},
// This function gets called during every iteration of the scrolling animation loop
scrollIntervalFunc:function(){var a=this.scrollEl,b=this.scrollIntervalMs/1e3;// considering animation frequency, what the vel should be mult'd by
// change the value of scrollEl's scroll
this.scrollTopVel&&a.scrollTop(a.scrollTop()+this.scrollTopVel*b),this.scrollLeftVel&&a.scrollLeft(a.scrollLeft()+this.scrollLeftVel*b),this.constrainScrollVel(),// since the scroll values changed, recompute the velocities
// if scrolled all the way, which causes the vels to be zero, stop the animation loop
this.scrollTopVel||this.scrollLeftVel||this.endAutoScroll()},
// Kills any existing scrolling animation loop
endAutoScroll:function(){this.scrollIntervalId&&(clearInterval(this.scrollIntervalId),this.scrollIntervalId=null,this.handleScrollEnd())},
// Get called when the scrollEl is scrolled (NOTE: this is delayed via debounce)
handleDebouncedScroll:function(){
// recompute all coordinates, but *only* if this is *not* part of our scrolling animation
this.scrollIntervalId||this.handleScrollEnd()},
// Called when scrolling has stopped, whether through auto scroll, or the user scrolling
handleScrollEnd:function(){}});/* Tracks mouse movements over a component and raises events about which hit the mouse is over.
------------------------------------------------------------------------------------------------------------------------
options:
- subjectEl
- subjectCenter
*/
var nb=mb.extend({component:null,// converts coordinates to hits
// methods: prepareHits, releaseHits, queryHit
origHit:null,// the hit the mouse was over when listening started
hit:null,// the hit the mouse is over
coordAdjust:null,// delta that will be added to the mouse coordinates when computing collisions
constructor:function(a,b){mb.call(this,b),// call the super-constructor
this.component=a},
// Called when drag listening starts (but a real drag has not necessarily began).
// ev might be undefined if dragging was started manually.
handleInteractionStart:function(a){var b,c,d,e=this.subjectEl;this.computeCoords(),a?(c={left:v(a),top:w(a)},d=c,e&&(b=n(e),d=B(d,b)),this.origHit=this.queryHit(d.left,d.top),e&&this.options.subjectCenter&&(this.origHit&&(b=A(this.origHit,b)||b),d=C(b)),this.coordAdjust=D(d,c)):(this.origHit=null,this.coordAdjust=null),
// call the super-method. do it after origHit has been computed
mb.prototype.handleInteractionStart.apply(this,arguments)},
// Recomputes the drag-critical positions of elements
computeCoords:function(){this.component.prepareHits(),this.computeScrollBounds()},
// Called when the actual drag has started
handleDragStart:function(a){var b;mb.prototype.handleDragStart.apply(this,arguments),b=this.queryHit(v(a),w(a)),b&&this.handleHitOver(b)},
// Called when the drag moves
handleDrag:function(a,b,c){var d;mb.prototype.handleDrag.apply(this,arguments),d=this.queryHit(v(c),w(c)),ya(d,this.hit)||(this.hit&&this.handleHitOut(),d&&this.handleHitOver(d))},
// Called when dragging has been stopped
handleDragEnd:function(){this.handleHitDone(),mb.prototype.handleDragEnd.apply(this,arguments)},
// Called when a the mouse has just moved over a new hit
handleHitOver:function(a){var b=ya(a,this.origHit);this.hit=a,this.trigger("hitOver",this.hit,b,this.origHit)},
// Called when the mouse has just moved out of a hit
handleHitOut:function(){this.hit&&(this.trigger("hitOut",this.hit),this.handleHitDone(),this.hit=null)},
// Called after a hitOut. Also called before a dragStop
handleHitDone:function(){this.hit&&this.trigger("hitDone",this.hit)},
// Called when the interaction ends, whether there was a real drag or not
handleInteractionEnd:function(){mb.prototype.handleInteractionEnd.apply(this,arguments),// call the super-method
this.origHit=null,this.hit=null,this.component.releaseHits()},
// Called when scrolling has stopped, whether through auto scroll, or the user scrolling
handleScrollEnd:function(){mb.prototype.handleScrollEnd.apply(this,arguments),// call the super-method
this.computeCoords()},
// Gets the hit underneath the coordinates for the given mouse event
queryHit:function(a,b){return this.coordAdjust&&(a+=this.coordAdjust.left,b+=this.coordAdjust.top),this.component.queryHit(a,b)}}),ob=va.extend(jb,{options:null,sourceEl:null,// the element that will be cloned and made to look like it is dragging
el:null,// the clone of `sourceEl` that will track the mouse
parentEl:null,// the element that `el` (the clone) will be attached to
// the initial position of el, relative to the offset parent. made to match the initial offset of sourceEl
top0:null,left0:null,
// the absolute coordinates of the initiating touch/mouse action
y0:null,x0:null,
// the number of pixels the mouse has moved from its initial position
topDelta:null,leftDelta:null,isFollowing:!1,isHidden:!1,isAnimating:!1,// doing the revert animation?
constructor:function(b,c){this.options=c=c||{},this.sourceEl=b,this.parentEl=c.parentEl?a(c.parentEl):b.parent()},
// Causes the element to start following the mouse
start:function(b){this.isFollowing||(this.isFollowing=!0,this.y0=w(b),this.x0=v(b),this.topDelta=0,this.leftDelta=0,this.isHidden||this.updatePosition(),x(b)?this.listenTo(a(document),"touchmove",this.handleMove):this.listenTo(a(document),"mousemove",this.handleMove))},
// Causes the element to stop following the mouse. If shouldRevert is true, will animate back to original position.
// `callback` gets invoked when the animation is complete. If no animation, it is invoked immediately.
stop:function(b,c){function d(){this.isAnimating=!1,e.removeElement(),this.top0=this.left0=null,// reset state for future updatePosition calls
c&&c()}var e=this,f=this.options.revertDuration;this.isFollowing&&!this.isAnimating&&(// disallow more than one stop animation at a time
this.isFollowing=!1,this.stopListeningTo(a(document)),b&&f&&!this.isHidden?(// do a revert animation?
this.isAnimating=!0,this.el.animate({top:this.top0,left:this.left0},{duration:f,complete:d})):d())},
// Gets the tracking element. Create it if necessary
getEl:function(){var a=this.el;// hack to force IE8 to compute correct bounding box
// we don't want long taps or any mouse interaction causing selection/menus.
// would use preventSelection(), but that prevents selectstart, causing problems.
return a||(this.sourceEl.width(),a=this.el=this.sourceEl.clone().addClass(this.options.additionalClass||"").css({position:"absolute",visibility:"",// in case original element was hidden (commonly through hideEvents())
display:this.isHidden?"none":"",// for when initially hidden
margin:0,right:"auto",// erase and set width instead
bottom:"auto",// erase and set height instead
width:this.sourceEl.width(),// explicit height in case there was a 'right' value
height:this.sourceEl.height(),// explicit width in case there was a 'bottom' value
opacity:this.options.opacity||"",zIndex:this.options.zIndex}),a.addClass("fc-unselectable"),a.appendTo(this.parentEl)),a},
// Removes the tracking element if it has already been created
removeElement:function(){this.el&&(this.el.remove(),this.el=null)},
// Update the CSS position of the tracking element
updatePosition:function(){var a,b;this.getEl(),// ensure this.el
// make sure origin info was computed
null===this.top0&&(this.sourceEl.width(),a=this.sourceEl.offset(),b=this.el.offsetParent().offset(),this.top0=a.top-b.top,this.left0=a.left-b.left),this.el.css({top:this.top0+this.topDelta,left:this.left0+this.leftDelta})},
// Gets called when the user moves the mouse
handleMove:function(a){this.topDelta=w(a)-this.y0,this.leftDelta=v(a)-this.x0,this.isHidden||this.updatePosition()},
// Temporarily makes the tracking element invisible. Can be called before following starts
hide:function(){this.isHidden||(this.isHidden=!0,this.el&&this.el.hide())},
// Show the tracking element after it has been temporarily hidden
show:function(){this.isHidden&&(this.isHidden=!1,this.updatePosition(),this.getEl().show())}}),pb=Ta.Grid=va.extend(jb,{view:null,// a View object
isRTL:null,// shortcut to the view's isRTL option
start:null,end:null,el:null,// the containing element
elsByFill:null,// a hash of jQuery element sets used for rendering each fill. Keyed by fill name.
// derived from options
eventTimeFormat:null,displayEventTime:null,displayEventEnd:null,minResizeDuration:null,// TODO: hack. set by subclasses. minumum event resize duration
// if defined, holds the unit identified (ex: "year" or "month") that determines the level of granularity
// of the date areas. if not defined, assumes to be day and time granularity.
// TODO: port isTimeScale into same system?
largeUnit:null,dayDragListener:null,segDragListener:null,segResizeListener:null,externalDragListener:null,constructor:function(a){this.view=a,this.isRTL=a.opt("isRTL"),this.elsByFill={}},/* Options
	------------------------------------------------------------------------------------------------------------------*/
// Generates the format string used for event time text, if not explicitly defined by 'timeFormat'
computeEventTimeFormat:function(){return this.view.opt("smallTimeFormat")},
// Determines whether events should have their end times displayed, if not explicitly defined by 'displayEventTime'.
// Only applies to non-all-day events.
computeDisplayEventTime:function(){return!0},
// Determines whether events should have their end times displayed, if not explicitly defined by 'displayEventEnd'
computeDisplayEventEnd:function(){return!0},/* Dates
	------------------------------------------------------------------------------------------------------------------*/
// Tells the grid about what period of time to display.
// Any date-related internal data should be generated.
setRange:function(a){this.start=a.start.clone(),this.end=a.end.clone(),this.rangeUpdated(),this.processRangeOptions()},
// Called when internal variables that rely on the range should be updated
rangeUpdated:function(){},
// Updates values that rely on options and also relate to range
processRangeOptions:function(){var a,b,c=this.view;this.eventTimeFormat=c.opt("eventTimeFormat")||c.opt("timeFormat")||// deprecated
this.computeEventTimeFormat(),a=c.opt("displayEventTime"),null==a&&(a=this.computeDisplayEventTime()),b=c.opt("displayEventEnd"),null==b&&(b=this.computeDisplayEventEnd()),this.displayEventTime=a,this.displayEventEnd=b},
// Converts a span (has unzoned start/end and any other grid-specific location information)
// into an array of segments (pieces of events whose format is decided by the grid).
spanToSegs:function(a){},
// Diffs the two dates, returning a duration, based on granularity of the grid
// TODO: port isTimeScale into this system?
diffDates:function(a,b){return this.largeUnit?L(a,b,this.largeUnit):J(a,b)},/* Hit Area
	------------------------------------------------------------------------------------------------------------------*/
// Called before one or more queryHit calls might happen. Should prepare any cached coordinates for queryHit
prepareHits:function(){},
// Called when queryHit calls have subsided. Good place to clear any coordinate caches.
releaseHits:function(){},
// Given coordinates from the topleft of the document, return data about the date-related area underneath.
// Can return an object with arbitrary properties (although top/right/left/bottom are encouraged).
// Must have a `grid` property, a reference to this current grid. TODO: avoid this
// The returned object will be processed by getHitSpan and getHitEl.
queryHit:function(a,b){},
// Given position-level information about a date-related area within the grid,
// should return an object with at least a start/end date. Can provide other information as well.
getHitSpan:function(a){},
// Given position-level information about a date-related area within the grid,
// should return a jQuery element that best represents it. passed to dayClick callback.
getHitEl:function(a){},/* Rendering
	------------------------------------------------------------------------------------------------------------------*/
// Sets the container element that the grid should render inside of.
// Does other DOM-related initializations.
setElement:function(a){this.el=a,y(a),this.view.calendar.isTouch?this.bindDayHandler("touchstart",this.dayTouchStart):this.bindDayHandler("mousedown",this.dayMousedown),
// attach event-element-related handlers. in Grid.events
// same garbage collection note as above.
this.bindSegHandlers(),this.bindGlobalHandlers()},bindDayHandler:function(b,c){var d=this;
// attach a handler to the grid's root element.
// jQuery will take care of unregistering them when removeElement gets called.
this.el.on(b,function(b){return a(b.target).is(".fc-event-container *, .fc-more")||a(b.target).closest(".fc-popover").length?void 0:c.call(d,b)})},
// Removes the grid's container element from the DOM. Undoes any other DOM-related attachments.
// DOES NOT remove any content beforehand (doesn't clear events or call unrenderDates), unlike View
removeElement:function(){this.unbindGlobalHandlers(),this.clearDragListeners(),this.el.remove()},
// Renders the basic structure of grid view before any content is rendered
renderSkeleton:function(){},
// Renders the grid's date-related content (like areas that represent days/times).
// Assumes setRange has already been called and the skeleton has already been rendered.
renderDates:function(){},
// Unrenders the grid's date-related content
unrenderDates:function(){},/* Handlers
	------------------------------------------------------------------------------------------------------------------*/
// Binds DOM handlers to elements that reside outside the grid, such as the document
bindGlobalHandlers:function(){this.listenTo(a(document),{dragstart:this.externalDragStart,// jqui
sortstart:this.externalDragStart})},
// Unbinds DOM handlers from elements that reside outside the grid
unbindGlobalHandlers:function(){this.stopListeningTo(a(document))},
// Process a mousedown on an element that represents a day. For day clicking and selecting.
dayMousedown:function(a){this.clearDragListeners(),this.buildDayDragListener().startInteraction(a,{})},dayTouchStart:function(a){this.clearDragListeners(),this.buildDayDragListener().startInteraction(a,{delay:this.view.opt("longPressDelay")})},
// Creates a listener that tracks the user's drag across day elements.
// For day clicking and selecting.
buildDayDragListener:function(){var a,b,c=this,d=this.view,e=d.opt("selectable"),f=this.dayDragListener=new nb(this,{scroll:d.opt("dragScroll"),interactionStart:function(){a=f.origHit},dragStart:function(){d.unselect()},hitOver:function(d,f,h){h&&(// click needs to have started on a hit
// if user dragged to another cell at any point, it can no longer be a dayClick
f||(a=null),e&&(b=c.computeSelection(c.getHitSpan(h),c.getHitSpan(d)),b?c.renderSelection(b):b===!1&&g()))},hitOut:function(){a=null,b=null,c.unrenderSelection(),h()},interactionEnd:function(e){a&&d.triggerDayClick(c.getHitSpan(a),c.getHitEl(a),e),b&&
// the selection will already have been rendered. just report it
d.reportSelection(b,e),h(),c.dayDragListener=null}});return f},
// Kills all in-progress dragging.
// Useful for when public API methods that result in re-rendering are invoked during a drag.
// Also useful for when touch devices misbehave and don't fire their touchend.
clearDragListeners:function(){this.dayDragListener&&this.dayDragListener.endInteraction(),this.segDragListener&&this.segDragListener.endInteraction(),this.segResizeListener&&this.segResizeListener.endInteraction(),this.externalDragListener&&this.externalDragListener.endInteraction()},/* Event Helper
	------------------------------------------------------------------------------------------------------------------*/
// TODO: should probably move this to Grid.events, like we did event dragging / resizing
// Renders a mock event at the given event location, which contains zoned start/end properties.
// Returns all mock event elements.
renderEventLocationHelper:function(a,b){var c=this.fabricateHelperEvent(a,b);return this.renderHelper(c,b)},
// Builds a fake event given zoned event date properties and a segment is should be inspired from.
// The range's end can be null, in which case the mock event that is rendered will have a null end time.
// `sourceSeg` is the internal segment object involved in the drag. If null, something external is dragging.
fabricateHelperEvent:function(a,b){var c=b?V(b.event):{};// mask the original event object if possible
// force it to be freshly computed by normalizeEventDates
// this extra className will be useful for differentiating real events from mock events in CSS
// if something external is being dragged in, don't render a resizer
return c.start=a.start.clone(),c.end=a.end?a.end.clone():null,c.allDay=null,this.view.calendar.normalizeEventDates(c),c.className=(c.className||[]).concat("fc-helper"),b||(c.editable=!1),c},
// Renders a mock event. Given zoned event date properties.
// Must return all mock event elements.
renderHelper:function(a,b){},
// Unrenders a mock event
unrenderHelper:function(){},/* Selection
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of a selection. Will highlight by default but can be overridden by subclasses.
// Given a span (unzoned start/end and other misc data)
renderSelection:function(a){this.renderHighlight(a)},
// Unrenders any visual indications of a selection. Will unrender a highlight by default.
unrenderSelection:function(){this.unrenderHighlight()},
// Given the first and last date-spans of a selection, returns another date-span object.
// Subclasses can override and provide additional data in the span object. Will be passed to renderSelection().
// Will return false if the selection is invalid and this should be indicated to the user.
// Will return null/undefined if a selection invalid but no error should be reported.
computeSelection:function(a,b){var c=this.computeSelectionSpan(a,b);return c&&!this.view.calendar.isSelectionSpanAllowed(c)?!1:c},
// Given two spans, must return the combination of the two.
// TODO: do this separation of concerns (combining VS validation) for event dnd/resize too.
computeSelectionSpan:function(a,b){var c=[a.start,a.end,b.start,b.end];// sorts chronologically. works with Moments
return c.sort(ea),{start:c[0].clone(),end:c[3].clone()}},/* Highlight
	------------------------------------------------------------------------------------------------------------------*/
// Renders an emphasis on the given date range. Given a span (unzoned start/end and other misc data)
renderHighlight:function(a){this.renderFill("highlight",this.spanToSegs(a))},
// Unrenders the emphasis on a date range
unrenderHighlight:function(){this.unrenderFill("highlight")},
// Generates an array of classNames for rendering the highlight. Used by the fill system.
highlightSegClasses:function(){return["fc-highlight"]},/* Business Hours
	------------------------------------------------------------------------------------------------------------------*/
renderBusinessHours:function(){},unrenderBusinessHours:function(){},/* Now Indicator
	------------------------------------------------------------------------------------------------------------------*/
getNowIndicatorUnit:function(){},renderNowIndicator:function(a){},unrenderNowIndicator:function(){},/* Fill System (highlight, background events, business hours)
	--------------------------------------------------------------------------------------------------------------------
	TODO: remove this system. like we did in TimeGrid
	*/
// Renders a set of rectangles over the given segments of time.
// MUST RETURN a subset of segs, the segs that were actually rendered.
// Responsible for populating this.elsByFill. TODO: better API for expressing this requirement
renderFill:function(a,b){},
// Unrenders a specific type of fill that is currently rendered on the grid
unrenderFill:function(a){var b=this.elsByFill[a];b&&(b.remove(),delete this.elsByFill[a])},
// Renders and assigns an `el` property for each fill segment. Generic enough to work with different types.
// Only returns segments that successfully rendered.
// To be harnessed by renderFill (implemented by subclasses).
// Analagous to renderFgSegEls.
renderFillSegEls:function(b,c){var d,e=this,f=this[b+"SegEl"],g="",h=[];if(c.length){
// build a large concatenation of segment HTML
for(d=0;d<c.length;d++)g+=this.fillSegHtml(b,c[d]);
// Grab individual elements from the combined HTML string. Use each as the default rendering.
// Then, compute the 'el' for each segment.
a(g).each(function(b,d){var g=c[b],i=a(d);
// allow custom filter methods per-type
f&&(i=f.call(e,g,i)),i&&(i=a(i),i.is(e.fillSegTag)&&(g.el=i,h.push(g)))})}return h},fillSegTag:"div",// subclasses can override
// Builds the HTML needed for one fill segment. Generic enought o work with different types.
fillSegHtml:function(a,b){
// custom hooks per-type
var c=this[a+"SegClasses"],d=this[a+"SegCss"],e=c?c.call(this,b):[],f=ca(d?d.call(this,b):{});return"<"+this.fillSegTag+(e.length?' class="'+e.join(" ")+'"':"")+(f?' style="'+f+'"':"")+" />"},/* Generic rendering utilities for subclasses
	------------------------------------------------------------------------------------------------------------------*/
// Computes HTML classNames for a single-day element
getDayClasses:function(a){var b=this.view,c=b.calendar.getNow(),d=["fc-"+Xa[a.day()]];return 1==b.intervalDuration.as("months")&&a.month()!=b.intervalStart.month()&&d.push("fc-other-month"),a.isSame(c,"day")?d.push("fc-today",b.highlightStateClass):c>a?d.push("fc-past"):d.push("fc-future"),d}});/* Event-rendering and event-interaction methods for the abstract Grid class
----------------------------------------------------------------------------------------------------------------------*/
pb.mixin({mousedOverSeg:null,// the segment object the user's mouse is over. null if over nothing
isDraggingSeg:!1,// is a segment being dragged? boolean
isResizingSeg:!1,// is a segment being resized? boolean
isDraggingExternal:!1,// jqui-dragging an external element? boolean
segs:null,// the *event* segments currently rendered in the grid. TODO: rename to `eventSegs`
// Renders the given events onto the grid
renderEvents:function(a){var b,c=[],d=[];for(b=0;b<a.length;b++)(Aa(a[b])?c:d).push(a[b]);this.segs=[].concat(// record all segs
this.renderBgEvents(c),this.renderFgEvents(d))},renderBgEvents:function(a){var b=this.eventsToSegs(a);
// renderBgSegs might return a subset of segs, segs that were actually rendered
return this.renderBgSegs(b)||b},renderFgEvents:function(a){var b=this.eventsToSegs(a);
// renderFgSegs might return a subset of segs, segs that were actually rendered
return this.renderFgSegs(b)||b},
// Unrenders all events currently rendered on the grid
unrenderEvents:function(){this.handleSegMouseout(),// trigger an eventMouseout if user's mouse is over an event
this.clearDragListeners(),this.unrenderFgSegs(),this.unrenderBgSegs(),this.segs=null},
// Retrieves all rendered segment objects currently rendered on the grid
getEventSegs:function(){return this.segs||[]},/* Foreground Segment Rendering
	------------------------------------------------------------------------------------------------------------------*/
// Renders foreground event segments onto the grid. May return a subset of segs that were rendered.
renderFgSegs:function(a){},
// Unrenders all currently rendered foreground segments
unrenderFgSegs:function(){},
// Renders and assigns an `el` property for each foreground event segment.
// Only returns segments that successfully rendered.
// A utility that subclasses may use.
renderFgSegEls:function(b,c){var d,e=this.view,f="",g=[];if(b.length){// don't build an empty html string
// build a large concatenation of event segment HTML
for(d=0;d<b.length;d++)f+=this.fgSegHtml(b[d],c);
// Grab individual elements from the combined HTML string. Use each as the default rendering.
// Then, compute the 'el' for each segment. An el might be null if the eventRender callback returned false.
a(f).each(function(c,d){var f=b[c],h=e.resolveEventEl(f.event,a(d));h&&(h.data("fc-seg",f),// used by handlers
f.el=h,g.push(f))})}return g},
// Generates the HTML for the default rendering of a foreground event segment. Used by renderFgSegEls()
fgSegHtml:function(a,b){},/* Background Segment Rendering
	------------------------------------------------------------------------------------------------------------------*/
// Renders the given background event segments onto the grid.
// Returns a subset of the segs that were actually rendered.
renderBgSegs:function(a){return this.renderFill("bgEvent",a)},
// Unrenders all the currently rendered background event segments
unrenderBgSegs:function(){this.unrenderFill("bgEvent")},
// Renders a background event element, given the default rendering. Called by the fill system.
bgEventSegEl:function(a,b){return this.view.resolveEventEl(a.event,b)},
// Generates an array of classNames to be used for the default rendering of a background event.
// Called by the fill system.
bgEventSegClasses:function(a){var b=a.event,c=b.source||{};return["fc-bgevent"].concat(b.className,c.className||[])},
// Generates a semicolon-separated CSS string to be used for the default rendering of a background event.
// Called by the fill system.
bgEventSegCss:function(a){return{"background-color":this.getSegSkinCss(a)["background-color"]}},
// Generates an array of classNames to be used for the rendering business hours overlay. Called by the fill system.
businessHoursSegClasses:function(a){return["fc-nonbusiness","fc-bgevent"]},/* Handlers
	------------------------------------------------------------------------------------------------------------------*/
// Attaches event-element-related handlers to the container element and leverage bubbling
bindSegHandlers:function(){this.view.calendar.isTouch?this.bindSegHandler("touchstart",this.handleSegTouchStart):(this.bindSegHandler("mouseenter",this.handleSegMouseover),this.bindSegHandler("mouseleave",this.handleSegMouseout),this.bindSegHandler("mousedown",this.handleSegMousedown)),this.bindSegHandler("click",this.handleSegClick)},
// Executes a handler for any a user-interaction on a segment.
// Handler gets called with (seg, ev), and with the `this` context of the Grid
bindSegHandler:function(b,c){var d=this;this.el.on(b,".fc-event-container > *",function(b){var e=a(this).data("fc-seg");// grab segment data. put there by View::renderEvents
// only call the handlers if there is not a drag/resize in progress
// grab segment data. put there by View::renderEvents
// only call the handlers if there is not a drag/resize in progress
return!e||d.isDraggingSeg||d.isResizingSeg?void 0:c.call(d,e,b)})},handleSegClick:function(a,b){return this.view.trigger("eventClick",a.el[0],a.event,b)},
// Updates internal state and triggers handlers for when an event element is moused over
handleSegMouseover:function(a,b){this.mousedOverSeg||(this.mousedOverSeg=a,this.view.trigger("eventMouseover",a.el[0],a.event,b))},
// Updates internal state and triggers handlers for when an event element is moused out.
// Can be given no arguments, in which case it will mouseout the segment that was previously moused over.
handleSegMouseout:function(a,b){b=b||{},this.mousedOverSeg&&(a=a||this.mousedOverSeg,this.mousedOverSeg=null,this.view.trigger("eventMouseout",a.el[0],a.event,b))},handleSegTouchStart:function(a,b){var c,d=this.view,e=a.event,f=d.isEventSelected(e),g=d.isEventDraggable(e),h=d.isEventResizable(e),i=!1;f&&h&&(
// only allow resizing of the event is selected
i=this.startSegResize(a,b)),i||!g&&!h||(// allowed to be selected?
this.clearDragListeners(),c=g?this.buildSegDragListener(a):new mb,c._dragStart=function(){f||d.selectEvent(e)},c.startInteraction(b,{delay:f?0:this.view.opt("longPressDelay")}))},handleSegMousedown:function(a,b){var c=this.startSegResize(a,b,{distance:5});!c&&this.view.isEventDraggable(a.event)&&(this.clearDragListeners(),this.buildSegDragListener(a).startInteraction(b,{distance:5}))},
// returns boolean whether resizing actually started or not.
// assumes the seg allows resizing.
// `dragOptions` are optional.
startSegResize:function(b,c,d){return a(c.target).is(".fc-resizer")?(this.clearDragListeners(),this.buildSegResizeListener(b,a(c.target).is(".fc-start-resizer")).startInteraction(c,d),!0):!1},/* Event Dragging
	------------------------------------------------------------------------------------------------------------------*/
// Builds a listener that will track user-dragging on an event segment.
// Generic enough to work with any type of Grid.
buildSegDragListener:function(a){var b,c,d,e=this,f=this.view,i=f.calendar,j=a.el,k=a.event,l=this.segDragListener=new nb(f,{scroll:f.opt("dragScroll"),subjectEl:j,subjectCenter:!0,interactionStart:function(d){b=!1,c=new ob(a.el,{additionalClass:"fc-dragging",parentEl:f.el,opacity:l.isTouch?null:f.opt("dragOpacity"),revertDuration:f.opt("dragRevertDuration"),zIndex:2}),c.hide(),c.start(d)},dragStart:function(c){b=!0,e.handleSegMouseout(a,c),e.segDragStart(a,c),f.hideEvent(k)},hitOver:function(b,h,j){var m;
// starting hit could be forced (DayGrid.limit)
a.hit&&(j=a.hit),d=e.computeEventDrop(j.component.getHitSpan(j),b.component.getHitSpan(b),k),d&&!i.isEventSpanAllowed(e.eventToSpan(d),k)&&(g(),d=null),d&&(m=f.renderDrag(d,a))?(m.addClass("fc-dragging"),l.isTouch||e.applyDragOpacity(m),c.hide()):c.show(),h&&(d=null)},hitOut:function(){// called before mouse moves to a different hit OR moved out of all hits
f.unrenderDrag(),// unrender whatever was done in renderDrag
c.show(),// show in case we are moving out of all hits
d=null},hitDone:function(){// Called after a hitOut OR before a dragEnd
h()},interactionEnd:function(g){
// do revert animation if hasn't changed. calls a callback when finished (whether animation or not)
c.stop(!d,function(){b&&(f.unrenderDrag(),f.showEvent(k),e.segDragStop(a,g)),d&&f.reportEventDrop(k,d,this.largeUnit,j,g)}),e.segDragListener=null}});return l},
// Called before event segment dragging starts
segDragStart:function(a,b){this.isDraggingSeg=!0,this.view.trigger("eventDragStart",a.el[0],a.event,b,{})},
// Called after event segment dragging stops
segDragStop:function(a,b){this.isDraggingSeg=!1,this.view.trigger("eventDragStop",a.el[0],a.event,b,{})},
// Given the spans an event drag began, and the span event was dropped, calculates the new zoned start/end/allDay
// values for the event. Subclasses may override and set additional properties to be used by renderDrag.
// A falsy returned value indicates an invalid drop.
// DOES NOT consider overlap/constraint.
computeEventDrop:function(a,b,c){var d,e,f=this.view.calendar,g=a.start,h=b.start;// zoned event date properties
// if an all-day event was in a timed area and it was dragged to a different time,
// guarantee an end and adjust start/end to have times
// if switching from day <-> timed, start should be reset to the dropped date, and the end cleared
return g.hasTime()===h.hasTime()?(d=this.diffDates(h,g),c.allDay&&R(d)?(e={start:c.start.clone(),end:f.getEventEnd(c),allDay:!1},f.normalizeEventTimes(e)):e={start:c.start.clone(),end:c.end?c.end.clone():null,allDay:c.allDay},e.start.add(d),e.end&&e.end.add(d)):e={start:h.clone(),end:null,// end should be cleared
allDay:!h.hasTime()},e},
// Utility for apply dragOpacity to a jQuery set
applyDragOpacity:function(a){var b=this.view.opt("dragOpacity");null!=b&&a.each(function(a,c){
// Don't use jQuery (will set an IE filter), do it the old fashioned way.
// In IE8, a helper element will disappears if there's a filter.
c.style.opacity=b})},/* External Element Dragging
	------------------------------------------------------------------------------------------------------------------*/
// Called when a jQuery UI drag is initiated anywhere in the DOM
externalDragStart:function(b,c){var d,e,f=this.view;f.opt("droppable")&&(d=a((c?c.item:null)||b.target),e=f.opt("dropAccept"),(a.isFunction(e)?e.call(d[0],d):d.is(e))&&(this.isDraggingExternal||this.listenToExternalDrag(d,b,c)))},
// Called when a jQuery UI drag starts and it needs to be monitored for dropping
listenToExternalDrag:function(a,b,c){var d,e=this,f=this.view.calendar,i=Fa(a),j=e.externalDragListener=new nb(this,{interactionStart:function(){e.isDraggingExternal=!0},hitOver:function(a){d=e.computeExternalDrop(a.component.getHitSpan(a),// since we are querying the parent view, might not belong to this grid
i),d&&!f.isExternalSpanAllowed(e.eventToSpan(d),d,i.eventProps)&&(g(),d=null),d&&e.renderDrag(d)},hitOut:function(){d=null},hitDone:function(){// Called after a hitOut OR before a dragEnd
h(),e.unrenderDrag()},interactionEnd:function(b){d&&// element was dropped on a valid hit
e.view.reportExternalDrop(i,d,a,b,c),e.isDraggingExternal=!1,e.externalDragListener=null}});j.startDrag(b)},
// Given a hit to be dropped upon, and misc data associated with the jqui drag (guaranteed to be a plain object),
// returns the zoned start/end dates for the event that would result from the hypothetical drop. end might be null.
// Returning a null value signals an invalid drop hit.
// DOES NOT consider overlap/constraint.
computeExternalDrop:function(a,b){var c=this.view.calendar,d={start:c.applyTimezone(a.start),// simulate a zoned event start date
end:null};
// if dropped on an all-day span, and element's metadata specified a time, set it
return b.startTime&&!d.start.hasTime()&&d.start.time(b.startTime),b.duration&&(d.end=d.start.clone().add(b.duration)),d},/* Drag Rendering (for both events and an external elements)
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of an event or external element being dragged.
// `dropLocation` contains hypothetical start/end/allDay values the event would have if dropped. end can be null.
// `seg` is the internal segment object that is being dragged. If dragging an external element, `seg` is null.
// A truthy returned value indicates this method has rendered a helper element.
// Must return elements used for any mock events.
renderDrag:function(a,b){},
// Unrenders a visual indication of an event or external element being dragged
unrenderDrag:function(){},/* Resizing
	------------------------------------------------------------------------------------------------------------------*/
// Creates a listener that tracks the user as they resize an event segment.
// Generic enough to work with any type of Grid.
buildSegResizeListener:function(a,b){var c,d,e=this,f=this.view,i=f.calendar,j=a.el,k=a.event,l=i.getEventEnd(k),m=this.segResizeListener=new nb(this,{scroll:f.opt("dragScroll"),subjectEl:j,interactionStart:function(){c=!1},dragStart:function(b){c=!0,e.handleSegMouseout(a,b),e.segResizeStart(a,b)},hitOver:function(c,h,j){var m=e.getHitSpan(j),n=e.getHitSpan(c);d=b?e.computeEventStartResize(m,n,k):e.computeEventEndResize(m,n,k),d&&(i.isEventSpanAllowed(e.eventToSpan(d),k)?d.start.isSame(k.start)&&d.end.isSame(l)&&(d=null):(g(),d=null)),d&&(f.hideEvent(k),e.renderEventResize(d,a))},hitOut:function(){// called before mouse moves to a different hit OR moved out of all hits
d=null},hitDone:function(){// resets the rendering to show the original event
e.unrenderEventResize(),f.showEvent(k),h()},interactionEnd:function(b){c&&e.segResizeStop(a,b),d&&// valid date to resize to?
f.reportEventResize(k,d,this.largeUnit,j,b),e.segResizeListener=null}});return m},
// Called before event segment resizing starts
segResizeStart:function(a,b){this.isResizingSeg=!0,this.view.trigger("eventResizeStart",a.el[0],a.event,b,{})},
// Called after event segment resizing stops
segResizeStop:function(a,b){this.isResizingSeg=!1,this.view.trigger("eventResizeStop",a.el[0],a.event,b,{})},
// Returns new date-information for an event segment being resized from its start
computeEventStartResize:function(a,b,c){return this.computeEventResize("start",a,b,c)},
// Returns new date-information for an event segment being resized from its end
computeEventEndResize:function(a,b,c){return this.computeEventResize("end",a,b,c)},
// Returns new zoned date information for an event segment being resized from its start OR end
// `type` is either 'start' or 'end'.
// DOES NOT consider overlap/constraint.
computeEventResize:function(a,b,c,d){var e,f,g=this.view.calendar,h=this.diffDates(c[a],b[a]);
// build original values to work from, guaranteeing a start and end
// if an all-day event was in a timed area and was resized to a time, adjust start/end to have times
// apply delta to start or end
// if the event was compressed too small, find a new reasonable duration for it
// TODO: hack
// resizing the start?
// resizing the end?
return e={start:d.start.clone(),end:g.getEventEnd(d),allDay:d.allDay},e.allDay&&R(h)&&(e.allDay=!1,g.normalizeEventTimes(e)),e[a].add(h),e.start.isBefore(e.end)||(f=this.minResizeDuration||(d.allDay?g.defaultAllDayEventDuration:g.defaultTimedEventDuration),"start"==a?e.start=e.end.clone().subtract(f):e.end=e.start.clone().add(f)),e},
// Renders a visual indication of an event being resized.
// `range` has the updated dates of the event. `seg` is the original segment object involved in the drag.
// Must return elements used for any mock events.
renderEventResize:function(a,b){},
// Unrenders a visual indication of an event being resized.
unrenderEventResize:function(){},/* Rendering Utils
	------------------------------------------------------------------------------------------------------------------*/
// Compute the text that should be displayed on an event's element.
// `range` can be the Event object itself, or something range-like, with at least a `start`.
// If event times are disabled, or the event has no time, will return a blank string.
// If not specified, formatStr will default to the eventTimeFormat setting,
// and displayEnd will default to the displayEventEnd setting.
getEventTimeText:function(a,b,c){return null==b&&(b=this.eventTimeFormat),null==c&&(c=this.displayEventEnd),this.displayEventTime&&a.start.hasTime()?c&&a.end?this.view.formatRange(a,b):a.start.format(b):""},
// Generic utility for generating the HTML classNames for an event segment's element
getSegClasses:function(a,b,c){var d=this.view,e=a.event,f=["fc-event",a.isStart?"fc-start":"fc-not-start",a.isEnd?"fc-end":"fc-not-end"].concat(e.className,e.source?e.source.className:[]);
// event is currently selected? attach a className.
return b&&f.push("fc-draggable"),c&&f.push("fc-resizable"),d.isEventSelected(e)&&f.push("fc-selected"),f},
// Utility for generating event skin-related CSS properties
getSegSkinCss:function(a){var b=a.event,c=this.view,d=b.source||{},e=b.color,f=d.color,g=c.opt("eventColor");return{"background-color":b.backgroundColor||e||d.backgroundColor||f||c.opt("eventBackgroundColor")||g,"border-color":b.borderColor||e||d.borderColor||f||c.opt("eventBorderColor")||g,color:b.textColor||d.textColor||c.opt("eventTextColor")}},/* Converting events -> eventRange -> eventSpan -> eventSegs
	------------------------------------------------------------------------------------------------------------------*/
// Generates an array of segments for the given single event
// Can accept an event "location" as well (which only has start/end and no allDay)
eventToSegs:function(a){return this.eventsToSegs([a])},eventToSpan:function(a){return this.eventToSpans(a)[0]},
// Generates spans (always unzoned) for the given event.
// Does not do any inverting for inverse-background events.
// Can accept an event "location" as well (which only has start/end and no allDay)
eventToSpans:function(a){var b=this.eventToRange(a);return this.eventRangeToSpans(b,a)},
// Converts an array of event objects into an array of event segment objects.
// A custom `segSliceFunc` may be given for arbitrarily slicing up events.
// Doesn't guarantee an order for the resulting array.
eventsToSegs:function(b,c){var d=this,e=Da(b),f=[];return a.each(e,function(a,b){var e,g=[];for(e=0;e<b.length;e++)g.push(d.eventToRange(b[e]));
// inverse-background events (utilize only the first event in calculations)
if(Ba(b[0]))for(g=d.invertRanges(g),e=0;e<g.length;e++)f.push.apply(f,// append to
d.eventRangeToSegs(g[e],b[0],c));else for(e=0;e<g.length;e++)f.push.apply(f,// append to
d.eventRangeToSegs(g[e],b[e],c))}),f},
// Generates the unzoned start/end dates an event appears to occupy
// Can accept an event "location" as well (which only has start/end and no allDay)
eventToRange:function(a){return{start:a.start.clone().stripZone(),end:(a.end?a.end.clone():
// derive the end from the start and allDay. compute allDay if necessary
this.view.calendar.getDefaultEventEnd(null!=a.allDay?a.allDay:!a.start.hasTime(),a.start)).stripZone()}},
// Given an event's range (unzoned start/end), and the event itself,
// slice into segments (using the segSliceFunc function if specified)
eventRangeToSegs:function(a,b,c){var d,e=this.eventRangeToSpans(a,b),f=[];for(d=0;d<e.length;d++)f.push.apply(f,// append to
this.eventSpanToSegs(e[d],b,c));return f},
// Given an event's unzoned date range, return an array of "span" objects.
// Subclasses can override.
eventRangeToSpans:function(b,c){return[a.extend({},b)]},
// Given an event's span (unzoned start/end and other misc data), and the event itself,
// slices into segments and attaches event-derived properties to them.
eventSpanToSegs:function(a,b,c){var d,e,f=c?c(a):this.spanToSegs(a);for(d=0;d<f.length;d++)e=f[d],e.event=b,e.eventStartMS=+a.start,e.eventDurationMS=a.end-a.start;return f},
// Produces a new array of range objects that will cover all the time NOT covered by the given ranges.
// SIDE EFFECT: will mutate the given array and will use its date references.
invertRanges:function(a){var b,c,d=this.view,e=d.start.clone(),f=d.end.clone(),g=[],h=e;for(
// ranges need to be in order. required for our date-walking algorithm
a.sort(Ea),b=0;b<a.length;b++)c=a[b],c.start>h&&g.push({start:h,end:c.start}),h=c.end;
// add the span of time after the last event (if there is any)
// compare millisecond time (skip any ambig logic)
return f>h&&g.push({start:h,end:f}),g},sortEventSegs:function(a){a.sort(ga(this,"compareEventSegs"))},
// A cmp function for determining which segments should take visual priority
compareEventSegs:function(a,b){// earlier events go first
// tie? longer events go first
// tie? put all-day events first (booleans cast to 0/1)
return a.eventStartMS-b.eventStartMS||b.eventDurationMS-a.eventDurationMS||b.event.allDay-a.event.allDay||F(a.event,b.event,this.view.eventOrderSpecs)}}),Ta.isBgEvent=Aa,/* External-Dragging-Element Data
----------------------------------------------------------------------------------------------------------------------*/
// Require all HTML5 data-* attributes used by FullCalendar to have this prefix.
// A value of '' will query attributes like data-event. A value of 'fc' will query attributes like data-fc-event.
Ta.dataAttrPrefix="";/*
A set of rendering and date-related methods for a visual component comprised of one or more rows of day columns.
Prerequisite: the object being mixed into needs to be a *Grid*
*/
var qb=Ta.DayTableMixin={breakOnWeeks:!1,// should create a new row for each week?
dayDates:null,// whole-day dates for each column. left to right
dayIndices:null,// for each day from start, the offset
daysPerRow:null,rowCnt:null,colCnt:null,colHeadFormat:null,
// Populates internal variables used for date calculation and rendering
updateDayTable:function(){for(var a,b,c,d=this.view,e=this.start.clone(),f=-1,g=[],h=[];e.isBefore(this.end);)// loop each day from start to end
d.isHiddenDay(e)?g.push(f+.5):(f++,g.push(f),h.push(e.clone())),e.add(1,"days");if(this.breakOnWeeks){for(b=h[0].day(),a=1;a<h.length&&h[a].day()!=b;a++);c=Math.ceil(h.length/a)}else c=1,a=h.length;this.dayDates=h,this.dayIndices=g,this.daysPerRow=a,this.rowCnt=c,this.updateDayTableCols()},
// Computes and assigned the colCnt property and updates any options that may be computed from it
updateDayTableCols:function(){this.colCnt=this.computeColCnt(),this.colHeadFormat=this.view.opt("columnFormat")||this.computeColHeadFormat()},
// Determines how many columns there should be in the table
computeColCnt:function(){return this.daysPerRow},
// Computes the ambiguously-timed moment for the given cell
getCellDate:function(a,b){return this.dayDates[this.getCellDayIndex(a,b)].clone()},
// Computes the ambiguously-timed date range for the given cell
getCellRange:function(a,b){var c=this.getCellDate(a,b),d=c.clone().add(1,"days");return{start:c,end:d}},
// Returns the number of day cells, chronologically, from the first of the grid (0-based)
getCellDayIndex:function(a,b){return a*this.daysPerRow+this.getColDayIndex(b)},
// Returns the numner of day cells, chronologically, from the first cell in *any given row*
getColDayIndex:function(a){return this.isRTL?this.colCnt-1-a:a},
// Given a date, returns its chronolocial cell-index from the first cell of the grid.
// If the date lies between cells (because of hiddenDays), returns a floating-point value between offsets.
// If before the first offset, returns a negative number.
// If after the last offset, returns an offset past the last cell offset.
// Only works for *start* dates of cells. Will not work for exclusive end dates for cells.
getDateDayIndex:function(a){var b=this.dayIndices,c=a.diff(this.start,"days");return 0>c?b[0]-1:c>=b.length?b[b.length-1]+1:b[c]},/* Options
	------------------------------------------------------------------------------------------------------------------*/
// Computes a default column header formatting string if `colFormat` is not explicitly defined
computeColHeadFormat:function(){
// if more than one week row, or if there are a lot of columns with not much space,
// put just the day numbers will be in each cell
// if more than one week row, or if there are a lot of columns with not much space,
// put just the day numbers will be in each cell
return this.rowCnt>1||this.colCnt>10?"ddd":this.colCnt>1?this.view.opt("dayOfMonthFormat"):"dddd"},/* Slicing
	------------------------------------------------------------------------------------------------------------------*/
// Slices up a date range into a segment for every week-row it intersects with
sliceRangeByRow:function(a){var b,c,d,e,f,g=this.daysPerRow,h=this.view.computeDayRange(a),i=this.getDateDayIndex(h.start),j=this.getDateDayIndex(h.end.clone().subtract(1,"days")),k=[];// inclusive day-index range for segment
for(b=0;b<this.rowCnt;b++)c=b*g,d=c+g-1,e=Math.max(i,c),f=Math.min(j,d),e=Math.ceil(e),f=Math.floor(f),f>=e&&k.push({row:b,firstRowDayIndex:e-c,lastRowDayIndex:f-c,isStart:e===i,isEnd:f===j});return k},
// Slices up a date range into a segment for every day-cell it intersects with.
// TODO: make more DRY with sliceRangeByRow somehow.
sliceRangeByDay:function(a){var b,c,d,e,f,g,h=this.daysPerRow,i=this.view.computeDayRange(a),j=this.getDateDayIndex(i.start),k=this.getDateDayIndex(i.end.clone().subtract(1,"days")),l=[];// inclusive day-index range for segment
for(b=0;b<this.rowCnt;b++)for(c=b*h,d=c+h-1,e=c;d>=e;e++)f=Math.max(j,e),g=Math.min(k,e),f=Math.ceil(f),g=Math.floor(g),g>=f&&l.push({row:b,firstRowDayIndex:f-c,lastRowDayIndex:g-c,isStart:f===j,isEnd:g===k});return l},/* Header Rendering
	------------------------------------------------------------------------------------------------------------------*/
renderHeadHtml:function(){var a=this.view;return'<div class="fc-row '+a.widgetHeaderClass+'"><table><thead>'+this.renderHeadTrHtml()+"</thead></table></div>"},renderHeadIntroHtml:function(){return this.renderIntroHtml()},renderHeadTrHtml:function(){return"<tr>"+(this.isRTL?"":this.renderHeadIntroHtml())+this.renderHeadDateCellsHtml()+(this.isRTL?this.renderHeadIntroHtml():"")+"</tr>"},renderHeadDateCellsHtml:function(){var a,b,c=[];for(a=0;a<this.colCnt;a++)b=this.getCellDate(0,a),c.push(this.renderHeadDateCellHtml(b));return c.join("")},
// TODO: when internalApiVersion, accept an object for HTML attributes
// (colspan should be no different)
renderHeadDateCellHtml:function(a,b,c){var d=this.view;return'<th class="fc-day-header '+d.widgetHeaderClass+" fc-"+Xa[a.day()]+'"'+(1==this.rowCnt?' data-date="'+a.format("YYYY-MM-DD")+'"':"")+(b>1?' colspan="'+b+'"':"")+(c?" "+c:"")+">"+aa(a.format(this.colHeadFormat))+"</th>"},/* Background Rendering
	------------------------------------------------------------------------------------------------------------------*/
renderBgTrHtml:function(a){return"<tr>"+(this.isRTL?"":this.renderBgIntroHtml(a))+this.renderBgCellsHtml(a)+(this.isRTL?this.renderBgIntroHtml(a):"")+"</tr>"},renderBgIntroHtml:function(a){return this.renderIntroHtml()},renderBgCellsHtml:function(a){var b,c,d=[];for(b=0;b<this.colCnt;b++)c=this.getCellDate(a,b),d.push(this.renderBgCellHtml(c));return d.join("")},renderBgCellHtml:function(a,b){var c=this.view,d=this.getDayClasses(a);// if date has a time, won't format it
return d.unshift("fc-day",c.widgetContentClass),'<td class="'+d.join(" ")+'" data-date="'+a.format("YYYY-MM-DD")+'"'+(b?" "+b:"")+"></td>"},/* Generic
	------------------------------------------------------------------------------------------------------------------*/
// Generates the default HTML intro for any row. User classes should override
renderIntroHtml:function(){},
// TODO: a generic method for dealing with <tr>, RTL, intro
// when increment internalApiVersion
// wrapTr (scheduler)
/* Utils
	------------------------------------------------------------------------------------------------------------------*/
// Applies the generic "intro" and "outro" HTML to the given cells.
// Intro means the leftmost cell when the calendar is LTR and the rightmost cell when RTL. Vice-versa for outro.
bookendCells:function(a){var b=this.renderIntroHtml();b&&(this.isRTL?a.append(b):a.prepend(b))}},rb=Ta.DayGrid=pb.extend(qb,{numbersVisible:!1,// should render a row for day/week numbers? set by outside view. TODO: make internal
bottomCoordPadding:0,// hack for extending the hit area for the last row of the coordinate grid
rowEls:null,// set of fake row elements
cellEls:null,// set of whole-day elements comprising the row's background
helperEls:null,// set of cell skeleton elements for rendering the mock event "helper"
rowCoordCache:null,colCoordCache:null,
// Renders the rows and columns into the component's `this.el`, which should already be assigned.
// isRigid determins whether the individual rows should ignore the contents and be a constant height.
// Relies on the view's colCnt and rowCnt. In the future, this component should probably be self-sufficient.
renderDates:function(a){var b,c,d=this.view,e=this.rowCnt,f=this.colCnt,g="";for(b=0;e>b;b++)g+=this.renderDayRowHtml(b,a);
// trigger dayRender with each cell's element
for(this.el.html(g),this.rowEls=this.el.find(".fc-row"),this.cellEls=this.el.find(".fc-day"),this.rowCoordCache=new lb({els:this.rowEls,isVertical:!0}),this.colCoordCache=new lb({els:this.cellEls.slice(0,this.colCnt),// only the first row
isHorizontal:!0}),b=0;e>b;b++)for(c=0;f>c;c++)d.trigger("dayRender",null,this.getCellDate(b,c),this.getCellEl(b,c))},unrenderDates:function(){this.removeSegPopover()},renderBusinessHours:function(){var a=this.view.calendar.getBusinessHoursEvents(!0),b=this.eventsToSegs(a);this.renderFill("businessHours",b,"bgevent")},
// Generates the HTML for a single row, which is a div that wraps a table.
// `row` is the row number.
renderDayRowHtml:function(a,b){var c=this.view,d=["fc-row","fc-week",c.widgetContentClass];return b&&d.push("fc-rigid"),'<div class="'+d.join(" ")+'"><div class="fc-bg"><table>'+this.renderBgTrHtml(a)+'</table></div><div class="fc-content-skeleton"><table>'+(this.numbersVisible?"<thead>"+this.renderNumberTrHtml(a)+"</thead>":"")+"</table></div></div>"},/* Grid Number Rendering
	------------------------------------------------------------------------------------------------------------------*/
renderNumberTrHtml:function(a){return"<tr>"+(this.isRTL?"":this.renderNumberIntroHtml(a))+this.renderNumberCellsHtml(a)+(this.isRTL?this.renderNumberIntroHtml(a):"")+"</tr>"},renderNumberIntroHtml:function(a){return this.renderIntroHtml()},renderNumberCellsHtml:function(a){var b,c,d=[];for(b=0;b<this.colCnt;b++)c=this.getCellDate(a,b),d.push(this.renderNumberCellHtml(c));return d.join("")},
// Generates the HTML for the <td>s of the "number" row in the DayGrid's content skeleton.
// The number row will only exist if either day numbers or week numbers are turned on.
renderNumberCellHtml:function(a){var b;return this.view.dayNumbersVisible?(b=this.getDayClasses(a),b.unshift("fc-day-number"),'<td class="'+b.join(" ")+'" data-date="'+a.format()+'">'+a.date()+"</td>"):"<td/>"},/* Options
	------------------------------------------------------------------------------------------------------------------*/
// Computes a default event time formatting string if `timeFormat` is not explicitly defined
computeEventTimeFormat:function(){return this.view.opt("extraSmallTimeFormat")},
// Computes a default `displayEventEnd` value if one is not expliclty defined
computeDisplayEventEnd:function(){return 1==this.colCnt},/* Dates
	------------------------------------------------------------------------------------------------------------------*/
rangeUpdated:function(){this.updateDayTable()},
// Slices up the given span (unzoned start/end with other misc data) into an array of segments
spanToSegs:function(a){var b,c,d=this.sliceRangeByRow(a);for(b=0;b<d.length;b++)c=d[b],this.isRTL?(c.leftCol=this.daysPerRow-1-c.lastRowDayIndex,c.rightCol=this.daysPerRow-1-c.firstRowDayIndex):(c.leftCol=c.firstRowDayIndex,c.rightCol=c.lastRowDayIndex);return d},/* Hit System
	------------------------------------------------------------------------------------------------------------------*/
prepareHits:function(){this.colCoordCache.build(),this.rowCoordCache.build(),this.rowCoordCache.bottoms[this.rowCnt-1]+=this.bottomCoordPadding},releaseHits:function(){this.colCoordCache.clear(),this.rowCoordCache.clear()},queryHit:function(a,b){var c=this.colCoordCache.getHorizontalIndex(a),d=this.rowCoordCache.getVerticalIndex(b);return null!=d&&null!=c?this.getCellHit(d,c):void 0},getHitSpan:function(a){return this.getCellRange(a.row,a.col)},getHitEl:function(a){return this.getCellEl(a.row,a.col)},/* Cell System
	------------------------------------------------------------------------------------------------------------------*/
// FYI: the first column is the leftmost column, regardless of date
getCellHit:function(a,b){return{row:a,col:b,component:this,// needed unfortunately :(
left:this.colCoordCache.getLeftOffset(b),right:this.colCoordCache.getRightOffset(b),top:this.rowCoordCache.getTopOffset(a),bottom:this.rowCoordCache.getBottomOffset(a)}},getCellEl:function(a,b){return this.cellEls.eq(a*this.colCnt+b)},/* Event Drag Visualization
	------------------------------------------------------------------------------------------------------------------*/
// TODO: move to DayGrid.event, similar to what we did with Grid's drag methods
// Renders a visual indication of an event or external element being dragged.
// `eventLocation` has zoned start and end (optional)
renderDrag:function(a,b){
// if a segment from the same calendar but another component is being dragged, render a helper event
// always render a highlight underneath
// if a segment from the same calendar but another component is being dragged, render a helper event
return this.renderHighlight(this.eventToSpan(a)),b&&!b.el.closest(this.el).length?this.renderEventLocationHelper(a,b):void 0},
// Unrenders any visual indication of a hovering event
unrenderDrag:function(){this.unrenderHighlight(),this.unrenderHelper()},/* Event Resize Visualization
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of an event being resized
renderEventResize:function(a,b){return this.renderHighlight(this.eventToSpan(a)),this.renderEventLocationHelper(a,b)},
// Unrenders a visual indication of an event being resized
unrenderEventResize:function(){this.unrenderHighlight(),this.unrenderHelper()},/* Event Helper
	------------------------------------------------------------------------------------------------------------------*/
// Renders a mock "helper" event. `sourceSeg` is the associated internal segment object. It can be null.
renderHelper:function(b,c){var d,e=[],f=this.eventToSegs(b);// assigns each seg's el and returns a subset of segs that were rendered
// inject each new event skeleton into each associated row
// must return the elements rendered
return f=this.renderFgSegEls(f),d=this.renderSegRows(f),this.rowEls.each(function(b,f){var g,h=a(f),i=a('<div class="fc-helper-skeleton"><table/></div>');g=c&&c.row===b?c.el.position().top:h.find(".fc-content-skeleton tbody").position().top,i.css("top",g).find("table").append(d[b].tbodyEl),h.append(i),e.push(i[0])}),this.helperEls=a(e)},
// Unrenders any visual indication of a mock helper event
unrenderHelper:function(){this.helperEls&&(this.helperEls.remove(),this.helperEls=null)},/* Fill System (highlight, background events, business hours)
	------------------------------------------------------------------------------------------------------------------*/
fillSegTag:"td",// override the default tag name
// Renders a set of rectangles over the given segments of days.
// Only returns segments that successfully rendered.
renderFill:function(b,c,d){var e,f,g,h=[];// assignes `.el` to each seg. returns successfully rendered segs
for(c=this.renderFillSegEls(b,c),e=0;e<c.length;e++)f=c[e],g=this.renderFillRow(b,f,d),this.rowEls.eq(f.row).append(g),h.push(g[0]);return this.elsByFill[b]=a(h),c},
// Generates the HTML needed for one row of a fill. Requires the seg's el to be rendered.
renderFillRow:function(b,c,d){var e,f,g=this.colCnt,h=c.leftCol,i=c.rightCol+1;return d=d||b.toLowerCase(),e=a('<div class="fc-'+d+'-skeleton"><table><tr/></table></div>'),f=e.find("tr"),h>0&&f.append('<td colspan="'+h+'"/>'),f.append(c.el.attr("colspan",i-h)),g>i&&f.append('<td colspan="'+(g-i)+'"/>'),this.bookendCells(f),e}});/* Event-rendering methods for the DayGrid class
----------------------------------------------------------------------------------------------------------------------*/
rb.mixin({rowStructs:null,// an array of objects, each holding information about a row's foreground event-rendering
// Unrenders all events currently rendered on the grid
unrenderEvents:function(){this.removeSegPopover(),// removes the "more.." events popover
pb.prototype.unrenderEvents.apply(this,arguments)},
// Retrieves all rendered segment objects currently rendered on the grid
getEventSegs:function(){return pb.prototype.getEventSegs.call(this).concat(this.popoverSegs||[])},
// Renders the given background event segments onto the grid
renderBgSegs:function(b){
// don't render timed background events
var c=a.grep(b,function(a){return a.event.allDay});return pb.prototype.renderBgSegs.call(this,c)},
// Renders the given foreground event segments onto the grid
renderFgSegs:function(b){var c;
// render an `.el` on each seg
// returns a subset of the segs. segs that were actually rendered
// append to each row's content skeleton
return b=this.renderFgSegEls(b),c=this.rowStructs=this.renderSegRows(b),this.rowEls.each(function(b,d){a(d).find(".fc-content-skeleton > table").append(c[b].tbodyEl)}),b},
// Unrenders all currently rendered foreground event segments
unrenderFgSegs:function(){for(var a,b=this.rowStructs||[];a=b.pop();)a.tbodyEl.remove();this.rowStructs=null},
// Uses the given events array to generate <tbody> elements that should be appended to each row's content skeleton.
// Returns an array of rowStruct objects (see the bottom of `renderSegRow`).
// PRECONDITION: each segment shoud already have a rendered and assigned `.el`
renderSegRows:function(a){var b,c,d=[];// group into nested arrays
// iterate each row of segment groupings
for(b=this.groupSegRows(a),c=0;c<b.length;c++)d.push(this.renderSegRow(c,b[c]));return d},
// Builds the HTML to be used for the default element for an individual segment
fgSegHtml:function(a,b){var c,d,e=this.view,f=a.event,g=e.isEventDraggable(f),h=!b&&f.allDay&&a.isStart&&e.isEventResizableFromStart(f),i=!b&&f.allDay&&a.isEnd&&e.isEventResizableFromEnd(f),j=this.getSegClasses(a,g,h||i),k=ca(this.getSegSkinCss(a)),l="";
// Only display a timed events time if it is the starting segment
// we always want one line of height
// put a natural space in between
return j.unshift("fc-day-grid-event","fc-h-event"),a.isStart&&(c=this.getEventTimeText(f),c&&(l='<span class="fc-time">'+aa(c)+"</span>")),d='<span class="fc-title">'+(aa(f.title||"")||"&nbsp;")+"</span>",'<a class="'+j.join(" ")+'"'+(f.url?' href="'+aa(f.url)+'"':"")+(k?' style="'+k+'"':"")+'><div class="fc-content">'+(this.isRTL?d+" "+l:l+" "+d)+"</div>"+(h?'<div class="fc-resizer fc-start-resizer" />':"")+(i?'<div class="fc-resizer fc-end-resizer" />':"")+"</a>"},
// Given a row # and an array of segments all in the same row, render a <tbody> element, a skeleton that contains
// the segments. Returns object with a bunch of internal data about how the render was calculated.
// NOTE: modifies rowSegs
renderSegRow:function(b,c){
// populates empty cells from the current column (`col`) to `endCol`
function d(b){for(;b>g;)k=(r[e-1]||[])[g],k?k.attr("rowspan",parseInt(k.attr("rowspan")||1,10)+1):(k=a("<td/>"),h.append(k)),q[e][g]=k,r[e][g]=k,g++}var e,f,g,h,i,j,k,l=this.colCnt,m=this.buildSegLevels(c),n=Math.max(1,m.length),o=a("<tbody/>"),p=[],q=[],r=[];for(e=0;n>e;e++){
// levelCnt might be 1 even though there are no actual levels. protect against this.
// this single empty row is useful for styling.
if(f=m[e],g=0,h=a("<tr/>"),p.push([]),q.push([]),r.push([]),f)for(i=0;i<f.length;i++){for(// iterate through segments in level
j=f[i],d(j.leftCol),
// create a container that occupies or more columns. append the event element.
k=a('<td class="fc-event-container"/>').append(j.el),j.leftCol!=j.rightCol?k.attr("colspan",j.rightCol-j.leftCol+1):// a single-column segment
r[e][g]=k;g<=j.rightCol;)q[e][g]=k,p[e][g]=j,g++;h.append(k)}d(l),// finish off the row
this.bookendCells(h),o.append(h)}return{// a "rowStruct"
row:b,// the row number
tbodyEl:o,cellMatrix:q,segMatrix:p,segLevels:m,segs:c}},
// Stacks a flat array of segments, which are all assumed to be in the same row, into subarrays of vertical levels.
// NOTE: modifies segs
buildSegLevels:function(a){var b,c,d,e=[];for(
// Give preference to elements with certain criteria, so they have
// a chance to be closer to the top.
this.sortEventSegs(a),b=0;b<a.length;b++){
// loop through levels, starting with the topmost, until the segment doesn't collide with other segments
for(c=a[b],d=0;d<e.length&&Ga(c,e[d]);d++);
// `j` now holds the desired subrow index
c.level=d,
// create new level array if needed and append segment
(e[d]||(e[d]=[])).push(c)}
// order segments left-to-right. very important if calendar is RTL
for(d=0;d<e.length;d++)e[d].sort(Ha);return e},
// Given a flat array of segments, return an array of sub-arrays, grouped by each segment's row
groupSegRows:function(a){var b,c=[];for(b=0;b<this.rowCnt;b++)c.push([]);for(b=0;b<a.length;b++)c[a[b].row].push(a[b]);return c}}),/* Methods relate to limiting the number events for a given day on a DayGrid
----------------------------------------------------------------------------------------------------------------------*/
// NOTE: all the segs being passed around in here are foreground segs
rb.mixin({segPopover:null,// the Popover that holds events that can't fit in a cell. null when not visible
popoverSegs:null,// an array of segment objects that the segPopover holds. null when not visible
removeSegPopover:function(){this.segPopover&&this.segPopover.hide()},
// Limits the number of "levels" (vertically stacking layers of events) for each row of the grid.
// `levelLimit` can be false (don't limit), a number, or true (should be computed).
limitRows:function(a){var b,c,d=this.rowStructs||[];for(b=0;b<d.length;b++)this.unlimitRow(b),c=a?"number"==typeof a?a:this.computeRowLevelLimit(b):!1,c!==!1&&this.limitRow(b,c)},
// Computes the number of levels a row will accomodate without going outside its bounds.
// Assumes the row is "rigid" (maintains a constant height regardless of what is inside).
// `row` is the row number.
computeRowLevelLimit:function(b){function c(b,c){f=Math.max(f,a(c).outerHeight())}var d,e,f,g=this.rowEls.eq(b),h=g.height(),i=this.rowStructs[b].tbodyEl.children();
// Reveal one level <tr> at a time and stop when we find one out of bounds
for(d=0;d<i.length;d++)if(e=i.eq(d).removeClass("fc-limited"),f=0,e.find("> td > :first-child").each(c),e.position().top+f>h)return d;return!1},
// Limits the given grid row to the maximum number of levels and injects "more" links if necessary.
// `row` is the row number.
// `levelLimit` is a number for the maximum (inclusive) number of levels allowed.
limitRow:function(b,c){
// Iterates through empty level cells and places "more" links inside if need be
function d(d){// goes from current `col` to `endCol`
for(;d>w;)j=t.getCellSegs(b,w,c),j.length&&(m=f[c-1][w],s=t.renderMoreLink(b,w,j),r=a("<div/>").append(s),m.append(r),v.push(r[0])),w++}var e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t=this,u=this.rowStructs[b],v=[],w=0;if(c&&c<u.segLevels.length){// hide elements and get a simple DOM-nodes array
// iterate though segments in the last allowable level
for(e=u.segLevels[c-1],f=u.cellMatrix,g=u.tbodyEl.children().slice(c).addClass("fc-limited").get(),h=0;h<e.length;h++){for(i=e[h],d(i.leftCol),// process empty cells before the segment
// determine *all* segments below `seg` that occupy the same columns
l=[],k=0;w<=i.rightCol;)j=this.getCellSegs(b,w,c),l.push(j),k+=j.length,w++;if(k){
// make a replacement <td> for each column the segment occupies. will be one for each colspan
for(m=f[c-1][i.leftCol],n=m.attr("rowspan")||1,o=[],p=0;p<l.length;p++)q=a('<td class="fc-more-cell"/>').attr("rowspan",n),j=l[p],s=this.renderMoreLink(b,i.leftCol+p,[i].concat(j)),r=a("<div/>").append(s),q.append(r),o.push(q[0]),v.push(q[0]);m.addClass("fc-limited").after(a(o)),// hide original <td> and inject replacements
g.push(m[0])}}d(this.colCnt),// finish off the level
u.moreEls=a(v),// for easy undoing later
u.limitedEls=a(g)}},
// Reveals all levels and removes all "more"-related elements for a grid's row.
// `row` is a row number.
unlimitRow:function(a){var b=this.rowStructs[a];b.moreEls&&(b.moreEls.remove(),b.moreEls=null),b.limitedEls&&(b.limitedEls.removeClass("fc-limited"),b.limitedEls=null)},
// Renders an <a> element that represents hidden event element for a cell.
// Responsible for attaching click handler as well.
renderMoreLink:function(b,c,d){var e=this,f=this.view;return a('<a class="fc-more"/>').text(this.getMoreLinkText(d.length)).on("click",function(g){var h=f.opt("eventLimitClick"),i=e.getCellDate(b,c),j=a(this),k=e.getCellEl(b,c),l=e.getCellSegs(b,c),m=e.resliceDaySegs(l,i),n=e.resliceDaySegs(d,i);"function"==typeof h&&(
// the returned value can be an atomic option
h=f.trigger("eventLimitClick",null,{date:i,dayEl:k,moreEl:j,segs:m,hiddenSegs:n},g)),"popover"===h?e.showSegPopover(b,c,j,m):"string"==typeof h&&// a view name
f.calendar.zoomTo(i,h)})},
// Reveals the popover that displays all events within a cell
showSegPopover:function(a,b,c,d){var e,f,g=this,h=this.view,i=c.parent();e=1==this.rowCnt?h.el:this.rowEls.eq(a),f={className:"fc-more-popover",content:this.renderSegPopoverContent(a,b,d),parentEl:this.el,top:e.offset().top,autoHide:!0,viewportConstrain:h.opt("popoverViewportConstrain"),hide:function(){g.segPopover.removeElement(),g.segPopover=null,g.popoverSegs=null}},this.isRTL?f.right=i.offset().left+i.outerWidth()+1:f.left=i.offset().left-1,this.segPopover=new kb(f),this.segPopover.show()},
// Builds the inner DOM contents of the segment popover
renderSegPopoverContent:function(b,c,d){var e,f=this.view,g=f.opt("theme"),h=this.getCellDate(b,c).format(f.opt("dayPopoverFormat")),i=a('<div class="fc-header '+f.widgetHeaderClass+'"><span class="fc-close '+(g?"ui-icon ui-icon-closethick":"fc-icon fc-icon-x")+'"></span><span class="fc-title">'+aa(h)+'</span><div class="fc-clear"/></div><div class="fc-body '+f.widgetContentClass+'"><div class="fc-event-container"></div></div>'),j=i.find(".fc-event-container");for(d=this.renderFgSegEls(d,!0),this.popoverSegs=d,e=0;e<d.length;e++)
// because segments in the popover are not part of a grid coordinate system, provide a hint to any
// grids that want to do drag-n-drop about which cell it came from
this.prepareHits(),d[e].hit=this.getCellHit(b,c),this.releaseHits(),j.append(d[e].el);return i},
// Given the events within an array of segment objects, reslice them to be in a single day
resliceDaySegs:function(b,c){
// build an array of the original events
var d=a.map(b,function(a){return a.event}),e=c.clone(),f=e.clone().add(1,"days"),g={start:e,end:f};
// slice the events with a custom slicing function
// force an order because eventsToSegs doesn't guarantee one
return b=this.eventsToSegs(d,function(a){var b=I(a,g);// undefind if no intersection
return b?[b]:[]}),this.sortEventSegs(b),b},
// Generates the text that should be inside a "more" link, given the number of events it represents
getMoreLinkText:function(a){var b=this.view.opt("eventLimitText");return"function"==typeof b?b(a):"+"+a+" "+b},
// Returns segments within a given cell.
// If `startLevel` is specified, returns only events including and below that level. Otherwise returns all segs.
getCellSegs:function(a,b,c){for(var d,e=this.rowStructs[a].segMatrix,f=c||0,g=[];f<e.length;)d=e[f][b],d&&g.push(d),f++;return g}});/* A component that renders one or more columns of vertical time slots
----------------------------------------------------------------------------------------------------------------------*/
// We mixin DayTable, even though there is only a single row of days
var sb=Ta.TimeGrid=pb.extend(qb,{slotDuration:null,// duration of a "slot", a distinct time segment on given day, visualized by lines
snapDuration:null,// granularity of time for dragging and selecting
snapsPerSlot:null,minTime:null,// Duration object that denotes the first visible time of any given day
maxTime:null,// Duration object that denotes the exclusive visible end time of any given day
labelFormat:null,// formatting string for times running along vertical axis
labelInterval:null,// duration of how often a label should be displayed for a slot
colEls:null,// cells elements in the day-row background
slatContainerEl:null,// div that wraps all the slat rows
slatEls:null,// elements running horizontally across all columns
nowIndicatorEls:null,colCoordCache:null,slatCoordCache:null,constructor:function(){pb.apply(this,arguments),// call the super-constructor
this.processOptions()},
// Renders the time grid into `this.el`, which should already be assigned.
// Relies on the view's colCnt. In the future, this component should probably be self-sufficient.
renderDates:function(){this.el.html(this.renderHtml()),this.colEls=this.el.find(".fc-day"),this.slatContainerEl=this.el.find(".fc-slats"),this.slatEls=this.slatContainerEl.find("tr"),this.colCoordCache=new lb({els:this.colEls,isHorizontal:!0}),this.slatCoordCache=new lb({els:this.slatEls,isVertical:!0}),this.renderContentSkeleton()},
// Renders the basic HTML skeleton for the grid
renderHtml:function(){// row=0
return'<div class="fc-bg"><table>'+this.renderBgTrHtml(0)+'</table></div><div class="fc-slats"><table>'+this.renderSlatRowHtml()+"</table></div>"},
// Generates the HTML for the horizontal "slats" that run width-wise. Has a time axis on a side. Depends on RTL.
renderSlatRowHtml:function(){
// Calculate the time for each slot
for(var a,c,d,e=this.view,f=this.isRTL,g="",h=b.duration(+this.minTime);h<this.maxTime;)a=this.start.clone().time(h),c=fa(P(h,this.labelInterval)),d='<td class="fc-axis fc-time '+e.widgetContentClass+'" '+e.axisStyleAttr()+">"+(c?"<span>"+aa(a.format(this.labelFormat))+"</span>":"")+"</td>",g+='<tr data-time="'+a.format("HH:mm:ss")+'"'+(c?"":' class="fc-minor"')+">"+(f?"":d)+'<td class="'+e.widgetContentClass+'"/>'+(f?d:"")+"</tr>",h.add(this.slotDuration);return g},/* Options
	------------------------------------------------------------------------------------------------------------------*/
// Parses various options into properties of this object
processOptions:function(){var c,d=this.view,e=d.opt("slotDuration"),f=d.opt("snapDuration");e=b.duration(e),f=f?b.duration(f):e,this.slotDuration=e,this.snapDuration=f,this.snapsPerSlot=e/f,this.minResizeDuration=f,this.minTime=b.duration(d.opt("minTime")),this.maxTime=b.duration(d.opt("maxTime")),c=d.opt("slotLabelFormat"),a.isArray(c)&&(c=c[c.length-1]),this.labelFormat=c||d.opt("axisFormat")||d.opt("smallTimeFormat"),c=d.opt("slotLabelInterval"),this.labelInterval=c?b.duration(c):this.computeLabelInterval(e)},
// Computes an automatic value for slotLabelInterval
computeLabelInterval:function(a){var c,d,e;
// find the smallest stock label interval that results in more than one slots-per-label
for(c=Jb.length-1;c>=0;c--)if(d=b.duration(Jb[c]),e=P(d,a),fa(e)&&e>1)return d;return b.duration(a)},
// Computes a default event time formatting string if `timeFormat` is not explicitly defined
computeEventTimeFormat:function(){return this.view.opt("noMeridiemTimeFormat")},
// Computes a default `displayEventEnd` value if one is not expliclty defined
computeDisplayEventEnd:function(){return!0},/* Hit System
	------------------------------------------------------------------------------------------------------------------*/
prepareHits:function(){this.colCoordCache.build(),this.slatCoordCache.build()},releaseHits:function(){this.colCoordCache.clear()},queryHit:function(a,b){var c=this.snapsPerSlot,d=this.colCoordCache,e=this.slatCoordCache,f=d.getHorizontalIndex(a),g=e.getVerticalIndex(b);if(null!=f&&null!=g){var h=e.getTopOffset(g),i=e.getHeight(g),j=(b-h)/i,k=Math.floor(j*c),l=g*c+k,m=h+k/c*i,n=h+(k+1)/c*i;return{col:f,snap:l,component:this,// needed unfortunately :(
left:d.getLeftOffset(f),right:d.getRightOffset(f),top:m,bottom:n}}},getHitSpan:function(a){var b,c=this.getCellDate(0,a.col),d=this.computeSnapTime(a.snap);return c.time(d),b=c.clone().add(this.snapDuration),{start:c,end:b}},getHitEl:function(a){return this.colEls.eq(a.col)},/* Dates
	------------------------------------------------------------------------------------------------------------------*/
rangeUpdated:function(){this.updateDayTable()},
// Given a row number of the grid, representing a "snap", returns a time (Duration) from its start-of-day
computeSnapTime:function(a){return b.duration(this.minTime+this.snapDuration*a)},
// Slices up the given span (unzoned start/end with other misc data) into an array of segments
spanToSegs:function(a){var b,c=this.sliceRangeByTimes(a);for(b=0;b<c.length;b++)this.isRTL?c[b].col=this.daysPerRow-1-c[b].dayIndex:c[b].col=c[b].dayIndex;return c},sliceRangeByTimes:function(a){var b,c,d,e,f=[];for(c=0;c<this.daysPerRow;c++)d=this.dayDates[c].clone(),e={start:d.clone().time(this.minTime),end:d.clone().time(this.maxTime)},b=I(a,e),b&&(b.dayIndex=c,f.push(b));return f},/* Coordinates
	------------------------------------------------------------------------------------------------------------------*/
updateSize:function(a){// NOT a standard Grid method
this.slatCoordCache.build(),a&&this.updateSegVerticals([].concat(this.fgSegs||[],this.bgSegs||[],this.businessSegs||[]))},getTotalSlatHeight:function(){return this.slatContainerEl.outerHeight()},
// Computes the top coordinate, relative to the bounds of the grid, of the given date.
// A `startOfDayDate` must be given for avoiding ambiguity over how to treat midnight.
computeDateTop:function(a,c){return this.computeTimeTop(b.duration(a-c.clone().stripTime()))},
// Computes the top coordinate, relative to the bounds of the grid, of the given time (a Duration).
computeTimeTop:function(a){var b,c,d=this.slatEls.length,e=(a-this.minTime)/this.slotDuration;
// compute a floating-point number for how many slats should be progressed through.
// from 0 to number of slats (inclusive)
// constrained because minTime/maxTime might be customized.
// an integer index of the furthest whole slat
// from 0 to number slats (*exclusive*, so len-1)
// how much further through the slatIndex slat (from 0.0-1.0) must be covered in addition.
// could be 1.0 if slatCoverage is covering *all* the slots
return e=Math.max(0,e),e=Math.min(d,e),b=Math.floor(e),b=Math.min(b,d-1),c=e-b,this.slatCoordCache.getTopPosition(b)+this.slatCoordCache.getHeight(b)*c},/* Event Drag Visualization
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of an event being dragged over the specified date(s).
// A returned value of `true` signals that a mock "helper" event has been rendered.
renderDrag:function(a,b){
// otherwise, just render a highlight
return b?this.renderEventLocationHelper(a,b):void this.renderHighlight(this.eventToSpan(a))},
// Unrenders any visual indication of an event being dragged
unrenderDrag:function(){this.unrenderHelper(),this.unrenderHighlight()},/* Event Resize Visualization
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of an event being resized
renderEventResize:function(a,b){return this.renderEventLocationHelper(a,b)},
// Unrenders any visual indication of an event being resized
unrenderEventResize:function(){this.unrenderHelper()},/* Event Helper
	------------------------------------------------------------------------------------------------------------------*/
// Renders a mock "helper" event. `sourceSeg` is the original segment object and might be null (an external drag)
renderHelper:function(a,b){return this.renderHelperSegs(this.eventToSegs(a),b)},
// Unrenders any mock helper event
unrenderHelper:function(){this.unrenderHelperSegs()},/* Business Hours
	------------------------------------------------------------------------------------------------------------------*/
renderBusinessHours:function(){var a=this.view.calendar.getBusinessHoursEvents(),b=this.eventsToSegs(a);this.renderBusinessSegs(b)},unrenderBusinessHours:function(){this.unrenderBusinessSegs()},/* Now Indicator
	------------------------------------------------------------------------------------------------------------------*/
getNowIndicatorUnit:function(){return"minute"},renderNowIndicator:function(b){
// seg system might be overkill, but it handles scenario where line needs to be rendered
//  more than once because of columns with the same date (resources columns for example)
var c,d=this.spanToSegs({start:b,end:b}),e=this.computeDateTop(b,b),f=[];
// render lines within the columns
for(c=0;c<d.length;c++)f.push(a('<div class="fc-now-indicator fc-now-indicator-line"></div>').css("top",e).appendTo(this.colContainerEls.eq(d[c].col))[0]);
// render an arrow over the axis
d.length>0&&// is the current time in view?
f.push(a('<div class="fc-now-indicator fc-now-indicator-arrow"></div>').css("top",e).appendTo(this.el.find(".fc-content-skeleton"))[0]),this.nowIndicatorEls=a(f)},unrenderNowIndicator:function(){this.nowIndicatorEls&&(this.nowIndicatorEls.remove(),this.nowIndicatorEls=null)},/* Selection
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of a selection. Overrides the default, which was to simply render a highlight.
renderSelection:function(a){this.view.opt("selectHelper")?// this setting signals that a mock helper event should be rendered
// normally acceps an eventLocation, span has a start/end, which is good enough
this.renderEventLocationHelper(a):this.renderHighlight(a)},
// Unrenders any visual indication of a selection
unrenderSelection:function(){this.unrenderHelper(),this.unrenderHighlight()},/* Highlight
	------------------------------------------------------------------------------------------------------------------*/
renderHighlight:function(a){this.renderHighlightSegs(this.spanToSegs(a))},unrenderHighlight:function(){this.unrenderHighlightSegs()}});/* Methods for rendering SEGMENTS, pieces of content that live on the view
 ( this file is no longer just for events )
----------------------------------------------------------------------------------------------------------------------*/
sb.mixin({colContainerEls:null,// containers for each column
// inner-containers for each column where different types of segs live
fgContainerEls:null,bgContainerEls:null,helperContainerEls:null,highlightContainerEls:null,businessContainerEls:null,
// arrays of different types of displayed segments
fgSegs:null,bgSegs:null,helperSegs:null,highlightSegs:null,businessSegs:null,
// Renders the DOM that the view's content will live in
renderContentSkeleton:function(){var b,c,d="";for(b=0;b<this.colCnt;b++)d+='<td><div class="fc-content-col"><div class="fc-event-container fc-helper-container"></div><div class="fc-event-container"></div><div class="fc-highlight-container"></div><div class="fc-bgevent-container"></div><div class="fc-business-container"></div></div></td>';c=a('<div class="fc-content-skeleton"><table><tr>'+d+"</tr></table></div>"),this.colContainerEls=c.find(".fc-content-col"),this.helperContainerEls=c.find(".fc-helper-container"),this.fgContainerEls=c.find(".fc-event-container:not(.fc-helper-container)"),this.bgContainerEls=c.find(".fc-bgevent-container"),this.highlightContainerEls=c.find(".fc-highlight-container"),this.businessContainerEls=c.find(".fc-business-container"),this.bookendCells(c.find("tr")),this.el.append(c)},/* Foreground Events
	------------------------------------------------------------------------------------------------------------------*/
renderFgSegs:function(a){return a=this.renderFgSegsIntoContainers(a,this.fgContainerEls),this.fgSegs=a,a},unrenderFgSegs:function(){this.unrenderNamedSegs("fgSegs")},/* Foreground Helper Events
	------------------------------------------------------------------------------------------------------------------*/
renderHelperSegs:function(b,c){var d,e,f,g=[];
// Try to make the segment that is in the same row as sourceSeg look the same
for(b=this.renderFgSegsIntoContainers(b,this.helperContainerEls),d=0;d<b.length;d++)e=b[d],c&&c.col===e.col&&(f=c.el,e.el.css({left:f.css("left"),right:f.css("right"),"margin-left":f.css("margin-left"),"margin-right":f.css("margin-right")})),g.push(e.el[0]);return this.helperSegs=b,a(g)},unrenderHelperSegs:function(){this.unrenderNamedSegs("helperSegs")},/* Background Events
	------------------------------------------------------------------------------------------------------------------*/
renderBgSegs:function(a){// TODO: old fill system
return a=this.renderFillSegEls("bgEvent",a),this.updateSegVerticals(a),this.attachSegsByCol(this.groupSegsByCol(a),this.bgContainerEls),this.bgSegs=a,a},unrenderBgSegs:function(){this.unrenderNamedSegs("bgSegs")},/* Highlight
	------------------------------------------------------------------------------------------------------------------*/
renderHighlightSegs:function(a){a=this.renderFillSegEls("highlight",a),this.updateSegVerticals(a),this.attachSegsByCol(this.groupSegsByCol(a),this.highlightContainerEls),this.highlightSegs=a},unrenderHighlightSegs:function(){this.unrenderNamedSegs("highlightSegs")},/* Business Hours
	------------------------------------------------------------------------------------------------------------------*/
renderBusinessSegs:function(a){a=this.renderFillSegEls("businessHours",a),this.updateSegVerticals(a),this.attachSegsByCol(this.groupSegsByCol(a),this.businessContainerEls),this.businessSegs=a},unrenderBusinessSegs:function(){this.unrenderNamedSegs("businessSegs")},/* Seg Rendering Utils
	------------------------------------------------------------------------------------------------------------------*/
// Given a flat array of segments, return an array of sub-arrays, grouped by each segment's col
groupSegsByCol:function(a){var b,c=[];for(b=0;b<this.colCnt;b++)c.push([]);for(b=0;b<a.length;b++)c[a[b].col].push(a[b]);return c},
// Given segments grouped by column, insert the segments' elements into a parallel array of container
// elements, each living within a column.
attachSegsByCol:function(a,b){var c,d,e;for(c=0;c<this.colCnt;c++)for(d=a[c],e=0;e<d.length;e++)b.eq(c).append(d[e].el)},
// Given the name of a property of `this` object, assumed to be an array of segments,
// loops through each segment and removes from DOM. Will null-out the property afterwards.
unrenderNamedSegs:function(a){var b,c=this[a];if(c){for(b=0;b<c.length;b++)c[b].el.remove();this[a]=null}},/* Foreground Event Rendering Utils
	------------------------------------------------------------------------------------------------------------------*/
// Given an array of foreground segments, render a DOM element for each, computes position,
// and attaches to the column inner-container elements.
renderFgSegsIntoContainers:function(a,b){var c,d;for(a=this.renderFgSegEls(a),c=this.groupSegsByCol(a),d=0;d<this.colCnt;d++)this.updateFgSegCoords(c[d]);return this.attachSegsByCol(c,b),a},
// Renders the HTML for a single event segment's default rendering
fgSegHtml:function(a,b){var c,d,e,f=this.view,g=a.event,h=f.isEventDraggable(g),i=!b&&a.isStart&&f.isEventResizableFromStart(g),j=!b&&a.isEnd&&f.isEventResizableFromEnd(g),k=this.getSegClasses(a,h,i||j),l=ca(this.getSegSkinCss(a));// just the start time text
// if the event appears to span more than one day...
// Don't display time text on segments that run entirely through a day.
// That would appear as midnight-midnight and would look dumb.
// Otherwise, display the time text for the *segment's* times (like 6pm-midnight or midnight-10am)
// Display the normal time text for the *event's* times
/* TODO: write CSS for this
				(isResizableFromStart ?
					'<div class="fc-resizer fc-start-resizer" />' :
					''
					) +
				*/
return k.unshift("fc-time-grid-event","fc-v-event"),f.isMultiDayEvent(g)?(a.isStart||a.isEnd)&&(c=this.getEventTimeText(a),d=this.getEventTimeText(a,"LT"),e=this.getEventTimeText(a,null,!1)):(c=this.getEventTimeText(g),d=this.getEventTimeText(g,"LT"),e=this.getEventTimeText(g,null,!1)),'<a class="'+k.join(" ")+'"'+(g.url?' href="'+aa(g.url)+'"':"")+(l?' style="'+l+'"':"")+'><div class="fc-content">'+(c?'<div class="fc-time" data-start="'+aa(e)+'" data-full="'+aa(d)+'"><span>'+aa(c)+"</span></div>":"")+(g.title?'<div class="fc-title">'+aa(g.title)+"</div>":"")+'</div><div class="fc-bg"/>'+(j?'<div class="fc-resizer fc-end-resizer" />':"")+"</a>"},/* Seg Position Utils
	------------------------------------------------------------------------------------------------------------------*/
// Refreshes the CSS top/bottom coordinates for each segment element.
// Works when called after initial render, after a window resize/zoom for example.
updateSegVerticals:function(a){this.computeSegVerticals(a),this.assignSegVerticals(a)},
// For each segment in an array, computes and assigns its top and bottom properties
computeSegVerticals:function(a){var b,c;for(b=0;b<a.length;b++)c=a[b],c.top=this.computeDateTop(c.start,c.start),c.bottom=this.computeDateTop(c.end,c.start)},
// Given segments that already have their top/bottom properties computed, applies those values to
// the segments' elements.
assignSegVerticals:function(a){var b,c;for(b=0;b<a.length;b++)c=a[b],c.el.css(this.generateSegVerticalCss(c))},
// Generates an object with CSS properties for the top/bottom coordinates of a segment element
generateSegVerticalCss:function(a){return{top:a.top,bottom:-a.bottom}},/* Foreground Event Positioning Utils
	------------------------------------------------------------------------------------------------------------------*/
// Given segments that are assumed to all live in the *same column*,
// compute their verical/horizontal coordinates and assign to their elements.
updateFgSegCoords:function(a){this.computeSegVerticals(a),// horizontals relies on this
this.computeFgSegHorizontals(a),// compute horizontal coordinates, z-index's, and reorder the array
this.assignSegVerticals(a),this.assignFgSegHorizontals(a)},
// Given an array of segments that are all in the same column, sets the backwardCoord and forwardCoord on each.
// NOTE: Also reorders the given array by date!
computeFgSegHorizontals:function(a){var b,c,d;if(this.sortEventSegs(a),b=Ia(a),Ja(b),c=b[0]){for(d=0;d<c.length;d++)Ka(c[d]);for(d=0;d<c.length;d++)this.computeFgSegForwardBack(c[d],0,0)}},
// Calculate seg.forwardCoord and seg.backwardCoord for the segment, where both values range
// from 0 to 1. If the calendar is left-to-right, the seg.backwardCoord maps to "left" and
// seg.forwardCoord maps to "right" (via percentage). Vice-versa if the calendar is right-to-left.
//
// The segment might be part of a "series", which means consecutive segments with the same pressure
// who's width is unknown until an edge has been hit. `seriesBackwardPressure` is the number of
// segments behind this one in the current series, and `seriesBackwardCoord` is the starting
// coordinate of the first segment in the series.
computeFgSegForwardBack:function(a,b,c){var d,e=a.forwardSegs;if(void 0===a.forwardCoord)// # of segments in the series
// use this segment's coordinates to computed the coordinates of the less-pressurized
// forward segments
for(// not already computed
e.length?(
// sort highest pressure first
this.sortForwardSegs(e),
// this segment's forwardCoord will be calculated from the backwardCoord of the
// highest-pressure forward segment.
this.computeFgSegForwardBack(e[0],b+1,c),a.forwardCoord=e[0].backwardCoord):
// if there are no forward segments, this segment should butt up against the edge
a.forwardCoord=1,
// calculate the backwardCoord from the forwardCoord. consider the series
a.backwardCoord=a.forwardCoord-(a.forwardCoord-c)/(// available width for series
b+1),d=0;d<e.length;d++)this.computeFgSegForwardBack(e[d],0,a.forwardCoord)},sortForwardSegs:function(a){a.sort(ga(this,"compareForwardSegs"))},
// A cmp function for determining which forward segment to rely on more when computing coordinates.
compareForwardSegs:function(a,b){
// put higher-pressure first
// put segments that are closer to initial edge first (and favor ones with no coords yet)
// do normal sorting...
return b.forwardPressure-a.forwardPressure||(a.backwardCoord||0)-(b.backwardCoord||0)||this.compareEventSegs(a,b)},
// Given foreground event segments that have already had their position coordinates computed,
// assigns position-related CSS values to their elements.
assignFgSegHorizontals:function(a){var b,c;for(b=0;b<a.length;b++)c=a[b],c.el.css(this.generateFgSegHorizontalCss(c)),c.bottom-c.top<30&&c.el.addClass("fc-short")},
// Generates an object with CSS properties/values that should be applied to an event segment element.
// Contains important positioning-related properties that should be applied to any event element, customized or not.
generateFgSegHorizontalCss:function(a){var b,c,d=this.view.opt("slotEventOverlap"),e=a.backwardCoord,f=a.forwardCoord,g=this.generateSegVerticalCss(a);// amount of space from right edge, a fraction of the total width
// double the width, but don't go beyond the maximum forward coordinate (1.0)
// convert from 0-base to 1-based
// add padding to the edge so that forward stacked events don't cover the resizer's icon
return d&&(f=Math.min(1,e+2*(f-e))),this.isRTL?(b=1-f,c=e):(b=e,c=1-f),g.zIndex=a.level+1,g.left=100*b+"%",g.right=100*c+"%",d&&a.forwardPressure&&(g[this.isRTL?"marginLeft":"marginRight"]=20),g}});/* An abstract class from which other views inherit from
----------------------------------------------------------------------------------------------------------------------*/
var tb=Ta.View=va.extend(ib,jb,{type:null,// subclass' view name (string)
name:null,// deprecated. use `type` instead
title:null,// the text that will be displayed in the header's title
calendar:null,// owner Calendar object
options:null,// hash containing all options. already merged with view-specific-options
el:null,// the view's containing element. set by Calendar
displaying:null,// a promise representing the state of rendering. null if no render requested
isSkeletonRendered:!1,isEventsRendered:!1,
// range the view is actually displaying (moments)
start:null,end:null,// exclusive
// range the view is formally responsible for (moments)
// may be different from start/end. for example, a month view might have 1st-31st, excluding padded dates
intervalStart:null,intervalEnd:null,// exclusive
intervalDuration:null,intervalUnit:null,// name of largest unit being displayed, like "month" or "week"
isRTL:!1,isSelected:!1,// boolean whether a range of time is user-selected or not
selectedEvent:null,eventOrderSpecs:null,// criteria for ordering events when they have same date/time
// classNames styled by jqui themes
widgetHeaderClass:null,widgetContentClass:null,highlightStateClass:null,
// for date utils, computed from options
nextDayThreshold:null,isHiddenDayHash:null,
// now indicator
isNowIndicatorRendered:null,initialNowDate:null,// result first getNow call
initialNowQueriedMs:null,// ms time the getNow was called
nowIndicatorTimeoutID:null,// for refresh timing of now indicator
nowIndicatorIntervalID:null,// "
constructor:function(a,c,d,e){this.calendar=a,this.type=this.name=c,// .name is deprecated
this.options=d,this.intervalDuration=e||b.duration(1,"day"),this.nextDayThreshold=b.duration(this.opt("nextDayThreshold")),this.initThemingProps(),this.initHiddenDays(),this.isRTL=this.opt("isRTL"),this.eventOrderSpecs=E(this.opt("eventOrder")),this.initialize()},
// A good place for subclasses to initialize member variables
initialize:function(){},
// Retrieves an option with the given name
opt:function(a){return this.options[a]},
// Triggers handlers that are view-related. Modifies args before passing to calendar.
trigger:function(a,b){// arguments beyond thisObj are passed along
var c=this.calendar;// arguments beyond thisObj
return c.trigger.apply(c,[a,b||this].concat(Array.prototype.slice.call(arguments,2),[this]))},/* Dates
	------------------------------------------------------------------------------------------------------------------*/
// Updates all internal dates to center around the given current unzoned date.
setDate:function(a){this.setRange(this.computeRange(a))},
// Updates all internal dates for displaying the given unzoned range.
setRange:function(b){a.extend(this,b),// assigns every property to this object's member variables
this.updateTitle()},
// Given a single current unzoned date, produce information about what range to display.
// Subclasses can override. Must return all properties.
computeRange:function(a){var b,c,d=M(this.intervalDuration),e=a.clone().startOf(d),f=e.clone().add(this.intervalDuration);// exclusively move backwards
// normalize the range's time-ambiguity
// whole-days?
// needs to have a time?
return/year|month|week|day/.test(d)?(e.stripTime(),f.stripTime()):(e.hasTime()||(e=this.calendar.time(0)),f.hasTime()||(f=this.calendar.time(0))),b=e.clone(),b=this.skipHiddenDays(b),c=f.clone(),c=this.skipHiddenDays(c,-1,!0),{intervalUnit:d,intervalStart:e,intervalEnd:f,start:b,end:c}},
// Computes the new date when the user hits the prev button, given the current date
computePrevDate:function(a){return this.massageCurrentDate(a.clone().startOf(this.intervalUnit).subtract(this.intervalDuration),-1)},
// Computes the new date when the user hits the next button, given the current date
computeNextDate:function(a){return this.massageCurrentDate(a.clone().startOf(this.intervalUnit).add(this.intervalDuration))},
// Given an arbitrarily calculated current date of the calendar, returns a date that is ensured to be completely
// visible. `direction` is optional and indicates which direction the current date was being
// incremented or decremented (1 or -1).
massageCurrentDate:function(a,b){return this.intervalDuration.as("days")<=1&&this.isHiddenDay(a)&&(a=this.skipHiddenDays(a,b),a.startOf("day")),a},/* Title and Date Formatting
	------------------------------------------------------------------------------------------------------------------*/
// Sets the view's title property to the most updated computed value
updateTitle:function(){this.title=this.computeTitle()},
// Computes what the title at the top of the calendar should be for this view
computeTitle:function(){return this.formatRange({
// in case intervalStart/End has a time, make sure timezone is correct
start:this.calendar.applyTimezone(this.intervalStart),end:this.calendar.applyTimezone(this.intervalEnd)},this.opt("titleFormat")||this.computeTitleFormat(),this.opt("titleRangeSeparator"))},
// Generates the format string that should be used to generate the title for the current date range.
// Attempts to compute the most appropriate format if not explicitly specified with `titleFormat`.
computeTitleFormat:function(){return"year"==this.intervalUnit?"YYYY":"month"==this.intervalUnit?this.opt("monthYearFormat"):this.intervalDuration.as("days")>1?"ll":"LL"},
// Utility for formatting a range. Accepts a range object, formatting string, and optional separator.
// Displays all-day ranges naturally, with an inclusive end. Takes the current isRTL into account.
// The timezones of the dates within `range` will be respected.
formatRange:function(a,b,c){var d=a.end;// all-day?
return d.hasTime()||(d=d.clone().subtract(1)),qa(a.start,d,b,c,this.opt("isRTL"))},/* Rendering
	------------------------------------------------------------------------------------------------------------------*/
// Sets the container element that the view should render inside of.
// Does other DOM-related initializations.
setElement:function(a){this.el=a,this.bindGlobalHandlers()},
// Removes the view's container element from the DOM, clearing any content beforehand.
// Undoes any other DOM-related attachments.
removeElement:function(){this.clear(),// clears all content
// clean up the skeleton
this.isSkeletonRendered&&(this.unrenderSkeleton(),this.isSkeletonRendered=!1),this.unbindGlobalHandlers(),this.el.remove()},
// Does everything necessary to display the view centered around the given unzoned date.
// Does every type of rendering EXCEPT rendering events.
// Is asychronous and returns a promise.
display:function(b){var c=this,d=null;return this.displaying&&(d=this.queryScroll()),this.calendar.freezeContentHeight(),this.clear().then(function(){// clear the content first (async)
return c.displaying=a.when(c.displayView(b)).then(function(){c.forceScroll(c.computeInitialScroll(d)),c.calendar.unfreezeContentHeight(),c.triggerRender()})})},
// Does everything necessary to clear the content of the view.
// Clears dates and events. Does not clear the skeleton.
// Is asychronous and returns a promise.
clear:function(){var b=this,c=this.displaying;return c?c.then(function(){// wait for the display to finish
return b.displaying=null,b.clearEvents(),b.clearView()}):a.when()},
// Displays the view's non-event content, such as date-related content or anything required by events.
// Renders the view's non-content skeleton if necessary.
// Can be asynchronous and return a promise.
displayView:function(a){this.isSkeletonRendered||(this.renderSkeleton(),this.isSkeletonRendered=!0),a&&this.setDate(a),this.render&&this.render(),this.renderDates(),this.updateSize(),this.renderBusinessHours(),// might need coordinates, so should go after updateSize()
this.startNowIndicator()},
// Unrenders the view content that was rendered in displayView.
// Can be asynchronous and return a promise.
clearView:function(){this.unselect(),this.stopNowIndicator(),this.triggerUnrender(),this.unrenderBusinessHours(),this.unrenderDates(),this.destroy&&this.destroy()},
// Renders the basic structure of the view before any content is rendered
renderSkeleton:function(){},
// Unrenders the basic structure of the view
unrenderSkeleton:function(){},
// Renders the view's date-related content.
// Assumes setRange has already been called and the skeleton has already been rendered.
renderDates:function(){},
// Unrenders the view's date-related content
unrenderDates:function(){},
// Signals that the view's content has been rendered
triggerRender:function(){this.trigger("viewRender",this,this,this.el)},
// Signals that the view's content is about to be unrendered
triggerUnrender:function(){this.trigger("viewDestroy",this,this,this.el)},
// Binds DOM handlers to elements that reside outside the view container, such as the document
bindGlobalHandlers:function(){this.listenTo(a(document),"mousedown",this.handleDocumentMousedown),this.listenTo(a(document),"touchstart",this.handleDocumentTouchStart),this.listenTo(a(document),"touchend",this.handleDocumentTouchEnd)},
// Unbinds DOM handlers from elements that reside outside the view container
unbindGlobalHandlers:function(){this.stopListeningTo(a(document))},
// Initializes internal variables related to theming
initThemingProps:function(){var a=this.opt("theme")?"ui":"fc";this.widgetHeaderClass=a+"-widget-header",this.widgetContentClass=a+"-widget-content",this.highlightStateClass=a+"-state-highlight"},/* Business Hours
	------------------------------------------------------------------------------------------------------------------*/
// Renders business-hours onto the view. Assumes updateSize has already been called.
renderBusinessHours:function(){},
// Unrenders previously-rendered business-hours
unrenderBusinessHours:function(){},/* Now Indicator
	------------------------------------------------------------------------------------------------------------------*/
// Immediately render the current time indicator and begins re-rendering it at an interval,
// which is defined by this.getNowIndicatorUnit().
// TODO: somehow do this for the current whole day's background too
startNowIndicator:function(){var a,c,d,e=this;// ms wait value
this.opt("nowIndicator")&&(a=this.getNowIndicatorUnit(),a&&(c=ga(this,"updateNowIndicator"),this.initialNowDate=this.calendar.getNow(),this.initialNowQueriedMs=+new Date,this.renderNowIndicator(this.initialNowDate),this.isNowIndicatorRendered=!0,d=this.initialNowDate.clone().startOf(a).add(1,a)-this.initialNowDate,this.nowIndicatorTimeoutID=setTimeout(function(){e.nowIndicatorTimeoutID=null,c(),d=+b.duration(1,a),d=Math.max(100,d),e.nowIndicatorIntervalID=setInterval(c,d)},d)))},
// rerenders the now indicator, computing the new current time from the amount of time that has passed
// since the initial getNow call.
updateNowIndicator:function(){this.isNowIndicatorRendered&&(this.unrenderNowIndicator(),this.renderNowIndicator(this.initialNowDate.clone().add(new Date-this.initialNowQueriedMs)))},
// Immediately unrenders the view's current time indicator and stops any re-rendering timers.
// Won't cause side effects if indicator isn't rendered.
stopNowIndicator:function(){this.isNowIndicatorRendered&&(this.nowIndicatorTimeoutID&&(clearTimeout(this.nowIndicatorTimeoutID),this.nowIndicatorTimeoutID=null),this.nowIndicatorIntervalID&&(clearTimeout(this.nowIndicatorIntervalID),this.nowIndicatorIntervalID=null),this.unrenderNowIndicator(),this.isNowIndicatorRendered=!1)},
// Returns a string unit, like 'second' or 'minute' that defined how often the current time indicator
// should be refreshed. If something falsy is returned, no time indicator is rendered at all.
getNowIndicatorUnit:function(){},
// Renders a current time indicator at the given datetime
renderNowIndicator:function(a){},
// Undoes the rendering actions from renderNowIndicator
unrenderNowIndicator:function(){},/* Dimensions
	------------------------------------------------------------------------------------------------------------------*/
// Refreshes anything dependant upon sizing of the container element of the grid
updateSize:function(a){var b;a&&(b=this.queryScroll()),this.updateHeight(a),this.updateWidth(a),this.updateNowIndicator(),a&&this.setScroll(b)},
// Refreshes the horizontal dimensions of the calendar
updateWidth:function(a){},
// Refreshes the vertical dimensions of the calendar
updateHeight:function(a){var b=this.calendar;// we poll the calendar for height information
this.setHeight(b.getSuggestedViewHeight(),b.isHeightAuto())},
// Updates the vertical dimensions of the calendar to the specified height.
// if `isAuto` is set to true, height becomes merely a suggestion and the view should use its "natural" height.
setHeight:function(a,b){},/* Scroller
	------------------------------------------------------------------------------------------------------------------*/
// Computes the initial pre-configured scroll state prior to allowing the user to change it.
// Given the scroll state from the previous rendering. If first time rendering, given null.
computeInitialScroll:function(a){return 0},
// Retrieves the view's current natural scroll state. Can return an arbitrary format.
queryScroll:function(){},
// Sets the view's scroll state. Will accept the same format computeInitialScroll and queryScroll produce.
setScroll:function(a){},
// Sets the scroll state, making sure to overcome any predefined scroll value the browser has in mind
forceScroll:function(a){var b=this;this.setScroll(a),setTimeout(function(){b.setScroll(a)},0)},/* Event Elements / Segments
	------------------------------------------------------------------------------------------------------------------*/
// Does everything necessary to display the given events onto the current view
displayEvents:function(a){var b=this.queryScroll();this.clearEvents(),this.renderEvents(a),this.isEventsRendered=!0,this.setScroll(b),this.triggerEventRender()},
// Does everything necessary to clear the view's currently-rendered events
clearEvents:function(){var a;this.isEventsRendered&&(a=this.queryScroll(),this.triggerEventUnrender(),this.destroyEvents&&this.destroyEvents(),this.unrenderEvents(),this.setScroll(a),this.isEventsRendered=!1)},
// Renders the events onto the view.
renderEvents:function(a){},
// Removes event elements from the view.
unrenderEvents:function(){},
// Signals that all events have been rendered
triggerEventRender:function(){this.renderedEventSegEach(function(a){this.trigger("eventAfterRender",a.event,a.event,a.el)}),this.trigger("eventAfterAllRender")},
// Signals that all event elements are about to be removed
triggerEventUnrender:function(){this.renderedEventSegEach(function(a){this.trigger("eventDestroy",a.event,a.event,a.el)})},
// Given an event and the default element used for rendering, returns the element that should actually be used.
// Basically runs events and elements through the eventRender hook.
resolveEventEl:function(b,c){var d=this.trigger("eventRender",b,b,c);// means don't render at all
return d===!1?c=null:d&&d!==!0&&(c=a(d)),c},
// Hides all rendered event segments linked to the given event
showEvent:function(a){this.renderedEventSegEach(function(a){a.el.css("visibility","")},a)},
// Shows all rendered event segments linked to the given event
hideEvent:function(a){this.renderedEventSegEach(function(a){a.el.css("visibility","hidden")},a)},
// Iterates through event segments that have been rendered (have an el). Goes through all by default.
// If the optional `event` argument is specified, only iterates through segments linked to that event.
// The `this` value of the callback function will be the view.
renderedEventSegEach:function(a,b){var c,d=this.getEventSegs();for(c=0;c<d.length;c++)b&&d[c].event._id!==b._id||d[c].el&&a.call(this,d[c])},
// Retrieves all the rendered segment objects for the view
getEventSegs:function(){
// subclasses must implement
return[]},/* Event Drag-n-Drop
	------------------------------------------------------------------------------------------------------------------*/
// Computes if the given event is allowed to be dragged by the user
isEventDraggable:function(a){var b=a.source||{};return _(a.startEditable,b.startEditable,this.opt("eventStartEditable"),a.editable,b.editable,this.opt("editable"))},
// Must be called when an event in the view is dropped onto new location.
// `dropLocation` is an object that contains the new zoned start/end/allDay values for the event.
reportEventDrop:function(a,b,c,d,e){var f=this.calendar,g=f.mutateEvent(a,b,c),h=function(){g.undo(),f.reportEventChange()};this.triggerEventDrop(a,g.dateDelta,h,d,e),f.reportEventChange()},
// Triggers event-drop handlers that have subscribed via the API
triggerEventDrop:function(a,b,c,d,e){this.trigger("eventDrop",d[0],a,b,c,e,{})},/* External Element Drag-n-Drop
	------------------------------------------------------------------------------------------------------------------*/
// Must be called when an external element, via jQuery UI, has been dropped onto the calendar.
// `meta` is the parsed data that has been embedded into the dragging event.
// `dropLocation` is an object that contains the new zoned start/end/allDay values for the event.
reportExternalDrop:function(b,c,d,e,f){var g,h,i=b.eventProps;
// Try to build an event object and render it. TODO: decouple the two
i&&(g=a.extend({},i,c),h=this.calendar.renderEvent(g,b.stick)[0]),this.triggerExternalDrop(h,c,d,e,f)},
// Triggers external-drop handlers that have subscribed via the API
triggerExternalDrop:function(a,b,c,d,e){
// trigger 'drop' regardless of whether element represents an event
this.trigger("drop",c[0],b.start,d,e),a&&this.trigger("eventReceive",null,a)},/* Drag-n-Drop Rendering (for both events and external elements)
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of a event or external-element drag over the given drop zone.
// If an external-element, seg will be `null`.
// Must return elements used for any mock events.
renderDrag:function(a,b){},
// Unrenders a visual indication of an event or external-element being dragged.
unrenderDrag:function(){},/* Event Resizing
	------------------------------------------------------------------------------------------------------------------*/
// Computes if the given event is allowed to be resized from its starting edge
isEventResizableFromStart:function(a){return this.opt("eventResizableFromStart")&&this.isEventResizable(a)},
// Computes if the given event is allowed to be resized from its ending edge
isEventResizableFromEnd:function(a){return this.isEventResizable(a)},
// Computes if the given event is allowed to be resized by the user at all
isEventResizable:function(a){var b=a.source||{};return _(a.durationEditable,b.durationEditable,this.opt("eventDurationEditable"),a.editable,b.editable,this.opt("editable"))},
// Must be called when an event in the view has been resized to a new length
reportEventResize:function(a,b,c,d,e){var f=this.calendar,g=f.mutateEvent(a,b,c),h=function(){g.undo(),f.reportEventChange()};this.triggerEventResize(a,g.durationDelta,h,d,e),f.reportEventChange()},
// Triggers event-resize handlers that have subscribed via the API
triggerEventResize:function(a,b,c,d,e){this.trigger("eventResize",d[0],a,b,c,e,{})},/* Selection (time range)
	------------------------------------------------------------------------------------------------------------------*/
// Selects a date span on the view. `start` and `end` are both Moments.
// `ev` is the native mouse event that begin the interaction.
select:function(a,b){this.unselect(b),this.renderSelection(a),this.reportSelection(a,b)},
// Renders a visual indication of the selection
renderSelection:function(a){},
// Called when a new selection is made. Updates internal state and triggers handlers.
reportSelection:function(a,b){this.isSelected=!0,this.triggerSelect(a,b)},
// Triggers handlers to 'select'
triggerSelect:function(a,b){this.trigger("select",null,this.calendar.applyTimezone(a.start),// convert to calendar's tz for external API
this.calendar.applyTimezone(a.end),// "
b)},
// Undoes a selection. updates in the internal state and triggers handlers.
// `ev` is the native mouse event that began the interaction.
unselect:function(a){this.isSelected&&(this.isSelected=!1,this.destroySelection&&this.destroySelection(),this.unrenderSelection(),this.trigger("unselect",null,a))},
// Unrenders a visual indication of selection
unrenderSelection:function(){},/* Event Selection
	------------------------------------------------------------------------------------------------------------------*/
selectEvent:function(a){this.selectedEvent&&this.selectedEvent===a||(this.unselectEvent(),this.renderedEventSegEach(function(a){a.el.addClass("fc-selected")},a),this.selectedEvent=a)},unselectEvent:function(){this.selectedEvent&&(this.renderedEventSegEach(function(a){a.el.removeClass("fc-selected")},this.selectedEvent),this.selectedEvent=null)},isEventSelected:function(a){
// event references might change on refetchEvents(), while selectedEvent doesn't,
// so compare IDs
return this.selectedEvent&&this.selectedEvent._id===a._id},/* Mouse / Touch Unselecting (time range & event unselection)
	------------------------------------------------------------------------------------------------------------------*/
// TODO: move consistently to down/start or up/end?
handleDocumentMousedown:function(a){
// touch devices fire simulated mouse events on a "click".
// only process mousedown if we know this isn't a touch device.
!this.calendar.isTouch&&u(a)&&(this.processRangeUnselect(a),this.processEventUnselect(a))},handleDocumentTouchStart:function(a){this.processRangeUnselect(a)},handleDocumentTouchEnd:function(a){
// TODO: don't do this if because of touch-scrolling
this.processEventUnselect(a)},processRangeUnselect:function(b){var c;
// is there a time-range selection?
this.isSelected&&this.opt("unselectAuto")&&(c=this.opt("unselectCancel"),c&&a(b.target).closest(c).length||this.unselect(b))},processEventUnselect:function(b){this.selectedEvent&&(a(b.target).closest(".fc-selected").length||this.unselectEvent())},/* Day Click
	------------------------------------------------------------------------------------------------------------------*/
// Triggers handlers to 'dayClick'
// Span has start/end of the clicked area. Only the start is useful.
triggerDayClick:function(a,b,c){this.trigger("dayClick",b,this.calendar.applyTimezone(a.start),// convert to calendar's timezone for external API
c)},/* Date Utils
	------------------------------------------------------------------------------------------------------------------*/
// Initializes internal variables related to calculating hidden days-of-week
initHiddenDays:function(){var b,c=this.opt("hiddenDays")||[],d=[],e=0;for(this.opt("weekends")===!1&&c.push(0,6),b=0;7>b;b++)(d[b]=-1!==a.inArray(b,c))||e++;if(!e)throw"invalid hiddenDays";this.isHiddenDayHash=d},
// Is the current day hidden?
// `day` is a day-of-week index (0-6), or a Moment
isHiddenDay:function(a){return b.isMoment(a)&&(a=a.day()),this.isHiddenDayHash[a]},
// Incrementing the current day until it is no longer a hidden day, returning a copy.
// If the initial value of `date` is not a hidden day, don't do anything.
// Pass `isExclusive` as `true` if you are dealing with an end date.
// `inc` defaults to `1` (increment one day forward each time)
skipHiddenDays:function(a,b,c){var d=a.clone();for(b=b||1;this.isHiddenDayHash[(d.day()+(c?b:0)+7)%7];)d.add(b,"days");return d},
// Returns the date range of the full days the given range visually appears to occupy.
// Returns a new range object.
computeDayRange:function(a){var b,c=a.start.clone().stripTime(),d=a.end,e=null;// the beginning of the day the range exclusively ends
// # of milliseconds into `endDay`
// If the end time is actually inclusively part of the next day and is equal to or
// beyond the next day threshold, adjust the end to be the exclusive end of `endDay`.
// Otherwise, leaving it as inclusive will cause it to exclude `endDay`.
// If no end was specified, or if it is within `startDay` but not past nextDayThreshold,
// assign the default duration of one day.
return d&&(e=d.clone().stripTime(),b=+d.time(),b&&b>=this.nextDayThreshold&&e.add(1,"days")),(!d||c>=e)&&(e=c.clone().add(1,"days")),{start:c,end:e}},
// Does the given event visually appear to occupy more than one day?
isMultiDayEvent:function(a){var b=this.computeDayRange(a);// event is range-ish
return b.end.diff(b.start,"days")>1}}),ub=Ta.Scroller=va.extend({el:null,// the guaranteed outer element
scrollEl:null,// the element with the scrollbars
overflowX:null,overflowY:null,constructor:function(a){a=a||{},this.overflowX=a.overflowX||a.overflow||"auto",this.overflowY=a.overflowY||a.overflow||"auto"},render:function(){this.el=this.renderEl(),this.applyOverflow()},renderEl:function(){return this.scrollEl=a('<div class="fc-scroller"></div>')},
// sets to natural height, unlocks overflow
clear:function(){this.setHeight("auto"),this.applyOverflow()},destroy:function(){this.el.remove()},
// Overflow
// -----------------------------------------------------------------------------------------------------------------
applyOverflow:function(){this.scrollEl.css({"overflow-x":this.overflowX,"overflow-y":this.overflowY})},
// Causes any 'auto' overflow values to resolves to 'scroll' or 'hidden'.
// Useful for preserving scrollbar widths regardless of future resizes.
// Can pass in scrollbarWidths for optimization.
lockOverflow:function(a){var b=this.overflowX,c=this.overflowY;a=a||this.getScrollbarWidths(),"auto"===b&&(b=a.top||a.bottom||this.scrollEl[0].scrollWidth-1>this.scrollEl[0].clientWidth?"scroll":"hidden"),"auto"===c&&(c=a.left||a.right||this.scrollEl[0].scrollHeight-1>this.scrollEl[0].clientHeight?"scroll":"hidden"),this.scrollEl.css({"overflow-x":b,"overflow-y":c})},
// Getters / Setters
// -----------------------------------------------------------------------------------------------------------------
setHeight:function(a){this.scrollEl.height(a)},getScrollTop:function(){return this.scrollEl.scrollTop()},setScrollTop:function(a){this.scrollEl.scrollTop(a)},getClientWidth:function(){return this.scrollEl[0].clientWidth},getClientHeight:function(){return this.scrollEl[0].clientHeight},getScrollbarWidths:function(){return q(this.scrollEl)}}),vb=Ta.Calendar=va.extend({dirDefaults:null,// option defaults related to LTR or RTL
langDefaults:null,// option defaults related to current locale
overrides:null,// option overrides given to the fullCalendar constructor
options:null,// all defaults combined with overrides
viewSpecCache:null,// cache of view definitions
view:null,// current View object
header:null,loadingLevel:0,// number of simultaneous loading tasks
isTouch:!1,
// a lot of this class' OOP logic is scoped within this constructor function,
// but in the future, write individual methods on the prototype.
constructor:Na,
// Subclasses can override this for initialization logic after the constructor has been called
initialize:function(){},
// Initializes `this.options` and other important options-related objects
initOptions:function(a){var b,e,f,g;a=d(a),b=a.lang,e=wb[b],e||(b=vb.defaults.lang,e=wb[b]||{}),f=_(a.isRTL,e.isRTL,vb.defaults.isRTL),g=f?vb.rtlDefaults:{},this.dirDefaults=g,this.langDefaults=e,this.overrides=a,this.options=c([vb.defaults,g,e,a]),Oa(this.options),this.isTouch=null!=this.options.isTouch?this.options.isTouch:Ta.isTouch,this.viewSpecCache={}},
// Gets information about how to create a view. Will use a cache.
getViewSpec:function(a){var b=this.viewSpecCache;return b[a]||(b[a]=this.buildViewSpec(a))},
// Given a duration singular unit, like "week" or "day", finds a matching view spec.
// Preference is given to views that have corresponding buttons.
getUnitViewSpec:function(b){var c,d,e;if(-1!=a.inArray(b,Ya))for(c=this.header.getViewsWithButtons(),a.each(Ta.views,function(a){c.push(a)}),d=0;d<c.length;d++)if(e=this.getViewSpec(c[d]),e&&e.singleUnit==b)return e},
// Builds an object with information on how to create a given view
buildViewSpec:function(a){
// iterate from the specific view definition to a more general one until we hit an actual View class
for(var d,e,f,g,h=this.overrides.views||{},i=[],j=[],k=[],l=a;l;)d=Ua[l],e=h[l],l=null,"function"==typeof d&&(d={"class":d}),d&&(i.unshift(d),j.unshift(d.defaults||{}),f=f||d.duration,l=l||d.type),e&&(k.unshift(e),f=f||e.duration,l=l||e.type);// valid?
// view is a single-unit duration, like "week" or "day"
// incorporate options for this. lowest priority
return d=U(i),d.type=a,d["class"]?(f&&(f=b.duration(f),f.valueOf()&&(d.duration=f,g=M(f),1===f.as(g)&&(d.singleUnit=g,k.unshift(h[g]||{})))),d.defaults=c(j),d.overrides=c(k),this.buildViewSpecOptions(d),this.buildViewSpecButtonText(d,a),d):!1},
// Builds and assigns a view spec's options object from its already-assigned defaults and overrides
buildViewSpecOptions:function(a){a.options=c([// lowest to highest priority
vb.defaults,// global defaults
a.defaults,// view's defaults (from ViewSubclass.defaults)
this.dirDefaults,this.langDefaults,// locale and dir take precedence over view's defaults!
this.overrides,// calendar's overrides (options given to constructor)
a.overrides]),Oa(a.options)},
// Computes and assigns a view spec's buttonText-related options
buildViewSpecButtonText:function(a,b){
// given an options object with a possible `buttonText` hash, lookup the buttonText for the
// requested view, falling back to a generic unit entry like "week" or "day"
function c(c){var d=c.buttonText||{};return d[b]||(a.singleUnit?d[a.singleUnit]:null)}
// highest to lowest priority
a.buttonTextOverride=c(this.overrides)||// constructor-specified buttonText lookup hash takes precedence
a.overrides.buttonText,// `buttonText` for view-specific options is a string
// highest to lowest priority. mirrors buildViewSpecOptions
a.buttonTextDefault=c(this.langDefaults)||c(this.dirDefaults)||a.defaults.buttonText||// a single string. from ViewSubclass.defaults
c(vb.defaults)||(a.duration?this.humanizeDuration(a.duration):null)||// like "3 days"
b},
// Given a view name for a custom view or a standard view, creates a ready-to-go View object
instantiateView:function(a){var b=this.getViewSpec(a);return new b["class"](this,a,b.options,b.duration)},
// Returns a boolean about whether the view is okay to instantiate at some point
isValidViewType:function(a){return Boolean(this.getViewSpec(a))},
// Should be called when any type of async data fetching begins
pushLoading:function(){this.loadingLevel++||this.trigger("loading",null,!0,this.view)},
// Should be called when any type of async data fetching completes
popLoading:function(){--this.loadingLevel||this.trigger("loading",null,!1,this.view)},
// Given arguments to the select method in the API, returns a span (unzoned start/end and other info)
buildSelectSpan:function(a,b){var c,d=this.moment(a).stripZone();return c=b?this.moment(b).stripZone():d.hasTime()?d.clone().add(this.defaultTimedEventDuration):d.clone().add(this.defaultAllDayEventDuration),{start:d,end:c}}});vb.mixin(ib),vb.defaults={titleRangeSeparator:" — ",// emphasized dash
monthYearFormat:"MMMM YYYY",// required for en. other languages rely on datepicker computable option
defaultTimedEventDuration:"02:00:00",defaultAllDayEventDuration:{days:1},forceEventDuration:!1,nextDayThreshold:"09:00:00",// 9am
// display
defaultView:"month",aspectRatio:1.35,header:{left:"title",center:"",right:"today prev,next"},weekends:!0,weekNumbers:!1,weekNumberTitle:"W",weekNumberCalculation:"local",
//editable: false,
//nowIndicator: false,
scrollTime:"06:00:00",
// event ajax
lazyFetching:!0,startParam:"start",endParam:"end",timezoneParam:"timezone",timezone:!1,
//allDayDefault: undefined,
// locale
isRTL:!1,buttonText:{prev:"prev",next:"next",prevYear:"prev year",nextYear:"next year",year:"year",// TODO: locale files need to specify this
today:"today",month:"month",week:"week",day:"day"},buttonIcons:{prev:"left-single-arrow",next:"right-single-arrow",prevYear:"left-double-arrow",nextYear:"right-double-arrow"},
// jquery-ui theming
theme:!1,themeButtonIcons:{prev:"circle-triangle-w",next:"circle-triangle-e",prevYear:"seek-prev",nextYear:"seek-next"},
//eventResizableFromStart: false,
dragOpacity:.75,dragRevertDuration:500,dragScroll:!0,
//selectable: false,
unselectAuto:!0,dropAccept:"*",eventOrder:"title",eventLimit:!1,eventLimitText:"more",eventLimitClick:"popover",dayPopoverFormat:"LL",handleWindowResize:!0,windowResizeDelay:200,// milliseconds before an updateSize happens
longPressDelay:1e3},vb.englishDefaults={// used by lang.js
dayPopoverFormat:"dddd, MMMM D"},vb.rtlDefaults={// right-to-left defaults
header:{// TODO: smarter solution (first/center/last ?)
left:"next,prev today",center:"",right:"title"},buttonIcons:{prev:"right-single-arrow",next:"left-single-arrow",prevYear:"right-double-arrow",nextYear:"left-double-arrow"},themeButtonIcons:{prev:"circle-triangle-e",next:"circle-triangle-w",nextYear:"seek-prev",prevYear:"seek-next"}};var wb=Ta.langs={};// initialize and expose
// TODO: document the structure and ordering of a FullCalendar lang file
// TODO: rename everything "lang" to "locale", like what the moment project did
// Initialize jQuery UI datepicker translations while using some of the translations
// Will set this as the default language for datepicker.
Ta.datepickerLang=function(b,c,d){
// get the FullCalendar internal option hash for this language. create if necessary
var e=wb[b]||(wb[b]={});
// transfer some simple options from datepicker to fc
e.isRTL=d.isRTL,e.weekNumberTitle=d.weekHeader,
// compute some more complex options from datepicker
a.each(xb,function(a,b){e[a]=b(d)}),
// is jQuery UI Datepicker is on the page?
a.datepicker&&(
// Register the language data.
// FullCalendar and MomentJS use language codes like "pt-br" but Datepicker
// does it like "pt-BR" or if it doesn't have the language, maybe just "pt".
// Make an alias so the language can be referenced either way.
a.datepicker.regional[c]=a.datepicker.regional[b]=// alias
d,
// Alias 'en' to the default language data. Do this every time.
a.datepicker.regional.en=a.datepicker.regional[""],
// Set as Datepicker's global defaults.
a.datepicker.setDefaults(d))},
// Sets FullCalendar-specific translations. Will set the language as the global default.
Ta.lang=function(b,d){var e,f;e=wb[b]||(wb[b]={}),d&&(e=wb[b]=c([e,d])),f=Pa(b),a.each(yb,function(a,b){null==e[a]&&(e[a]=b(f,e))}),vb.defaults.lang=b};
// NOTE: can't guarantee any of these computations will run because not every language has datepicker
// configs, so make sure there are English fallbacks for these in the defaults file.
var xb={buttonText:function(a){return{
// the translations sometimes wrongly contain HTML entities
prev:ba(a.prevText),next:ba(a.nextText),today:ba(a.currentText)}},
// Produces format strings like "MMMM YYYY" -> "September 2014"
monthYearFormat:function(a){return a.showMonthAfterYear?"YYYY["+a.yearSuffix+"] MMMM":"MMMM YYYY["+a.yearSuffix+"]"}},yb={
// Produces format strings like "ddd M/D" -> "Fri 9/15"
dayOfMonthFormat:function(a,b){var c=a.longDateFormat("l");// for the format like "M/D/YYYY"
// strip the year off the edge, as well as other misc non-whitespace chars
return c=c.replace(/^Y+[^\w\s]*|[^\w\s]*Y+$/g,""),b.isRTL?c+=" ddd":c="ddd "+c,c},
// Produces format strings like "h:mma" -> "6:00pm"
mediumTimeFormat:function(a){// can't be called `timeFormat` because collides with option
return a.longDateFormat("LT").replace(/\s*a$/i,"a")},
// Produces format strings like "h(:mm)a" -> "6pm" / "6:30pm"
smallTimeFormat:function(a){return a.longDateFormat("LT").replace(":mm","(:mm)").replace(/(\Wmm)$/,"($1)").replace(/\s*a$/i,"a")},
// Produces format strings like "h(:mm)t" -> "6p" / "6:30p"
extraSmallTimeFormat:function(a){return a.longDateFormat("LT").replace(":mm","(:mm)").replace(/(\Wmm)$/,"($1)").replace(/\s*a$/i,"t")},
// Produces format strings like "ha" / "H" -> "6pm" / "18"
hourFormat:function(a){return a.longDateFormat("LT").replace(":mm","").replace(/(\Wmm)$/,"").replace(/\s*a$/i,"a")},
// Produces format strings like "h:mm" -> "6:30" (with no AM/PM)
noMeridiemTimeFormat:function(a){return a.longDateFormat("LT").replace(/\s*a$/i,"")}},zb={
// Produces format strings for results like "Mo 16"
smallDayDateFormat:function(a){return a.isRTL?"D dd":"dd D"},
// Produces format strings for results like "Wk 5"
weekFormat:function(a){return a.isRTL?"w[ "+a.weekNumberTitle+"]":"["+a.weekNumberTitle+" ]w"},
// Produces format strings for results like "Wk5"
smallWeekFormat:function(a){return a.isRTL?"w["+a.weekNumberTitle+"]":"["+a.weekNumberTitle+"]w"}};
// Initialize English by forcing computation of moment-derived options.
// Also, sets it as the default.
Ta.lang("en",vb.englishDefaults),Ta.sourceNormalizers=[],Ta.sourceFetchers=[];var Ab={dataType:"json",cache:!1},Bb=1;
// Returns a list of events that the given event should be compared against when being considered for a move to
// the specified span. Attached to the Calendar's prototype because EventManager is a mixin for a Calendar.
vb.prototype.getPeerEvents=function(a,b){var c,d,e=this.getEventCache(),f=[];for(c=0;c<e.length;c++)d=e[c],b&&b._id===d._id||f.push(d);return f};/* An abstract class for the "basic" views, as well as month view. Renders one or more rows of day cells.
----------------------------------------------------------------------------------------------------------------------*/
// It is a manager for a DayGrid subcomponent, which does most of the heavy lifting.
// It is responsible for managing width/height.
var Cb=Ta.BasicView=tb.extend({scroller:null,dayGridClass:rb,// class the dayGrid will be instantiated from (overridable by subclasses)
dayGrid:null,// the main subcomponent that does most of the heavy lifting
dayNumbersVisible:!1,// display day numbers on each day cell?
weekNumbersVisible:!1,// display week numbers along the side?
weekNumberWidth:null,// width of all the week-number cells running down the side
headContainerEl:null,// div that hold's the dayGrid's rendered date header
headRowEl:null,// the fake row element of the day-of-week header
initialize:function(){this.dayGrid=this.instantiateDayGrid(),this.scroller=new ub({overflowX:"hidden",overflowY:"auto"})},
// Generates the DayGrid object this view needs. Draws from this.dayGridClass
instantiateDayGrid:function(){
// generate a subclass on the fly with BasicView-specific behavior
// TODO: cache this subclass
var a=this.dayGridClass.extend(Db);return new a(this)},
// Sets the display range and computes all necessary dates
setRange:function(a){tb.prototype.setRange.call(this,a),// call the super-method
this.dayGrid.breakOnWeeks=/year|month|week/.test(this.intervalUnit),// do before setRange
this.dayGrid.setRange(a)},
// Compute the value to feed into setRange. Overrides superclass.
computeRange:function(a){var b=tb.prototype.computeRange.call(this,a);// get value from the super-method
// year and month views should be aligned with weeks. this is already done for week
// make end-of-week if not already
return/year|month/.test(b.intervalUnit)&&(b.start.startOf("week"),b.start=this.skipHiddenDays(b.start),b.end.weekday()&&(b.end.add(1,"week").startOf("week"),b.end=this.skipHiddenDays(b.end,-1,!0))),b},
// Renders the view into `this.el`, which should already be assigned
renderDates:function(){this.dayNumbersVisible=this.dayGrid.rowCnt>1,// TODO: make grid responsible
this.weekNumbersVisible=this.opt("weekNumbers"),this.dayGrid.numbersVisible=this.dayNumbersVisible||this.weekNumbersVisible,this.el.addClass("fc-basic-view").html(this.renderSkeletonHtml()),this.renderHead(),this.scroller.render();var b=this.scroller.el.addClass("fc-day-grid-container"),c=a('<div class="fc-day-grid" />').appendTo(b);this.el.find(".fc-body > tr > td").append(b),this.dayGrid.setElement(c),this.dayGrid.renderDates(this.hasRigidRows())},
// render the day-of-week headers
renderHead:function(){this.headContainerEl=this.el.find(".fc-head-container").html(this.dayGrid.renderHeadHtml()),this.headRowEl=this.headContainerEl.find(".fc-row")},
// Unrenders the content of the view. Since we haven't separated skeleton rendering from date rendering,
// always completely kill the dayGrid's rendering.
unrenderDates:function(){this.dayGrid.unrenderDates(),this.dayGrid.removeElement(),this.scroller.destroy()},renderBusinessHours:function(){this.dayGrid.renderBusinessHours()},
// Builds the HTML skeleton for the view.
// The day-grid component will render inside of a container defined by this HTML.
renderSkeletonHtml:function(){return'<table><thead class="fc-head"><tr><td class="fc-head-container '+this.widgetHeaderClass+'"></td></tr></thead><tbody class="fc-body"><tr><td class="'+this.widgetContentClass+'"></td></tr></tbody></table>'},
// Generates an HTML attribute string for setting the width of the week number column, if it is known
weekNumberStyleAttr:function(){return null!==this.weekNumberWidth?'style="width:'+this.weekNumberWidth+'px"':""},
// Determines whether each row should have a constant height
hasRigidRows:function(){var a=this.opt("eventLimit");return a&&"number"!=typeof a},/* Dimensions
	------------------------------------------------------------------------------------------------------------------*/
// Refreshes the horizontal dimensions of the view
updateWidth:function(){this.weekNumbersVisible&&(
// Make sure all week number cells running down the side have the same width.
// Record the width for cells created later.
this.weekNumberWidth=k(this.el.find(".fc-week-number")))},
// Adjusts the vertical dimensions of the view to the specified values
setHeight:function(a,b){var c,d,g=this.opt("eventLimit");
// reset all heights to be natural
this.scroller.clear(),f(this.headRowEl),this.dayGrid.removeSegPopover(),// kill the "more" popover if displayed
// is the event limit a constant level number?
g&&"number"==typeof g&&this.dayGrid.limitRows(g),c=this.computeScrollerHeight(a),this.setGridHeight(c,b),g&&"number"!=typeof g&&this.dayGrid.limitRows(g),b||(this.scroller.setHeight(c),d=this.scroller.getScrollbarWidths(),(d.left||d.right)&&(e(this.headRowEl,d),c=this.computeScrollerHeight(a),this.scroller.setHeight(c)),this.scroller.lockOverflow(d))},
// given a desired total height of the view, returns what the height of the scroller should be
computeScrollerHeight:function(a){return a-l(this.el,this.scroller.el)},
// Sets the height of just the DayGrid component in this view
setGridHeight:function(a,b){b?j(this.dayGrid.rowEls):i(this.dayGrid.rowEls,a,!0)},/* Scroll
	------------------------------------------------------------------------------------------------------------------*/
queryScroll:function(){return this.scroller.getScrollTop()},setScroll:function(a){this.scroller.setScrollTop(a)},/* Hit Areas
	------------------------------------------------------------------------------------------------------------------*/
// forward all hit-related method calls to dayGrid
prepareHits:function(){this.dayGrid.prepareHits()},releaseHits:function(){this.dayGrid.releaseHits()},queryHit:function(a,b){return this.dayGrid.queryHit(a,b)},getHitSpan:function(a){return this.dayGrid.getHitSpan(a)},getHitEl:function(a){return this.dayGrid.getHitEl(a)},/* Events
	------------------------------------------------------------------------------------------------------------------*/
// Renders the given events onto the view and populates the segments array
renderEvents:function(a){this.dayGrid.renderEvents(a),this.updateHeight()},
// Retrieves all segment objects that are rendered in the view
getEventSegs:function(){return this.dayGrid.getEventSegs()},
// Unrenders all event elements and clears internal segment data
unrenderEvents:function(){this.dayGrid.unrenderEvents()},/* Dragging (for both events and external elements)
	------------------------------------------------------------------------------------------------------------------*/
// A returned value of `true` signals that a mock "helper" event has been rendered.
renderDrag:function(a,b){return this.dayGrid.renderDrag(a,b)},unrenderDrag:function(){this.dayGrid.unrenderDrag()},/* Selection
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of a selection
renderSelection:function(a){this.dayGrid.renderSelection(a)},
// Unrenders a visual indications of a selection
unrenderSelection:function(){this.dayGrid.unrenderSelection()}}),Db={
// Generates the HTML that will go before the day-of week header cells
renderHeadIntroHtml:function(){var a=this.view;// needed for matchCellWidths
return a.weekNumbersVisible?'<th class="fc-week-number '+a.widgetHeaderClass+'" '+a.weekNumberStyleAttr()+"><span>"+aa(a.opt("weekNumberTitle"))+"</span></th>":""},
// Generates the HTML that will go before content-skeleton cells that display the day/week numbers
renderNumberIntroHtml:function(a){var b=this.view;// needed for matchCellWidths
return b.weekNumbersVisible?'<td class="fc-week-number" '+b.weekNumberStyleAttr()+"><span>"+this.getCellDate(a,0).format("w")+"</span></td>":""},
// Generates the HTML that goes before the day bg cells for each day-row
renderBgIntroHtml:function(){var a=this.view;return a.weekNumbersVisible?'<td class="fc-week-number '+a.widgetContentClass+'" '+a.weekNumberStyleAttr()+"></td>":""},
// Generates the HTML that goes before every other type of row generated by DayGrid.
// Affects helper-skeleton and highlight-skeleton rows.
renderIntroHtml:function(){var a=this.view;return a.weekNumbersVisible?'<td class="fc-week-number" '+a.weekNumberStyleAttr()+"></td>":""}},Eb=Ta.MonthView=Cb.extend({
// Produces information about what range to display
computeRange:function(a){var b,c=Cb.prototype.computeRange.call(this,a);
// ensure 6 weeks
// could be partial weeks due to hiddenDays
return this.isFixedWeeks()&&(b=Math.ceil(c.end.diff(c.start,"weeks",!0)),c.end.add(6-b,"weeks")),c},
// Overrides the default BasicView behavior to have special multi-week auto-height logic
setGridHeight:function(a,b){b=b||"variable"===this.opt("weekMode"),b&&(a*=this.rowCnt/6),i(this.dayGrid.rowEls,a,!b)},isFixedWeeks:function(){var a=this.opt("weekMode");// LEGACY: weekMode is deprecated
// LEGACY: weekMode is deprecated
return a?"fixed"===a:this.opt("fixedWeekCount")}});Ua.basic={"class":Cb},Ua.basicDay={type:"basic",duration:{days:1}},Ua.basicWeek={type:"basic",duration:{weeks:1}},Ua.month={"class":Eb,duration:{months:1},// important for prev/next
defaults:{fixedWeekCount:!0}};/* An abstract class for all agenda-related views. Displays one more columns with time slots running vertically.
----------------------------------------------------------------------------------------------------------------------*/
// Is a manager for the TimeGrid subcomponent and possibly the DayGrid subcomponent (if allDaySlot is on).
// Responsible for managing width/height.
var Fb=Ta.AgendaView=tb.extend({scroller:null,timeGridClass:sb,// class used to instantiate the timeGrid. subclasses can override
timeGrid:null,// the main time-grid subcomponent of this view
dayGridClass:rb,// class used to instantiate the dayGrid. subclasses can override
dayGrid:null,// the "all-day" subcomponent. if all-day is turned off, this will be null
axisWidth:null,// the width of the time axis running down the side
headContainerEl:null,// div that hold's the timeGrid's rendered date header
noScrollRowEls:null,// set of fake row elements that must compensate when scroller has scrollbars
// when the time-grid isn't tall enough to occupy the given height, we render an <hr> underneath
bottomRuleEl:null,initialize:function(){this.timeGrid=this.instantiateTimeGrid(),this.opt("allDaySlot")&&(// should we display the "all-day" area?
this.dayGrid=this.instantiateDayGrid()),this.scroller=new ub({overflowX:"hidden",overflowY:"auto"})},
// Instantiates the TimeGrid object this view needs. Draws from this.timeGridClass
instantiateTimeGrid:function(){var a=this.timeGridClass.extend(Gb);return new a(this)},
// Instantiates the DayGrid object this view might need. Draws from this.dayGridClass
instantiateDayGrid:function(){var a=this.dayGridClass.extend(Hb);return new a(this)},/* Rendering
	------------------------------------------------------------------------------------------------------------------*/
// Sets the display range and computes all necessary dates
setRange:function(a){tb.prototype.setRange.call(this,a),// call the super-method
this.timeGrid.setRange(a),this.dayGrid&&this.dayGrid.setRange(a)},
// Renders the view into `this.el`, which has already been assigned
renderDates:function(){this.el.addClass("fc-agenda-view").html(this.renderSkeletonHtml()),this.renderHead(),this.scroller.render();var b=this.scroller.el.addClass("fc-time-grid-container"),c=a('<div class="fc-time-grid" />').appendTo(b);this.el.find(".fc-body > tr > td").append(b),this.timeGrid.setElement(c),this.timeGrid.renderDates(),
// the <hr> that sometimes displays under the time-grid
this.bottomRuleEl=a('<hr class="fc-divider '+this.widgetHeaderClass+'"/>').appendTo(this.timeGrid.el),// inject it into the time-grid
this.dayGrid&&(this.dayGrid.setElement(this.el.find(".fc-day-grid")),this.dayGrid.renderDates(),
// have the day-grid extend it's coordinate area over the <hr> dividing the two grids
this.dayGrid.bottomCoordPadding=this.dayGrid.el.next("hr").outerHeight()),this.noScrollRowEls=this.el.find(".fc-row:not(.fc-scroller *)")},
// render the day-of-week headers
renderHead:function(){this.headContainerEl=this.el.find(".fc-head-container").html(this.timeGrid.renderHeadHtml())},
// Unrenders the content of the view. Since we haven't separated skeleton rendering from date rendering,
// always completely kill each grid's rendering.
unrenderDates:function(){this.timeGrid.unrenderDates(),this.timeGrid.removeElement(),this.dayGrid&&(this.dayGrid.unrenderDates(),this.dayGrid.removeElement()),this.scroller.destroy()},
// Builds the HTML skeleton for the view.
// The day-grid and time-grid components will render inside containers defined by this HTML.
renderSkeletonHtml:function(){return'<table><thead class="fc-head"><tr><td class="fc-head-container '+this.widgetHeaderClass+'"></td></tr></thead><tbody class="fc-body"><tr><td class="'+this.widgetContentClass+'">'+(this.dayGrid?'<div class="fc-day-grid"/><hr class="fc-divider '+this.widgetHeaderClass+'"/>':"")+"</td></tr></tbody></table>"},
// Generates an HTML attribute string for setting the width of the axis, if it is known
axisStyleAttr:function(){return null!==this.axisWidth?'style="width:'+this.axisWidth+'px"':""},/* Business Hours
	------------------------------------------------------------------------------------------------------------------*/
renderBusinessHours:function(){this.timeGrid.renderBusinessHours(),this.dayGrid&&this.dayGrid.renderBusinessHours()},unrenderBusinessHours:function(){this.timeGrid.unrenderBusinessHours(),this.dayGrid&&this.dayGrid.unrenderBusinessHours()},/* Now Indicator
	------------------------------------------------------------------------------------------------------------------*/
getNowIndicatorUnit:function(){return this.timeGrid.getNowIndicatorUnit()},renderNowIndicator:function(a){this.timeGrid.renderNowIndicator(a)},unrenderNowIndicator:function(){this.timeGrid.unrenderNowIndicator()},/* Dimensions
	------------------------------------------------------------------------------------------------------------------*/
updateSize:function(a){this.timeGrid.updateSize(a),tb.prototype.updateSize.call(this,a)},
// Refreshes the horizontal dimensions of the view
updateWidth:function(){
// make all axis cells line up, and record the width so newly created axis cells will have it
this.axisWidth=k(this.el.find(".fc-axis"))},
// Adjusts the vertical dimensions of the view to the specified values
setHeight:function(a,b){var c,d,g;
// reset all dimensions back to the original state
this.bottomRuleEl.hide(),// .show() will be called later if this <hr> is necessary
this.scroller.clear(),// sets height to 'auto' and clears overflow
f(this.noScrollRowEls),
// limit number of events in the all-day area
this.dayGrid&&(this.dayGrid.removeSegPopover(),c=this.opt("eventLimit"),c&&"number"!=typeof c&&(c=Ib),c&&this.dayGrid.limitRows(c)),b||(d=this.computeScrollerHeight(a),this.scroller.setHeight(d),g=this.scroller.getScrollbarWidths(),(g.left||g.right)&&(e(this.noScrollRowEls,g),d=this.computeScrollerHeight(a),this.scroller.setHeight(d)),this.scroller.lockOverflow(g),this.timeGrid.getTotalSlatHeight()<d&&this.bottomRuleEl.show())},
// given a desired total height of the view, returns what the height of the scroller should be
computeScrollerHeight:function(a){return a-l(this.el,this.scroller.el)},/* Scroll
	------------------------------------------------------------------------------------------------------------------*/
// Computes the initial pre-configured scroll state prior to allowing the user to change it
computeInitialScroll:function(){var a=b.duration(this.opt("scrollTime")),c=this.timeGrid.computeTimeTop(a);
// zoom can give weird floating-point values. rather scroll a little bit further
return c=Math.ceil(c),c&&c++,c},queryScroll:function(){return this.scroller.getScrollTop()},setScroll:function(a){this.scroller.setScrollTop(a)},/* Hit Areas
	------------------------------------------------------------------------------------------------------------------*/
// forward all hit-related method calls to the grids (dayGrid might not be defined)
prepareHits:function(){this.timeGrid.prepareHits(),this.dayGrid&&this.dayGrid.prepareHits()},releaseHits:function(){this.timeGrid.releaseHits(),this.dayGrid&&this.dayGrid.releaseHits()},queryHit:function(a,b){var c=this.timeGrid.queryHit(a,b);return!c&&this.dayGrid&&(c=this.dayGrid.queryHit(a,b)),c},getHitSpan:function(a){
// TODO: hit.component is set as a hack to identify where the hit came from
return a.component.getHitSpan(a)},getHitEl:function(a){
// TODO: hit.component is set as a hack to identify where the hit came from
return a.component.getHitEl(a)},/* Events
	------------------------------------------------------------------------------------------------------------------*/
// Renders events onto the view and populates the View's segment array
renderEvents:function(a){var b,c,d=[],e=[],f=[];
// separate the events into all-day and timed
for(c=0;c<a.length;c++)a[c].allDay?d.push(a[c]):e.push(a[c]);b=this.timeGrid.renderEvents(e),this.dayGrid&&(f=this.dayGrid.renderEvents(d)),this.updateHeight()},
// Retrieves all segment objects that are rendered in the view
getEventSegs:function(){return this.timeGrid.getEventSegs().concat(this.dayGrid?this.dayGrid.getEventSegs():[])},
// Unrenders all event elements and clears internal segment data
unrenderEvents:function(){
// unrender the events in the subcomponents
this.timeGrid.unrenderEvents(),this.dayGrid&&this.dayGrid.unrenderEvents()},/* Dragging (for events and external elements)
	------------------------------------------------------------------------------------------------------------------*/
// A returned value of `true` signals that a mock "helper" event has been rendered.
renderDrag:function(a,b){return a.start.hasTime()?this.timeGrid.renderDrag(a,b):this.dayGrid?this.dayGrid.renderDrag(a,b):void 0},unrenderDrag:function(){this.timeGrid.unrenderDrag(),this.dayGrid&&this.dayGrid.unrenderDrag()},/* Selection
	------------------------------------------------------------------------------------------------------------------*/
// Renders a visual indication of a selection
renderSelection:function(a){a.start.hasTime()||a.end.hasTime()?this.timeGrid.renderSelection(a):this.dayGrid&&this.dayGrid.renderSelection(a)},
// Unrenders a visual indications of a selection
unrenderSelection:function(){this.timeGrid.unrenderSelection(),this.dayGrid&&this.dayGrid.unrenderSelection()}}),Gb={
// Generates the HTML that will go before the day-of week header cells
renderHeadIntroHtml:function(){var a,b=this.view;// needed for matchCellWidths
return b.opt("weekNumbers")?(a=this.start.format(b.opt("smallWeekFormat")),'<th class="fc-axis fc-week-number '+b.widgetHeaderClass+'" '+b.axisStyleAttr()+"><span>"+aa(a)+"</span></th>"):'<th class="fc-axis '+b.widgetHeaderClass+'" '+b.axisStyleAttr()+"></th>"},
// Generates the HTML that goes before the bg of the TimeGrid slot area. Long vertical column.
renderBgIntroHtml:function(){var a=this.view;return'<td class="fc-axis '+a.widgetContentClass+'" '+a.axisStyleAttr()+"></td>"},
// Generates the HTML that goes before all other types of cells.
// Affects content-skeleton, helper-skeleton, highlight-skeleton for both the time-grid and day-grid.
renderIntroHtml:function(){var a=this.view;return'<td class="fc-axis" '+a.axisStyleAttr()+"></td>"}},Hb={
// Generates the HTML that goes before the all-day cells
renderBgIntroHtml:function(){var a=this.view;// needed for matchCellWidths
return'<td class="fc-axis '+a.widgetContentClass+'" '+a.axisStyleAttr()+"><span>"+(a.opt("allDayHtml")||aa(a.opt("allDayText")))+"</span></td>"},
// Generates the HTML that goes before all other types of cells.
// Affects content-skeleton, helper-skeleton, highlight-skeleton for both the time-grid and day-grid.
renderIntroHtml:function(){var a=this.view;return'<td class="fc-axis" '+a.axisStyleAttr()+"></td>"}},Ib=5,Jb=[{hours:1},{minutes:30},{minutes:15},{seconds:30},{seconds:15}];return Ua.agenda={"class":Fb,defaults:{allDaySlot:!0,allDayText:"all-day",slotDuration:"00:30:00",minTime:"00:00:00",maxTime:"24:00:00",slotEventOverlap:!0}},Ua.agendaDay={type:"agenda",duration:{days:1}},Ua.agendaWeek={type:"agenda",duration:{weeks:1}},Ta});