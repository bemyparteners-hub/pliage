const filterButtons = document.querySelectorAll(".filter");
const prospectRows = document.querySelectorAll("tbody tr[data-status]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    prospectRows.forEach((row) => {
      const shouldShow = selectedFilter === "all" || row.dataset.status === selectedFilter;
      row.classList.toggle("is-hidden", !shouldShow);
    });
  });
});
