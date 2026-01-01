import GridRenderer from './grid/grid-renderer.js';

export default class App {
  static GRID = Symbol('App.GRID');

  static container(container) {
    container.registerAlias(App.GRID, GridRenderer.ELEMENT);
  }

  static create() {
    return {
      gridRenderer: [ GridRenderer ],
    };
  }
}
