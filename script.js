// --- Status Bar Helpers ---
function setStatus(message, loading = false) {
    let statusBar = document.getElementById("statusBar");
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
    gsap.to(statusBar, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
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
            onComplete: () => { statusBar.style.display = "none"; }
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
	modList.innerHTML = ""; // clear previous entries

	if (json.game !== "minecraft") {
        setStatus("This mod is not for Minecraft!", false);
        clearStatus(2000);
        return;
    }

	setStatus("Fetching mod info from Modrinth...", true);

	// Display game info
	const gameInfoDiv = document.createElement("div");
	gameInfoDiv.className = "game-info";

	const modNameDiv = document.createElement("div");
	modNameDiv.className = "info-block";
	modNameDiv.innerHTML = `<h2>Mod Name:</h2><p>${json.name}</p>`;
	gameInfoDiv.appendChild(modNameDiv);

	const versionDiv = document.createElement("div");
	versionDiv.className = "info-block";
	versionDiv.innerHTML = `<h2>Version:</h2><p>${json.versionId}</p>`;
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
			.map(([key, value]) => `<li>${key} ${value}</li>`)
			.join("");
		depDiv.innerHTML = `<h2>Dependencies:</h2><ul>${deps}</ul>`;
		gameInfoDiv.appendChild(depDiv);
	}

	modList.appendChild(gameInfoDiv);

	// Animate game info
	gsap.from(gameInfoDiv, {
		opacity: 0,
		y: 80,
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

    const results = await Promise.all(fetchPromises);

    clearStatus();

	// Group mods into categories
	const categories = {};
	for (const { category, mod } of results) {
		if (!categories[category]) {
			categories[category] = [];
		}
		categories[category].push(mod);
	}


	// Display categories
	for (const [category, items] of Object.entries(categories)) {
		const catDiv = document.createElement("div");
		catDiv.className = "category-block";

		const catTitle = document.createElement("h2");
		catTitle.textContent = `${category}`;
		catDiv.appendChild(catTitle);

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
			catDiv.appendChild(mod_item);
		});

		modList.appendChild(catDiv);

		// Animate each category block as it enters the viewport
		gsap.from(catDiv, {
			scrollTrigger: {
				trigger: catDiv,
				start: "top 100%",
			},
			opacity: 0,
			y: 80,
			duration: 1,
			ease: "elastic.out(1, 0.5)"
		});

		// Animate each mod inside
		catDiv.querySelectorAll(".mod-item").forEach(modItem => {
			animateModItem(modItem);
		});
	}
}

function animateModItem(modItem) {
	gsap.from(modItem, {
		scrollTrigger: {
			trigger: modItem,
			start: "top 105%",
		},
		opacity: 0,
		y: 80,
		duration: 0.8,
		ease: "elastic.out(1, 0.5)"
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

async function fetchMrPackFromLink(link) {
    try {
        setStatus("Fetching .mrpack from link...", true);
        let mrpackUrl = link;

        else if (!link.includes("/")) {
            setStatus("Resolving Modrinth project...", true);
            const versionsRes = await fetch(`https://api.modrinth.com/v2/project/${link}/version`);
            if (!versionsRes.ok) throw new Error("Failed to fetch project versions!");
            const versions = await versionsRes.json();
            if (!versions.length || !versions[0].files.length) throw new Error("No files found!");
            mrpackUrl = versions[0].files[0].url;
}

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