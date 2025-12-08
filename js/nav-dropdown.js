// Navigation dropdown functionality
document.addEventListener('DOMContentLoaded', function() {
  const dropdowns = document.querySelectorAll('.nav-dropdown');

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');

    if (toggle) {
      // Toggle dropdown on click
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        // Close other dropdowns
        dropdowns.forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('active');
          }
        });

        // Toggle current dropdown
        dropdown.classList.toggle('active');
      });
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-dropdown')) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });

  // Close dropdown when pressing Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
});
