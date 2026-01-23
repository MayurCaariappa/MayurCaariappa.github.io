document.addEventListener("DOMContentLoaded", () => {
  // Theme configuration object
  const themeStyles = {
    light: {
      "--bg-gradient-yellow-1":
        "linear-gradient(to bottom right, hsl(282, 68%, 85%) 0%, hsla(285, 94%, 81%, 0) 50%)",
      "--text-gradient-yellow":
        "linear-gradient(to right, hsl(260, 100%, 85%), hsl(290, 100%, 83%))",
      "--bg-gradient-jet": "white",
      "--jet": "hsl(0, 0%, 93%)",
      "--onyx": "hsl(271, 100%, 89%)",
      "--eerie-black-1": "hsl(0, 0%, 100%)",
      "--eerie-black-2": "hsl(240, 100%, 100%)",
      "--smoky-black": "hsl(0, 0%, 100%)",
      "--white-1": "hsl(0, 0%, 0%)",
      "--white-2": "hsl(0, 4%, 21%)",
      "--orange-yellow-crayola": "hsl(270, 50%, 70%)",
      "--vegas-gold": "hsl(270, 50%, 68%)",
      "--bittersweet-shimmer": "hsl(0, 43%, 51%)",
      "--light-gray": "hsl(0, 0%, 30%)",
      "--twitter-hover-color": "hsl(0, 0%, 0%)",
    },
    dark: {
      "--bg-gradient-yellow-1":
        "linear-gradient(to bottom right, hsl(283, 100%, 63%) 0%, hsla(285, 100%, 69%, 0) 50%)",
      "--text-gradient-yellow":
        "linear-gradient(to right, hsl(260, 96%, 71%), hsl(290, 100%, 76%))",
      "--bg-gradient-jet":
        "linear-gradient(to bottom right, hsla(240, 1%, 18%, 0.251) 0%, hsla(240, 2%, 11%, 0) 100%)",
      "--jet": "hsl(0, 0%, 22%)",
      "--onyx": "hsl(240, 1%, 17%)",
      "--eerie-black-1": "hsl(240, 2%, 13%)",
      "--eerie-black-2": "hsl(240, 2%, 12%)",
      "--smoky-black": "hsl(0, 0%, 7%)",
      "--white-1": "hsl(0, 0%, 100%)",
      "--white-2": "hsl(0, 0%, 98%)",
      "--orange-yellow-crayola": "hsl(260, 96%, 71%)",
      "--vegas-gold": "hsl(270, 50%, 68%)",
      "--bittersweet-shimmer": "hsl(0, 43%, 51%)",
      "--light-gray": "hsl(0, 1%, 85%)",
      "--twitter-hover-color": "hsl(0, 0%, 100%)",
    },
  };

  // Applies the selected theme (light or dark) to the document
  function applyTheme(isLight) {
    const mode = isLight ? "light" : "dark";
    const root = document.documentElement;
    Object.entries(themeStyles[mode]).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    updateElementStyles(isLight);
    localStorage.setItem("theme", mode);
  }

  // Updates specific element styles based on the theme
  function updateElementStyles(isLight) {
    const styles = {
      ".checkbox-label": {
        backgroundColor: isLight ? "var(--onyx)" : "var(--bg-gradient-onyx)",
        border: isLight
          ? "1px solid hsl(270, 50%, 68%)"
          : "1px solid var(--jet)",
      },
      ".info-content .title": {
        background: isLight ? "hsla(270, 50%, 70%, 0.634)" : "var(--onyx)",
      },
      ".info_more-btn": {
        background: isLight ? "white" : "var(--bg-gradient-jet)",
      },
      ".navbar": {
        background: isLight ? "var(--onyx)" : "hsla(240, 1%, 17%, 0.75)",
        border: isLight
          ? "1px solid hsl(270, 50%, 68%)"
          : "1px solid var(--jet)",
      },
      ".testimonials-text-main, .about-text, .service-item-text, .timeline-text, .p-c-space, .filter-item button":
        {
          color: isLight ? "var(--light-gray)" : "var(--white-1)",
        },
      ".service-item, .content-card": {
        background: isLight ? "white" : "var(--border-gradient-onyx)",
      },
      ".contact-button": {
        background: isLight ? "var(--onyx)" : "var(--bg-gradient-onyx)",
      },
    };

    Object.entries(styles).forEach(([selector, props]) => {
      document.querySelectorAll(selector).forEach((element) => {
        Object.entries(props).forEach(([prop, value]) => {
          element.style[prop] = value;
        });
      });
    });

    document.querySelectorAll(".navbar-link").forEach((element) => {
      element.style.color =
        isLight && !element.classList.contains("active")
          ? "var(--light-gray)"
          : element.classList.contains("active")
          ? "var(--orange-yellow-crayola)"
          : "var(--white-1)";
    });
  }

  // Initializes theme based on saved preference or default
  function initializeTheme() {
    const checkbox = document.querySelector(".checkbox");
    const savedTheme = localStorage.getItem("theme") || "dark";
    checkbox.checked = savedTheme === "light";
    applyTheme(checkbox.checked);
    checkbox.addEventListener("change", () => applyTheme(checkbox.checked));
  }

  // Handles typewriter animation for text
  function initializeTypewriter() {
    const words = ["Software Engineer", "Footballer", "Photographer"];
    let wordIndex = 0,
      charIndex = 0,
      isDeleting = false;
    const typewriter = document.getElementById("typewriter");

    function type() {
      const currentWord = words[wordIndex];

      // Update text content first to ensure correct character display
      if (isDeleting) {
        typewriter.textContent = currentWord.substring(0, charIndex);
        charIndex--;
      } else {
        typewriter.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
      }

      let delay = isDeleting ? 50 : 100;

      // Check conditions after updating text and charIndex
      if (!isDeleting && charIndex === currentWord.length) {
        isDeleting = true;
        delay = 1100;
      } else if (isDeleting && charIndex < 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        charIndex = 0;
        delay = 250;
      }

      setTimeout(type, delay);
    }
    type();
  }

  // Initializes map with GeoJSON data and custom markers
  async function initializeMap() {
    try {
      const response = await fetch("/config/locations.json");
      if (!response.ok)
        throw new Error(
          `Failed to load locations.json: ${response.statusText}`
        );
      const geojsonData = await response.json();

      const bounds = geojsonData.features.reduce(
        (b, f) => b.extend(f.geometry.coordinates),
        new maplibregl.LngLatBounds()
      );
      const map = new maplibregl.Map({
        container: "map",
        style:
          "https://api.maptiler.com/maps/backdrop/style.json?key=DkZBwTcNZd93pVZ7b4qy",
        center: bounds.getCenter(),
        zoom: 40,
        pitch: 100,
        bearing: 45,
        hash: true,
        maxBounds: [
          [77.4, 12.8],
          [77.8, 13.2],
        ],
      });

      map.on("load", () => {
        map.fitBounds(bounds, {
          padding: 100,
          maxZoom: 4, // Adjusted max zoom for fitBounds
          duration: 0,
          pitch: 100,
          bearing: 45,
        });
      });

      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
      map.boxZoom.disable();
      map.on("error", (e) => console.error("[Map Error]", e.error));

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "custom-popup",
      });

      map.on("style.load", () => {
        map.getStyle().layers.forEach((layer) => {
          if (layer.type === "symbol")
            map.setLayoutProperty(layer.id, "visibility", "none");
        });

        if (map.getSource("composite") && map.getLayer("building")) {
          map.addLayer({
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 12,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                0,
                14,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                0,
                14,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.8,
            },
          });
        }

        map.addSource("places", { type: "geojson", data: geojsonData });

        const img = new Image(20, 20);
        img.src = "./assets/svg/flag-purple.svg";
        img.style.boxShadow = "0 0 10px rgb(0, 0, 0)";

        img.onload = () => {
          map.addImage("custom-marker", img);
          map.addLayer({
            id: "places",
            type: "symbol",
            source: "places",
            layout: {
              "icon-image": "custom-marker",
              "icon-size": 1,
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-padding": 5,
            },
          });
        };

        img.onerror = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 40;
          canvas.height = 40;
          canvas.getContext("2d").fillStyle = "#800080";
          canvas.getContext("2d").fillRect(0, 0, 40, 40);
          map.addImage("custom-marker", canvas);
          map.addLayer({
            id: "places",
            type: "symbol",
            source: "places",
            layout: {
              "icon-image": "custom-marker",
              "icon-size": 1,
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-padding": 5,
            },
          });
        };

        map.on("mousemove", "places", (e) => {
          if (e.features.length) {
            const feature = e.features[0];
            map.getCanvas().style.cursor = "pointer";
            const coordinates = feature.geometry.coordinates.slice();
            while (coordinates[0] > 180) coordinates[0] -= 360;
            while (coordinates[0] < -180) coordinates[0] += 360;
            popup
              .setLngLat(coordinates)
              .setHTML(feature.properties.description)
              .setOffset([0, -20])
              .addTo(map);
          }
        });

        map.on("mouseleave", "places", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });

        map.on("click", "places", (e) => {
          if (e.features.length) {
            const feature = e.features[0];
            popup
              .setLngLat(feature.geometry.coordinates.slice())
              .setHTML(feature.properties.description)
              .setOffset([0, -20])
              .addTo(map);
          }
        });
      });
    } catch (error) {
      console.error("[Map Error] GeoJSON fetch failed:", error);
      document.getElementById(
        "map"
      ).innerHTML = `<div style="text-align: center; padding: 20px; color: #fff;">Unable to load map data. Please try again later.</div>`;
    }
  }

  // Initializes download icon animation
  function initializeDownloadAnimation() {
    const downloadIcon = document.querySelector(".download-icon");
    function restartAnimation() {
      downloadIcon.style.animation = "none";
      downloadIcon.offsetHeight;
      downloadIcon.style.animation = "pulse 1s ease-in-out 4 forwards";
    }
    setInterval(restartAnimation, 15000);
  }

  // Toggles visibility of an element
  function elementToggleFunc(element) {
    element.classList.toggle("active");
  }

  // Initializes sidebar toggle functionality
  function initializeSidebar() {
    const sidebar = document.querySelector("[data-sidebar]");
    const sidebarBtn = document.querySelector("[data-sidebar-btn-2]");
    sidebarBtn.addEventListener("click", () => elementToggleFunc(sidebar));
  }

  // Initializes project filter functionality
  function initializeProjectFilter() {
    const select = document.querySelector("[data-select]");
    const selectItems = document.querySelectorAll("[data-select-item]");
    const selectValue = document.querySelector("[data-selecct-value]");
    const filterBtn = document.querySelectorAll("[data-filter-btn]");
    const filterItems = document.querySelectorAll("[data-filter-item]");

    select.addEventListener("click", () => elementToggleFunc(select));
    selectItems.forEach((item) => {
      item.addEventListener("click", () => {
        let selectedValue = item.innerText.toLowerCase();
        selectValue.innerText = item.innerText;
        elementToggleFunc(select);
        filterFunc(selectedValue);
      });
    });

    filterBtn[0].classList.add("active");
    const filterFunc = (selectedValue) => {
      filterItems.forEach((item) => {
        item.classList.toggle(
          "active",
          selectedValue === "all" || selectedValue === item.dataset.category
        );
      });
    };

    filterBtn.forEach((btn) => {
      btn.addEventListener("click", () => {
        let selectedValue = btn.innerText.toLowerCase();
        selectValue.innerText = btn.innerText;
        filterFunc(selectedValue);
        filterBtn.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  // Initializes navigation between pages
  function initializeNavigation() {
    const navigationLinks = document.querySelectorAll("[data-nav-link]");
    const pages = document.querySelectorAll("[data-page]");
    navigationLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const sectionName = link.innerHTML.toLowerCase();
        pages.forEach((page) => {
          page.classList.toggle("active", sectionName === page.dataset.page);
          navigationLinks.forEach((nl) =>
            nl.classList.toggle("active", nl === link)
          );
        });
        updateElementStyles(document.querySelector(".checkbox").checked);
        window.scrollTo(0, 0);
      });
    });

    const activeLink = document.querySelector(".navbar-link.active");
    if (activeLink) {
      const activeSection = document.querySelector(
        `article[data-page="${activeLink.innerHTML.toLowerCase()}"]`
      );
      if (activeSection) {
        activeSection.classList.add("active");
        activeLink.classList.add("active");
      }
    }
  }

  // Initialize all functionalities
  initializeTheme();
  initializeTypewriter();
  initializeMap();
  initializeDownloadAnimation();
  initializeSidebar();
  initializeProjectFilter();
  initializeNavigation();
});
