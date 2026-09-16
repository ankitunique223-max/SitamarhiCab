// =======================================
// SERVICES PAGE JAVASCRIPT
// Sitamarhi Cab
// =======================================

// Page Loaded
window.addEventListener("load", () => {
    console.log("Services Page Loaded Successfully");
});

// =======================================
// Button Click Animation
// =======================================

const buttons = document.querySelectorAll(".service-btn");

buttons.forEach(button => {

    button.addEventListener("mouseenter", () => {
        button.style.transform = "scale(1.05)";
    });

    button.addEventListener("mouseleave", () => {
        button.style.transform = "scale(1)";
    });

});

// =======================================
// Future Navigation
// =======================================

buttons.forEach(button => {

    button.addEventListener("click", function(e){

        e.preventDefault();

        const service = this.innerText;

        alert(service + " feature will be available soon.");

        // Future Links
        /*
        if(service === "Order Now"){
            window.location.href = "food.html";
        }

        if(service === "Order Essentials"){
            window.location.href = "essentials.html";
        }

        if(service === "Emergency Order"){
            window.location.href = "emergency.html";
        }

        if(service === "Book Companion"){
            window.location.href = "companion.html";
        }
        */

    });

});

// =======================================
// Card Animation
// =======================================

const cards = document.querySelectorAll(".service-card");

cards.forEach((card, index) => {

    card.style.opacity = "0";
    card.style.transform = "translateY(40px)";

    setTimeout(() => {

        card.style.transition = "0.6s ease";

        card.style.opacity = "1";
        card.style.transform = "translateY(0)";

    }, index * 200);

});
