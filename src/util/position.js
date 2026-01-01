export default class Position {
  static add(...positions) {
    return new Position().add(...positions);
  }
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(position) {
    this.x = position.x;
    this.y = position.y;
    return this;
  }
  add(...positions) {
    const result = new Position();
    for (const position of positions) {
      if (!position) {
        continue;
      }
      this.x += position.x;
      this.y += position.y;
    }
    return result;
  }
}
