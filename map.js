// ==========================================
// SITAMARHI CAB - LEAFLET MAP
// OpenStreetMap + OSRM
// ==========================================

window.map = null;

let pickupMarker = null;
let dropMarker = null;
let routeLine = null;


// ==========================================
// CURRENT LOCATIONS
// ==========================================

window.currentPickupLocation = null;
window.currentDropLocation = null;


// ==========================================
// SITAMARHI CENTER
// ==========================================

const SITAMARHI = [26.5956, 85.4906];


// ==========================================
// INITIALIZE MAP
// ==========================================

function initializeMap() {

    const mapElement =
        document.getElementById("map");

    if (!mapElement) {

        console.error(
            "Map element not found."
        );

        return;
    }


    map = L.map("map").setView(
        SITAMARHI,
        13
    );


    window.map = map;


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    // ======================================
    // DEFAULT SITAMARHI MARKER
    // ======================================

    L.marker(SITAMARHI)
        .addTo(map)
        .bindPopup(
            "Sitamarhi"
        )
        .openPopup();
}


// ==========================================
// SEARCH LOCATION USING NOMINATIM
// ==========================================

async function searchLocation(
    locationName
) {

    const url =
        "https://nominatim.openstreetmap.org/search" +

        "?format=json" +

        "&limit=1" +

        "&countrycodes=in" +

        "&q=" +

        encodeURIComponent(
            locationName
        );


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Location search failed."
        );
    }


    const data =
        await response.json();


    if (
        !data ||
        data.length === 0
    ) {

        throw new Error(
            "Location not found: " +
            locationName
        );
    }


    return {

        lat:
            Number(
                data[0].lat
            ),

        lng:
            Number(
                data[0].lon
            )
    };
}


// ==========================================
// GET ROUTE FROM OSRM
// ==========================================

async function getRoute(
    pickupLocation,
    dropLocation
) {

    const url =
        "https://router.project-osrm.org/route/v1/driving/" +

        pickupLocation.lng +
        "," +
        pickupLocation.lat +

        ";" +

        dropLocation.lng +
        "," +
        dropLocation.lat +

        "?overview=full&geometries=geojson";


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Routing service unavailable."
        );
    }


    const data =
        await response.json();


    if (
        data.code !== "Ok" ||
        !data.routes ||
        data.routes.length === 0
    ) {

        throw new Error(
            "Route not found."
        );
    }


    return data.routes[0];
}


// ==========================================
// CALCULATE ROUTE
// ==========================================

window.calculateRoute =
    async function (
        pickup,
        drop
    ) {

        if (!map) {

            initializeMap();
        }


        try {

            // ==================================
            // FIND PICKUP
            // ==================================

            const pickupLocation =
                await searchLocation(
                    pickup
                );


            // ==================================
            // FIND DROP
            // ==================================

            const dropLocation =
                await searchLocation(
                    drop
                );


            // ==================================
            // SAVE LOCATIONS GLOBALLY
            // ==================================

            window.currentPickupLocation = {

                lat:
                    pickupLocation.lat,

                lng:
                    pickupLocation.lng
            };


            window.currentDropLocation = {

                lat:
                    dropLocation.lat,

                lng:
                    dropLocation.lng
            };


            console.log(
                "📍 Pickup coordinates:",
                window.currentPickupLocation
            );


            console.log(
                "📍 Drop coordinates:",
                window.currentDropLocation
            );


            // ==================================
            // GET ROUTE
            // ==================================

            const route =
                await getRoute(
                    pickupLocation,
                    dropLocation
                );


            // ==================================
            // DISTANCE
            // ==================================

            const distanceKm =
                route.distance / 1000;


            // ==================================
            // ROUTE COORDINATES
            // ==================================

            const coordinates =
                route.geometry.coordinates.map(
                    function (point) {

                        return [
                            point[1],
                            point[0]
                        ];

                    }
                );


            // ==================================
            // REMOVE OLD MARKERS
            // ==================================

            if (pickupMarker) {

                map.removeLayer(
                    pickupMarker
                );
            }


            if (dropMarker) {

                map.removeLayer(
                    dropMarker
                );
            }


            if (routeLine) {

                map.removeLayer(
                    routeLine
                );
            }


            // ==================================
            // PICKUP MARKER
            // ==================================

            pickupMarker =
                L.marker([

                    pickupLocation.lat,

                    pickupLocation.lng

                ])
                .addTo(map)
                .bindPopup(
                    "Pickup Location"
                );


            // ==================================
            // DROP MARKER
            // ==================================

            dropMarker =
                L.marker([

                    dropLocation.lat,

                    dropLocation.lng

                ])
                .addTo(map)
                .bindPopup(
                    "Drop Location"
                );


            // ==================================
            // DRAW ROUTE
            // ==================================

            routeLine =
                L.polyline(
                    coordinates,
                    {
                        weight: 5
                    }
                )
                .addTo(map);


            // ==================================
            // FIT MAP
            // ==================================

            map.fitBounds(
                routeLine.getBounds(),
                {
                    padding: [
                        30,
                        30
                    ]
                }
            );


            console.log(
                "Route distance:",
                distanceKm.toFixed(2),
                "KM"
            );


            return distanceKm;


        } catch (error) {

            console.error(
                "Route calculation error:",
                error
            );


            // Clear invalid coordinates

            window.currentPickupLocation =
                null;

            window.currentDropLocation =
                null;


            throw error;
        }
    };


// ==========================================
// INITIALIZE AFTER PAGE LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeMap();

    }
);