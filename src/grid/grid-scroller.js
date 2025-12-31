import { Position } from '../util/position.js';

export class GridScroller {
  gridRenderer;

  constructor() {
    this.isDragging = false;
    this.lastClientPosition = new Position();
    this.scrollVelocity = new Position();
    this.scrollAnimation = null;
  }

  init(gridRenderer) {
    this.gridRenderer = gridRenderer;
    this._attachEvents();
  }

  getPosition() {
    return this.gridRenderer.getPosition();
  }

  getPositionFraction() {
    return this.gridRenderer.getPositionFraction();
  }

  getCellSize() {
    return this.gridRenderer.getCellSize();
  }

  setPosition(position, positionFraction = null) {
    this.gridRenderer.setPosition(position, positionFraction);
  }

  movePixelPosition(dx, dy) {
    return this.gridRenderer.movePixelPosition(dx, dy);
  }

  clearVelocity() {
    this.scrollVelocity.x = 0;
    this.scrollVelocity.y = 0;
  }

  endScrolling() {
    this.isDragging = false;
    const { _fling } = this;
    this.scrollVelocity.x *= _fling;
    this.scrollVelocity.y *= _fling;
    this._startScrollAnimation();
  }

  _attachEvents() {
    const el = this.gridRenderer._element;
    if (!el) {
      return;
    }
    el.addEventListener('mousedown', e => this._startScrolling(e));
    el.addEventListener('touchstart', e => this._startScrolling(e), { passive: false });
    addEventListener('mousemove', e => this._onPointerMove(e));
    addEventListener('touchmove', e => this._onPointerMove(e.touches[0]), { passive: false });
    addEventListener('mouseup', () => this.endScrolling());
    addEventListener('touchend', () => this.endScrolling());
  }

  _fling = 3;
  _frictions = [
    [ 10, .99 ],
    [  5, .97 ],
    [  0, .85 ],
  ];

  _storeLast(e) {
    this.lastClientPosition.x = e.clientX;
    this.lastClientPosition.y = e.clientY;
  }

  _startScrolling(e) {
    e.preventDefault();
    this._stopScrollAnimation();
    this._storeLast(e);
    this.isDragging = true;
    this.scrollVelocity = new Position();
  }

  _onPointerMove(e) {
    if (!this.isDragging) {
      return;
    }
    const dx = e.clientX - this.lastClientPosition.x;
    const dy = e.clientY - this.lastClientPosition.y;
    this._storeLast(e);
    this.scrollVelocity.x = dx;
    this.scrollVelocity.y = dy;
    this.movePixelPosition(dx, dy);
  }

  _startScrollAnimation() {
    if (this.scrollAnimation) {
      return;
    }
    const { x: dx, y: dy } = this.scrollVelocity;
    let delta, friction;
    for ([ delta, friction ] of this._frictions) {
      if (Math.abs(dx) >= delta && Math.abs(dy) >= delta) {
        break;
      }
    }
    const animate = () => {
      this.movePixelPosition(this.scrollVelocity.x, this.scrollVelocity.y);
      this.scrollVelocity.x *= friction;
      this.scrollVelocity.y *= friction;
      if (Math.abs(this.scrollVelocity.x) < 1 && Math.abs(this.scrollVelocity.y) < 1) {
        this.scrollAnimation = null;
        return;
      }
      this.scrollAnimation = requestAnimationFrame(animate);
    };
    this.scrollAnimation = requestAnimationFrame(animate);
  }

  _stopScrollAnimation() {
    if (!this.scrollAnimation) {
      return;
    }
    cancelAnimationFrame(this.scrollAnimation);
    this.scrollAnimation = null;
  }
}
