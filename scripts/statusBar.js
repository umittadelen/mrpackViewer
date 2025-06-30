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

export { setStatus, clearStatus };