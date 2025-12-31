export class Grid {
  /** @type {Map<string,GridCell>} */
  cells = new Map;
  constructor(data) {
    this.dimensions = data?.dimensions ?? 2;
    this.min = this.#copyCoords(data?.min, -Infinity);
    this.max = this.#copyCoords(data?.max, Infinity);
    this.invert = this.#copyCoords(data?.invert, false);
    this.scale = this.#copyCoords(data?.scale, 1);
    this.offset = this.#copyCoords(data?.offset, 0);
    for (let cell of data?.cells ?? []) {
      this.set(cell);
    }
  }
  key({ x, y, z }) {
    return `${x}:${y}:${z}`;
  }
  set(cell) {
    return this.cells.set(this.key(cell.coordinates), cell);
  }
  has(coords) {
    return this.cells.has(this.key(coords));
  }
  get(coords) {
    return this.cells.get(this.key(coords));
  }
  delete(coords) {
    return this.cells.delete(this.key(coords));
  }
  #copyCoords(coords, defaultValue)  {
    return {
      x: coords?.x ?? defaultValue,
      y: coords?.y ?? defaultValue,
      z: coords?.z ?? defaultValue,
    };
  }
}
