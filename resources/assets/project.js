(() => {
  const descriptions = {
    terminate: 'Conclude or safely interrupt an ongoing event that conflicts with the updated instruction.',
    release: 'Resolve incompatible contacts, held objects, or occupied hands before the next action.',
    align: 'Establish the pose, position, or contact needed for the target action.',
    entry: 'Introduce a missing entity through a plausible, observable process.',
    execute: 'Hand control back to the original target instruction after the required preparation.'
  };
  document.querySelectorAll('[data-role]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-role]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      document.getElementById('role-description').textContent = descriptions[button.dataset.role];
    });
  });
  document.getElementById('see-interaction').addEventListener('click', () => {
    const video = document.getElementById('demo-player');
    video.currentTime = 49.2;
    document.getElementById('demo-section').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    const play = video.play();
    if (play) play.catch(() => {document.getElementById('demo-status').textContent = 'Press play to watch the planned interaction.';});
  });
})();
