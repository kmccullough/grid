import { GridCellCoordinates } from './grid-cell-coordinates.js';

export class GridCell {
  static wrap(cell) {
    return cell instanceof GridCell ? cell : new GridCell(cell)
  }

  constructor(data) {
    this.coordinates = new GridCellCoordinates(data.coordinates);
    this.data = data.data;
  }
}
