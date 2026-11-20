document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dsa-report-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Notice recorded. Please also send any supporting documentation to info@vicecityhub.eu.');
      form.reset();
    });
  }
});
