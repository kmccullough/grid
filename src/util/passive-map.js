class PassiveMapWeakRef extends WeakRef {}

export default class PassiveMap {
  _map = new Map();
  _weakRefMap = new WeakMap();
  constructor(entries = []) {
    for (const [ key, value ] of entries) {
      this.set(key, value);
    }
  }
  has(key) {
    return (key && typeof key === 'object' ? this._weakRefMap : this._map).has(key);
  }
  get(key) {
    return this._map.get(key && typeof key === 'object' ? this._weakRefMap.get(key) : key);
  }
  set(key, value) {
    if (key && typeof key === 'object') {
      let weakRef = this._weakRefMap.get(key);
      if (!weakRef) {
        weakRef = new PassiveMapWeakRef(key);
        this._weakRefMap.set(key, weakRef);
      }
      key = weakRef;
    }
    this._map.set(key, value);
    return this;
  }
  delete(key) {
    if (key && typeof key === 'object') {
      key = this._weakRefMap.get(key);
      if (!key) {
        return false;
      }
    }
    return this._map.delete(key);
  }
  *entries() {
    for (let [ key, value ] of this._map) {
      if (key instanceof PassiveMapWeakRef) {
        const actualKey = key.deref();
        if (actualKey) {
          yield [ actualKey, value ];
        } else {
          this._map.delete(key);
        }
        continue;
      }
      yield [ key, value ];
    }
  }
}
