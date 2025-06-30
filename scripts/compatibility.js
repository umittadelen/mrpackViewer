import { setStatus, clearStatus } from "./statusBar.js";

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
            const res = await fetch(`${apiURL}/project/${projectId}/version?game_versions=["${version}"]`, header);
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

export { checkCompatibility, compatibilityChecked };