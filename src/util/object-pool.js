import Events from './events.js';

export default class ObjectPool {
  events = new Events();
  borrowed = new Set;
  objects = new Set;
  constructor() {
    this.clear();
  }
  onCreate(onCreate) {
    this._onCreate = onCreate;
    return this;
  }
  onBorrow(onBorrow) {
    this._onBorrow = onBorrow;
    return this;
  }
  onRelease(onRelease) {
    this._onRelease = onRelease;
    return this;
  }
  onRemove(onRemove) {
    this._onRemove = onRemove;
    return this;
  }
  onReleaseAll(onReleaseAll) {
    this._onReleaseAll = onReleaseAll;
    return this;
  }
  onClear(onClear) {
    this._onClear = onClear;
    return this;
  }
  create() {
    const object = this._onCreate(this);
    this.events.emit('create', this, object, this);
    return object;
  }
  borrow() {
    const { objects } = this;
    let object;
    if (objects.size) {
      object = objects.values().next().value;
      objects.delete(object);
    } else {
      object = this.create();
    }
    this._onBorrow?.(object, this);
    objects.delete(object);
    this.borrowed.add(object);
    this.events.emit('borrow', this, object, this);
    return object;
  }
  release(object) {
    if (!this.borrowed.has(object)) {
      return this;
    }
    this._onRelease?.(object, this)
    this.objects.add(object);
    this.borrowed.delete(object);
    this.events.emit('release', this, object, this);
    return this;
  }
  releaseAll() {
    const { borrowed } = this;
    this._onReleaseAll?.(borrowed, this);
    this.events.emit('release-all', this, borrowed, this);
    for (const object of borrowed) {
      this.release(object);
    }
    return this;
  }
  clear() {
    this.events.emit('before-clear', this, this);
    this.releaseAll();
    this._onClear?.(this);
    const { _onRemove, borrowed, objects } = this;
    for (const object of borrowed) {
      _onRemove?.(object, this);
      this.events.emit('remove', this, object, this);
      objects.delete(object);
    }
    this.events.emit('clear', this, this);
    return this;
  }
}
