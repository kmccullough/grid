import { Grid } from './grid.js';
import { CellRenderer } from './cell-renderer.js';
import { cloneNode, insertBefore } from './util/dom.js';

export class GridRenderer {
  static GRID = Symbol('GridRenderer.GRID');
  static SIZE = Symbol('GridRenderer.SIZE');
  static RENDER_GRID = Symbol('GridRenderer.RENDER_GRID');
  static TEMPLATE = Symbol('GridRenderer.TEMPLATE');
  static PARENT_ELEMENT = Symbol('GridRenderer.PARENT_ELEMENT');

  element;
  grid;
  template;
  parentElement;

  static create() {
    return {
      cellRenderer: [ CellRenderer, { factory: true } ],
      gridFactory: [ Grid, { factory: true, optional: true } ],
      grid: [ GridRenderer.GRID, { optional: true } ],
      gridSize: [ GridRenderer.SIZE, { optional: true } ],
      renderGrid: [ GridRenderer.RENDER_GRID, { optional: true } ],
      template: [ GridRenderer.TEMPLATE ],
      parentElement: [ GridRenderer.PARENT_ELEMENT, { optional: true } ],
    };
  }

  /**
   * @param {CellRenderer} cellRenderer
   * @param {function(...args:*):Grid} gridFactory
   * @param {Grid} [grid]
   * @param {Grid} [renderGrid]
   * @param {Size} [gridSize]
   * @param {Element} [parentElement]
   */
  constructor({ cellRenderer, gridFactory, grid, renderGrid, gridSize, template, parentElement }) {
    this.cellRenderer = cellRenderer;
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

  getCell(x, y) {
    return this.grid.getCell(x, y);
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

  _createElement() {
    const el = this.template.content.cloneNode(true);

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

  _initialValue(x, y) {
    return this.cellRenderer([
      [ CellRenderer.X, x ],
      [ CellRenderer.Y, y ],
      [ CellRenderer.EVENT_HANDLER, this._cellEventHandler(x, y) ],
      ...(this._cellTemplate ? [ [ CellRenderer.TEMPLATE, this._cellTemplate ] ] : [])
    ]);
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
          console.log('_render2', cell);
          insertBefore(cell.element, cellEnd);
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
