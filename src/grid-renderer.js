import { Grid } from './grid.js';
import { CellRenderer } from './cell-renderer.js';
import { cloneNode, insertBefore, wrapFragment } from './util/dom.js';
import { FocusHandler } from './focus-handler.js';

export class GridRenderer {
  static GRID = Symbol('GridRenderer.GRID');
  static SIZE = Symbol('GridRenderer.SIZE');
  static RENDER_GRID = Symbol('GridRenderer.RENDER_GRID');
  static TEMPLATE = Symbol('GridRenderer.TEMPLATE');
  static PARENT_ELEMENT = Symbol('GridRenderer.PARENT_ELEMENT');

  static create() {
    return {
      cellRenderer: [ CellRenderer, { factory: true } ],
      focusHandler: [ FocusHandler, { factory: true } ],
      gridFactory: [ Grid, { factory: true, optional: true } ],
      grid: [ GridRenderer.GRID, { optional: true } ],
      gridSize: [ GridRenderer.SIZE, { optional: true } ],
      renderGrid: [ GridRenderer.RENDER_GRID, { optional: true } ],
      template: [ GridRenderer.TEMPLATE ],
      parentElement: [ GridRenderer.PARENT_ELEMENT, { optional: true } ],
    };
  }

  element;
  grid;
  template;
  parentElement;

  /**
   * @param {CellRenderer} cellRenderer
   * @param {function(...args:*):Grid} gridFactory
   * @param {Grid} [grid]
   * @param {Grid} [renderGrid]
   * @param {Size} [gridSize]
   * @param {Element} [parentElement]
   */
  constructor({ cellRenderer, focusHandler, gridFactory, grid, renderGrid, gridSize, template, parentElement }) {
    this.cellRenderer = cellRenderer;
    this.focusHandler = focusHandler;
    this.template = template;
    this.parentElement = parentElement;
    this.grid = !grid ? gridFactory([ [ Grid.SIZE, gridSize ] ])
      : (!gridSize ? grid
        : grid.setRect(0, 0, gridSize.width, gridSize.height) && grid
      );
    this._renderGrid = renderGrid ?? gridFactory([ [ Grid.INITIAL_VALUE, this._initialValue.bind(this) ] ]);
    this.element = this._createElement();
    this.render();
  }

  setCellSize(width, height = width) {
    this.grid.setCellSize(width, height);
    this.render();
    return this;
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

    this.parentElement?.appendChild(el);

    return el;
  }

  _findFocus(target) {
    const focusedCell = this.getCell(this._focusedRow, this._focusedCol, true)?.element;

    if (focusedCell === target || focusedCell.contains(target)) {
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
    const cell = this.getCell(x, y, true);
    if (!cell) {
      return false;
    }

    this.getCell(this._focusedCol, this._focusedRow, true)
      ?.element.setAttribute('tabindex', -1);

    // this.grid[y][x].removeEventListener('focus', this.showKeysIndicator);
    // this.grid[y][x].removeEventListener('blur', this.hideKeysIndicator);

    // Disable navigation if focused on an input
    // this._navigationDisabled = aria.Utils.matches(this.grid[y][x], 'input:not([type="checkbox"])');

    cell.cell.element.setAttribute('tabindex', 0);
    this._focusedRow = y;
    this._focusedCol = x;

    // this.grid[y][x].addEventListener('focus', this.showKeysIndicator);
    // this.grid[y][x].addEventListener('blur', this.hideKeysIndicator);

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
      [ CellRenderer.X, x ],
      [ CellRenderer.Y, y ],
      [ CellRenderer.EVENT_HANDLER, this._cellEventHandler(x, y) ],
      ...(this._cellTemplate ? [ [ CellRenderer.TEMPLATE, this._cellTemplate ] ] : [])
    ]);
    /** @var {FocusHandler} */
    const focus = this.focusHandler([
      [ FocusHandler.CONTAINER, cell.element ],
      [ FocusHandler.FOCUSABLE, cell.element.querySelector('[data-slot-cell-focusable]') ],
    ]);
    focus.on('focus', () => {
      console.log('focus', ...arguments);
    });
    focus.on('blur', () => {
      console.log('blur', ...arguments);
    });
    return { cell, focus };
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
    const {
      cellOffset: { x: cx, y: cy },
      cellSize: { width: cw, height: ch },
      offset: { x: ox, y: oy },
      size: { width: w, height: h },
    } = this.grid;
    const {
      cellOffset: { x: rcx, y: rcy },
      cellSize: { width: rcw, height: rch },
      offset: { x: rox, y: roy },
      size: { width: rw, height: rh },
    } = this._renderGrid;
    const getCell = this._renderGrid.getCell.bind(this._renderGrid);

    this._renderGrid.offset.x = ox;
    this._renderGrid.offset.y = oy;
    this._renderGrid.cellOffset.x = cx;
    this._renderGrid.cellOffset.y = cy;
    this._renderGrid.size.width = w;
    this._renderGrid.size.height = h;
    this._renderGrid.cellSize.width = cw;
    this._renderGrid.cellSize.height = ch;
    const dox = rox - ox;
    const [ sox, eox ] = dox < 0 ? [ dox, 0 ] : [ 0, dox ];
    const doy = roy - oy;
    const [ startTop, endTop ] = doy < 0 ? [ doy, 0 ] : [ 0, doy ];
    const dcx = rcx - cx;
    const [ scx, ecx ] = dcx < 0 ? [ dcx, 0 ] : [ 0, dcx ];
    const dcy = rcy - cy;
    const [ scy, ecy ] = dcy < 0 ? [ dcy, 0 ] : [ 0, dcy ];
    const dw = Math.max(0, rw - w);
    const [ startRight, endRight ] = dw < 0 ? [ dw, 0 ] : [ 0, dw ];
    const dh = Math.max(0, rh - h);
    const [ sh, eh ] = dh < 0 ? [ dh, 0 ] : [ 0, dh ];
    const dcw = Math.max(0, rcw - cw);
    const [ scw, ecw ] = dcw < 0 ? [ dcw, 0 ] : [ 0, dcw ];
    const dch = Math.max(0, rch - ch);
    const [ sch, ech ] = dch < 0 ? [ dch, 0 ] : [ 0, dch ];
    console.log('_render', rw, rh, w, h, startTop, endTop);
    for (const [ x, col ] of this._cols) {
      col.remove();
    }
    for (const [ y, row ] of this._rows) {
      row.remove();
    }
    this._rows = new Map();
    // if (!rw || !rh) {
      let firstRow = true;
      for (let y = 0; y < h; ++y) {
        const row = cloneNode(this._row);
        this._rows.set(y, row);
        const headRow = row.querySelector('[data-slot-head-row]');
        headRow.innerHTML = y;
        const cellEnd = document.createComment('cell');
        row.querySelector('[data-slot-cell]').replaceWith(cellEnd);
        for (let x = 0; x < w; ++x) {
          if (firstRow) {
            const col = cloneNode(this._headCol);
            this._cols.set(x, col);
            col.innerHTML = x;
            insertBefore(col, this._headColEnd);
          }
          const cell = getCell(x, y);
          // console.log('_render2', cell);
          // TODO only render what needs to be rendered to prevent focus loss
          insertBefore(cell.cell.element, cellEnd);
        }
        firstRow = false;
        insertBefore(row, this._rowEnd);
      }
    // } else {
    //   for (let ioy = startTop; ioy < endTop; ++ioy) {
    //     console.log('_render0', ioy);
    //   }
    // }
  }
}
