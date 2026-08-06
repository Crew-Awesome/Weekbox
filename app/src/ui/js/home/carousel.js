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

  async init() {
    const track = document.getElementById("carousel-track");
    const dotsContainer = document.getElementById("carousel-dots");
    if (!track || !dotsContainer) return;

    try {
      const mods = await gameBananaApi.getFeaturedCarousel();
      if (mods.length === 0) {
        track.textContent = t("home.noFeaturedMods");
        return;
      }

      track.innerHTML = "";
      dotsContainer.innerHTML = "";
      this.totalSlides = mods.length;

      mods.forEach((mod, index) => {
        const engineName = getEngineLabel(mod.engineId, mod.engine?.name);
        const engineLabelKey = getEngineLabelKey(mod.engineId);
        const engineBadgeHtml = `
          <div class="home-engine-badge" title="${engineName}">
              <img src="assets/icons/${mod.engine.icon}" alt=""/>
              <span class="home-engine-name"${engineLabelKey ? ` data-i18n="${engineLabelKey}"` : ""}>${engineName}</span>
          </div>
        `;

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
            ${engineBadgeHtml}
            <div class="carousel-content">
                <span class="badge">${mod.label}</span>
                <h1>${mod.title}</h1>
                <p class="carousel-author">${t("home.byAuthor", { author: mod.author })}</p>
                <button class="action-btn download-mod-btn">
                    <i class="fa-solid fa-download"></i> ${t("common.download")}
                </button>
            </div>
        `;

        const badge = slide.querySelector(".badge");
        const labelKey = getFeaturedLabelKey(mod.label);
        if (badge && labelKey) {
          badge.dataset.i18n = labelKey;
          badge.textContent = t(labelKey);
        }
        const author = slide.querySelector(".carousel-author");
        if (author) {
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
      networkStatus.setOnline(false);
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
    const dots = document.querySelectorAll(".dot");
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
    if (!track) return;
    this.currentSlideIndex = index;
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
    this.slideInterval = setInterval(() => this.nextSlide(), 5000);
  },

  stopAutoSlide() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  },
};
