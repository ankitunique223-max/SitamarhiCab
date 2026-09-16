// ==============================
// SUCCESS PAGE
// ==============================

// Page Loaded
window.addEventListener("load", () => {

    console.log("Ride Booked Successfully!");

});

// Auto Redirect after 10 seconds (Optional)

setTimeout(() => {

    const stay = confirm(
        "Do you want to track your ride now?"
    );

    if (stay) {

        window.location.href = "tracking.html";

    }

}, 10000);


// Button Animation

const buttons = document.querySelectorAll(".success-btn");

buttons.forEach(button => {

    button.addEventListener("mouseenter", () => {

        button.style.transform = "scale(1.05)";

    });

    button.addEventListener("mouseleave", () => {

        button.style.transform = "scale(1)";

    });

});


// Confetti Effect (Simple)

const icon = document.querySelector(".success-icon");

if (icon) {

    icon.animate(

        [
            { transform: "scale(0.8)" },
            { transform: "scale(1.2)" },
            { transform: "scale(1)" }

        ],

        {
            duration: 700
        }

    );

}