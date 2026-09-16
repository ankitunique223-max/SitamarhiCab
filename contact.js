// ===================================
// CONTACT PAGE JAVASCRIPT
// ===================================

// Page Loaded
window.addEventListener("load", () => {
    console.log("Contact Page Loaded Successfully");
});

// ===================================
// Contact Form Validation
// ===================================

const contactForm = document.getElementById("contactForm");

if (contactForm) {

    contactForm.addEventListener("submit", function(e){

        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const message = document.getElementById("message").value.trim();

        // Name Validation
        if(name.length < 3){
            alert("Please enter a valid name.");
            return;
        }

        // Email Validation
        const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailPattern.test(email)){
            alert("Please enter a valid email address.");
            return;
        }

        // Phone Validation
        const phonePattern = /^[0-9]{10}$/;

        if(!phonePattern.test(phone)){
            alert("Phone number must contain exactly 10 digits.");
            return;
        }

        // Message Validation
        if(message.length < 10){
            alert("Message should be at least 10 characters.");
            return;
        }

        // Success
        alert("✅ Thank you! Your message has been sent successfully.");

        contactForm.reset();

    });

}

// ===================================
// Button Hover Animation
// ===================================

const submitBtn = document.querySelector(".contact-form button");

if(submitBtn){

    submitBtn.addEventListener("mouseenter",()=>{

        submitBtn.style.transform="scale(1.03)";

    });

    submitBtn.addEventListener("mouseleave",()=>{

        submitBtn.style.transform="scale(1)";

    });

}

// ===================================
// Social Icons Animation
// ===================================

const icons = document.querySelectorAll(".social-icons a");

icons.forEach(icon=>{

    icon.addEventListener("mouseenter",()=>{

        icon.style.transform="translateY(-5px)";

    });

    icon.addEventListener("mouseleave",()=>{

        icon.style.transform="translateY(0)";

    });

});