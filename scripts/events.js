import { checkCompatibility, compatibilityChecked } from './compatibility.js';
import { fetchMrPackFromLink } from './fetchModpack.js';

window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    let link = params.get("link") || params.get("l");
    if (!link && window.location.hash.length > 1) {
        link = decodeURIComponent(window.location.hash.substring(1));
    }
    if (link) {
        fetchMrPackFromLink(link);
    }
});

document.getElementById("urlInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        const link = event.target.value.trim();
        if (link) {
            fetchMrPackFromLink(link);
        }
    }
});

document.getElementById("loadBtn").addEventListener("click", function() {
    const link = document.getElementById("urlInput").value.trim();
	console.log("Load button clicked with link:", link);
    if (link) {
        fetchMrPackFromLink(link);
    }
});

document.getElementById("checkCompatibilityBtn").addEventListener("click", async () => {
    await checkCompatibility();
});

document.getElementById("showAllBtn").addEventListener("click", async () => {
	if (compatibilityChecked) {
		document.querySelectorAll(".mod-item").forEach(item => {
			if (item.getAttribute("controlled-by-search") !== "true") {
				item.style.display = "flex";
				item.removeAttribute("controlled-by-compatibility");
			}
		});
	} else {
		await checkCompatibility();
	}
});

document.getElementById("showCompatibleBtn").addEventListener("click", async () => {
	if (compatibilityChecked) {
		document.querySelectorAll(".mod-item").forEach(item => {
			if (item.getAttribute("data-compatible") === "true" && item.getAttribute("controlled-by-search") !== "true") {
				item.style.display = "flex";
				item.removeAttribute("controlled-by-compatibility");
			} else {
				item.style.display = "none";
				item.setAttribute("controlled-by-compatibility", "true");
			}
		});
	} else {
		await checkCompatibility();
	}
});

document.getElementById("showIncompatibleBtn").addEventListener("click", async () => {
	if (compatibilityChecked) {
		document.querySelectorAll(".mod-item").forEach(item => {
			if (item.getAttribute("data-compatible") === "false" && item.getAttribute("controlled-by-search") !== "true") {
				item.style.display = "flex";
				item.removeAttribute("controlled-by-compatibility");
			} else {
				item.style.display = "none";
				item.setAttribute("controlled-by-compatibility", "true");
			}
		});
	} else {
		await checkCompatibility();
	}
});

document.getElementById("modSearchInput").addEventListener("input", function(event) {
	const query = event.target.value.toLowerCase();
	document.querySelectorAll(".mod-item").forEach(item => {
		const name = item.querySelector("h3")?.textContent.toLowerCase() || "";
		const hiddenByCompat = item.getAttribute("controlled-by-compatibility") === "true";
		if (name.includes(query) && !hiddenByCompat) {
			item.style.display = "flex";
			item.removeAttribute("controlled-by-search");
		} else {
			item.style.display = "none";
			item.setAttribute("controlled-by-search", "true");
		}
	});
});