import { setStatus, clearStatus } from './statusBar.js';
import { apiURL, header } from './variables.js';

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
            const projectRes = await fetch(`${apiURL}/version_file/${file.hashes.sha1}`, header).then(res => res.json());
            projectData = await fetch(`${apiURL}/project/${projectRes.project_id}`, header).then(res => res.json());
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

    let results = await Promise.all(fetchPromises);

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
	document.getElementById("modSearchInput").style.display = "block";

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

export { onFileUpload };