import { CellRenderer } from './cell-renderer.js';

export class CheckBoxCellRenderer extends CellRenderer {
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
    const el = document.createElement('div');
    el.classList.add('cell')
    const label = document.createElement('label');
    const input = this.input = document.createElement('input');
    input.type = 'checkbox';
    const renderer = this;
    input.addEventListener('change', function(e) {
      renderer._value = this.checked;
      eventHandler.change?.call(renderer, this, e);
    })
    label.append(document.createTextNode(`${this.x}, ${this.y}`), input);
    el.append(label);
    this._parentElement?.appendChild(el);
    return el;
  }
}
