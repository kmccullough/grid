import { CellRenderer } from './src/cell-renderer.js';
import { CheckBoxCellRenderer } from './src/checkbox-cell-renderer.js';
import { Grid } from './src/grid.js';
import { GridIterator } from './src/grid-iterator.js';
import { GridRenderer } from './src/grid-renderer.js';
import { FocusHandler } from './src/focus-handler.js';
import { Container } from './src/util/container.js';
import { Events } from './src/util/events.js';

export const dependencies = new Container()
  .defaultToSingleton(false)
  .registerClass(Events)
  .registerClass(FocusHandler)
  .registerClass(Grid)
  .registerClass(GridIterator)
  .registerClassAs(CellRenderer, CheckBoxCellRenderer)
  .registerClass(GridRenderer, true)
;

export default dependencies;
