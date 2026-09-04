const effectSelect = document.querySelector('#effect');

const [effects, state] = await Promise.all([
  window.swyzzleDesktop.getEffects(),
  window.swyzzleDesktop.getState(),
]);

for (const effect of effects) {
  const option = document.createElement('option');
  option.value = effect.value;
  option.textContent = effect.label;
  effectSelect.append(option);
}

effectSelect.value = state.effect;
effectSelect.addEventListener('change', () => {
  window.swyzzleDesktop.setEffect(effectSelect.value);
});
