export default class GridCellCoordinates {
  static wrap(coords) {
    return coords instanceof GridCellCoordinates ? coords : new GridCellCoordinates(coords)
  }
  constructor(coords) {
    this.x = coords.x;
    this.y = coords.y;
    this.z = coords.z ?? 0;
  }
}
