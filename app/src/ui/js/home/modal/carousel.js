import { setModalBackdrop } from "./modalBackdrop.js";

export const modModalCarousel = {
  slideInterval: null,
  images: [],
  currentIndex: 0,
  slideDuration: 5000,

  setup(imagesArray) {
    const images = Array.isArray(imagesArray)
      ? imagesArray.filter((image) => typeof image === "string" && image)
      : [];
    this.images = images.length ? images : ["assets/img/placeholder-mini.jpg"];
    this.currentIndex = 0;

    const thumbsContainer = document.getElementById("modal-thumbnails");
    if (!thumbsContainer) return;
    thumbsContainer.replaceChildren();

    this.images.forEach((imgSrc, index) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = `thumbnail-wrapper ${index === 0 ? "active" : ""}`;
      thumb.setAttribute("aria-label", `Show preview ${index + 1}`);
      thumb.onclick = () => this.goToSlide(index);

      const src = imgSrc || "assets/img/placeholder-mini.jpg";
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.onerror = () => {
        image.onerror = null;
        image.src = "assets/img/placeholder-mini.jpg";
      };
      thumb.appendChild(image);
      thumbsContainer.appendChild(thumb);
    });

    this.updateMainImage();
  },

  goToSlide(index) {
    if (!this.images.length) return;
    this.currentIndex = Math.max(
      0,
      Math.min(Number(index) || 0, this.images.length - 1),
    );
    this.updateMainImage();
  },

  updateMainImage() {
    const mainImg = document.getElementById("modal-main-image");
    if (!mainImg || !this.images.length) return;
    this.currentIndex = Math.max(
      0,
      Math.min(this.currentIndex, this.images.length - 1),
    );
    const imageSrc = this.images[this.currentIndex] || "assets/img/placeholder-mini.jpg";
    setModalBackdrop(document.getElementById("mod-modal"), imageSrc);

    mainImg.classList.remove("fade-anim");
    void mainImg.offsetWidth;
    mainImg.classList.add("fade-anim");

    mainImg.onerror = () => {
      mainImg.onerror = null;
      mainImg.src = "assets/img/placeholder-mini.jpg";
    };
    mainImg.src = imageSrc;

    const thumbsContainer = document.getElementById("modal-thumbnails");
    if (!thumbsContainer) return;
    const thumbs = thumbsContainer.querySelectorAll(".thumbnail-wrapper");

    thumbs.forEach((t) => t.classList.remove("active"));

    const activeThumb = thumbs[this.currentIndex];
    if (activeThumb) {
      activeThumb.classList.add("active");
      const targetLeft =
        activeThumb.offsetLeft -
        (thumbsContainer.clientWidth - activeThumb.clientWidth) / 2;
      thumbsContainer.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
      });
    }

    const progressBar = document.getElementById("modal-progress-bar");
    if (progressBar) {
      progressBar.style.transition = "none";
      progressBar.style.width = "0%";

      void progressBar.offsetWidth;

      progressBar.style.transition = `width ${this.slideDuration}ms linear`;
      progressBar.style.width = "100%";
    }

    this.startAutoPlay();
  },

  startAutoPlay() {
    this.stopAutoPlay();
    if (this.images.length <= 1) return;

    this.slideInterval = setTimeout(() => {
      let nextIndex = (this.currentIndex + 1) % this.images.length;
      this.goToSlide(nextIndex);
    }, this.slideDuration);
  },

  stopAutoPlay() {
    if (this.slideInterval) {
      clearTimeout(this.slideInterval);
    }
    this.slideInterval = null;
  },
};
