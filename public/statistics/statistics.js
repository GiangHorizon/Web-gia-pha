// Admin Dropdown Toggle Logic
const API = "http://localhost:3000";
document.addEventListener("DOMContentLoaded", () => {
  const adminDropdownBtn = document.getElementById("adminDropdownBtn");
  const adminDropdownMenu = document.getElementById("adminDropdownMenu");

  if (adminDropdownBtn && adminDropdownMenu) {
    adminDropdownBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      adminDropdownMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
      adminDropdownMenu.classList.add("hidden");
    });
  }

  // Load statistics when page is loaded
  fetchAndRenderStatistics();
});

async function fetchAndRenderStatistics() {
  try {
    // API endpoint written in server.js
    const response = await fetch(`${API}/api/statistics`);
    const data = await response.json();

    // 1. Update KPI Card numbers
    document.getElementById("stat-total").innerText = data.total;
    document.getElementById("stat-male").innerText = data.male;
    document.getElementById("stat-female").innerText = data.female;
    document.getElementById("stat-generations").innerText = data.maxGeneration;

    // Calculate percentage for gender split
    const totalGender = data.male + data.female;
    const pctMale = totalGender > 0 ? Math.round((data.male / totalGender) * 100) : 0;
    const pctFemale = totalGender > 0 ? Math.round((data.female / totalGender) * 100) : 0;
    document.getElementById("pct-male").innerText = `${pctMale}%`;
    document.getElementById("pct-female").innerText = `${pctFemale}%`;

    // 2. RENDER BAR CHART (Members by Generation)
    // Translate "Thế hệ X" from Vietnamese backend response to English "Generation X"
    const genLabels = data.generationData.map(item => item.label.replace("Thế hệ", "Generation"));
    const genValues = data.generationData.map(item => item.count);

    const ctxBar = document.getElementById('generationChart').getContext('2d');
    new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: genLabels,
        datasets: [{
          label: 'Members',
          data: genValues,
          backgroundColor: '#3b82f6', // Premium blue
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 24
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { color: '#94a3b8', stepSize: 10 }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { weight: 'bold' } }
          }
        }
      }
    });

    // 3. RENDER DONUT CHART (Gender Distribution)
    const ctxDonut = document.getElementById('genderChart').getContext('2d');
    new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Male', 'Female'],
        datasets: [{
          data: [data.male, data.female],
          backgroundColor: ['#0ea5e9', '#ec4899'], // Sky blue & Pink
          borderWidth: 4,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%', // Modern donut hollow size
        plugins: {
          legend: { display: false }
        }
      }
    });

  } catch (error) {
    console.error("Failed to load statistics:", error);
  }
}

