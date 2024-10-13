export function cloneNode(node) {
  return (node.content || node).cloneNode(true);
}

export function insertBefore(node, refNode) {
  return refNode.parentNode.insertBefore(node, refNode);
}
