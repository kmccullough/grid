import Position from './util/position.js';
import Size from './util/size.js';

export default class Grid {
  static SIZE = 'Grid.SIZE';
  static OFFSET = 'Grid.OFFSET';
  static INITIAL_VALUE = 'Grid.INITIAL_VALUE';

  static TOP = 1;
  static RIGHT = 2;
  static BOTTOM = 4;
  static LEFT = 8;

  size;
  offset;
  initialValue;
  cellSize = new Size(1);
  cellOffset = new Position();
  position = new Position();
  positionFraction = new Position();
  cells = new Map();

  static create() {
    return {
      size: [ Grid.SIZE, { optional: true } ],
      offset: [ Grid.OFFSET, { optional: true } ],
      initialValue: [ Grid.INITIAL_VALUE, { optional: true } ],
    };
  }

  constructor({ size, offset, initialValue }) {
    const { width = 0, height = 0 } = size || {};
    const { x = 0, y = 0 } = offset || {};
    this.size = new Size(width, height);
    this.offset = new Position(x, y);
    this.initialValue = initialValue ?? null;
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

  setSize(size, offset = null) {
    this.size.width = size.width;
    this.size.height = size.height;
    if (offset) {
      this.offset.x = offset.x;
      this.offset.y = offset.y;
    }
    return this;
  }

  setOffset(offset) {
    this.offset.x = offset.x;
    this.offset.y = offset.y;
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

  getCellSize() {
    return this.cellSize;
  }

  setCellSize(size, offset = null) {
    this.cellSize.width = size.width;
    this.cellSize.height = size.height;
    if (offset) {
      this.cellOffset.x = offset.x;
      this.cellOffset.y = offset.y;
    }
    return this;
  }

  setCellOffset(offset = null) {
    this.cellOffset.x = offset.x;
    this.cellOffset.y = offset.y;
    return this;
  }

  getPosition() {
    return this.position;
  }

  getPositionFraction() {
    return this.positionFraction;
  }

  setPosition(position, positionFraction = new Position()) {
    this.position = position;
    this.positionFraction = positionFraction;
  }

  movePixelPosition(dx, dy) {
    const {
      cellSize: { width: cellWidth, height: cellHeight },
      position, positionFraction,
    } = this;
    const x = this.getCoordinatePosition(
      position.x, positionFraction.x, cellWidth, dx
    );
    const y = this.getCoordinatePosition(
      position.y, positionFraction.y, cellHeight, dy
    );
    const px = Math.floor(x);
    const py = Math.floor(y);
    this.setPosition(
      new Position(px, py),
      new Position(x - px, y - py),
    );
    return this;
  }

  getCoordinatePosition(pos, frac, size, delta = 0) {
    return -this.getCoordinatePixelPosition(pos, frac, size, delta) / size;
  }

  getCoordinatePixelPosition(pos, frac, size, delta = 0) {
    return -(pos + frac) * size + delta;
  }

  _getCellKey(x, y) {
    return x + ',' + y;
  }

  hasCell(x, y) {
    return this.cells.has(this._getCellKey(x, y));
  }

  getCell(x, y, optional = false) {
    const key = this._getCellKey(x, y);
    if (!this.cells.has(key) && !optional) {
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
