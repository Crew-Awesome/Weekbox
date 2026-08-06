import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { modModal } from "./modal/index.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import { getEngineLabel, getEngineLabelKey, t } from "../i18n/index.js";

const featuredLabelKeys = {
  "best of today": "home.bestOfToday",
  "best of this week": "home.bestOfThisWeek",
  "best of this month": "home.bestOfThisMonth",
  "best of 3 months": "home.bestOfThreeMonths",
  "best of 6 months": "home.bestOfSixMonths",
  "best of this year": "home.bestOfThisYear",
  "best of all time": "home.bestOfAllTime",
};

function getFeaturedLabelKey(label) {
  return (
    featuredLabelKeys[
      String(label || "")
        .trim()
        .toLowerCase()
    ] || ""
  );
}

export const homeCarousel = {
  currentSlideIndex: 0,
  slideInterval: null,
  totalSlides: 0,
  featuredGroupSize: 5,
  loadToken: 0,

  async init() {
    const track = document.getElementById("carousel-track");
    const dotsContainer = document.getElementById("carousel-dots");
    if (!track || !dotsContainer) return;
    const controls = document.querySelector(".carousel-controls");
    const loadToken = ++this.loadToken;
    this.stopAutoSlide();
    this.currentSlideIndex = 0;
    this.totalSlides = 0;
    track.style.transform = "";
    dotsContainer.replaceChildren();
    if (controls) controls.hidden = true;

    try {
      const mods = await gameBananaApi.getFeaturedCarousel();
      if (loadToken !== this.loadToken) return;
      if (mods.length === 0) {
        track.textContent = t("home.noFeaturedMods");
        return;
      }

      track.innerHTML = "";
      this.totalSlides = mods.length;
      if (controls) controls.hidden = false;

      mods.forEach((mod, index) => {
        const engineName = getEngineLabel(mod.engineId, mod.engine?.name);
        const engineLabelKey = getEngineLabelKey(mod.engineId);

        const slide = document.createElement("div");
        slide.className = "carousel-slide";
        slide.style.backgroundImage = "url('assets/img/placeholder-mini.jpg')";
        if (mod.image) {
          const preloader = new Image();
          preloader.onload = () => {
            slide.style.backgroundImage = `url('${mod.image}')`;
            preloader.onload = null;
            preloader.onerror = null;
          };
          preloader.onerror = () => {
            slide.style.backgroundImage = "url('assets/img/placeholder-mini.jpg')";
            preloader.onload = null;
            preloader.onerror = null;
          };
          preloader.src = mod.image;
        }
        slide.innerHTML = `
            <div class="carousel-overlay"></div>
            <div class="home-engine-badge">
              <img alt="" />
              <span class="home-engine-name"></span>
            </div>
            <div class="carousel-content">
                <span class="badge"></span>
                <h1></h1>
                <p class="carousel-author"></p>
                <button class="action-btn download-mod-btn" type="button">
                    <i class="fa-solid fa-download"></i> ${t("common.download")}
                </button>
            </div>
        `;

        const engineBadge = slide.querySelector(".home-engine-badge");
        const engineIcon = engineBadge?.querySelector("img");
        const engineNameEl = engineBadge?.querySelector(".home-engine-name");
        if (engineNameEl) {
          engineNameEl.textContent = engineName;
          if (engineLabelKey) engineNameEl.dataset.i18n = engineLabelKey;
        }
        if (engineBadge) engineBadge.title = engineName;
        if (engineIcon && mod.engine?.icon) {
          engineIcon.src = `assets/icons/${mod.engine.icon}`;
        }
        if (engineBadge && !engineName && !mod.engine?.icon) {
          engineBadge.hidden = true;
        }
        const badge = slide.querySelector(".badge");
        const labelKey = getFeaturedLabelKey(mod.label);
        if (badge) {
          badge.textContent = labelKey ? t(labelKey) : mod.label || "";
          if (labelKey) badge.dataset.i18n = labelKey;
        }
        const title = slide.querySelector("h1");
        if (title) title.textContent = mod.title || "";
        const author = slide.querySelector(".carousel-author");
        if (author) {
          author.textContent = t("home.byAuthor", { author: mod.author });
          author.dataset.i18n = "home.byAuthor";
          author.dataset.i18nVars = JSON.stringify({ author: mod.author });
        }

        const downloadBtn = slide.querySelector(".download-mod-btn");
        downloadBtn?.addEventListener("click", () => {
          modModal.open(mod.id);
        });
        track.appendChild(slide);

        const dot = document.createElement("div");
        dot.className = "dot";
        dot.addEventListener("click", () => this.goToSlide(index));
        dotsContainer.appendChild(dot);
      });

      this.setupControls();
      this.updateDots();
      this.startAutoSlide();
    } catch (error) {
      if (loadToken !== this.loadToken) return;
      networkStatus.setOnline(false);
      this.stopAutoSlide();
      track.textContent = t("home.carouselError");
    }
  },

  setupControls() {
    const btnPrev = document.getElementById("carousel-prev");
    const btnNext = document.getElementById("carousel-next");
    if (btnPrev) {
      const newPrev = btnPrev.cloneNode(true);
      btnPrev.parentNode.replaceChild(newPrev, btnPrev);
      newPrev.title = t("home.previousFeatured");
      newPrev.addEventListener("click", (event) =>
        event.shiftKey ? this.prevGroup() : this.prevSlide(),
      );
    }
    if (btnNext) {
      const newNext = btnNext.cloneNode(true);
      btnNext.parentNode.replaceChild(newNext, btnNext);
      newNext.title = t("home.nextFeatured");
      newNext.addEventListener("click", (event) =>
        event.shiftKey ? this.nextGroup() : this.nextSlide(),
      );
    }
  },

  updateDots() {
    const dots = document
      .getElementById("carousel-dots")
      ?.querySelectorAll(".dot") || [];
    if (dots.length === 0) return;
    dots.forEach((d) => {
      d.classList.remove("active");
      d.style.display = "none";
    });
    const visibleDots = this.featuredGroupSize;
    const groupStart =
      Math.floor(this.currentSlideIndex / visibleDots) * visibleDots;
    for (
      let offset = 0;
      offset < Math.min(visibleDots, this.totalSlides - groupStart);
      offset++
    ) {
      const dotIndex = groupStart + offset;
      dots[dotIndex]?.style.setProperty("display", "block");
      dots[dotIndex]?.style.setProperty("order", String(offset + 1));
    }
    dots[this.currentSlideIndex]?.classList.add("active");
  },

  goToSlide(index) {
    const track = document.getElementById("carousel-track");
    if (!track || this.totalSlides === 0) return;
    this.currentSlideIndex = Math.max(
      0,
      Math.min(Number(index) || 0, this.totalSlides - 1),
    );
    track.style.transform = `translateX(-${this.currentSlideIndex * 100}%)`;
    this.updateDots();
    this.startAutoSlide();
  },

  nextSlide() {
    if (this.totalSlides > 0)
      this.goToSlide((this.currentSlideIndex + 1) % this.totalSlides);
  },

  prevSlide() {
    if (this.totalSlides > 0)
      this.goToSlide(
        (this.currentSlideIndex - 1 + this.totalSlides) % this.totalSlides,
      );
  },

  nextGroup() {
    if (this.totalSlides > 0)
      this.goToSlide(
        (this.currentSlideIndex + this.featuredGroupSize) % this.totalSlides,
      );
  },

  prevGroup() {
    if (this.totalSlides > 0)
      this.goToSlide(
        (this.currentSlideIndex - this.featuredGroupSize + this.totalSlides) %
          this.totalSlides,
      );
  },

  startAutoSlide() {
    this.stopAutoSlide();
    if (this.totalSlides <= 1) return;
    this.slideInterval = setInterval(() => this.nextSlide(), 5000);
  },

  stopAutoSlide() {
    if (this.slideInterval) clearInterval(this.slideInterval);
    this.slideInterval = null;
  },
};
