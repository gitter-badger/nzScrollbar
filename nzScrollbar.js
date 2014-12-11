(function() {

    var module = angular.module('nzScrollbar', []);

    module.directive('nzScrollbar', ['$interval', '$timeout',
        function($interval, $timeout) {
            return {
                restrict: 'EA',
                transclude: true,
                template: [
                    '<div class="nzScrollbar-outer">',
                    '   <div ng-transclude class="nzScrollbar-inner"></div>',
                    '   <div class="nzScrollbar-indicator-wrap">',
                    '       <div class="nzScrollbar-indicator">',
                    '   </div>',
                    '</div>'
                ].join(' '),
                link: function($scope, el, attrs) {

                    var container,
                        inner,
                        indicator,
                        relative,
                        containerHeight,
                        containerPadding,
                        innerHeight,
                        min,
                        max,
                        offset,
                        oldOffset,
                        reference,
                        pressed,
                        inidicatorPressed,
                        xform,
                        velocity,
                        frame,
                        timestamp,
                        ticker,
                        amplitude,
                        target,
                        timeConstant,
                        useCssTranslate = attrs.useCssTranslate !== "false";

                    var wheelSpeed = 40;
                    var deferreds = {},
                        methods = {},
                        uuid = 0;

                    container = el;
                    outer = angular.element(el[0].querySelector('.nzScrollbar-outer'));
                    inner = angular.element(el[0].querySelector('.nzScrollbar-inner'));
                    indicator = angular.element(el[0].querySelector('.nzScrollbar-indicator'));

                    // Init Watchers
                    window.addEventListener('resize', debounce(build, 200));

                    // Touch Events
                    container[0].addEventListener('touchstart', tap);

                    // Click Events
                    indicator[0].addEventListener('mousedown', indicatorClick);

                    // Scroll Events
                    if (container[0].addEventListener) {
                        container[0].addEventListener("mousewheel", wheel, false); // IE9, Chrome, Safari, Opera
                        container[0].addEventListener("DOMMouseScroll", wheel, false); // Firefox
                    } else container[0].attachEvent("onmousewheel", wheel); // IE 6/7/8

                    if (window.addResizeListener) {
                        window.addResizeListener(inner[0], build);
                        $scope.$on('$destroy', function() {
                            window.removeResizeListener(inner[0], build);
                        });
                    }

                    init();


                    function init() {
                        container.addClass('nzScrollbar');
                        timeConstant = 325; // ms
                        pressed = false;

                        build();
                    }

                    function build() {
                        containerHeight = parseInt(getComputedStyle(el[0]).height, 10);
                        containerPadding = parseInt(getComputedStyle(el[0]).padding, 10);
                        innerHeight = parseInt(getComputedStyle(inner[0]).height, 10);
                        max = innerHeight - containerHeight + containerPadding * 2;
                        max = max < 0 ? 0 : max;
                        offset = min = 0;

                        // Styles
                        indicator.css({
                            height: ((containerHeight - containerPadding) / innerHeight) * (containerHeight - containerPadding) + 'px',
                            display: (containerHeight - containerPadding) / innerHeight >= 1 ? 'none' : 'initial'
                        });

                    }









                    function ypos(e) {
                        // touch event
                        if (e.targetTouches && (e.targetTouches.length >= 1)) {
                            return e.targetTouches[0].clientY;
                        }

                        // mouse event
                        return e.clientY;
                    }

                    function scroll(y) {
                        offset = (y > max) ? max : (y < min) ? min : y;
                        
                        //Check scroll method
                        if(useCssTranslate) {
	                        inner.css({
	                            webkitTransform: 'translateY(' + (-offset) + 'px)',
	                            transform: 'translateY(' + (-offset) + 'px)'
	                        });
                        }
                        else {
                        	inner.css({top: -offset + 'px'});
                        }
                        
                        indicator.css({
                            webkitTransform: 'translateY(' + (offset / max * ((containerHeight) - parseInt(indicator.css('height')))) + 'px)',
                            transform: 'translateY(' + (offset / max * ((containerHeight) - parseInt(indicator.css('height')))) + 'px)'
                        });
                        return offset;
                    }

                    function track() {
                        var now, elapsed, delta, v;

                        now = Date.now();
                        elapsed = now - timestamp;
                        timestamp = now;
                        delta = offset - frame;
                        frame = offset;

                        v = 1000 * delta / (1 + elapsed);
                        velocity = 0.8 * v + 0.2 * velocity;
                    }

                    function autoScroll(isIndicator) {
                        var elapsed, delta;

                        if (amplitude) {
                            elapsed = Date.now() - timestamp;
                            delta = -amplitude * Math.exp(-elapsed / timeConstant);
                            if (delta > 0.5 || delta < -0.5) {
                                scroll(target + delta);
                                requestAnimationFrame(autoScroll);
                            } else {
                                scroll(target);
                            }
                        }
                    }

                    function wheel(e) {
                        e = window.event || e; // old IE support
                        var wheelSpeedDelta = -(e.deltaX || e.deltaY ? e.deltaY : null || e.detail || (-1 / 3 * e.wheelDelta)) / 40;
                        offset -= wheelSpeedDelta * 30;

                        scroll(offset);

                        if (offset === 0 || offset === max) {
                            return;
                        } else {
                            e.preventDefault();
                            e.stopPropagation();
                            e.returnValue = false;
                            return false;
                        }
                    }

                    function indicatorClick(e) {
                        window.addEventListener('mousemove', indicatorDrag);
                        window.addEventListener('mouseup', indicatorRelease);
                        container[0].removeEventListener('mouseenter', build);
                        container.addClass('dragging');

                        indicatorPressed = true;
                        reference = ypos(e);

                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }

                    function indicatorDrag(e) {
                        var y, delta;
                        if (indicatorPressed) {
                            y = ypos(e);
                            delta = reference - y;
                            reference = y;
                            delta *= (innerHeight / (containerHeight - containerPadding));
                            scroll(offset - delta);
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }

                    function indicatorRelease(e) {
                        container[0].addEventListener('mouseenter', build);
                        window.removeEventListener('mousemove', indicatorDrag);
                        window.removeEventListener('mouseup', indicatorRelease);
                        container.removeClass('dragging');

                        indicatorPressed = false;

                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }





                    function tap(e) {
                        window.addEventListener('touchmove', drag);
                        window.addEventListener('touchend', release);

                        window.removeEventListener('mouseenter', build);

                        pressed = true;
                        reference = ypos(e);

                        velocity = amplitude = 0;
                        frame = offset;
                        timestamp = Date.now();
                        clearInterval(ticker);
                        ticker = $interval(track, 10);

                        if (offset === 0 || offset === max) {
                            return;
                        } else {
                            e.preventDefault();
                            e.stopPropagation();
                            e.returnValue = false;
                            return false;
                        }
                    }

                    function drag(e) {
                        var y, delta;
                        if (pressed) {
                            y = ypos(e);
                            delta = reference - y;
                            if (delta > 2 || delta < -2) {
                                reference = y;
                                scroll(offset + delta);
                            }
                            if (offset === 0 || offset === max) {
                                return;
                            }
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        e.returnValue = false;
                        return false;
                    }

                    function release(e) {
                        window.removeEventListener('touchmove', drag);
                        window.removeEventListener('touchend', release);

                        window.addEventListener('mouseenter', build);

                        pressed = false;

                        $interval.cancel(ticker);
                        if (velocity > 10 || velocity < -10) {
                            amplitude = 0.6 * velocity;
                            target = Math.round(offset + amplitude);
                            timestamp = Date.now();
                            requestAnimationFrame(autoScroll);
                        }

                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }



                    function debounce(func, threshold, execAsap) {

                        var timeout;

                        return function debounced() {
                            var obj = this,
                                args = arguments;

                            function delayed() {
                                if (!execAsap)
                                    func.apply(obj, args);
                                timeout = null;
                            }

                            if (timeout)
                                clearTimeout(timeout);
                            else if (execAsap)
                                func.apply(obj, args);

                            timeout = setTimeout(delayed, threshold || 100);
                        };
                    }

                }
            };
        }
    ]);

})();
