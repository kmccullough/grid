import { GridCellRenderer } from './grid/grid-cell-renderer.js';
import { cloneNode } from './util/dom.js';

export class CheckBoxCellRenderer extends GridCellRenderer {
  static create() {
    return {
      template: [ GridCellRenderer.TEMPLATE ],
    };
  }

  input;

  _value = false;
  get value() {
    return this._value;
  }
  set value(value) {
    this._value = value;
    if (this.input) {
      this.input.checked = value;
    }
  }

  focus() {
    this._focus.setAttribute('tabindex', '0');
  }

  blur() {
    this._focus.setAttribute('tabindex', '-1');
  }

  _createElement() {
    const { eventHandler } = this;
    const el = cloneNode(this.template);
    const label = el.querySelector('[data-slot-cell-label]');
    const input = this.input = el.querySelector('[data-slot-cell-input]');
    this._focus = this.input = el.querySelector('[data-slot-cell-focusable]');
    this.blur();
    const renderer = this;
    input.addEventListener('change', function(e) {
      renderer._value = this.checked;
      eventHandler.change?.call(renderer, this, e);
    })
    label.innerHTML = `${this.x}, ${this.y}`;
    this.parentElement?.appendChild(el);
    return el;
  }
}
