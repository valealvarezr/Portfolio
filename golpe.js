const themeVideo = document.getElementById("themeVideo");
const titulo = document.querySelector(".Titulo");

// Momento exacto (en segundos) donde el gato golpea la O
const golpeTime = 10;  

themeVideo.addEventListener("timeupdate", () => {
  // Verifica si el tiempo del video está en el rango del golpe
  if (Math.abs(themeVideo.currentTime - golpeTime) < 0.1) {
    titulo.classList.add("golpe");

    // Quitar clase después de la animación para poder reutilizarla en el loop
    setTimeout(() => {
      titulo.classList.remove("golpe");
    }, 700);
  }
});