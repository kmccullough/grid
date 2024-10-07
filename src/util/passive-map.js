export class PassiveMap {
  _map = new Map();
  _weakMap = new WeakMap();
  constructor(entries = []) {
    for (const [ key, value ] of entries) {
      this.set(key, value);
    }
  }
  has(key) {
    return (typeof key === 'object' ? this._weakMap : this._map).has(key);
  }
  get(key) {
    return (typeof key === 'object' ? this._weakMap : this._map).get(key);
  }
  set(key, value) {
    return (typeof key === 'object' ? this._weakMap : this._map).set(key, value);
  }
}
