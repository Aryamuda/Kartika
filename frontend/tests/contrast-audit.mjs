export function auditTextContrast() {
  const parse = value => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const channels = match[1].split(',').map(Number);
    return [channels[0], channels[1], channels[2], channels[3] ?? 1];
  };
  const background = element => {
    if (!element) return [16, 22, 20, 1];
    const color = parse(getComputedStyle(element).backgroundColor);
    return color && color[3] >= 0.99 ? color : background(element.parentElement);
  };
  const luminance = color => color.slice(0, 3).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const results = [];
  let node;
  while ((node = walker.nextNode())) {
    const element = node.parentElement;
    if (!node.textContent.trim() || !element || element.closest('script,style,svg,.sr-only,button:disabled,option') || !element.getClientRects().length) continue;
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const foreground = parse(style.color);
    if (!foreground) continue;
    const first = luminance(foreground);
    const second = luminance(background(element));
    const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    results.push({ text: node.textContent.trim().slice(0, 80), ratio });
  }
  return {
    tested: results.length,
    minimum: Math.min(...results.map(result => result.ratio)),
    failures: results.filter(result => result.ratio < 4.5),
    scope: 'Opaque CSS text; excludes SVG, disabled controls, and screen-reader-only text.',
  };
}
