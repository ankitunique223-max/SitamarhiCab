/* ===========================
   DASHBOARD JAVASCRIPT
=========================== */

// Welcome message based on time
const welcomeHeading = document.querySelector(".topbar h1");

if (welcomeHeading) {

    const hour = new Date().getHours();

    if (hour < 12) {
        welcomeHeading.innerHTML = "🌅 Good Morning";
    }
    else if (hour < 17) {
        welcomeHeading.innerHTML = "☀️ Good Afternoon";
    }
    else {
        welcomeHeading.innerHTML = "🌙 Good Evening";
    }

}


// Highlight active sidebar item

const menuItems = document.querySelectorAll(".sidebar ul li");

menuItems.forEach(item => {

    item.addEventListener("click", function () {

        menuItems.forEach(i => i.classList.remove("active"));

        this.classList.add("active");

    });

});


// Dashboard Statistics Animation

function animateValue(element, start, end, duration){

    if(!element) return;

    let startTime = null;

    function animation(currentTime){

        if(!startTime) startTime = currentTime;

        const progress = Math.min((currentTime-startTime)/duration,1);

        element.innerHTML = Math.floor(progress*(end-start)+start);

        if(progress<1){

            requestAnimationFrame(animation);

        }

    }

    requestAnimationFrame(animation);

}


const cards = document.querySelectorAll(".dash-card h2");

if(cards.length >= 3){

    animateValue(cards[0],0,24,1000);

    animateValue(cards[1],0,2350,1500);

    setTimeout(()=>{

        cards[1].innerHTML="₹2350";

    },1500);

}


// Logout Confirmation

const logoutLink = document.querySelector('a[href="login.html"]');

if(logoutLink){

logoutLink.addEventListener("click",function(e){

const confirmLogout = confirm("Do you really want to logout?");

if(!confirmLogout){

e.preventDefault();

}

});

}
