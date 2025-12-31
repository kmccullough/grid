import { App } from './app.js';
import { FocusHandler } from './focus-handler.js';
import { Container } from './util/container.js';
import { Events } from './util/events.js';
import { gridDependencies } from './grid';

export const dependencies = new Container()
  .defaultToSingleton(false)
  .registerClass(App, true)
  .registerClass(Events)
  .registerClass(FocusHandler)
  .registerModule(gridDependencies)
;

export default dependencies;
