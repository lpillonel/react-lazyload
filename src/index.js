/**
* react-lazyload
*/
import React, { Component, PropTypes } from 'react';
import ReactDom from 'react-dom';
import { on, off } from './utils/event';
import scrollParent from './utils/scrollParent';
import debounce from './utils/debounce';
import throttle from './utils/throttle';

const LISTEN_FLAG = 'data-lazyload-listened';
const listeners = [];
let pending = [];


// Depending on component's props
let delayType;
let finalLazyLoadHandler = null;


class LazyLoad extends Component {

    constructor(props) {
        super(props);

        this.visible = false;
    }

    componentDidMount() {
        this.parent = scrollParent(ReactDom.findDOMNode(this));

        // It's unlikely to change delay type on the fly, this is mainly
        // designed for tests
        let needResetFinalLazyLoadHandler = false;
        if (this.props.debounce !== undefined && delayType === 'throttle') {
            console.warn('[react-lazyload] Previous delay function is `throttle`, now switching to `debounce`, try setting them unanimously');
            needResetFinalLazyLoadHandler = true;
        } else if (delayType === 'debounce' && this.props.debounce === undefined) {
            console.warn('[react-lazyload] Previous delay function is `debounce`, now switching to `throttle`, try setting them unanimously');
            needResetFinalLazyLoadHandler = true;
        }

        if (needResetFinalLazyLoadHandler) {
            off(window, 'scroll', finalLazyLoadHandler);
            off(window, 'resize', finalLazyLoadHandler);
            finalLazyLoadHandler = null;
        }

        if (!finalLazyLoadHandler) {
            if (this.props.debounce !== undefined) {
                finalLazyLoadHandler = debounce(this.lazyLoadHandler.bind(this), typeof this.props.debounce === 'number' ?
                this.props.debounce :
                300);
                delayType = 'debounce';
            } else {
                finalLazyLoadHandler = throttle(this.lazyLoadHandler.bind(this), typeof this.props.throttle === 'number' ?
                this.props.throttle :
                300);
                delayType = 'throttle';
            }
        }

        if (this.props.overflow) {
            if (this.parent) {
                const listenerCount = 1 + (+this.parent.getAttribute(LISTEN_FLAG));
                if (listenerCount === 1) {
                    this.parent.addEventListener('scroll', finalLazyLoadHandler);

                    if (this.props.resize) {
                        on(window, 'resize', finalLazyLoadHandler);
                    }
                }
                this.parent.setAttribute(LISTEN_FLAG, listenerCount);
            }
        } else if (listeners.length === 0 || needResetFinalLazyLoadHandler) {
            const { scroll, resize } = this.props;

            if (scroll) {
                on(window, 'scroll', finalLazyLoadHandler);
            }

            if (resize) {
                on(window, 'resize', finalLazyLoadHandler);
            }
        }

        listeners.push(this);
        this.checkVisible(this);
    }

    shouldComponentUpdate(nextProps) {
        return this.visible || (! this.visible && nextProps.placeholder !== this.props.placeholder);
    }

    componentWillUnmount() {
        if (this.props.overflow) {
            if (this.parent) {
                const listenerCount = (+this.parent.getAttribute(LISTEN_FLAG)) - 1;
                if (listenerCount === 0) {
                    this.parent.removeEventListener('scroll', finalLazyLoadHandler);
                    this.parent.removeAttribute(LISTEN_FLAG);
                } else {
                    this.parent.setAttribute(LISTEN_FLAG, listenerCount);
                }
            }
        }

        const index = listeners.indexOf(this);
        if (index !== -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            off(window, 'resize', finalLazyLoadHandler);
            off(window, 'scroll', finalLazyLoadHandler);

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
    checkOverflowVisible(component, parent) {
        const node = ReactDom.findDOMNode(component);

        const { top: parentTop, height: parentHeight } = parent.getBoundingClientRect();
        const windowInnerHeight = window.innerHeight || document.documentElement.clientHeight;

        // calculate top and height of the intersection of the element's scrollParent and viewport
        const intersectionTop = Math.max(parentTop, 0); // intersection's top relative to viewport
        const intersectionHeight = Math.min(windowInnerHeight, parentTop + parentHeight) - intersectionTop; // height

        // check whether the element is visible in the intersection
        const { top, height } = node.getBoundingClientRect();
        const offsetTop = top - intersectionTop; // element's top relative to intersection

        const offsets = Array.isArray(component.props.offset) ?
        component.props.offset :
        [component.props.offset, component.props.offset]; // Be compatible with previous API


        return (offsetTop - offsets[0] <= intersectionHeight) &&
        (offsetTop + height + offsets[1] >= 0);
    }

    /**
    * Check if `component` is visible in document
    * @param  {node} component React component
    * @return {bool}
    */
    checkNormalVisible(component) {
        const node = ReactDom.findDOMNode(component);

        const { top, height: elementHeight } = node.getBoundingClientRect();

        const windowInnerHeight = window.innerHeight || document.documentElement.clientHeight;

        const offsets = Array.isArray(component.props.offset) ?
        component.props.offset :
        [component.props.offset, component.props.offset]; // Be compatible with previous API

        return (top - offsets[0] <= windowInnerHeight) &&
        (top + elementHeight + offsets[1] >= 0);
    }

    /**
    * Detect if element is visible in viewport, if so, set `visible` state to true.
    * If `once` prop is provided true, remove component as listener after checkVisible
    *
    * @param  {React} component   React component that respond to scroll and resize
    */
    checkVisible(component) {
        const node = ReactDom.findDOMNode(component);
        if (!node) {
            return;
        }

        const isOverflow = this.parent !== node.ownerDocument &&
        this.parent !== document &&
        this.parent !== document.documentElement;

        const visible = isOverflow ?
        this.checkOverflowVisible(component, this.parent) :
        this.checkNormalVisible(component);

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

    purgePending() {
        pending.forEach(component => {
            const index = listeners.indexOf(component);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        });

        pending = [];
    }

    lazyLoadHandler() {
        for (let i = 0; i < listeners.length; ++i) {
            const listener = listeners[i];
            this.checkVisible(listener);
        }

        // Remove `once` component in listeners
        this.purgePending();
    }

    render() {
        return this.visible ?
        this.props.children :
        this.props.placeholder ?
        this.props.placeholder :
        <div style={{ height: this.props.height }} className="lazyload-placeholder"></div>;
    }
}

LazyLoad.propTypes = {
    once: PropTypes.bool,
    height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    offset: PropTypes.oneOfType([PropTypes.number, PropTypes.arrayOf(PropTypes.number)]),
    overflow: PropTypes.bool,
    resize: PropTypes.bool,
    scroll: PropTypes.bool,
    children: PropTypes.node,
    throttle: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
    debounce: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
    placeholder: PropTypes.node
};

LazyLoad.defaultProps = {
    once: false,
    offset: 0,
    overflow: false,
    resize: false,
    scroll: true
};

import decorator from './decorator';
export const lazyload = decorator;
export const lazyloadHandler = () => finalLazyLoadHandler && finalLazyLoadHandler();
export default LazyLoad;
