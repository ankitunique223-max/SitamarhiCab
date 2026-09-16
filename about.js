// ===================================
// ABOUT PAGE JAVASCRIPT
// ===================================

// Welcome Message
window.addEventListener("load", () => {
    console.log("About Page Loaded Successfully");
});

// ===============================
// Counter Animation
// ===============================

const counters = document.querySelectorAll(".stat-box h2");

counters.forEach(counter => {

    const target = parseInt(counter.innerText.replace(/\D/g, ""));

    if (!target) return;

    let count = 0;

    const speed = Math.ceil(target / 100);

    const updateCounter = () => {

        count += speed;

        if (count >= target) {

            counter.innerText = counter.innerText.includes("★")
                ? "4.9★"
                : target.toLocaleString() + "+";

        } else {

            counter.innerText = count;

            requestAnimationFrame(updateCounter);

        }

    };

    updateCounter();

});

// ===============================
// Feature Card Hover Animation
// ===============================

const cards = document.querySelectorAll(".feature-box");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-12px) scale(1.03)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "translateY(0) scale(1)";

    });

});

// ===============================
// Taxi Icon Animation
// ===============================

const taxi = document.querySelector(".about-image i");

if (taxi) {

    setInterval(() => {

        taxi.animate(

            [
                { transform: "translateX(0px)" },
                { transform: "translateX(15px)" },
                { transform: "translateX(0px)" }

            ],

            {
                duration: 1200
            }

        );

    }, 2000);

}

// ===============================
// Scroll Reveal Animation
// ===============================

const revealElements = document.querySelectorAll(
".about-section, .why-us, .stats, .mission"
);

const reveal = () => {

    revealElements.forEach(el => {

        const windowHeight = window.innerHeight;

        const top = el.getBoundingClientRect().top;

        if (top < windowHeight - 100) {

            el.style.opacity = "1";
            el.style.transform = "translateY(0)";

        }

    });

};

revealElements.forEach(el => {

    el.style.opacity = "0";
    el.style.transform = "translateY(60px)";
    el.style.transition = "0.8s";

});

window.addEventListener("scroll", reveal);

reveal();

// ===============================
// Footer Year Auto Update
// ===============================

const footer = document.querySelector(".about-footer p");

if (footer) {

    footer.innerHTML =
        `© ${new Date().getFullYear()} Sitamarhi Cab. All Rights Reserved.`;

}