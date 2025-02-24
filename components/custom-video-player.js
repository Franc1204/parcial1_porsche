class CustomVideoPlayer extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    
    const wrapper = document.createElement("div");
    wrapper.classList.add("video-wrapper");
    
    const video = document.createElement("video");
    video.src = this.getAttribute("src") || "";
    
    
    if (this.hasAttribute("muted")) {
      video.muted = true;
    }
    if (this.hasAttribute("autoplay")) {
      video.autoplay = true;
    }
    if (this.hasAttribute("loop")) {
      video.loop = true;
    }
    video.playsInline = true;
    video.classList.add("custom-video");
    
    const button = document.createElement("button");
    button.textContent = "Play";
    button.classList.add("btn", "btn-dark", "play-pause-btn");
    
    button.addEventListener("click", () => {
      if (video.paused) {
        video.play();
        button.textContent = "Pause";
      } else {
        video.pause();
        button.textContent = "Play";
      }
    });
    
    wrapper.appendChild(video);
    wrapper.appendChild(button);
    
    const style = document.createElement("style");
    style.textContent = `
      .video-wrapper {
        position: relative;
        display: inline-block;
      }
      .custom-video {
        border-radius: 20px;
        width: 100%;
        max-width: 1200px;
      }
      .play-pause-btn {
        position: absolute;
        bottom: 20px;
        left: 20px;
        z-index: 10;
      }
    `;
    
    shadow.appendChild(style);
    shadow.appendChild(wrapper);
  }
}

customElements.define("custom-video-player", CustomVideoPlayer);
