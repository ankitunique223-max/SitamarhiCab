// ==========================================
// SITAMARHI CAB - COMPLETE BOOKING JS
// ==========================================

import { auth, db } from "./firebase.js";

import {
    addDoc,
    collection
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// BOOKING FORM
// ==========================================

const bookingForm =
    document.getElementById("bookingForm");


// ==========================================
// VEHICLE RATES
// ==========================================

const vehicleRates = {
    "Bike": 8,
    "Auto": 12,
    "Mini Cab": 15,
    "Sedan": 18,
    "SUV": 22
};


// ==========================================
// GLOBAL VALUES
// ==========================================

window.currentFare = 0;

window.currentDistance = 0;

window.currentPickupLocation = null;

window.currentDropLocation = null;


// ==========================================
// SAFE NUMBER
// ==========================================

function validNumber(value) {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );

}


// ==========================================
// GEOCODE LOCATION
// ==========================================

async function geocodeLocation(
    location
) {

    const cleanLocation =
        String(location || "")
            .trim();


    if (!cleanLocation) {

        throw new Error(
            "Location is empty."
        );

    }


    // --------------------------------------
    // SEARCH VARIANTS
    // --------------------------------------

    const queries = [

        cleanLocation,

        cleanLocation +
            ", Sitamarhi, Bihar, India",

        cleanLocation +
            ", Sitamarhi, India",

        cleanLocation +
            ", Bihar, India",

        cleanLocation +
            ", India"

    ];


    // --------------------------------------
    // NOMINATIM
    // --------------------------------------

    for (
        const query of queries
    ) {

        try {

            const url =
                "https://nominatim.openstreetmap.org/search" +
                "?format=jsonv2" +
                "&limit=5" +
                "&addressdetails=1" +
                "&q=" +
                encodeURIComponent(
                    query
                );


            const response =
                await fetch(
                    url,
                    {
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            if (
                !response.ok
            ) {

                continue;

            }


            const results =
                await response.json();


            if (
                Array.isArray(results) &&
                results.length > 0
            ) {

                const result =
                    results[0];


                const lat =
                    Number(
                        result.lat
                    );


                const lng =
                    Number(
                        result.lon
                    );


                if (
                    validNumber(lat) &&
                    validNumber(lng)
                ) {

                    return {

                        lat:
                            lat,

                        lng:
                            lng,

                        display:
                            result.display_name ||
                            cleanLocation

                    };

                }

            }

        } catch (
            error
        ) {

            console.warn(
                "Nominatim attempt failed:",
                query,
                error
            );

        }

    }


    // --------------------------------------
    // PHOTON FALLBACK
    // --------------------------------------

    for (
        const query of queries
    ) {

        try {

            const url =
                "https://photon.komoot.io/api/?limit=5&q=" +
                encodeURIComponent(
                    query
                );


            const response =
                await fetch(
                    url
                );


            if (
                !response.ok
            ) {

                continue;

            }


            const data =
                await response.json();


            if (
                data &&
                Array.isArray(
                    data.features
                ) &&
                data.features.length > 0
            ) {

                const feature =
                    data.features[0];


                const coordinates =
                    feature.geometry &&
                    feature.geometry.coordinates;


                if (
                    Array.isArray(
                        coordinates
                    ) &&
                    coordinates.length >= 2
                ) {

                    const lng =
                        Number(
                            coordinates[0]
                        );


                    const lat =
                        Number(
                            coordinates[1]
                        );


                    if (
                        validNumber(lat) &&
                        validNumber(lng)
                    ) {

                        return {

                            lat:
                                lat,

                            lng:
                                lng,

                            display:
                                cleanLocation

                        };

                    }

                }

            }

        } catch (
            error
        ) {

            console.warn(
                "Photon attempt failed:",
                query,
                error
            );

        }

    }


    throw new Error(
        "Location not found: " +
        cleanLocation +
        ". Please enter a nearby landmark, area or city."
    );

}


// ==========================================
// ROUTE CALCULATION
// ==========================================

async function internalCalculateRoute(
    pickup,
    drop
) {

    // --------------------------------------
    // GET PICKUP
    // --------------------------------------

    const pickupLocation =
        await geocodeLocation(
            pickup
        );


    // --------------------------------------
    // GET DROP
    // --------------------------------------

    const dropLocation =
        await geocodeLocation(
            drop
        );


    // --------------------------------------
    // SAVE COORDINATES
    // --------------------------------------

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
        "📍 Pickup:",
        window.currentPickupLocation
    );


    console.log(
        "📍 Drop:",
        window.currentDropLocation
    );


    // --------------------------------------
    // OSRM ROUTE
    // --------------------------------------

    const routeURL =
        "https://router.project-osrm.org/route/v1/driving/" +

        pickupLocation.lng +
        "," +
        pickupLocation.lat +

        ";" +

        dropLocation.lng +
        "," +
        dropLocation.lat +

        "?overview=false";


    const routeResponse =
        await fetch(
            routeURL
        );


    if (
        !routeResponse.ok
    ) {

        throw new Error(
            "Route service is unavailable."
        );

    }


    const routeData =
        await routeResponse.json();


    if (
        routeData.code !== "Ok" ||
        !Array.isArray(
            routeData.routes
        ) ||
        routeData.routes.length === 0
    ) {

        throw new Error(
            "Road route could not be calculated."
        );

    }


    const distanceMeters =
        Number(
            routeData.routes[0].distance
        );


    const distanceKm =
        distanceMeters / 1000;


    if (
        !validNumber(
            distanceKm
        ) ||
        distanceKm <= 0
    ) {

        throw new Error(
            "Invalid route distance."
        );

    }


    return distanceKm;

}


// ==========================================
// MAP FUNCTION COMPATIBILITY
// ==========================================

async function getRouteDistance(
    pickup,
    drop
) {

    // --------------------------------------
    // USE EXISTING MAP FUNCTION IF AVAILABLE
    // --------------------------------------

    if (
        typeof window.calculateRoute ===
        "function"
    ) {

        try {

            const result =
                await window.calculateRoute(
                    pickup,
                    drop
                );


            const distance =
                Number(
                    result
                );


            if (
                validNumber(
                    distance
                ) &&
                distance > 0
            ) {

                return distance;

            }

        } catch (
            error
        ) {

            console.warn(
                "Existing map route failed. Using fallback route.",
                error
            );

        }

    }


    // --------------------------------------
    // FALLBACK
    // --------------------------------------

    return await internalCalculateRoute(
        pickup,
        drop
    );

}


// ==========================================
// ESTIMATE FARE
// ==========================================

window.calculateFare =
    async function () {

        const pickupElement =
            document.getElementById(
                "pickup"
            );


        const dropElement =
            document.getElementById(
                "drop"
            );


        const vehicleElement =
            document.getElementById(
                "vehicle"
            );


        const fareElement =
            document.getElementById(
                "fare"
            );


        // ----------------------------------
        // CHECK ELEMENTS
        // ----------------------------------

        if (
            !pickupElement ||
            !dropElement ||
            !vehicleElement ||
            !fareElement
        ) {

            alert(
                "Booking form elements are missing."
            );

            return;

        }


        const pickup =
            pickupElement.value.trim();


        const drop =
            dropElement.value.trim();


        const vehicle =
            vehicleElement.value;


        // ----------------------------------
        // VALIDATION
        // ----------------------------------

        if (!pickup) {

            alert(
                "Please enter pickup location."
            );

            pickupElement.focus();

            return;

        }


        if (!drop) {

            alert(
                "Please enter drop location."
            );

            dropElement.focus();

            return;

        }


        if (!vehicle) {

            alert(
                "Please select a vehicle."
            );

            vehicleElement.focus();

            return;

        }


        const rate =
            vehicleRates[
                vehicle
            ];


        if (!rate) {

            alert(
                "Vehicle rate not found."
            );

            return;

        }


        // ----------------------------------
        // LOADING
        // ----------------------------------

        fareElement.innerText =
            "Calculating...";


        try {

            // ==============================
            // ROUTE
            // ==============================

            const distanceKm =
                await getRouteDistance(
                    pickup,
                    drop
                );


            // ==============================
            // CHECK COORDINATES
            // ==============================

            if (
                !window.currentPickupLocation
            ) {

                throw new Error(
                    "Pickup coordinates are missing."
                );

            }


            if (
                !window.currentDropLocation
            ) {

                throw new Error(
                    "Drop coordinates are missing."
                );

            }


            // ==============================
            // FARE
            // ==============================

            let fare =
                Math.round(
                    distanceKm *
                    rate
                );


            // ==============================
            // MINIMUM FARE
            // ==============================

            if (
                fare < 50
            ) {

                fare = 50;

            }


            // ==============================
            // SAVE
            // ==============================

            window.currentFare =
                fare;


            window.currentDistance =
                distanceKm;


            // ==============================
            // DISPLAY
            // ==============================

            fareElement.innerText =
                "₹" + fare;


            // ==============================
            // LOG
            // ==============================

            console.log(
                "================================"
            );


            console.log(
                "🚖 FARE CALCULATED"
            );


            console.log(
                "Pickup:",
                pickup
            );


            console.log(
                "Drop:",
                drop
            );


            console.log(
                "Vehicle:",
                vehicle
            );


            console.log(
                "Distance:",
                distanceKm.toFixed(2),
                "KM"
            );


            console.log(
                "Rate:",
                "₹" + rate,
                "/KM"
            );


            console.log(
                "Fare:",
                "₹" + fare
            );


            console.log(
                "Pickup Coordinates:",
                window.currentPickupLocation
            );


            console.log(
                "Drop Coordinates:",
                window.currentDropLocation
            );


            console.log(
                "================================"
            );


        } catch (
            error
        ) {

            console.error(
                "❌ Fare calculation error:",
                error
            );


            fareElement.innerText =
                "₹0";


            window.currentFare =
                0;


            window.currentDistance =
                0;


            window.currentPickupLocation =
                null;


            window.currentDropLocation =
                null;


            alert(
                "Fare calculation failed.\n\n" +
                error.message
            );

        }

    };


// ==========================================
// BOOK RIDE
// ==========================================

if (
    bookingForm
) {

    bookingForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            // --------------------------------
            // FORM VALUES
            // --------------------------------

            const pickup =
                document
                    .getElementById(
                        "pickup"
                    )
                    .value
                    .trim();


            const drop =
                document
                    .getElementById(
                        "drop"
                    )
                    .value
                    .trim();


            const phone =
                document
                    .getElementById(
                        "phone"
                    )
                    .value
                    .trim();


            const vehicle =
                document
                    .getElementById(
                        "vehicle"
                    )
                    .value;


            const payment =
                document
                    .getElementById(
                        "payment"
                    )
                    .value;


            const date =
                document
                    .getElementById(
                        "date"
                    )
                    .value;


            const time =
                document
                    .getElementById(
                        "time"
                    )
                    .value;


            const fareElement =
                document.getElementById(
                    "fare"
                );


            const fareText =
                fareElement
                    ? fareElement.innerText
                    : "₹0";


            // --------------------------------
            // VALIDATION
            // --------------------------------

            if (
                !pickup ||
                !drop
            ) {

                alert(
                    "Please fill pickup and drop location."
                );

                return;

            }


            if (!vehicle) {

                alert(
                    "Please select a vehicle."
                );

                return;

            }


            if (
                !date ||
                !time
            ) {

                alert(
                    "Please select date and time."
                );

                return;

            }


            if (
                !/^[0-9]{10}$/.test(
                    phone
                )
            ) {

                alert(
                    "Please enter a valid 10-digit mobile number."
                );

                return;

            }


            // --------------------------------
            // LOGIN CHECK
            // --------------------------------

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Please login first."
                );


                window.location.href =
                    "login.html";


                return;

            }


            // --------------------------------
            // FARE
            // --------------------------------

            const fare =
                Number(
                    fareText
                        .replace(
                            "₹",
                            ""
                        )
                        .trim()
                );


            if (
                !fare ||
                fare <= 0 ||
                fareText === "₹0"
            ) {

                alert(
                    "Please calculate fare first."
                );

                return;

            }


            // --------------------------------
            // PICKUP COORDINATES
            // --------------------------------

            if (
                !window.currentPickupLocation
            ) {

                alert(
                    "Please calculate fare again."
                );

                return;

            }


            const pickupLatitude =
                Number(
                    window
                        .currentPickupLocation
                        .lat
                );


            const pickupLongitude =
                Number(
                    window
                        .currentPickupLocation
                        .lng
                );


            // --------------------------------
            // DROP COORDINATES
            // --------------------------------

            let dropLatitude =
                null;


            let dropLongitude =
                null;


            if (
                window.currentDropLocation
            ) {

                dropLatitude =
                    Number(
                        window
                            .currentDropLocation
                            .lat
                    );


                dropLongitude =
                    Number(
                        window
                            .currentDropLocation
                            .lng
                    );

            }


            // --------------------------------
            // VALIDATE COORDINATES
            // --------------------------------

            if (
                !validNumber(
                    pickupLatitude
                ) ||
                !validNumber(
                    pickupLongitude
                )
            ) {

                alert(
                    "Invalid pickup coordinates."
                );

                return;

            }


            // --------------------------------
            // RIDE DATA
            // --------------------------------

            const rideData = {

                userId:
                    user.uid,

                pickup:
                    pickup,

                pickupLatitude:
                    pickupLatitude,

                pickupLongitude:
                    pickupLongitude,

                drop:
                    drop,

                dropLatitude:
                    dropLatitude,

                dropLongitude:
                    dropLongitude,

                phone:
                    phone,

                vehicle:
                    vehicle,

                date:
                    date,

                time:
                    time,

                fare:
                    fare,

                distance:
                    window.currentDistance ||
                    0

            };


            // ==================================
            // CASH
            // ==================================

            if (
                payment === "Cash"
            ) {

                try {

                    const rideId =
                        await saveRide(
                            {

                                ...rideData,

                                payment:
                                    "Cash",

                                paymentStatus:
                                    "pending"

                            }
                        );


                    alert(
                        "🎉 Ride Booked Successfully!"
                    );


                    window.location.href =
                        "search-driver.html?rideId=" +
                        encodeURIComponent(
                            rideId
                        );


                } catch (
                    error
                ) {

                    console.error(
                        "Cash booking error:",
                        error
                    );


                    alert(
                        "Unable to book ride.\n\n" +
                        error.message
                    );

                }


                return;

            }


            // ==================================
            // ONLINE PAYMENT
            // ==================================

            if (
                payment === "Online" ||
                payment === "UPI" ||
                payment === "Card"
            ) {

                try {

                    const rideId =
                        await saveRide(
                            {

                                ...rideData,

                                payment:
                                    "Online",

                                paymentStatus:
                                    "pending"

                            }
                        );


                    if (!rideId) {

                        throw new Error(
                            "Ride ID was not created."
                        );

                    }


                    console.log(
                        "✅ Ride created:",
                        rideId
                    );


                    window.location.href =
                        "payment.html?rideId=" +
                        encodeURIComponent(
                            rideId
                        );


                } catch (
                    error
                ) {

                    console.error(
                        "Online payment setup error:",
                        error
                    );


                    alert(
                        "Unable to start payment.\n\n" +
                        error.message
                    );

                }


                return;

            }


            // --------------------------------
            // INVALID PAYMENT
            // --------------------------------

            alert(
                "Please select a valid payment method."
            );

        }
    );

}


// ==========================================
// SAVE RIDE
// ==========================================

async function saveRide(
    data
) {

    try {

        // ----------------------------------
        // CHECK PICKUP
        // ----------------------------------

        if (
            !validNumber(
                data.pickupLatitude
            ) ||
            !validNumber(
                data.pickupLongitude
            )
        ) {

            throw new Error(
                "Pickup coordinates missing."
            );

        }


        // ----------------------------------
        // FIRESTORE
        // ----------------------------------

        const rideRef =
            await addDoc(

                collection(
                    db,
                    "rides"
                ),

                {

                    ...data,

                    status:
                        "pending",

                    driverId:
                        "",

                    createdAt:
                        new Date()

                }

            );


        console.log(
            "✅ Ride saved:",
            rideRef.id
        );


        return rideRef.id;


    } catch (
        error
    ) {

        console.error(
            "❌ Firestore save error:",
            error
        );


        throw error;

    }

}