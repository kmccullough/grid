export function cloneNode(node) {
  return (node.content || node).cloneNode(true);
}

export function insertBefore(node, refNode) {
  return refNode.parentNode.insertBefore(node, refNode);
}

export function wrapFragment(node, wrapper = 'div') {
  if (!(node instanceof DocumentFragment)) {
    return node;
  }
  if (typeof wrapper === 'string') {
    wrapper = document.createElement(wrapper);
  }
  wrapper.appendChild(node);
  return wrapper;
}
