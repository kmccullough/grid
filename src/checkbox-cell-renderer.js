import { CellRenderer } from './cell-renderer.js';
import { cloneNode } from './util/dom.js';

export class CheckBoxCellRenderer extends CellRenderer {
  static create() {
    return {
      template: [ CellRenderer.TEMPLATE ],
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

  _createElement() {
    const { eventHandler } = this;
    const el = cloneNode(this.template);
    el.classList.add('cell')
    const label = el.querySelector('[data-slot-cell-label]');
    const input = this.input = el.querySelector('[data-slot-cell-input]');
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
