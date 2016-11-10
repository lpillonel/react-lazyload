'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.lazyloadHandler = exports.lazyload = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _event = require('./utils/event');

var _scrollParent = require('./utils/scrollParent');

var _scrollParent2 = _interopRequireDefault(_scrollParent);

var _debounce = require('./utils/debounce');

var _debounce2 = _interopRequireDefault(_debounce);

var _throttle = require('./utils/throttle');

var _throttle2 = _interopRequireDefault(_throttle);

var _decorator = require('./decorator');

var _decorator2 = _interopRequireDefault(_decorator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               * react-lazyload
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               */


var LISTEN_FLAG = 'data-lazyload-listened';
var listeners = [];
var pending = [];

// Depending on component's props
var delayType = void 0;
var finalLazyLoadHandler = null;

var LazyLoad = function (_Component) {
    _inherits(LazyLoad, _Component);

    function LazyLoad(props) {
        _classCallCheck(this, LazyLoad);

        var _this = _possibleConstructorReturn(this, (LazyLoad.__proto__ || Object.getPrototypeOf(LazyLoad)).call(this, props));

        _this.visible = false;
        return _this;
    }

    _createClass(LazyLoad, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            this.parent = (0, _scrollParent2.default)(_reactDom2.default.findDOMNode(this));

            // It's unlikely to change delay type on the fly, this is mainly
            // designed for tests
            var needResetFinalLazyLoadHandler = false;
            if (this.props.debounce !== undefined && delayType === 'throttle') {
                console.warn('[react-lazyload] Previous delay function is `throttle`, now switching to `debounce`, try setting them unanimously');
                needResetFinalLazyLoadHandler = true;
            } else if (delayType === 'debounce' && this.props.debounce === undefined) {
                console.warn('[react-lazyload] Previous delay function is `debounce`, now switching to `throttle`, try setting them unanimously');
                needResetFinalLazyLoadHandler = true;
            }

            if (needResetFinalLazyLoadHandler) {
                (0, _event.off)(window, 'scroll', finalLazyLoadHandler);
                (0, _event.off)(window, 'resize', finalLazyLoadHandler);
                finalLazyLoadHandler = null;
            }

            if (!finalLazyLoadHandler) {
                if (this.props.debounce !== undefined) {
                    finalLazyLoadHandler = (0, _debounce2.default)(this.lazyLoadHandler.bind(this), typeof this.props.debounce === 'number' ? this.props.debounce : 300);
                    delayType = 'debounce';
                } else {
                    finalLazyLoadHandler = (0, _throttle2.default)(this.lazyLoadHandler.bind(this), typeof this.props.throttle === 'number' ? this.props.throttle : 300);
                    delayType = 'throttle';
                }
            }

            if (this.props.overflow) {
                if (this.parent) {
                    var listenerCount = 1 + +this.parent.getAttribute(LISTEN_FLAG);
                    if (listenerCount === 1) {
                        this.parent.addEventListener('scroll', finalLazyLoadHandler);

                        if (this.props.resize) {
                            (0, _event.on)(window, 'resize', finalLazyLoadHandler);
                        }
                    }
                    this.parent.setAttribute(LISTEN_FLAG, listenerCount);
                }
            } else if (listeners.length === 0 || needResetFinalLazyLoadHandler) {
                var _props = this.props,
                    scroll = _props.scroll,
                    resize = _props.resize;


                if (scroll) {
                    (0, _event.on)(window, 'scroll', finalLazyLoadHandler);
                }

                if (resize) {
                    (0, _event.on)(window, 'resize', finalLazyLoadHandler);
                }
            }

            listeners.push(this);
            this.checkVisible(this);
        }
    }, {
        key: 'shouldComponentUpdate',
        value: function shouldComponentUpdate(nextProps) {
            return this.visible || !this.visible && nextProps.placeholder !== this.props.placeholder;
        }
    }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
            if (this.props.overflow) {
                if (this.parent) {
                    var listenerCount = +this.parent.getAttribute(LISTEN_FLAG) - 1;
                    if (listenerCount === 0) {
                        this.parent.removeEventListener('scroll', finalLazyLoadHandler);
                        this.parent.removeAttribute(LISTEN_FLAG);
                    } else {
                        this.parent.setAttribute(LISTEN_FLAG, listenerCount);
                    }
                }
            }

            var index = listeners.indexOf(this);
            if (index !== -1) {
                listeners.splice(index, 1);
            }

            if (listeners.length === 0) {
                (0, _event.off)(window, 'resize', finalLazyLoadHandler);
                (0, _event.off)(window, 'scroll', finalLazyLoadHandler);

                // Unasign the handler
                finalLazyLoadHandler = undefined;
            }
        }

        /**
        * Check if `component` is visible in overflow container `parent`
        * @param  {node} component React component
        * @param  {node} parent    component's scroll parent
        * @return {bool}
        */

    }, {
        key: 'checkOverflowVisible',
        value: function checkOverflowVisible(component, parent) {
            var node = _reactDom2.default.findDOMNode(component);

            var _parent$getBoundingCl = parent.getBoundingClientRect(),
                parentTop = _parent$getBoundingCl.top,
                parentHeight = _parent$getBoundingCl.height;

            var windowInnerHeight = window.innerHeight || document.documentElement.clientHeight;

            // calculate top and height of the intersection of the element's scrollParent and viewport
            var intersectionTop = Math.max(parentTop, 0); // intersection's top relative to viewport
            var intersectionHeight = Math.min(windowInnerHeight, parentTop + parentHeight) - intersectionTop; // height

            // check whether the element is visible in the intersection

            var _node$getBoundingClie = node.getBoundingClientRect(),
                top = _node$getBoundingClie.top,
                height = _node$getBoundingClie.height;

            var offsetTop = top - intersectionTop; // element's top relative to intersection

            var offsets = Array.isArray(component.props.offset) ? component.props.offset : [component.props.offset, component.props.offset]; // Be compatible with previous API


            return offsetTop - offsets[0] <= intersectionHeight && offsetTop + height + offsets[1] >= 0;
        }

        /**
        * Check if `component` is visible in document
        * @param  {node} component React component
        * @return {bool}
        */

    }, {
        key: 'checkNormalVisible',
        value: function checkNormalVisible(component) {
            var node = _reactDom2.default.findDOMNode(component);

            var _node$getBoundingClie2 = node.getBoundingClientRect(),
                top = _node$getBoundingClie2.top,
                elementHeight = _node$getBoundingClie2.height;

            var windowInnerHeight = window.innerHeight || document.documentElement.clientHeight;

            var offsets = Array.isArray(component.props.offset) ? component.props.offset : [component.props.offset, component.props.offset]; // Be compatible with previous API

            return top - offsets[0] <= windowInnerHeight && top + elementHeight + offsets[1] >= 0;
        }

        /**
        * Detect if element is visible in viewport, if so, set `visible` state to true.
        * If `once` prop is provided true, remove component as listener after checkVisible
        *
        * @param  {React} component   React component that respond to scroll and resize
        */

    }, {
        key: 'checkVisible',
        value: function checkVisible(component) {
            var node = _reactDom2.default.findDOMNode(component);
            if (!node) {
                return;
            }

            var isOverflow = this.parent !== node.ownerDocument && this.parent !== document && this.parent !== document.documentElement;

            var visible = isOverflow ? this.checkOverflowVisible(component, this.parent) : this.checkNormalVisible(component);

            if (visible) {
                // Avoid extra render if previously is visible, yeah I mean `render` call,
                // not actual DOM render
                if (!component.visible) {
                    if (component.props.once) {
                        pending.push(component);
                    }

                    component.visible = true;
                    component.forceUpdate();
                }
            } else if (!(component.props.once && component.visible)) {
                component.visible = false;
            }
        }
    }, {
        key: 'purgePending',
        value: function purgePending() {
            pending.forEach(function (component) {
                var index = listeners.indexOf(component);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            });

            pending = [];
        }
    }, {
        key: 'lazyLoadHandler',
        value: function lazyLoadHandler() {
            for (var i = 0; i < listeners.length; ++i) {
                var listener = listeners[i];
                this.checkVisible(listener);
            }

            // Remove `once` component in listeners
            this.purgePending();
        }
    }, {
        key: 'render',
        value: function render() {
            return this.visible ? this.props.children : this.props.placeholder ? this.props.placeholder : _react2.default.createElement('div', { style: { height: this.props.height }, className: 'lazyload-placeholder' });
        }
    }]);

    return LazyLoad;
}(_react.Component);

LazyLoad.propTypes = {
    once: _react.PropTypes.bool,
    height: _react.PropTypes.oneOfType([_react.PropTypes.number, _react.PropTypes.string]),
    offset: _react.PropTypes.oneOfType([_react.PropTypes.number, _react.PropTypes.arrayOf(_react.PropTypes.number)]),
    overflow: _react.PropTypes.bool,
    resize: _react.PropTypes.bool,
    scroll: _react.PropTypes.bool,
    children: _react.PropTypes.node,
    throttle: _react.PropTypes.oneOfType([_react.PropTypes.number, _react.PropTypes.bool]),
    debounce: _react.PropTypes.oneOfType([_react.PropTypes.number, _react.PropTypes.bool]),
    placeholder: _react.PropTypes.node
};

LazyLoad.defaultProps = {
    once: false,
    offset: 0,
    overflow: false,
    resize: false,
    scroll: true
};

var lazyload = exports.lazyload = _decorator2.default;
var lazyloadHandler = exports.lazyloadHandler = function lazyloadHandler() {
    return finalLazyLoadHandler && finalLazyLoadHandler();
};
exports.default = LazyLoad;