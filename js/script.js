document.addEventListener("DOMContentLoaded", () => {
  // Theme toggle variables
  const checkbox = document.querySelector(".checkbox");

  // Set checkbox state based on saved theme
  checkbox.checked = localStorage.getItem("theme") === "light";
  updateElementStyles(checkbox.checked); // Apply element-specific styles on load

  // Theme toggle event listener
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      applyLightMode();
      localStorage.setItem("theme", "light");
    } else {
      applyDarkMode();
      localStorage.setItem("theme", "dark");
    }
  });

  // Apply light mode styles
  function applyLightMode() {
    const root = document.documentElement;
    root.style.setProperty(
      "--bg-gradient-yellow-1",
      "linear-gradient(to bottom right, hsl(282, 68%, 85%) 0%, hsla(285, 94%, 81%, 0) 50%)"
    );
    root.style.setProperty(
      "--text-gradient-yellow",
      "linear-gradient(to right, hsl(260, 100%, 85%), hsl(290, 100%, 83%))"
    );
    root.style.setProperty("--bg-gradient-jet", "white");
    root.style.setProperty("--jet", "hsl(0, 0%, 93%)");
    root.style.setProperty("--onyx", "hsl(271, 100%, 89%)");
    root.style.setProperty("--eerie-black-1", "hsl(0, 0%, 100%)");
    root.style.setProperty("--eerie-black-2", "hsl(240, 100%, 100%)");
    root.style.setProperty("--smoky-black", "hsl(0, 0%, 100%)");
    root.style.setProperty("--white-1", "hsl(0, 0%, 0%)");
    root.style.setProperty("--white-2", "hsl(0, 4%, 21%)");
    root.style.setProperty("--orange-yellow-crayola", "hsl(270, 50%, 70%)");
    root.style.setProperty("--vegas-gold", "hsl(270, 50%, 68%)");
    root.style.setProperty("--bittersweet-shimmer", "hsl(0, 43%, 51%)");
    root.style.setProperty("--light-gray", "hsl(0, 0%, 30%)");

    updateElementStyles(true);
  }

  // Apply dark mode styles
  function applyDarkMode() {
    const root = document.documentElement;
    root.style.setProperty(
      "--bg-gradient-yellow-1",
      "linear-gradient(to bottom right, hsl(283, 100%, 63%) 0%, hsla(285, 100%, 69%, 0) 50%)"
    );
    root.style.setProperty(
      "--text-gradient-yellow",
      "linear-gradient(to right, hsl(260, 96%, 71%), hsl(290, 100%, 76%))"
    );
    root.style.setProperty(
      "--bg-gradient-jet",
      "linear-gradient(to bottom right, hsla(240, 1%, 18%, 0.251) 0%, hsla(240, 2%, 11%, 0) 100%)"
    );
    root.style.setProperty("--jet", "hsl(0, 0%, 22%)");
    root.style.setProperty("--onyx", "hsl(240, 1%, 17%)");
    root.style.setProperty("--eerie-black-1", "hsl(240, 2%, 13%)");
    root.style.setProperty("--eerie-black-2", "hsl(240, 2%, 12%)");
    root.style.setProperty("--smoky-black", "hsl(0, 0%, 7%)");
    root.style.setProperty("--white-1", "hsl(0, 0%, 100%)");
    root.style.setProperty("--white-2", "hsl(0, 0%, 98%)");
    root.style.setProperty("--orange-yellow-crayola", "hsl(260, 96%, 71%)");
    root.style.setProperty("--vegas-gold", "hsl(270, 50%, 68%)");
    root.style.setProperty("--bittersweet-shimmer", "hsl(0, 43%, 51%)");
    root.style.setProperty("--light-gray", "hsl(0, 1%, 85%)");

    updateElementStyles(false);
  }

  // Update element-specific styles based on theme
  function updateElementStyles(isLightMode) {
    // Checkbox label
    const checkboxLabel = document.querySelector(".checkbox-label");
    checkboxLabel.style.backgroundColor = isLightMode
      ? "var(--onyx)"
      : "var(--bg-gradient-onyx)";
    checkboxLabel.style.border = isLightMode
      ? "1px solid hsl(270, 50%, 68%)"
      : "1px solid var(--jet)";

    // Sidebar info title
    const infoContentTitle = document.querySelector(".info-content .title");
    infoContentTitle.style.background = isLightMode
      ? "hsla(270, 50%, 70%, 0.634)"
      : "var(--onyx)";

    // Info more button
    const infoMoreButton = document.querySelector(".info_more-btn");
    infoMoreButton.style.background = isLightMode
      ? "white"
      : "var(--bg-gradient-jet)";

    // Navbar
    const navbar = document.querySelector(".navbar");
    navbar.style.background = isLightMode
      ? "var(--onyx)"
      : "hsla(240, 1%, 17%, 0.75)";
    navbar.style.border = isLightMode
      ? "1px solid hsl(270, 50%, 68%)"
      : "1px solid var(--jet)";

    // Testimonials text
    document.querySelectorAll(".testimonials-text-main").forEach((element) => {
      element.style.color = isLightMode
        ? "var(--light-gray)"
        : "var(--white-1)";
    });

    // About text
    const aboutText = document.querySelector(".about-text");
    aboutText.style.color = isLightMode
      ? "var(--light-gray)"
      : "var(--white-1)";

    // Service item text
    document.querySelectorAll(".service-item-text").forEach((element) => {
      element.style.color = isLightMode
        ? "var(--light-gray)"
        : "var(--white-1)";
    });

    // Service item and content card backgrounds
    document
      .querySelectorAll(".service-item, .content-card")
      .forEach((element) => {
        element.style.background = isLightMode
          ? "white"
          : "var(--border-gradient-onyx)";
      });

    // Info more button background
    document.querySelectorAll(".info_more-btn").forEach((element) => {
      element.style.background = isLightMode
        ? "var(--onyx)"
        : "var(--border-gradient-onyx)";
    });

    // Timeline text
    document.querySelectorAll(".timeline-text").forEach((element) => {
      element.style.color = isLightMode
        ? "var(--light-gray)"
        : "var(--light-gray)";
    });

    // Navbar links
    document.querySelectorAll(".navbar-link").forEach((element) => {
      element.style.color =
        isLightMode && !element.classList.contains("active")
          ? "var(--light-gray)"
          : element.classList.contains("active")
          ? "var(--orange-yellow-crayola)"
          : "var(--white-1)";
    });

    // Send mail button
    const sendMailBtn = document.querySelector(".contact-button");
    sendMailBtn.style.background = isLightMode
      ? "rgb(153, 102, 204)" // Matches hsl(270, 50%, 60%)
      : "var(--bg-gradient-onyx)";
  }

  /* MAP LIBRARY INITIALIZATION */
  async function initializeMap() {
    try {
      // Fetch GeoJSON data early
      const response = await fetch("/config/locations.json");
      if (!response.ok) {
        throw new Error(
          `Failed to load locations.json: ${response.statusText}`
        );
      }
      const geojsonData = await response.json();

      // Calculate bounds from marker coordinates
      let bounds = geojsonData.features.reduce((bounds, feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        return bounds.extend([lng, lat]);
      }, new maplibregl.LngLatBounds());

      // Initialize map
      const map = new maplibregl.Map({
        container: "map",
        style:
          "https://api.maptiler.com/maps/backdrop/style.json?key=DkZBwTcNZd93pVZ7b4qy",
        center: bounds.getCenter(),
        zoom: 2,
        pitch: 100,
        bearing: 45,
        hash: true,
        maxBounds: [
          [77.4, 12.8], // SW-Bangalore
          [77.8, 13.2], // NE-Bangalore
        ],
      });

      // Fit map to bounds and ensure angled view
      map.on("load", () => {
        map.fitBounds(bounds, {
          padding: 100,
          maxZoom: 2,
          duration: 0,
          pitch: 100,
          bearing: 45,
        });
        popup.remove(); // Ensure popup is closed
      });

      // Disable all zooming
      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
      map.boxZoom.disable();

      // Log any map errors
      map.on("error", (e) => {
        logError("Map error", e.error);
      });

      // Initialize popup
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "custom-popup",
      });

      map.on("style.load", () => {
        // Handle missing images
        map.on("styleimagemissing", (e) => {
          const id = e.id;
          if (!map.hasImage(id) && id !== "custom-marker") {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, 1, 1);
            map.addImage(id, canvas);
          }
        });

        // Hide label and symbol layers
        map.getStyle().layers.forEach((layer) => {
          if (layer.type === "symbol") {
            map.setLayoutProperty(layer.id, "visibility", "none");
          }
        });

        // Add 3D buildings layer
        try {
          if (map.getSource("composite") && map.getLayer("building")) {
            map.addLayer({
              id: "3d-buildings",
              source: "composite",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 12, // Increased to ensure buildings render at closer zoom
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
          } else {
            console.warn(
              "3D buildings source or layer missing in MapTiler style"
            );
          }
        } catch (error) {
          logError("Failed to add 3D buildings layer", error);
        }

        // Add GeoJSON source
        map.addSource("places", {
          type: "geojson",
          data: geojsonData,
        });

        // Load custom marker image
        const img = new Image(20, 20);
        img.src = "./assets/svg/flag-purple.svg";
        img.style.boxShadow = "0 0 10px rgb(0, 0, 0)"; // Add shadow for better visibility
        img.onload = () => {
          map.addImage("custom-marker", img);

          // Add markers layer with reduced hit area
          map.addLayer({
            id: "places",
            type: "symbol",
            source: "places",
            layout: {
              "icon-image": "custom-marker",
              "icon-size": 1,
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-padding": 5, // Reduced to minimize overlap
            },
          });
        };
        img.onerror = () => {
          logError("Failed to load flag-purple.svg", error);
          // Fallback: Purple square
          const canvas = document.createElement("canvas");
          canvas.width = 40;
          canvas.height = 40;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#800080";
          ctx.fillRect(0, 0, 40, 40);
          map.addImage("custom-marker", canvas);

          // Add markers layer with reduced hit area
          map.addLayer({
            id: "places",
            type: "symbol",
            source: "places",
            layout: {
              "icon-image": "custom-marker",
              "icon-size": 1,
              "icon-allow-overlap": true,
              "icon-anchor": "bottom",
              "icon-padding": 5, // Reduced to minimize overlap
            },
          });
        };

        // Handle hover to show popup for closest marker
        map.on("mousemove", "places", (e) => {
          if (e.features.length > 0) {
            // Select the first (closest) feature
            const feature = e.features[0];
            map.getCanvas().style.cursor = "pointer";

            const coordinates = feature.geometry.coordinates.slice();
            const description = feature.properties.description;

            // Normalize coordinates
            while (coordinates[0] > 180) coordinates[0] -= 360;
            while (coordinates[0] < -180) coordinates[0] += 360;

            // Add slight offset to avoid popup overlap
            popup
              .setLngLat(coordinates)
              .setHTML(description)
              .setOffset([0, -20]) // Move popup 20px above marker
              .addTo(map);
          }
        });

        // Remove popup on mouse leave
        map.on("mouseleave", "places", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });

        // Accessibility: Handle click for keyboard users
        map.on("click", "places", (e) => {
          if (e.features.length > 0) {
            const feature = e.features[0];
            const description = feature.properties.description;
            const coordinates = feature.geometry.coordinates.slice();
            popup
              .setLngLat(coordinates)
              .setHTML(description)
              .setOffset([0, -20])
              .addTo(map);
          }
        });
      });
    } catch (error) {
      logError("GeoJSON fetch failed:", error);
      document.getElementById("map").innerHTML = `
    <div style="text-align: center; padding: 20px; color: #fff;">
      Unable to load map data. Please try again later.
    </div>`;
      return;
    }
  }

  // Call the async function to initialize the map
  initializeMap();

  // Centralized error logging function
  function logError(message, error) {
    console.error(`[Map Error] ${message}`, error);
  }

  /* COPY-TO-CLIPBOARD BUTTON */
  const copyEmailBtn = document.querySelector("#copy-email-btn");
  const tickIcon = document.querySelector("#tick-icon");
  if (copyEmailBtn && tickIcon) {
    // Ensure the copy icon is visible on page load
    copyEmailBtn.classList.remove("hidden");
    tickIcon.classList.remove("active");

    copyEmailBtn.addEventListener("click", (event) => {
      navigator.clipboard
        .writeText("mayurcaariappa10@gmail.com")
        .then(() => {
          // Show tick icon and hide copy icon
          copyEmailBtn.classList.add("hidden");
          tickIcon.classList.add("active");

          // Revert to copy icon after 2 seconds
          setTimeout(() => {
            tickIcon.classList.remove("active");
            copyEmailBtn.classList.remove("hidden");
          }, 2000);
        })
        .catch((err) => {
          logError("Failed to copy email", err);
        });
    });
  }

  /* DOWNLOAD RESUME BUTTON */
  const downloadIcon = document.querySelector(".download-icon");
  function restartAnimation() {
    downloadIcon.style.animation = "none";
    downloadIcon.offsetHeight; // Reading offsetHeight forces a reflow
    downloadIcon.style.animation = "pulse 1s ease-in-out 4 forwards"; // Reapply the animation
  }
  setInterval(restartAnimation, 15000); // Restart the animation every 15 seconds (5s animation + 10s delay)

  // Sidebar toggle
  const sidebar = document.querySelector("[data-sidebar]");
  const sidebarBtn = document.querySelector("[data-sidebar-btn-2]");
  sidebarBtn.addEventListener("click", () => elementToggleFunc(sidebar));

  // Custom select for filtering
  const select = document.querySelector("[data-select]");
  const selectItems = document.querySelectorAll("[data-select-item]");
  const selectValue = document.querySelector("[data-selecct-value]");
  const filterBtn = document.querySelectorAll("[data-filter-btn]");

  select.addEventListener("click", () => elementToggleFunc(select));

  selectItems.forEach((item) => {
    item.addEventListener("click", () => {
      let selectedValue = item.innerText.toLowerCase();
      selectValue.innerText = item.innerText;
      elementToggleFunc(select);
      filterFunc(selectedValue);
    });
  });

  // Filter functionality
  const filterItems = document.querySelectorAll("[data-filter-item]");
  filterBtn[0].classList.add("active"); // Set "All" as active on load

  const filterFunc = (selectedValue) => {
    filterItems.forEach((item) => {
      const category = item.dataset.category;
      if (selectedValue === "all" || selectedValue === category) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
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

  // Page navigation
  const navigationLinks = document.querySelectorAll("[data-nav-link]");
  const pages = document.querySelectorAll("[data-page]");

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const sectionName = link.innerHTML.toLowerCase();
      pages.forEach((page) => {
        if (sectionName === page.dataset.page) {
          page.classList.add("active");
          link.classList.add("active");
        } else {
          page.classList.remove("active");
          navigationLinks.forEach((nl) => nl.classList.remove("active"));
          link.classList.add("active");
        }
      });
      // Update navbar link colors based on theme
      updateElementStyles(checkbox.checked);
      window.scrollTo(0, 0);
    });
  });

  // Initialize active section on load
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
});
