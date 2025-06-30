import { apiURL, header } from "./variables.js";
import { setStatus, clearStatus } from "./statusBar.js";
import { onFileUpload } from "./onFileUpload.js";

async function fetchMrPackFromLink(link) {
    try {
        setStatus("Fetching .mrpack from link...", true);
        let mrpackUrl = link;

        // If user enters only a projectIdOrSlug (e.g., "cinematic+"), treat it as a Modrinth slug
        const modrinthSlugMatch = link.match(/^[a-zA-Z0-9\-\+_]+$/);
        if (modrinthSlugMatch) {
            setStatus("Resolving Modrinth project from slug...", true);
            const projectIdOrSlug = link;
            const versionsRes = await fetch(`${apiURL}/project/${projectIdOrSlug}/version`, header);
			
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
                const versionsRes = await fetch(`${apiURL}/project/${projectIdOrSlug}/version`, header);
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

export { fetchMrPackFromLink };