export class CellRenderer {
  static X = Symbol('CellRenderer.X');
  static Y = Symbol('CellRenderer.Y');
  static EVENT_HANDLER = Symbol('CellRenderer.EVENT_HANDLER');
  static VALUE = Symbol('CellRenderer.VALUE');
  static PARENT_ELEMENT = Symbol('CellRenderer.PARENT_ELEMENT');

  x;
  y;
  element;
  eventHandler;
  value;

  static create() {
    return {
      x: [ CellRenderer.X, { optional: true }],
      y: [ CellRenderer.Y, { optional: true } ],
      eventHandler: [ CellRenderer.EVENT_HANDLER, { optional: true } ],
      value: [ CellRenderer.VALUE, { optional: true } ],
      parentElement: [ CellRenderer.PARENT_ELEMENT, { optional: true } ],
    };
  }

  constructor({ x, y, eventHandler, value = null, parentElement }) {
    if (Object.getPrototypeOf(this) === CellRenderer) {
      throw new Error('CellRenderer is abstract');
    }
    this.x = +x || 0;
    this.y = +y || 0;
    this.eventHandler = eventHandler;
    this.element = this._createElement(parentElement);
    this.value = value;
  }

  _parentElement;

  _createElement() {

  }
}
