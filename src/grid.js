import { Position } from './util/position.js';
import { Size } from './util/size.js';

export class Grid {
  static SIZE = 'Grid.SIZE';
  static INITIAL_VALUE = 'Grid.INITIAL_VALUE';

  static TOP = 1;
  static RIGHT = 2;
  static BOTTOM = 4;
  static LEFT = 8;

  size;
  initialValue;
  cellSize = new Size(1);
  cellOffset = new Position();
  offset = new Position();
  cells = new Map();

  static create() {
    return {
      size: [ Grid.SIZE, { optional: true } ],
      initialValue: [ Grid.INITIAL_VALUE, { optional: true } ],
    };
  }

  constructor({ size, initialValue }) {
    this.size = new Size();
    this.initialValue = initialValue ?? null;
    this.resize(Grid.RIGHT, size?.width ?? 0)
      .resize(Grid.BOTTOM, size?.height ?? 0);
  }

  setCellSize(width, height = null) {
    this.cellSize.width = width;
    this.cellSize.height = height ?? width;
    return this;
  }

  resize(side, amount) {
    if (side === Grid.TOP || side === Grid.BOTTOM) {
      this.size.height += amount;
      if (side === Grid.TOP) {
        this.offset.y += amount;
      }
    } else {
      this.size.width += amount;
      if (side === Grid.LEFT) {
        this.offset.y += amount;
      }
    }
    return this;
  }

  setRect(left, top, right, bottom) {
    // TODO account for inverted coordinates
    this.offset.x = left;
    this.offset.y = top;
    this.size.width = right - left;
    this.size.height = bottom - top;
    return this;
  }

  _getCellKey(x, y) {
    return x + '|' + y;
  }
  getCell(x, y) {
    const key = this._getCellKey(x, y);
    if (!this.cells.has(key)) {
      const { initialValue } = this;
      this.cells.set(key,
        typeof initialValue === 'function'
          ? initialValue(x, y, this) : initialValue
      )
    }
    return this.cells.get(key);
  }
  setCell(x, y, value) {
    this.cells.set(this._getCellKey(x, y), value);
  }
}
