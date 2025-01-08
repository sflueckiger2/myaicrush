export function scrollToBottom(container) {
  if (container) {
      container.scrollTop = container.scrollHeight;
  } else {
      console.warn('Container for scrolling is undefined.');
  }
}
