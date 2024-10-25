import { Events } from './util/events.js';

/**
 * @typedef {'focus'|'blur'} FocusHandlerEvent
 */

export class FocusHandler {
  static EVENTS = Symbol('FocusHandler.EVENTS');
  static CONTAINER = Symbol('FocusHandler.CONTAINER');
  static FOCUSABLE = Symbol('FocusHandler.FOCUSABLE');

  static create() {
    return {
      eventsGiven: [ FocusHandler.EVENTS, { optional: true } ],
      eventsDefault: [ Events, { optional: true } ],
      container: [ FocusHandler.CONTAINER, { optional: true } ],
      focusable: [ FocusHandler.FOCUSABLE ],
    };
  }

  constructor({ eventsGiven, eventsDefault, container, focusable }) {
    if (!(this.events = eventsGiven ?? eventsDefault)) {
      throw new Error('FocusHandler depends on Events');
    }
    container = container || focusable
    this.container = container;
    this.focusable = focusable;
    focusable.addEventListener('focus', e => {
      this._setFocussedTabindex(true);
      this.events.emit('focus', this, this.container, this.focusable, this, e);
    });
    focusable.addEventListener('blur', e => {
      this._setFocussedTabindex(false);
      this.events.emit('blur', this, this.container, this.focusable, this, e);
    });
  }

  focus() {
    this._setFocussedTabindex(true);
    if (document.activeElement !== this.focusable) {
      this.focusable.focus();
    }
  }

  /**
   * @param {FocusHandlerEvent} event
   * @param {function} callback
   * @return {FocusHandler}
   */
  on(event, callback) {
    this.events.on(event, callback);
    return this;
  }

  /**
   * @param {FocusHandlerEvent} event
   * @param {function} callback
   * @return {FocusHandler}
   */
  off(event, callback) {
    this.events.off(event, callback);
    return this;
  }

  _setFocussedTabindex(focussed) {
    const tabindex = this.focusable.getAttribute('tabindex');
    if (focussed) {
      if (tabindex === '-1') {
        const index = this.focusable.dataset.defaultTabindex || '0';
        this.focusable.setAttribute('tabindex', index);
      }
    } else {
      if (tabindex !== '-1') {
        if (!this.focusable.dataset.defaultTabindex && tabindex !== '0') {
          this.focusable.dataset.defaultTabindex = tabindex;
        }
        this.focusable.setAttribute('tabindex', '-1');
      }
    }
  }
}
