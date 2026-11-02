// PRIVACY POLICY PAGE

document.addEventListener("DOMContentLoaded", () => {

    console.log("Privacy Policy Page Loaded Successfully");

    // Automatically update last modified date
    const lastUpdated = document.getElementById("lastUpdated");

    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }

    // Back to top functionality
    const backToTop = document.getElementById("backToTop");

    if (backToTop) {
        window.addEventListener("scroll", () => {
            backToTop.style.display =
                window.scrollY > 300 ? "block" : "none";
        });

        backToTop.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

});