// Minimal, dependency-free hyperscript helper. No build step, no JSX, no framework.
// Mirrors the shape of the reference prototype's own `h = (...) => React.createElement(...)`
// so screen code reads the same way, but builds real DOM nodes directly.
//
// Usage:
//   h('div', {class: 'card', onClick: fn}, [h('span', {}, 'text'), otherNode])
//   h('svg', {viewBox: '0 0 24 24'}, [...]) — SVG tags are auto-detected and created in the SVG namespace.
//
// `props` keys:
//   - 'class' / 'className'      -> className
//   - starts with 'on' + fn      -> addEventListener (lowercased event name, e.g. onClick -> click)
//   - 'style' as object          -> applied via el.style[prop] = value (camelCase or dashed both work)
//   - 'style' as string          -> el.style.cssText
//   - 'dataset' object           -> el.dataset[key] = value
//   - anything else              -> setAttribute (or property for booleans like checked/disabled/value on inputs)

const SVG_TAGS = new Set([
  'svg','circle','rect','path','line','g','defs','linearGradient','stop','text','tspan','polygon','polyline','ellipse'
]);

const BOOLEAN_PROPS = new Set(['checked','disabled','selected','readOnly','required','multiple']);

export function h(tag, props, children) {
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  props = props || {};
  // <select> only reflects `.value` once its <option> children exist, so its
  // value must be assigned AFTER appendChildren below rather than in this loop.
  const deferredValue = (tag === 'select' && 'value' in props) ? props.value : undefined;
  for (const key in props) {
    const value = props[key];
    if (value == null || value === false) continue;
    if (key === 'class' || key === 'className') {
      el.setAttribute('class', value);
    } else if (key === 'style') {
      if (typeof value === 'string') el.style.cssText = value;
      else if (value && typeof value === 'object') {
        for (const sk in value) {
          if (value[sk] == null) continue;
          el.style[sk] = value[sk];
        }
      }
    } else if (key === 'dataset' && value && typeof value === 'object') {
      for (const dk in value) el.dataset[dk] = value[dk];
    } else if (key.length > 2 && key.slice(0, 2) === 'on' && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') {
      el.innerHTML = value;
    } else if (BOOLEAN_PROPS.has(key)) {
      el[key] = !!value;
      if (value) el.setAttribute(key, '');
    } else if (!isSvg && key === 'value') {
      if (tag !== 'select') el.value = value;
    } else {
      el.setAttribute(key, value);
    }
  }

  appendChildren(el, children);
  if (deferredValue !== undefined) el.value = deferredValue;
  return el;
}

function appendChildren(el, children) {
  if (children == null) return;
  if (!Array.isArray(children)) children = [children];
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) { appendChildren(el, child); continue; }
    if (child instanceof Node) { el.appendChild(child); continue; }
    el.appendChild(document.createTextNode(String(child)));
  }
}

// Convenience: mount a node into a container, replacing its previous contents.
export function mount(container, node) {
  container.replaceChildren(node);
}

// Small SVG icon helper for Lucide-style stroke icons (copy `d` paths from reference/Kata.dc.html).
export function icon(paths, { size = 20, stroke = 'currentColor', strokeWidth = 1.7, viewBox = '0 0 24 24', extra } = {}) {
  const kids = (Array.isArray(paths) ? paths : [paths]).map(p =>
    typeof p === 'string'
      ? h('path', { d: p })
      : h(p.tag || 'path', p.attrs || {})
  );
  return h('svg', {
    width: size, height: size, viewBox,
    fill: 'none', stroke, 'stroke-width': strokeWidth,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    style: extra,
  }, kids);
}
