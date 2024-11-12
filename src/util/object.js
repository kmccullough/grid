export function softSet(object, property, value) {
  if (object[property] !== value) {
    object[property] = value;
  }
}

export function softAssign(...objects) {
  const assigned = Object.assign({}, ...objects);
  const result = objects.shift();
  for (const property of Object.keys(assigned)) {
    softSet(result, property, assigned[property]);
  }
  return result;
}
