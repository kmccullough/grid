export class HotArray {
  items = {};

  constructor(headWindow = 10000, excessWindow = 10000) {
    this.headWindow = headWindow;
    this.excessWindow = excessWindow;
    this.clear();
  }

  push(...elements) {
    const { items } = this;
    let { tail } = this;
    for (const element of elements) {
      items[tail] = element;
      ++tail;
    }
    this.tail = tail;
    if (this.tailOuter < tail) {
      this.tailOuter = tail;
    }
  }

  pop() {
    if (this.head === this.tail) {
      return undefined;
    }
    --this.tail;
    const item = this.items[this.tail];
    this.items[this.tail] = undefined;
    if (this.headOuter - this.head + this.tailOuter - this.tail >= this.excessWindow) {
      this._reindex();
    }
    return item;
  }

  unshift(...elements) {
    if (this.head - elements.length < 0) {
      this._reindex();
    }
    const { items } = this;
    let { head } = this;
    for (let i = elements.length - 1; i >= 0; --i) {
      items[--head] = elements[i];
    }
    this.head = head;
    if (this.headOuter > head) {
      this.headOuter = head;
    }
  }

  shift() {
    if (this.head === this.tail) return undefined;
    const item = this.items[this.head];
    this.items[this.head] = undefined;
    ++this.head;
    if (this.headOuter - this.head + this.tailOuter - this.tail >= this.excessWindow) {
      this._reindex();
    }
    return item;
  }

  clear() {
    const { headWindow } =  this;
    this.items = {};
    this.head = headWindow;
    this.headOuter = headWindow;
    this.tail = headWindow;
    this.tailOuter = headWindow;
  }

  _reindex() {
    const newItems = {};
    let newIndex = this.headWindow;
    const { tail } = this;
    for (let i = this.head; i < tail; ++i) {
      newItems[newIndex] = this.items[i];
      ++newIndex;
    }
    this.items = newItems;
    this.head = this.headWindow;
    this.tail = newIndex;
  }
}
