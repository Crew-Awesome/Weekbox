function sortableItems(container, selector) {
  return [...container.children].filter((item) => item.matches(selector));
}

/** Add pointer-based reordering and return a cleanup function for the interaction. */
export function setupAnimatedSortable(
  container,
  item,
  { selector, axis = "y", onDrop },
) {
  let drag = null;
  let pending = null;
  let suppressClick = false;
  let originalEngineColor = null;
  let suppressClickTimer = null;
  let settleTimer = null;
  let settlingPlaceholder = null;
  let disposed = false;
  const flipFrames = new Map();
  const activeFrames = new Set();
  const activeTimers = new Set();
  item.draggable = false;

  const requestTrackedFrame = (callback) => {
    let frameId;
    frameId = requestAnimationFrame((time) => {
      activeFrames.delete(frameId);
      callback(time);
    });
    activeFrames.add(frameId);
    return frameId;
  };

  const scheduleTrackedTimeout = (callback, delay) => {
    let timerId;
    timerId = setTimeout(() => {
      activeTimers.delete(timerId);
      callback();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  };

  const clearDragStyles = () => {
    item.classList.remove("is-dragging", "is-settling");
    item.style.position = "";
    item.style.left = "";
    item.style.top = "";
    item.style.width = "";
    item.style.height = "";
    item.style.zIndex = "";
    item.style.pointerEvents = "";
    item.style.transform = "";
    item.style.transition = "";
    item.style.translate = "";
    if (originalEngineColor !== null) {
      if (originalEngineColor) {
        item.style.setProperty("--engine-color", originalEngineColor);
      } else {
        item.style.removeProperty("--engine-color");
      }
      originalEngineColor = null;
    }
  };

  const animateLayout = (previousRects) => {
    const movedItems = sortableItems(container, selector);
    movedItems.forEach((other) => {
      if (other === item) return;
      const before = previousRects.get(other);
      if (!before) return;
      const after = other.getBoundingClientRect();
      const distance =
        axis === "x" ? before.left - after.left : before.top - after.top;
      if (!distance) return;
      other.style.setProperty(
        "--engine-sort-shift",
        axis === "x" ? `${distance}px 0` : `0 ${distance}px`,
      );
      void other.offsetWidth;
      const previousFrame = flipFrames.get(other);
      if (previousFrame) cancelAnimationFrame(previousFrame);
      flipFrames.set(
        other,
        requestTrackedFrame(() => {
          flipFrames.delete(other);
          other.style.removeProperty("--engine-sort-shift");
        }),
      );
    });
  };

  const movePlaceholder = (clientX, clientY) => {
    if (!drag) return;
    const previousRects = new Map(
      sortableItems(container, selector).map((other) => [
        other,
        other.getBoundingClientRect(),
      ]),
    );
    const pointer = axis === "x" ? clientX : clientY;
    const movingBackward = pointer < drag.lastPointer;
    const movingForward = pointer > drag.lastPointer;
    let moved = false;
    while (true) {
      const children = [...container.children];
      const placeholderIndex = children.indexOf(drag.placeholder);
      const previousItem = children
        .slice(0, placeholderIndex)
        .reverse()
        .find((child) => child.matches(selector));
      const nextItem = children
        .slice(placeholderIndex + 1)
        .find((child) => child.matches(selector));
      const previousRect = previousItem?.getBoundingClientRect();
      const nextRect = nextItem?.getBoundingClientRect();
      const previousMidpoint = previousRect
        ? (axis === "x" ? previousRect.left : previousRect.top) +
          (axis === "x" ? previousRect.width : previousRect.height) / 2
        : 0;
      const nextMidpoint = nextRect
        ? (axis === "x" ? nextRect.left : nextRect.top) +
          (axis === "x" ? nextRect.width : nextRect.height) / 2
        : 0;

      if (movingBackward && previousItem && pointer <= previousMidpoint) {
        container.insertBefore(drag.placeholder, previousItem);
        moved = true;
      } else if (movingForward && nextItem && pointer >= nextMidpoint) {
        const afterNext = nextItem.nextElementSibling;
        if (afterNext) container.insertBefore(drag.placeholder, afterNext);
        else container.appendChild(drag.placeholder);
        moved = true;
      } else {
        break;
      }
    }

    drag.lastPointer = pointer;
    if (moved) {
      drag.moved = true;
      animateLayout(previousRects);
    }
  };

  const releasePointer = (pointerId) => {
    if (!container.hasPointerCapture?.(pointerId)) return;
    container.releasePointerCapture(pointerId);
  };

  const stopTracking = () => {
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    document.removeEventListener("pointercancel", handlePointerCancel);
  };

  const cancelPending = () => {
    if (!pending) return;
    const pointerId = pending.pointerId;
    pending = null;
    stopTracking();
    releasePointer(pointerId);
  };

  const startDrag = (event) => {
    if (!pending) return;
    const { pointerId } = pending;
    const rect = item.getBoundingClientRect();
    const startPointer = axis === "x" ? pending.startX : pending.startY;
    const placeholder = document.createElement("div");
    placeholder.className = `engine-sort-placeholder ${axis}`;
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    const originalNextSibling = item.nextElementSibling;
    item.after(placeholder);
    originalEngineColor = item.style.getPropertyValue("--engine-color");
    const engineColor = getComputedStyle(item)
      .getPropertyValue("--engine-color")
      .trim();
    if (engineColor) item.style.setProperty("--engine-color", engineColor);
    document.body.appendChild(item);
    item.classList.add("is-dragging");
    drag = {
      pointerId,
      lastPointer: startPointer,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      originalNextSibling,
      placeholder,
      moved: false,
    };
    pending = null;
    item.style.position = "fixed";
    item.style.left = `${event.clientX - drag.offsetX}px`;
    item.style.top = `${event.clientY - drag.offsetY}px`;
    item.style.width = `${rect.width}px`;
    item.style.height = `${rect.height}px`;
    item.style.zIndex = "1000";
    item.style.pointerEvents = "none";
    container.setPointerCapture?.(pointerId);
  };

  const finish = (cancelled = false) => {
    if (!drag) return;
    const currentDrag = drag;
    drag = null;
    stopTracking();
    releasePointer(currentDrag.pointerId);

    if (cancelled) {
      if (currentDrag.originalNextSibling?.parentNode === container) {
        container.insertBefore(
          currentDrag.placeholder,
          currentDrag.originalNextSibling,
        );
      } else {
        const endItem = [...container.children].find(
          (child) =>
            child !== currentDrag.placeholder && !child.matches(selector),
        );
        if (endItem) container.insertBefore(currentDrag.placeholder, endItem);
        else container.appendChild(currentDrag.placeholder);
      }
    }

    if (!currentDrag.moved || cancelled) {
      currentDrag.placeholder.replaceWith(item);
      clearDragStyles();
      return;
    }

    suppressClick = true;
    suppressClickTimer = scheduleTrackedTimeout(() => {
      suppressClickTimer = null;
      suppressClick = false;
    }, 400);
    const targetRect = currentDrag.placeholder.getBoundingClientRect();
    item.classList.add("is-settling");
    item.style.transition =
      "left 180ms ease-out, top 180ms ease-out, transform 180ms ease-out";
    requestTrackedFrame(() => {
      item.style.left = `${targetRect.left}px`;
      item.style.top = `${targetRect.top}px`;
      item.style.transform = "scale(1) rotate(0deg)";
    });
    settlingPlaceholder = currentDrag.placeholder;
    settleTimer = scheduleTrackedTimeout(() => {
      settleTimer = null;
      settlingPlaceholder = null;
      currentDrag.placeholder.replaceWith(item);
      clearDragStyles();
      onDrop?.();
    }, 180);
  };

  function handlePointerMove(event) {
    const active = drag || pending;
    if (!active || event.pointerId !== active.pointerId) return;
    if (!drag) {
      const distance = Math.hypot(
        event.clientX - pending.startX,
        event.clientY - pending.startY,
      );
      if (distance < 5) return;
      startDrag(event);
    }
    event.preventDefault();
    item.style.left = `${event.clientX - drag.offsetX}px`;
    item.style.top = `${event.clientY - drag.offsetY}px`;
    movePlaceholder(event.clientX, event.clientY);
  }

  function handlePointerUp(event) {
    if (drag?.pointerId === event.pointerId) finish();
    else if (pending?.pointerId === event.pointerId) cancelPending();
  }

  function handlePointerCancel(event) {
    if (drag?.pointerId === event.pointerId) finish(true);
    else if (pending?.pointerId === event.pointerId) cancelPending();
  }

  function handlePointerDown(event) {
    const interactive = event.target.closest("button, a, input, select");
    if (
      drag ||
      pending ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (interactive && interactive !== item)
    ) {
      return;
    }
    pending = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    document.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
  }

  function handleLostPointerCapture() {
    if (drag) finish(true);
    else cancelPending();
  }

  function handleClick(event) {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  item.addEventListener("pointerdown", handlePointerDown);
  container.addEventListener("lostpointercapture", handleLostPointerCapture);
  item.addEventListener("click", handleClick, true);

  return () => {
    if (disposed) return;
    disposed = true;
    cancelPending();
    if (drag) finish(true);
    stopTracking();
    item.removeEventListener("pointerdown", handlePointerDown);
    container.removeEventListener(
      "lostpointercapture",
      handleLostPointerCapture,
    );
    item.removeEventListener("click", handleClick, true);
    for (const frameId of activeFrames) cancelAnimationFrame(frameId);
    activeFrames.clear();
    for (const timerId of activeTimers) clearTimeout(timerId);
    activeTimers.clear();
    if (settleTimer !== null) {
      if (settlingPlaceholder?.parentNode) {
        settlingPlaceholder.replaceWith(item);
      }
      settleTimer = null;
      settlingPlaceholder = null;
    }
    if (suppressClickTimer !== null) suppressClickTimer = null;
    for (const [element, frameId] of flipFrames) {
      cancelAnimationFrame(frameId);
      element.style.removeProperty("--engine-sort-shift");
    }
    flipFrames.clear();
    clearDragStyles();
  };
}
