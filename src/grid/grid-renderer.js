import FocusHandler from '../focus-handler.js';
import Grid from '../grid.js';
import GridCellRenderer from './grid-cell-renderer.js';
import GridIterator from './grid-iterator.js';
import GridScroller from './grid-scroller.js';
import { cloneNode, insertBefore, wrapFragment } from '../util/dom.js';
import { softSet } from '../util/object.js';
import ObjectPool from '../util/object-pool.js';
import Size from '../util/size.js';
import HotArray from '../util/hot-array.js';

export default class GridRenderer {
  static GRID = Symbol('GridRenderer.GRID');
  static SIZE = Symbol('GridRenderer.SIZE');
  static RENDER_GRID = Symbol('GridRenderer.RENDER_GRID');
  static ELEMENT = Symbol('GridRenderer.ELEMENT');
  static ELEMENT_POOL = Symbol('GridRenderer.ELEMENT_POOL');
  static ITERATOR = Symbol('GridRenderer.ITERATOR');
  static SCROLLER = Symbol('GridRenderer.SCROLLER');

  static create() {
    return {
      cellRenderer: [ GridCellRenderer, { factory: true } ],
      focusHandler: [ FocusHandler, { factory: true } ],
      gridFactory: [ Grid, { factory: true } ],
      grid: [ GridRenderer.GRID, { optional: true } ],
      gridSize: [ GridRenderer.SIZE, { optional: true } ],
      renderGrid: [ GridRenderer.RENDER_GRID, { optional: true } ],
      element: [ GridRenderer.ELEMENT ],
      elementPool: [ GridRenderer.ELEMENT_POOL, { optional: true } ],
      iterator: [ GridIterator ],
      scroller: [ GridRenderer.SCROLLER ],
    };
  }

  element;
  grid;
  // cell offset from top left of grid window
  offset = { x: 0, y: 0, z: 0 };
  visibleCells = new HotArray();

  /**
   * @param {GridCellRenderer} cellRenderer
   * @param {FocusHandler} focusHandler
   * @param {function(...args:*):Grid} gridFactory
   * @param {GridScroller} scroller
   * @param {Grid} [grid]
   * @param {Grid} [renderGrid]
   * @param {Size} [gridSize]
   * @param {Element} [element]
   * @param {ObjectPool} [elementPool]
   * @param {GridIterator} [iterator]
   */
  constructor({
    cellRenderer,
    focusHandler,
    gridFactory,
    grid,
    renderGrid,
    gridSize,
    element,
    elementPool,
    iterator,
    scroller,
  }) {
    this.cellRenderer = cellRenderer;
    this.focusHandler = focusHandler;
    this.iterator = iterator.colsOfRows().topToBottom().leftToRight();
    this.gridFactory = gridFactory;
    this._setupElementPool(elementPool);
    this._setupVisibleCellPool();
    this.setGrid(
      !grid ? gridFactory([ [ Grid.SIZE, gridSize ] ])
      : (!gridSize ? grid
        : grid.setRect(0, 0, gridSize.width, gridSize.height) && grid
      )
    );
    this._renderGrid = renderGrid ?? gridFactory([ [ Grid.INITIAL_VALUE, this._initialValue.bind(this) ] ]);
    this.setCellSize(new Size(200, 50));
    this.setElement(element);
    this.scroller = scroller;
    scroller.init(this);
    this.render();
  }

  // TODO create a size testing element with aria-hidden="true" and visibility: hidden

  setElement(element) {
    this._element = element;
  }

  setGrid(grid) {
    this.grid = grid;
  }

  getCellSize() {
    return this.grid.getCellSize();
  }

  setCellSize(size, offset = null) {
    this.grid.setCellSize(size, offset);
    return this.render();
  }

  setCellOffset(offset) {
    this.grid.setCellOffset(offset);
    return this.render();
  }

  getPosition() {
    return this.grid.getPosition();
  }

  getPositionFraction() {
    return this.grid.getPositionFraction();
  }

  setPosition(position, positionFraction = null) {
    this.grid.setPosition(position, positionFraction);
    return this.render();
  }

  movePixelPosition(dx, dy) {
    this.grid.movePixelPosition(dx, dy);
    return this.render();
  }

  resize(side, amount) {
    this.grid.resize(side, amount);
    this.render();
    return this;
  }

  hasCell(x, y) {
    return this.grid.hasCell(x, y);
  }

  getCell(x, y, optional = false) {
    return this.grid.getCell(x, y, optional);
  }

  setCell(x, y, value) {
    this.grid.setCell(x, y, value);
    const rendered = this._renderGrid.getCell(x, y);
    if (rendered) {
      rendered.value = value;
    }
    this.render();
  }

  render() {
    if (this._isRenderQueued) {
      return;
    }
    this._isRenderQueued = true;
    requestAnimationFrame(() => {
      this._isRenderQueued = false;
      if (this._lastRender + this._frameDelta > Date.now()) {
        this.render();
        return;
      }
      this._lastRender = Date.now();
      this._render();
    });
    return this;
  }

  _renderGrid;
  _isRenderQueued = false;
  _cellTemplate;
  _cols = new Map();
  _rows = new Map();
  _focusedRow;
  _focusedCol;
  _roundTo = 1;

  _fps = 30;
  _frameDelta = 1000 / this._fps;
  _lastRender = -Infinity;

  _setupElementPool(elementPool = new ObjectPool()) {
    const border = '1px solid rgba(0, 0, 0, 0.5)';
    this.elementPool = elementPool
      .onCreate(() => {
        const el = document.createElement('div');
        Object.assign(el.style, {
          position: 'absolute',
          boxSizing: 'border-box',
          borderTop: border,
          borderLeft: border,
          backgroundColor: 'white',
          left: 0,
          top: 0,
          willChange: 'width, height, transform',
        });
        this._element.appendChild(el);
        return el;
      })
      .onBorrow(el => {
        const cellSize = this.getCellSize();
        Object.assign(el.style, {
          width: `round(${cellSize.width}px, ${this._roundTo}px)`,
          height: `round(${cellSize.height}px, ${this._roundTo}px)`,
        });
        el.style.removeProperty('display');
      })
      .onRelease(el => {
        el.style.display = 'none';
      })
    ;
  }

  _setupVisibleCellPool(visibleCellPool = new ObjectPool()) {
    this.visibleCellPool = visibleCellPool
      .onCreate(() => new HotArray())
      .onRelease(cells => cells.clear())
    ;
  }

  _createElement() {
    const el = wrapFragment(cloneNode(this.template), 'div');
    const getCell = this._renderGrid.getCell.bind(this._renderGrid);
    el.addEventListener('keydown', e => {
      console.log('e', e.key);
      this._findFocus(e.target);

      let rowCaret = this._focusedRow;
      let colCaret = this._focusedCol;
      let nextCell;

      switch (e.key) {
        case 'ArrowUp':
          nextCell = this._getNextFocusableCell(0, -1);
          rowCaret = nextCell.row;
          colCaret = nextCell.col;
          break;
        case 'ArrowDown':
          nextCell = this._getNextFocusableCell(0, 1);
          rowCaret = nextCell.row;
          colCaret = nextCell.col;
          break;
        case 'ArrowLeft':
          nextCell = this._getNextFocusableCell(-1, 0);
          rowCaret = nextCell.row;
          colCaret = nextCell.col;
          break;
        case 'ArrowRight':
          nextCell = this._getNextFocusableCell(1, 0);
          rowCaret = nextCell.row;
          colCaret = nextCell.col;
          break;
        case 'Home':
          if (e.ctrlKey) {
            rowCaret = 0;
          }
          colCaret = 0;
          break;
        case 'End':
          if (e.ctrlKey) {
            rowCaret = this.grid.length - 1;
          }
          colCaret = this.grid[this._focusedRow].length - 1;
          break;
        default:
          console.log('keydown', e.key, e);
          return;
      }

      this._focusCell(rowCaret, colCaret);
      e.preventDefault();
    });

    this._shouldWrapCols = el.hasAttribute('data-wrap-cols');
    this._shouldWrapRows = el.hasAttribute('data-wrap-rows');

    const labelId = 'gridLabel.' + Math.random();

    this._label = el.querySelector('[data-slot-label]');
    this._labelledBy = el.querySelector('[data-slot-labelled-by]');
    if (this._label) {
      this._label.id = labelId;
      this._label.innerHTML = '';
      this._labelledBy?.setAttribute('aria-labelled-by', labelId);
    }

    this._headCol = el.querySelector('[data-slot-head-col]');
    this._headColEnd = document.createComment('head col');
    this._headCol.replaceWith(this._headColEnd);

    this._row = el.querySelector('[data-slot-grid-row]');
    this._rowStart = document.createComment('row start');
    this._rowEnd = document.createComment('row end');
    this._row.replaceWith(this._rowStart, this._rowEnd);

    this._cellTemplate = this._row.querySelector('[data-slot-cell]');

    return el;
  }

  _findFocus(target) {
    const focusedCell = this.getCell(this._focusedRow, this._focusedCol, true)?.element;

    if (focusedCell && (focusedCell === target || focusedCell.contains(target))) {
      return;
    }

    for (const [ , { cell } ] of this.grid.cells) {
      if (cell.element === target || cell.element.contains(target)) {
        this._setFocus(cell.x, cell.y);
        return;
      }
    }
  }

  _focusCell(x, y) {
    if (this._setFocus(x, y)) {
      this.getCell(x, y).element.focus();
    }
  }

  _setFocus(x, y) {
    // TODO getCell is pointing to the wrong grid
    const cell = this.getCell(x, y, true);
    console.log('_setFocus', x, y, cell);
    if (!cell) {
      return false;
    }

    const oldFocus = this.getCell(this._focusedCol, this._focusedRow, true);
    console.log(oldFocus, cell);
    if (oldFocus !== cell || cell.cell.element.getAttribute('tabindex') === '-1') {
      if (oldFocus !== cell) {
        oldFocus.element.setAttribute('tabindex', -1);
      }

      // this.grid[y][x].removeEventListener('focus', this.showKeysIndicator);
      // this.grid[y][x].removeEventListener('blur', this.hideKeysIndicator);

      // Disable navigation if focused on an input
      // this._navigationDisabled = aria.Utils.matches(this.grid[y][x], 'input:not([type="checkbox"])');

      cell.cell.element.setAttribute('tabindex', 0);
      this._focusedRow = y;
      this._focusedCol = x;

      // this.grid[y][x].addEventListener('focus', this.showKeysIndicator);
      // this.grid[y][x].addEventListener('blur', this.hideKeysIndicator);
    }

    return true;
  }
  
  _getNextCell(startX, startY, directionX, directionY) {
    const startCell = this.getCell(startX, startY, true);
    let y = startX + directionX;
    let x = startY + directionY;
    let rowCount = this.grid.height;
    let isLeftRight = directionX !== 0;

    if (!rowCount) {
      return false;
    }

    let colCount = this.grid.width;

    if (this._shouldWrapCols && isLeftRight) {
      if (y < 0) {
        y = colCount - 1;
        --x;
      }

      if (y >= colCount) {
        y = 0;
        ++x;
      }
    }

    if (this._shouldWrapRows && !isLeftRight) {
      if (x < 0) {
        --y;
        x = rowCount - 1;
        if (y >= 0 && !this.hasCell(x, y)) {
          // Sometimes the bottom row is not completely filled in. In this case,
          // jump to the next filled in cell.
          --x;
        }
      } else if (x >= rowCount || !this.hasCell(x, y)) {
        x = 0;
        ++y;
      }
    }

    return this.getCell(x, y, true) || startCell || false;
  }
  
  _getNextFocusableCell(directionX, directionY) {
    let nextCell = this._getNextCell(
      this._focusedRow,
      this._focusedCol,
      directionX,
      directionY
    );

    if (!nextCell) {
      return false;
    }

    while (true/*this.isHidden(nextCell.row, nextCell.col)*/) {
      const { x, y } = nextCell;
      nextCell = this._getNextCell(x, y, directionX, directionY);
      if (y === nextCell.y && x === nextCell.x) {
        // There are no more cells to try if getNextCell returns the current cell
        return false;
      }
    }

    return nextCell;
  }
  
  _initialValue(x, y) {
    const cell = this.cellRenderer([
      [ GridCellRenderer.X, x ],
      [ GridCellRenderer.Y, y ],
      [ GridCellRenderer.EVENT_HANDLER, this._cellEventHandler(x, y) ],
    ]);
    /** @var {FocusHandler} */
    const focus = this.focusHandler([
      [ FocusHandler.CONTAINER, cell.element ],
      [ FocusHandler.FOCUSABLE, cell.element.querySelector('[data-slot-cell-focusable]') ],
    ]);
    focus.on('focus', () => {
      console.log('focus', ...arguments);
      this._setFocus(cell.x, cell.y);
    });
    focus.on('blur', () => {
      console.log('blur', ...arguments);
    });
    const cellValue = { cell, focus };
    return cellValue;
  }

  _cellEventHandler(x, y) {
    const renderer = this;
    return {
      change() {
        console.log('change', x, y, this.value, renderer.getCell(x, y));
        renderer.setCell(x, y, this.value);
      },
    };
  }

  _render() {
    const { iterator } = this;
    const sourceGrid = this.grid;
    const renderGrid = this._renderGrid;
    const { size, offset, cellSize, cellOffset } = sourceGrid;
    const hasAllCellChange = cellSize.width !== renderGrid.cellSize.width
      || cellSize.height !== renderGrid.cellSize.height
      || cellOffset.x !== renderGrid.cellOffset.x
      || cellOffset.y !== renderGrid.cellOffset.y;
    const targetGrid = this.gridFactory([
      [ Grid.SIZE, size ],
      [ Grid.OFFSET, offset ],
    ]);
    renderGrid.setSize(size, offset);
    renderGrid.setCellSize(cellSize, cellOffset);
    const getCell = this._renderGrid.getCell.bind(this._renderGrid);

    const { width: pxCellWidth, height: pxCellHeight } = cellSize;
    const el = this._element;
    const { width, height } = el.getBoundingClientRect();
    const isInfinite = true;
    const isCentered = false;//isInfinite;

    const cells = this.visibleCells;

    const { x: px, y: py } = sourceGrid.getPosition();
    const { x: fx, y: fy } = sourceGrid.getPositionFraction();

    const pxPosX = this.grid.getCoordinatePixelPosition(px, fx, pxCellWidth);
    const pxPosY = this.grid.getCoordinatePixelPosition(py, fy, pxCellHeight);

    let pxStartX = pxPosX % pxCellWidth;
    if (pxStartX > 0) {
      pxStartX -= pxCellWidth;
    }
    let pxStartY = pxPosY % pxCellHeight;
    if (pxStartY > 0) {
      pxStartY -= pxCellHeight;
    }
    const visibleCellsWidth = Math.ceil(
      (width - (pxStartX < 0 ? pxStartX : 0))
      / pxCellWidth
    );
    const visibleCellsHeight = Math.ceil(
      (height - (pxStartY < 0 ? pxStartY : 0))
      / pxCellHeight
    );

    this.elementPool.releaseAll();

    let cellCount = 0;
    for (let iCellY = 0; iCellY < visibleCellsHeight; ++iCellY) {
      const y = pxStartY + iCellY * pxCellHeight;
      for (let iCellX = 0; iCellX < visibleCellsWidth; ++iCellX) {
        const x = pxStartX + iCellX * pxCellWidth;
        const cellEl = this.elementPool.borrow();
        Object.assign(cellEl.style, {
          transform: 'translate('
            + `round(${x}px, ${this._roundTo}px),`
            + `round(${y}px, ${this._roundTo}px)`
          + ')',
        });
        cellEl.innerText = `${px + iCellX}, ${py + iCellY}`;
        ++cellCount;
      }
    }
    console.log('Rendered', cellCount)

    let firstRow = true;
    iterator
      // First render, grids may be same size, and we need to render new elements,
      // but on subsequent renders we can skip unchanged cells already rendered,
      // unless cell size/offset changed, then we need to update labels.
      .skipUnchanged(!!(this._hasRendered && !hasAllCellChange))
      .eachRowOrCol(sourceGrid, targetGrid, (y, state) => {
        console.log('itr', y, state);
        let row = this._rows.get(y);
        if (!row) {
          const element = cloneNode(this._row);
          const insertion = document.createComment('cell');
          element.querySelector('[data-slot-cell]').replaceWith(insertion);
          row = {
            element,
            insertion,
            heading: element.querySelector('[data-slot-head-row]'),
          };
          this._rows.set(y, row);
          insertBefore(row.element, this._rowEnd);
        }
        // Set `y`/`row` coordinate on left heading of table
        row.heading && softSet(row.heading, 'innerHTML', y);
        // Iterate each col/cell of row
        iterator.eachCellOfRowOrCol(y, sourceGrid, targetGrid, (x, y, sourceCell, targetCell, state) => {
          console.log('it', x, y, state);

          if (firstRow) {
            let col = this._cols.get(x);
            if (!col) {
              col = cloneNode(this._headCol);
              this._cols.set(x, col);
              insertBefore(col, this._headColEnd);
            }
            // Set `x`/`col` coordinate on top heading of table
            softSet(col, 'innerHTML', x);
          }

          const cell = getCell(x, y);
          if (!row.insertion.parentNode.contains(cell.cell.element)) {
            insertBefore(cell.cell.element, row.insertion);
          }
        });
        firstRow = false;
      });

    const focusedCell = this.getCell(this._focusedRow, this._focusedCol, true);
    if (focusedCell) {
      focusedCell.focus.focus();
    }

    if (!this._hasRendered) {
      this._hasRendered = true;
    }
  }
}
