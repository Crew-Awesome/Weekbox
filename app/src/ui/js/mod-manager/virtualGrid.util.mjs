export function createVirtualGridMetrics(rowHeights) {
  const values = Float64Array.from(rowHeights);
  const tree = new Float64Array(values.length + 1);
  for (let index = 1; index <= values.length; index += 1) {
    tree[index] += values[index - 1];
    const parent = index + (index & -index);
    if (parent <= values.length) tree[parent] += tree[index];
  }

  const prefix = (endExclusive) => {
    let index = Math.min(values.length, Math.max(0, endExclusive));
    let total = 0;
    while (index > 0) {
      total += tree[index];
      index -= index & -index;
    }
    return total;
  };

  const findRowAt = (offset) => {
    let index = 0;
    let total = 0;
    let bit = 1;
    while (bit * 2 <= values.length) bit *= 2;
    while (bit) {
      const next = index + bit;
      if (next <= values.length && total + tree[next] <= offset) {
        index = next;
        total += tree[next];
      }
      bit = Math.floor(bit / 2);
    }
    return Math.min(index, Math.max(0, values.length - 1));
  };

  return {
    length: values.length,
    prefix,
    findRowAt,
    setHeight(rowIndex, height) {
      if (rowIndex < 0 || rowIndex >= values.length || !(height > 0)) return;
      const delta = height - values[rowIndex];
      if (Math.abs(delta) < 0.01) return;
      values[rowIndex] = height;
      for (
        let index = rowIndex + 1;
        index <= values.length;
        index += index & -index
      ) {
        tree[index] += delta;
      }
    },
  };
}

export function getVirtualGridRange({
  itemCount,
  columns,
  scrollTop,
  viewportHeight,
  rowHeight,
  metrics = null,
  overscanRows = 2,
}) {
  const totalRows = Math.ceil(itemCount / columns);
  if (!totalRows) {
    return {
      totalRows: 0,
      firstRow: 0,
      lastRow: 0,
      firstIndex: 0,
      lastIndex: 0,
      topHeight: 0,
      bottomHeight: 0,
    };
  }

  const viewBottom = scrollTop + viewportHeight;
  let firstVisibleRow;
  let lastVisibleRow;
  if (metrics && metrics.length === totalRows) {
    firstVisibleRow = metrics.findRowAt(Math.max(0, scrollTop));
    lastVisibleRow = metrics.findRowAt(Math.max(0, viewBottom));
    if (viewBottom >= metrics.prefix(totalRows)) lastVisibleRow = totalRows;
    else if (metrics.prefix(lastVisibleRow) < viewBottom) lastVisibleRow += 1;
  } else {
    firstVisibleRow = 0;
    let rowOffset = 0;
    while (
      firstVisibleRow < totalRows &&
      rowOffset + rowHeight(firstVisibleRow) <= scrollTop
    ) {
      rowOffset += rowHeight(firstVisibleRow++);
    }

    lastVisibleRow = firstVisibleRow;
    while (lastVisibleRow < totalRows && rowOffset < viewBottom) {
      rowOffset += rowHeight(lastVisibleRow++);
    }
  }

  const firstRow = Math.max(0, firstVisibleRow - overscanRows);
  const lastRow = Math.min(totalRows, lastVisibleRow + overscanRows);
  let topHeight = 0;
  let bottomHeight = 0;
  if (metrics && metrics.length === totalRows) {
    topHeight = metrics.prefix(firstRow);
    bottomHeight = metrics.prefix(totalRows) - metrics.prefix(lastRow);
  } else {
    for (let row = 0; row < firstRow; row += 1) topHeight += rowHeight(row);
    for (let row = lastRow; row < totalRows; row += 1) {
      bottomHeight += rowHeight(row);
    }
  }

  return {
    totalRows,
    firstRow,
    lastRow,
    firstIndex: firstRow * columns,
    lastIndex: Math.min(itemCount, lastRow * columns),
    topHeight,
    bottomHeight,
  };
}
