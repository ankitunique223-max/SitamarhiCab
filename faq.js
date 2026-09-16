// ====================================
// FAQ PAGE JAVASCRIPT
// ====================================

// Page Loaded
window.addEventListener("load", () => {

    console.log("FAQ Page Loaded Successfully");

});

// ====================================
// FAQ Accordion
// ====================================

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {

    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {

        // Close all other items
        faqItems.forEach(other => {

            if(other !== item){

                other.classList.remove("active");

            }

        });

        // Toggle current item
        item.classList.toggle("active");

    });

});

// ====================================
// Smooth Fade-in Animation
// ====================================

faqItems.forEach((item, index) => {

    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";

    setTimeout(() => {

        item.style.transition = "0.5s ease";

        item.style.opacity = "1";

        item.style.transform = "translateY(0)";

    }, index * 150);

});

// ====================================
// Back To Top Button (Optional)
// ====================================

const backBtn = document.createElement("button");

backBtn.innerHTML = "⬆";

backBtn.id = "backToTop";

document.body.appendChild(backBtn);

backBtn.style.cssText = `
position:fixed;
bottom:20px;
right:20px;
width:50px;
height:50px;
border:none;
border-radius:50%;
background:#FFD700;
color:#000;
font-size:20px;
cursor:pointer;
display:none;
box-shadow:0 5px 15px rgba(0,0,0,.2);
z-index:999;
`;

window.addEventListener("scroll", () => {

    if(window.scrollY > 300){

        backBtn.style.display = "block";

    }else{

        backBtn.style.display = "none";

    }

});

backBtn.addEventListener("click", () => {

    window.scrollTo({

        top:0,

        behavior:"smooth"

    });

});