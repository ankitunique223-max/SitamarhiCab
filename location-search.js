// ==========================================
// SITAMARHI CAB
// FREE LOCATION SEARCH / SUGGESTIONS
// OpenStreetMap + Nominatim
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    setupLocationSearch("pickup");
    setupLocationSearch("drop");

});


// ==========================================
// LOCATION SEARCH SETUP
// ==========================================

function setupLocationSearch(inputId) {

    const input =
        document.getElementById(inputId);

    if (!input) {
        return;
    }


    // Create suggestion box

    const suggestionBox =
        document.createElement("div");

    suggestionBox.className =
        "location-suggestions";


    // Position relative to input

    const parent =
        input.parentElement;

    parent.style.position =
        "relative";


    parent.appendChild(
        suggestionBox
    );


    let searchTimer = null;


    // ======================================
    // INPUT EVENT
    // ======================================

    input.addEventListener(
        "input",
        function () {

            const query =
                input.value.trim();


            clearTimeout(
                searchTimer
            );


            if (query.length < 3) {

                suggestionBox.innerHTML = "";

                suggestionBox.style.display =
                    "none";

                return;

            }


            // Small delay

            searchTimer =
                setTimeout(
                    function () {

                        searchLocations(
                            query,
                            suggestionBox,
                            input
                        );

                    },
                    700
                );

        }
    );


    // ======================================
    // CLOSE WHEN CLICKING OUTSIDE
    // ======================================

    document.addEventListener(
        "click",
        function (event) {

            if (
                !parent.contains(event.target)
            ) {

                suggestionBox.innerHTML = "";

                suggestionBox.style.display =
                    "none";

            }

        }
    );

}


// ==========================================
// SEARCH NOMINATIM
// ==========================================

async function searchLocations(
    query,
    suggestionBox,
    input
) {

    try {

        suggestionBox.innerHTML =
            `<div class="location-loading">
                Searching...
            </div>`;

        suggestionBox.style.display =
            "block";


        const url =
            "https://nominatim.openstreetmap.org/search" +

            "?format=json" +

            "&addressdetails=1" +

            "&limit=5" +

            "&countrycodes=in" +

            "&q=" +

            encodeURIComponent(query);


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Location search failed"
            );

        }


        const results =
            await response.json();


        suggestionBox.innerHTML = "";


        if (
            !results ||
            results.length === 0
        ) {

            suggestionBox.innerHTML =
                `<div class="location-empty">
                    Location not found
                </div>`;

            return;

        }


        // ==================================
        // SHOW RESULTS
        // ==================================

        results.forEach(
            function (place) {

                const item =
                    document.createElement("div");


                item.className =
                    "location-suggestion";


                item.innerHTML =
                    `
                    <div class="location-icon">
                        📍
                    </div>

                    <div class="location-text">
                        ${escapeHTML(
                            place.display_name
                        )}
                    </div>
                    `;


                // =================================
                // CLICK LOCATION
                // =================================

                item.addEventListener(
                    "click",
                    function () {

                        input.value =
                            place.display_name;


                        suggestionBox.innerHTML =
                            "";

                        suggestionBox.style.display =
                            "none";


                        // Move map to location

                        if (
                            window.map &&
                            typeof window.map.setView ===
                            "function"
                        ) {

                            window.map.setView(
                                [
                                    Number(place.lat),
                                    Number(place.lon)
                                ],
                                15
                            );

                        }

                    }
                );


                suggestionBox.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(
            "Location search error:",
            error
        );


        suggestionBox.innerHTML =
            `
            <div class="location-empty">
                Unable to search location
            </div>
            `;

    }

}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}