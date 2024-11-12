/**
 * @typedef {Object} GridIteratorRangeState
 * @property {boolean} added Row/col in target but not source
 * @property {boolean} removed Row/col in source but not target
 * @property {boolean} unchanged Row/col in source and target
 * @property {boolean} hasAdded Has cells in target but not source
 * @property {boolean} hasRemoved Has cells in source but not target
 * @property {boolean} hasUnchanged Has cells in source and target
 */

/**
 * @typedef {Object} GridIteratorCellState
 * @property {boolean} added In target but not source
 * @property {boolean} removed In source but not target
 * @property {boolean} unchanged In source and target
 */

/**
 * @typedef {function} GridIteratorRangeCallback
 * @param {number} index
 * @param {GridIteratorCellState} state
 * @param {Grid} sourceGrid
 * @param {Grid} targetGrid
 */

/**
 * @typedef {function} GridIteratorCallback
 * @param {number} x
 * @param {number} y
 * @param {*} sourceCell
 * @param {*} targetCell
 * @param {GridIteratorCellState} state
 * @param {Grid} sourceGrid
 * @param {Grid} targetGrid
 */

export class GridIterator {
  constructor(config) {
    this.config(config);
  }

  config(config) {
    this._config = Object.assign(this._config || {}, config);
    return this;
  }

  /**
   * Configure iterations to handle rows top to bottom; this is the default direction
   * @return {GridIterator}
   */
  topToBottom() {
    return this.config({ bottomToTop: false });
  }

  /**
   * Configure iterations to handle rows bottom to top
   * @return {GridIterator}
   */
  bottomToTop() {
    return this.config({ bottomToTop: true });
  }

  /**
   * Configure iterations to handle columns left to right; this is the default direction
   * @return {GridIterator}
   */
  leftToRight() {
    return this.config({ rightToLeft: false });
  }

  /**
   * Configure iterations to handle columns right to left
   * @return {GridIterator}
   */
  rightToLeft() {
    return this.config({ rightToLeft: true });
  }

  /**
   * Configure iterations to handle rows then columns within; this is the default orientation
   * @return {GridIterator}
   */
  colsOfRows() {
    return this.config({ rowsOfCols: false });
  }

  /**
   * Configure iterations to columns then rows within
   * @return {GridIterator}
   */
  rowsOfCols() {
    return this.config({ rowsOfCols: true });
  }

  /**
   * Whether to skip calling callbacks for unchanged rows/cols/cells. The default
   * is not to skip, but the argument passed to the method is `true` by default.
   * @param {boolean} [skip] Default `true`
   * @return {GridIterator}
   */
  skipUnchanged(skip = true) {
    return this.config({ skipUnchanged: skip });
  }

  /**
   * Whether iteration should skip unchanged rows/cols. Given perpendicular
   * source/target measurements are used to determine if nested row/col has
   * *changed* cells, requiring that those rows/cols *not* be skipped.
   * @param {number} sourceOffset Source offset perpendicular to iterated row/col
   * @param {number} targetOffset Target offset perpendicular to iterated row/col
   * @param {number} sourceSize Source size perpendicular to iterated row/col
   * @param {number} targetSize Target size perpendicular to iterated row/col
   * @return {boolean}
   * @private
   */
  _skipUnchangedRowOrCol(sourceOffset, targetOffset, sourceSize, targetSize) {
    return this._config.skipUnchanged
      && !(targetOffset - sourceOffset || targetSize - sourceSize);
  }

  /**
   * Whether iteration should skip unchanged cell ranges.
   * @return {boolean}
   * @private
   */
  _skipUnchangedCell() {
    return this._config.skipUnchanged;
  }

  /**
   * @param {number} sourceOffset
   * @param {number} targetOffset
   * @param {number} sourceSize
   * @param {number} targetSize
   * @param {boolean} skipUnchanged
   * @param {boolean} reverseDir
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorRangeCallback} callback
   */
  _eachInRange(sourceOffset, targetOffset, sourceSize, targetSize, skipUnchanged, reverseDir, sourceGrid, targetGrid, callback) {
    const step = reverseDir ? -1 : 1;
    const start = Math.min(targetOffset, sourceOffset);
    const startUnchanged = Math.max(targetOffset, sourceOffset);
    const sourceEnd = sourceOffset + sourceSize - 1;
    const targetEnd = targetOffset + targetSize - 1;
    const endUnchanged = Math.min(targetEnd, sourceEnd);
    const end = Math.max(targetEnd, sourceEnd);
    const iStart = reverseDir ? end : start;
    const iEnd = reverseDir ? start : end;
    const unchangedStart = reverseDir ? endUnchanged : startUnchanged;
    const unchangedEnd = reverseDir ? startUnchanged : endUnchanged;
    for (let i = iStart; reverseDir ? i >= iEnd : i <= iEnd; i += step) {
      if (skipUnchanged && i === unchangedStart) {
        i = unchangedEnd;
        continue;
      }
      const unchanged = i >= unchangedStart && i <= unchangedEnd;
      const added = !unchanged && (i < unchangedStart
        ? targetOffset < sourceOffset
        : targetEnd > sourceEnd
      );
      const removed = !unchanged && !added;
      callback(i, { added, removed, unchanged }, sourceGrid, targetGrid);
    }
    return this;
  }

  /**
   *
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorRangeCallback} rowCallback
   */
  eachRow(sourceGrid, targetGrid, rowCallback) {
    return this._eachInRange(
      sourceGrid.offset.x,
      targetGrid.offset.x,
      sourceGrid.size.width,
      targetGrid.size.width,
      this._skipUnchangedRowOrCol(
        sourceGrid.offset.y,
        targetGrid.offset.y,
        sourceGrid.size.height,
        targetGrid.size.height
      ),
      this._config.bottomToTop,
      sourceGrid,
      targetGrid,
      rowCallback,
    );
  }

  /**
   *
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorRangeCallback} colCallback
   */
  eachCol(sourceGrid, targetGrid, colCallback) {
    return this._eachInRange(
      sourceGrid.offset.y,
      targetGrid.offset.y,
      sourceGrid.size.height,
      targetGrid.size.height,
      this._skipUnchangedRowOrCol(
        sourceGrid.offset.x,
        targetGrid.offset.x,
        sourceGrid.size.width,
        targetGrid.size.width
      ),
      this._config.rightToLeft,
      sourceGrid,
      targetGrid,
      colCallback,
    );
  }

  /**
   * Each row/col depending on rowsOfCols option
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorRangeCallback} rowOrColCallback
   */
  eachRowOrCol(sourceGrid, targetGrid, rowOrColCallback) {
    return this._config.rowsOfCols
      ? this.eachCol(sourceGrid, targetGrid, rowOrColCallback)
      : this.eachRow(sourceGrid, targetGrid, rowOrColCallback);
  }

  /**
   * Each row/col of col/row depending on rowsOfCols option
   * @param {number} rowIndex
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorCallback} cellCallback
   */
  eachCellOfRow(rowIndex, sourceGrid, targetGrid, cellCallback) {
    return this._eachInRange(
      sourceGrid.offset.x,
      targetGrid.offset.x,
      sourceGrid.size.width,
      targetGrid.size.width,
      this._skipUnchangedCell(),
      this._config.bottomToTop,
      sourceGrid,
      targetGrid,
      (colIndex, state) => cellCallback(
        colIndex,
        rowIndex,
        sourceGrid.getCell(colIndex, rowIndex, true),
        targetGrid.getCell(colIndex, rowIndex, true),
        state,
        sourceGrid,
        targetGrid,
      ),
    );
  }

  /**
   * Each row/col of col/row depending on rowsOfCols option
   * @param {number} rowIndex
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorCallback} cellCallback
   */
  eachCellOfCol(rowIndex, sourceGrid, targetGrid, cellCallback) {
    return this._eachInRange(
      sourceGrid.offset.y,
      targetGrid.offset.y,
      sourceGrid.size.height,
      targetGrid.size.height,
      this._skipUnchangedCell(),
      this._config.rightToLeft,
      sourceGrid,
      targetGrid,
      (colIndex, state) => cellCallback(
        colIndex,
        rowIndex,
        sourceGrid.getCell(colIndex, rowIndex, true),
        targetGrid.getCell(colIndex, rowIndex, true),
        state,
        sourceGrid,
        targetGrid,
      ),
    );
  }

  /**
   * Each cell of row/col depending on rowsOfCols option
   * @param {number} index
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorCallback} cellCallback
   */
  eachCellOfRowOrCol(index, sourceGrid, targetGrid, cellCallback) {
    return this._config.rowsOfCols
      ? this.eachCellOfRow(index, sourceGrid, targetGrid, cellCallback)
      : this.eachCellOfCol(index, sourceGrid, targetGrid, cellCallback);
  }

  /**
   * @param {Grid} sourceGrid
   * @param {Grid} targetGrid
   * @param {GridIteratorCallback} cellCallback
   */
  eachCell(sourceGrid, targetGrid, cellCallback) {
    return this.eachRowOrCol(sourceGrid, targetGrid, index => {
      this.eachCellOfRowOrCol(index, sourceGrid, targetGrid, cellCallback);
    });
  }
}
