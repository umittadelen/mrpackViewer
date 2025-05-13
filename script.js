document.getElementById("fileInput").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const zip = await JSZip.loadAsync(file);
  const jsonFile = zip.file("modrinth.index.json");

  if (!jsonFile) {
    alert("Nyaa~ modrinth.index.json not found inside .mrpack!");
    return;
  }

  const jsonText = await jsonFile.async("text");
  const json = JSON.parse(jsonText);

  const modList = document.getElementById("modList");
  modList.innerHTML = ""; // clear previous entries

  // Only work with Minecraft game
  if (json.game !== "minecraft") {
    alert("This mod is not for Minecraft!");
    return;
  }

  // Display Minecraft-specific info
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

  // Group by category
  const categories = {};

  json.files.forEach(file => {
    const parts = file.path.split('/');
    const category = parts[0];
    const fullFilename = parts[parts.length - 1];
    const nameWithoutExt = fullFilename.replace(/\.[^/.]+$/, '');

    if (!categories[category]) {
      categories[category] = [];
    }

    categories[category].push({
      name: nameWithoutExt,
      download: file.downloads?.[0] || null
    });
  });

  // Display per category
  for (const [category, items] of Object.entries(categories)) {
    const catDiv = document.createElement("div");
    catDiv.className = "category-block";

    const catTitle = document.createElement("h2");
    catTitle.textContent = `${category}`;
    catDiv.appendChild(catTitle);

    items.forEach(mod => {
      const modDiv = document.createElement("div");
      modDiv.className = "mod-item";

      const name = document.createElement("h3");
      name.textContent = mod.name;
      modDiv.appendChild(name);

      if (mod.download) {
        const link = document.createElement("a");
        link.href = mod.download;
        link.textContent = "Download";
        link.className = "download-button";
        link.target = "_blank";
        modDiv.appendChild(link);
      } else {
        const span = document.createElement("span");
        span.textContent = "No download link";
        modDiv.appendChild(span);
      }

      catDiv.appendChild(modDiv);
    });

    modList.appendChild(catDiv);
  }
});
