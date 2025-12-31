import { GridCellCoordinates } from '../grid/grid-cell-coordinates.js';

export class PooledGrid {
  cellWidth = 100;
  cellHeight = 30;

  constructor(container, model, options = {}) {
    this.container = container;
    this.model = model;
    this.viewportCols = Math.ceil(container.clientWidth / this.cellWidth) + 2;
    this.viewportRows = Math.ceil(container.clientHeight / this.cellHeight) + 2;
    this.pool = options.pool;
    this.visibleElements = new Map();
    this.focusedCell = { row: 0, col: 0 };

    this.container.tabIndex = 0;
    this.container.setAttribute('role', 'grid');

    this.dragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.flingAnimation = null;

    container.addEventListener('scroll', () => this.render());
    this.addKeyboardNavigation(options.jumpSize || 5, options.modifierKey || 'Shift');
    this.enableDragPan();
    this.enableTouchScroll();
  }

  addKeyboardNavigation(jumpSize, modifierKey) {
    this.container.addEventListener('keydown', e => {
      const { row, col } = this.focusedCell;
      let newRow = row, newCol = col;
      const jump = e[`${modifierKey.toLowerCase()}Key`] ? jumpSize : 1;
      switch (e.key) {
        case 'ArrowUp': newRow -= jump; break;
        case 'ArrowDown': newRow += jump; break;
        case 'ArrowLeft': newCol -= jump; break;
        case 'ArrowRight': newCol += jump; break;
        default: return;
      }
      e.preventDefault();
      this.focusCell(newRow, newCol);
    });
  }

  focusCell(row, col) {
    this.focusedCell = { row, col };
    this.scrollToCell(row, col);
    this.render();
  }

  scrollToCell(row, col) {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    if (x < this.container.scrollLeft) this.container.scrollLeft = x;
    else if (x + this.cellWidth > this.container.scrollLeft + this.container.clientWidth)
      this.container.scrollLeft = x - this.container.clientWidth + this.cellWidth;
    if (y < this.container.scrollTop) this.container.scrollTop = y;
    else if (y + this.cellHeight > this.container.scrollTop + this.container.clientHeight)
      this.container.scrollTop = y - this.container.clientHeight + this.cellHeight;
  }

  getCellFromMouseEvent(e) {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left + this.container.scrollLeft;
    const y = e.clientY - rect.top + this.container.scrollTop;
    return { col: Math.floor(x / this.cellWidth), row: Math.floor(y / this.cellHeight) };
  }

  render() {
    const firstCol = Math.floor(this.container.scrollLeft / this.cellWidth);
    const firstRow = Math.floor(this.container.scrollTop / this.cellHeight);
    const newVisible = new Map();

    for (let r = firstRow; r < firstRow + this.viewportRows; r++) {
      for (let c = firstCol; c < firstCol + this.viewportCols; c++) {
        const key = `${r}:${c}`;
        let el = this.visibleElements.get(key) || this.pool.borrow();
        if (!el) continue;
        const cell = this.model.get(new GridCellCoordinates({ x: c, y: r })) || {};
        el.style.width = this.cellWidth + 'px';
        el.style.height = this.cellHeight + 'px';
        el.style.transform = `translate3d(${c * this.cellWidth}px,${r * this.cellHeight}px,0)`;
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.border = '1px solid #ddd';
        el.style.background = '#fff';
        el.innerHTML = '';

        if (cell.data?.text) el.appendChild(document.createTextNode(cell.data.text));
        if (cell.data?.button) {
          const btn = document.createElement('button');
          btn.textContent = cell.data.button.label;
          btn.onclick = cell.data.button.onClick;
          el.appendChild(btn);
        }
        if (cell.data?.input) {
          const input = document.createElement('input');
          input.value = cell.data.input.value;
          input.oninput = e => cell.data.input.onChange(e.target.value);
          el.appendChild(input);
        }

        el.tabIndex = (this.focusedCell.row === r && this.focusedCell.col === c) ? 0 : -1;
        newVisible.set(key, el);
      }
    }

    for (let [key, el] of this.visibleElements)
      if (!newVisible.has(key)) this.pool.release(el);

    this.visibleElements = newVisible;
  }

  // ----------------------------
  // Drag / fling scrolling
  // ----------------------------
  enableDragPan() {
    this.container.style.cursor = 'grab';
    const startDrag = e => {
      if (e.target !== this.container) return;
      e.preventDefault();
      this.stopFling();
      this.dragging = true;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
      this.velocity.x = 0; this.velocity.y = 0;
      this.container.style.cursor = 'grabbing';
    };
    const moveDrag = e => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.container.scrollLeft -= dx;
      this.container.scrollTop -= dy;
      this.velocity.x = dx;
      this.velocity.y = dy;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
    };
    const endDrag = e => {
      if (!this.dragging) return;
      this.dragging = false;
      this.container.style.cursor = 'grab';
      this.startFling();
    };
    this.container.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
  }

  enableTouchScroll() {
    const startTouch = e => {
      if (e.target !== this.container || e.touches.length !== 1) return;
      e.preventDefault();
      this.stopFling();
      this.dragging = true;
      const touch = e.touches[0];
      this.lastPointer.x = touch.clientX; this.lastPointer.y = touch.clientY;
      this.velocity.x = 0; this.velocity.y = 0;
    };
    const moveTouch = e => {
      if (!this.dragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - this.lastPointer.x;
      const dy = touch.clientY - this.lastPointer.y;
      this.container.scrollLeft -= dx;
      this.container.scrollTop -= dy;
      this.velocity.x = dx;
      this.velocity.y = dy;
      this.lastPointer.x = touch.clientX; this.lastPointer.y = touch.clientY;
    };
    const endTouch = e => { if (!this.dragging) return; this.dragging=false; this.startFling(); };
    this.container.addEventListener('touchstart', startTouch, { passive: false });
    this.container.addEventListener('touchmove', moveTouch, { passive: false });
    this.container.addEventListener('touchend', endTouch);
    this.container.addEventListener('touchcancel', endTouch);
  }

  startFling() {
    const friction = 0.95; const minVelocity = 0.5;
    const animate = () => {
      this.container.scrollLeft -= this.velocity.x;
      this.container.scrollTop -= this.velocity.y;
      this.velocity.x *= friction; this.velocity.y *= friction;
      if (Math.abs(this.velocity.x) < minVelocity && Math.abs(this.velocity.y) < minVelocity) {
        cancelAnimationFrame(this.flingAnimation); this.flingAnimation = null; return;
      }
      this.flingAnimation = requestAnimationFrame(animate);
    };
    this.flingAnimation = requestAnimationFrame(animate);
  }

  stopFling() { if(this.flingAnimation){ cancelAnimationFrame(this.flingAnimation); this.flingAnimation=null; } }
}
