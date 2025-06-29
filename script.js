let apiURL = "https://api.modrinth.com/v2";
let header = {
	heasers: {
    	"User-Agent": "umittadelen/mrpackViewer/1.0 (https://github.com/umittadelen)"
	}
}

// --- Status Bar Helpers ---
function setStatus(message, loading = false) {
	let statusBar = document.getElementById("statusBar");
	const isNew = !statusBar;
	if (!statusBar) {
		statusBar = document.createElement("div");
		statusBar.id = "statusBar";
		statusBar.className = "status-bar";
		document.body.appendChild(statusBar);
	}
	statusBar.innerHTML = loading
		? `<div class="info-block"><span class="status-message">${message}</span><span class="status-spinner"></span></div>`
		: `<span class="status-message">${message}</span>`;
	statusBar.style.display = "block";
	if (isNew) {
		gsap.set(statusBar, { y: -30, opacity: 0 });
		gsap.to(statusBar, {
			opacity: 1,
			y: 0,
			duration: 0.4,
			ease: "power2.out"
		});
	}
}

function clearStatus(delay = 0) {
    const statusBar = document.getElementById("statusBar");
    if (!statusBar) return;
    setTimeout(() => {
        gsap.to(statusBar, {
            opacity: 0,
            y: -30,
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => { statusBar.remove(); }
        });
    }, delay);
}

document.getElementById("fileInput").addEventListener("change", onFileUpload);
// Add drag and drop file upload support
const dropArea = document.getElementById("drop-area");
dropArea.addEventListener("dragover", (event) => {
	event.preventDefault();
	dropArea.classList.add("dragging");
});
dropArea.addEventListener("dragleave", () => {
	dropArea.classList.remove("dragging");
});
dropArea.addEventListener("drop", (event) => {
	event.preventDefault();
	dropArea.classList.remove("dragging");
	const files = event.dataTransfer.files;
	if (files.length > 0) {
		const file = files[0];
		if (file.name.endsWith(".mrpack")) {
			onFileUpload({ target: { files: [file] } });
		} else {
			alert("Please drop a .mrpack file!");
		}
	}
});

function formatModName(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

async function onFileUpload(event) {
	setStatus("Loading and parsing .mrpack file...", true);
	const file = event.target.files[0];
	if (!file) {
        clearStatus();
        return;
    }

	const zip = await JSZip.loadAsync(file);
	const jsonFile = zip.file("modrinth.index.json");

	if (!jsonFile) {
        setStatus("modrinth.index.json not found inside .mrpack!", false);
        clearStatus(2000);
        return;
    }

	const jsonText = await jsonFile.async("text");
	const json = JSON.parse(jsonText);

	console.log(json);

	const modList = document.getElementById("modList");
	const modListPreview = document.getElementById("mod-list-preview");
	modList.innerHTML = ""; // clear previous entries
	modList.style.display = "";

	if (json.game !== "minecraft") {
        setStatus("This modpack is not for Minecraft!", false);
        clearStatus(2000);
        return;
    }

	setStatus("Fetching mod info from Modrinth...", true);

	// Display game info
	const gameInfoDiv = document.createElement("div");
	gameInfoDiv.className = "game-info";

	/** remove the existing game-info */
	const existingGameInfo = document.querySelector(".game-info");
	const gameInfoPreview = document.getElementById("game-info-preview");
	if (gameInfoPreview) {
		gameInfoPreview.remove();
	}
	if (existingGameInfo) {
		existingGameInfo.remove();
	}

	const gameInfoContainer = document.getElementById("game-info-container");
	gameInfoContainer.style.display = "";

	const modNameDiv = document.createElement("div");
	modNameDiv.className = "info-block";
	modNameDiv.innerHTML = `<div class="flex-vertical"><h2>Mod Name:</h2><p>${json.name}</p></div>`;
	gameInfoDiv.appendChild(modNameDiv);

	const versionDiv = document.createElement("div");
	versionDiv.className = "info-block";
	versionDiv.innerHTML = `<div class="flex-vertical"><h2>Version:</h2><p>${json.versionId}</p></div>`;
	gameInfoDiv.appendChild(versionDiv);

	if (json.summary) {
		const summaryDiv = document.createElement("div");
		summaryDiv.className = "info-block";
		summaryDiv.innerHTML = `<h2>Summary:</h2><p>${json.summary}</p>`;
		gameInfoDiv.appendChild(summaryDiv);
	}

	if (json.dependencies) {
		const depDiv = document.createElement("div");
		depDiv.className = "info-block";

		const deps = Object.entries(json.dependencies)
			.map(([key, value]) => `<p>${key} ${value}</p>`)
			.join("");

		depDiv.innerHTML = `<div class="flex-vertical"><h2>Dependencies:</h2>${deps}</div>`;
		gameInfoDiv.appendChild(depDiv);
	}

	gameInfoContainer.appendChild(gameInfoDiv);

	// Animate game info
	gsap.from(gameInfoDiv, {
		opacity: 0,
		x: 80,
		ease: "elastic.out(1, 0.5)",
		duration: 1
	});

	// Group by category
	const fetchPromises = json.files.map(async file => {
		const parts = file.path.split('/');
		const category = parts[0];
		const fullFilename = parts[parts.length - 1];
		const nameWithoutExt = fullFilename.replace(/\.[^/.]+$/, "");

        let projectData = null;

        try {
            const projectRes = await fetch(`https://api.modrinth.com/v2/version_file/${file.hashes.sha1}`).then(res => res.json());
            projectData = await fetch(`https://api.modrinth.com/v2/project/${projectRes.project_id}`).then(res => res.json());
        } catch (err) {
            console.error("Error fetching project data:", err);
        }

		return {
			category,
			mod: {
				name: projectData?.title || nameWithoutExt,
				download: file.downloads?.[0] || null,
				icon_url: projectData?.icon_url || null,
				project_id: projectData?.id || null
			}
		};
	});

    results = await Promise.all(fetchPromises);

	// Group mods into categories
	const categories = {};
	for (const { category, mod } of results) {
		if (!categories[category]) {
			categories[category] = [];
		}
		categories[category].push(mod);
	}

	// Display categories
	modList.innerHTML = "";

	for (const [category, items] of Object.entries(categories)) {
		const catDiv = document.createElement("div");
		catDiv.className = "category-block";

		const catTitle = document.createElement("h2");
		catTitle.innerHTML = `${category} <span style="font-weight: normal;">[${items.length}/${json.files.length}]</span>`;
		catDiv.appendChild(catTitle);

		const modContainer = document.createElement("div");
		modContainer.className = "mod-container";

		items.forEach(mod => {
			const mod_item = document.createElement("div");
			mod_item.className = "mod-item";

			if (mod.icon_url) {
				const icon = document.createElement("img");
				icon.src = mod.icon_url;
				icon.className = "mod-icon";
				mod_item.appendChild(icon);
			}

			const mod_item_content = document.createElement("div");
			mod_item_content.className = "mod-item-content";

			const name = document.createElement("h3");
			name.textContent = formatModName(mod.name);
			mod_item_content.appendChild(name);

			const button_row = document.createElement("div");
			button_row.className = "button-row";

			if (mod.download) {
				const link = document.createElement("a");
				link.href = mod.download;
				link.textContent = `Download for ${json.dependencies.minecraft}`;
				link.className = "download-button";
				button_row.appendChild(link);
			} else {
				const span = document.createElement("span");
				span.textContent = "No download link";
				button_row.appendChild(span);
			}

			const link = document.createElement("a");
			link.href = `https://modrinth.com/mod/${mod.project_id}`;
			link.textContent = `modrinth page`;
			link.className = "download-button";
			button_row.appendChild(link);

			mod_item_content.appendChild(button_row);
			mod_item.appendChild(mod_item_content);
			modContainer.appendChild(mod_item);
			catDiv.appendChild(modContainer);
		});

		if (modListPreview) {
			modListPreview.remove();
		}
		modList.appendChild(catDiv);

		animateModItem(catDiv);

		// Animate each mod inside
		catDiv.querySelectorAll(".mod-item").forEach(modItem => {
			animateModItem(modItem);
		});
	}
	clearStatus();
}

function animateModItem(modItem) {
  gsap.from(modItem, {
		opacity: 0,
		x: 80,
		ease: "elastic.out(1, 0.5)",
		duration: 1
	});
}

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
    if (link) {
        fetchMrPackFromLink(link);
    }
});

async function fetchMrPackFromLink(link) {
    try {
        setStatus("Fetching .mrpack from link...", true);
        let mrpackUrl = link;

        // If user enters only a projectIdOrSlug (e.g., "cinematic+"), treat it as a Modrinth slug
        const modrinthSlugMatch = link.match(/^[a-zA-Z0-9\-\+_]+$/);
        if (modrinthSlugMatch) {
            setStatus("Resolving Modrinth project from slug...", true);
            const projectIdOrSlug = link;
            const versionsRes = await fetch(`https://api.modrinth.com/v2/project/${projectIdOrSlug}/version`);
			
            if (!versionsRes.ok) throw new Error("Failed to fetch project versions!");
            const versions = await versionsRes.json();
            if (!versions.length || !versions[0].files.length) throw new Error("No files found for this project!");
            mrpackUrl = versions[0].files[0].url;
        } else {
            // If it's a Modrinth project URL
            const modrinthProjectMatch = link.match(/^https:\/\/modrinth\.com\/(mod|modpack)\/([^\/#?]+)/i);
            if (modrinthProjectMatch) {
                setStatus("Resolving Modrinth project...", true);
                const projectIdOrSlug = modrinthProjectMatch[2];
                const versionsRes = await fetch(`https://api.modrinth.com/v2/project/${projectIdOrSlug}/version`);
                if (!versionsRes.ok) throw new Error("Failed to fetch project versions!");
                const versions = await versionsRes.json();
                if (!versions.length || !versions[0].files.length) throw new Error("No files found for this project!");
                mrpackUrl = versions[0].files[0].url;
            }
        }

        setStatus("Loading .mrpack file...", true);
        const response = await fetch(mrpackUrl);
        if (!response.ok) throw new Error("Failed to fetch .mrpack file!");

        const blob = await response.blob();
        const file = new File([blob], "from-url.mrpack");
        
        // Simulate file upload
        await onFileUpload({ target: { files: [file] } });
    } catch (err) {
        console.error("Error loading .mrpack from link:", err);
        setStatus("Couldn't load the .mrpack file from the provided link!", false);
        clearStatus(2500);
    }
}

let compatibilityChecked = false;

async function checkCompatibility() {
	const version = document.getElementById("mcVersionInput").value.trim();
    if (!version) {
		setStatus("Please enter a Minecraft version!", false);
		clearStatus(1000);
		return;
	}
    const modItems = document.querySelectorAll(".mod-item");
    setStatus("Checking compatibility...", true);

    let compatibleP = document.getElementById("compatible");
    let incompatibleP = document.getElementById("incompatible");

    let compatibleCount = 0;
    let notCompatibleCount = 0;

    // Collect all fetch promises
    const tasks = Array.from(modItems).map(async (modItem) => {
        const modrinthLink = modItem.querySelector('a[href^="https://modrinth.com/mod/"]');
        if (!modrinthLink) return;
        const projectId = modrinthLink.href.split("/").pop();

        let compatSpan = modItem.querySelector(".compatibility-info");
        if (!compatSpan) {
            compatSpan = document.createElement("span");
            compatSpan.className = "compatibility-info";
            modItem.querySelector(".mod-item-content").appendChild(compatSpan);
        }

        try {
            const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version?game_versions=["${version}"]`);
            const versions = await res.json(); //check also if response.ok
			if (res.ok) {
				if (Array.isArray(versions) && versions.length > 0) {
					compatSpan.textContent = `Compatible with ${version}`;
					compatSpan.style.color = "var(--green-text-color)";
					modItem.setAttribute("data-compatible", "true");
					compatibleCount++;
				} else {
					compatSpan.textContent = `Not compatible with ${version}`;
					compatSpan.style.color = "var(--red-text-color)";
					modItem.setAttribute("data-compatible", "false");
					notCompatibleCount++;
				}
			} else {
				compatSpan.textContent = `failed to check`;
				compatSpan.style.color = "var(--blue-text-color)";
				modItem.setAttribute("data-compatible", "false");
				notCompatibleCount++;
			}
        } catch (e) {
            compatSpan.textContent = `Compatibility unknown`;
            compatSpan.style.color = "var(--blue-text-color)";
			modItem.setAttribute("data-compatible", "false");
            notCompatibleCount++;
        }
		compatibleP.innerHTML = `<span class="green">${compatibleCount} compatible</span>`;
    	incompatibleP.innerHTML = `<span class="red">${notCompatibleCount} incompatible</span>`;
    });

    await Promise.all(tasks);
	compatibilityChecked = true;

    clearStatus(1000);
}

document.getElementById("checkCompatibilityBtn").addEventListener("click", async () => {
    await checkCompatibility();
});
document.getElementById("showAllBtn").addEventListener("click", async () => {
	if (compatibilityChecked) {
		document.querySelectorAll(".mod-item").forEach(item => {
			item.style.display = "flex";
		});
	} else {
		await checkCompatibility();
	}
});
document.getElementById("showCompatibleBtn").addEventListener("click", async () => {
	if (compatibilityChecked) {
		document.querySelectorAll(".mod-item").forEach(item => {
			if (item.getAttribute("data-compatible") === "true") {
				item.style.display = "flex";
			} else {
				item.style.display = "none";
			}
		});
	} else {
		await checkCompatibility();
	}
});
document.getElementById("showIncompatibleBtn").addEventListener("click", async () => {
	if (compatibilityChecked) {
		document.querySelectorAll(".mod-item").forEach(item => {
			if (item.getAttribute("data-compatible") === "false") {
				item.style.display = "flex";
			} else {
				item.style.display = "none";
			}
		});
	} else {
		await checkCompatibility();
	}
});