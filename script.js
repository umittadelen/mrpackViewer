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

async function onFileUpload(event) {
	const file = event.target.files[0];
	if (!file) return;

	const zip = await JSZip.loadAsync(file);
	const jsonFile = zip.file("modrinth.index.json");

	if (!jsonFile) {
		alert("modrinth.index.json not found inside .mrpack!");
		return;
	}

	const jsonText = await jsonFile.async("text");
	const json = JSON.parse(jsonText);

	console.log(json);

	const modList = document.getElementById("modList");
	modList.innerHTML = ""; // clear previous entries

	if (json.game !== "minecraft") {
		alert("This mod is not for Minecraft!");
		return;
	}

	// Display game info
	const gameInfoDiv = document.createElement("div");
	gameInfoDiv.className = "game-info";

	const name = document.createElement("h2");
	name.textContent = `Mod Name: ${json.name}`;
	gameInfoDiv.appendChild(name);

	const version = document.createElement("p");
	version.textContent = `Version: ${json.versionId}`;
	gameInfoDiv.appendChild(version);

	if (json.summary) {
		const summary = document.createElement("p");
		summary.textContent = `Summary: ${json.summary}`;
		gameInfoDiv.appendChild(summary);
	}

	if (json.dependencies) {
		const dependencies = document.createElement("p");
		dependencies.textContent = `Dependencies: ${Object.entries(json.dependencies).map(([key, value]) => `${key} ${value}`).join(', ')}`;
		gameInfoDiv.appendChild(dependencies);
	}

	modList.appendChild(gameInfoDiv);

	// Animate game info
	gsap.from(gameInfoDiv, {
		opacity: 0,
		y: 40,
		ease: "elastic.out(1, 0.5)",
		duration: 1
	});

	// Group by category
	const fetchPromises = json.files.map(async file => {
		const parts = file.path.split('/');
		const category = parts[0];
		const fullFilename = parts[parts.length - 1];
		const nameWithoutExt = fullFilename.replace(/\.[^/.]+$/, '');

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
			name.textContent = mod.name;
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

		// Animate each category block as it enters the viewport 💖
		gsap.from(catDiv, {
			scrollTrigger: {
				trigger: catDiv,
				start: "top 100%",
			},
			opacity: 0,
			y: 40,
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
		y: 40,
		duration: 0.8,
		ease: "elastic.out(1, 0.5)"
	});
}

window.addEventListener("DOMContentLoaded", () => {
	const params = new URLSearchParams(window.location.search);
	const link = params.get("link");
	if (link) {
		fetchMrPackFromLink(link);
	}
});

async function fetchMrPackFromLink(link) {
	try {
		const response = await fetch(link);
		if (!response.ok) throw new Error("Failed to fetch .mrpack file!");

		const blob = await response.blob();
		const file = new File([blob], "from-url.mrpack");
		
		// Simulate file upload~
		await onFileUpload({ target: { files: [file] } });
	} catch (err) {
		console.error("Error loading .mrpack from link:", err);
		alert("Couldn't load the .mrpack file from the provided link!");
	}
}