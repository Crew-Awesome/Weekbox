export const modModalCarousel = {
  slideInterval: null,
  images: [],
  currentIndex: 0,
  slideDuration: 5000,

  setup(imagesArray) {
    this.images = imagesArray;
    this.currentIndex = 0;

    const thumbsContainer = document.getElementById("modal-thumbnails");
    thumbsContainer.innerHTML = "";

    this.images.forEach((imgSrc, index) => {
      const thumb = document.createElement("div");
      thumb.className = `thumbnail-wrapper ${index === 0 ? "active" : ""}`;
      thumb.onclick = () => this.goToSlide(index);

      thumb.innerHTML = `<img src="${imgSrc}">`;
      thumbsContainer.appendChild(thumb);
    });

    this.updateMainImage();
  },

  goToSlide(index) {
    this.currentIndex = index;
    this.updateMainImage();
  },

  updateMainImage() {
    const mainImg = document.getElementById("modal-main-image");

    mainImg.classList.remove("fade-anim");
    void mainImg.offsetWidth;
    mainImg.classList.add("fade-anim");

    mainImg.src = this.images[this.currentIndex];

    const thumbsContainer = document.getElementById("modal-thumbnails");
    const thumbs = thumbsContainer.querySelectorAll(".thumbnail-wrapper");

    thumbs.forEach((t) => t.classList.remove("active"));

    const activeThumb = thumbs[this.currentIndex];
    if (activeThumb) {
      activeThumb.classList.add("active");
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
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
  },
};
