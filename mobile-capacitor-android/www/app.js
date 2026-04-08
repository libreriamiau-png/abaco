const statusEl = document.getElementById("status");
const pingBtn = document.getElementById("ping");

pingBtn.addEventListener("click", () => {
  const platform = window.Capacitor?.getPlatform?.() || "web";
  statusEl.textContent = `Capacitor OK en ${platform}`;
});
