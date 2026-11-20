window.location.replace("https://map.vicecityhub.eu");

const fsBtn = document.getElementById('toggle-map-fullscreen');
    const mapFrame = document.getElementById('leonida-map-frame');
    if (fsBtn && mapFrame) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          if (mapFrame.requestFullscreen) {
            mapFrame.requestFullscreen();
          } else if (mapFrame.webkitRequestFullscreen) {
            mapFrame.webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      });
    }
