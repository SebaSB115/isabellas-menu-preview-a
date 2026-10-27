// Turn a Journal page without stealing taps, vertical reading or pinch-to-zoom.
export function installPageSwipe(viewer, {move, blocked = () => false}) {
  let gesture = null;
  let pointer = null;
  let suppressClickUntil = 0;
  const reset = () => { gesture = null; pointer = null; };
  const editable = target => target.closest('input,select,textarea,[contenteditable="true"],[data-no-page-swipe]');
  const turn = (x, y) => {
    const threshold = Math.min(64, Math.max(44, viewer.clientWidth * 0.12));
    if (Math.abs(x) < threshold || Math.abs(x) <= Math.abs(y) * 1.5) return;
    suppressClickUntil = performance.now() + 500;
    const direction = document.documentElement.dir === 'rtl' ? -1 : 1;
    move((x < 0 ? 1 : -1) * direction);
  };
  // A narrow desktop preview still emits mouse events, not touch events.
  // Touch stays on its own path to preserve browser scrolling and pinch zoom.
  viewer.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0 || event.detail > 1 || blocked() || editable(event.target)) return;
    suppressClickUntil = 0;
    pointer = {id:event.pointerId, x:event.clientX, y:event.clientY};
  });
  window.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (!event.buttons || blocked()) { pointer = null; return; }
    const x = Math.abs(event.clientX - pointer.x), y = Math.abs(event.clientY - pointer.y);
    if (y > 12 && y > x) pointer = null;
  });
  window.addEventListener('pointerup', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const start = pointer; pointer = null;
    if (!blocked()) turn(event.clientX - start.x, event.clientY - start.y);
  });
  window.addEventListener('pointercancel', () => { pointer = null; });
  // Prevent native image/text dragging from taking over the page gesture.
  viewer.addEventListener('dragstart', event => { if (pointer) event.preventDefault(); });
  viewer.addEventListener('selectstart', event => { if (pointer) event.preventDefault(); });
  viewer.addEventListener('touchstart', event => {
    const touch = event.touches[0];
    // Keep the screen edges available for the browser's own back/forward gesture.
    if (event.touches.length !== 1 || blocked() || editable(event.target) || touch.clientX < 24 || touch.clientX > innerWidth - 24) { reset(); return; }
    suppressClickUntil = 0;
    gesture = {id:touch.identifier, x:touch.clientX, y:touch.clientY, axis:null};
  }, {passive:true});
  viewer.addEventListener('touchmove', event => {
    if (!gesture) return;
    if (event.touches.length !== 1 || blocked()) { reset(); return; }
    const touch = [...event.touches].find(t => t.identifier === gesture.id);
    if (!touch) { reset(); return; }
    const x = Math.abs(touch.clientX - gesture.x), y = Math.abs(touch.clientY - gesture.y);
    if (!gesture.axis) {
      if (y > 12 && y > x) { reset(); return; }
      if (x > 12 && x > y * 1.5) gesture.axis = 'horizontal';
    }
    // Cancels the synthetic click on a dish name after a swipe (Safari included).
    // Vertical gestures and two-finger zoom never reach this preventDefault.
    if (gesture.axis === 'horizontal' && event.cancelable) event.preventDefault();
  }, {passive:false});
  viewer.addEventListener('touchend', event => {
    if (!gesture) return;
    const start = gesture; reset();
    const touch = [...event.changedTouches].find(t => t.identifier === start.id);
    if (!touch || event.touches.length || blocked()) return;
    const x = touch.clientX - start.x, y = touch.clientY - start.y;
    turn(x, y);
  }, {passive:true});
  viewer.addEventListener('touchcancel', reset, {passive:true});
  viewer.addEventListener('click', event => {
    if (event.detail && performance.now() < suppressClickUntil) {
      event.preventDefault(); event.stopImmediatePropagation(); suppressClickUntil = 0;
    }
  }, true);
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide', reset);
}
