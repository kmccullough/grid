import { CheckBoxCellRenderer } from '../checkbox-cell-renderer.js';
import { Grid } from '../grid.js';
import { GridCellRenderer } from './grid-cell-renderer.js';
import { GridIterator } from './grid-iterator.js';
import { GridRenderer } from './grid-renderer.js';
import { GridScroller } from './grid-scroller.js';

export function gridDependencies(container) {
  return container
    .registerClass(Grid)
    .registerClassAs(GridCellRenderer, CheckBoxCellRenderer)
    .registerClass(GridIterator)
    .registerClass(GridRenderer, true)
    .registerConstant(GridRenderer.SCROLLER, new GridScroller())
  ;
}
