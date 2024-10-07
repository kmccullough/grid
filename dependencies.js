import { CellRenderer } from './src/cell-renderer.js';
import { CheckBoxCellRenderer } from './src/checkbox-cell-renderer.js';
import { Grid } from './src/grid.js';
import { GridRenderer } from './src/grid-renderer.js';
import { Container } from './src/util/container.js';

export const dependencies = new Container()
  .registerClass(GridRenderer)
  .registerClass(Grid, false)
  .registerClassAs(CellRenderer, CheckBoxCellRenderer, false)
;

export default dependencies;
