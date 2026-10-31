export const isTextInputFocused = () => {
  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement)) return false
  return activeElement.isContentEditable ||
    activeElement.matches('input, textarea, select, [role="textbox"], [contenteditable="true"]')
}
