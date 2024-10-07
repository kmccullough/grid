import { Grid } from './grid.js';
import { CellRenderer } from './cell-renderer.js';

export class GridRenderer {
  static PARENT_ELEMENT = Symbol('GridRenderer.PARENT_ELEMENT');
  static GRID = Symbol('GridRenderer.GRID');
  static SIZE = Symbol('GridRenderer.SIZE');
  static RENDER_GRID = Symbol('GridRenderer.RENDER_GRID');

  element;
  grid;

  static create() {
    return {
      cellRenderer: [ CellRenderer, { factory: true } ],
      gridFactory: [ Grid, { factory: true, optional: true } ],
      grid: [ GridRenderer.GRID, { optional: true } ],
      gridSize: [ GridRenderer.SIZE, { optional: true } ],
      renderGrid: [ GridRenderer.RENDER_GRID, { optional: true } ],
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
  constructor({ cellRenderer, gridFactory, grid, renderGrid, gridSize, parentElement }) {
    this.cellRenderer = cellRenderer;
    this._parentElement = parentElement;
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

  _createElement() {
    const el = document.createElement('div');
    this._parentElement?.appendChild(el);
    return el;
  }

  _initialValue(x, y) {
    return this.cellRenderer([
      [ CellRenderer.X, x ],
      [ CellRenderer.Y, y ],
      [ CellRenderer.EVENT_HANDLER, this._cellEventHandler(x, y) ],
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
    if (!rw || !rh) {
      for (let y = 0; y < h; ++y) {
        for (let x = 0; x < w; ++x) {
          const cell = getCell(x, y);
          console.log('_render2', cell);
          this.element.appendChild(cell.element);
        }
      }
    } else {
      for (let ioy = startTop; ioy < endTop; ++ioy) {
        console.log('_render0', ioy);
      }
    }
  }
}
