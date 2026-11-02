
// FAQ Accordion
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {
        const isActive = item.classList.contains("active");

        // Close all FAQ items
        faqItems.forEach((other) => {
            other.classList.remove("active");
            const btn = other.querySelector(".faq-question");
            if (btn) btn.setAttribute("aria-expanded", "false");
        });

        // Toggle selected item
        if (!isActive) {
            item.classList.add("active");
            question.setAttribute("aria-expanded", "true");
        }
    });
});

// Back to Top Button
const backBtn = document.createElement("button");

backBtn.id = "backToTop";
backBtn.textContent = "↑";
backBtn.setAttribute("aria-label", "Back to top");

document.body.appendChild(backBtn);

window.addEventListener("scroll", () => {
    backBtn.style.display =
        window.scrollY > 300 ? "block" : "none";
});

backBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});
