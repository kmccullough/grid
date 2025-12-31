import { GridRenderer } from './grid/grid-renderer.js';

export class App {
  static container(container) {
    container
      .registerConstant(GridRenderer.PARENT_ELEMENT, document.body)
      .registerConstant(GridRenderer.ELEMENT, document.getElementById('grid'))
  }

  static create() {
    return {
      gridRenderer: [ GridRenderer ],
    };
  }
}
