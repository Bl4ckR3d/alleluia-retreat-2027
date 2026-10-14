
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const form = $("#bookingForm");
    const panels = $$("[data-panel]");
    const stepButtons = $$("[data-jump]");
    const guestList = $("#guestList");
    const guestTemplate = $("#guestTemplate");
    const includeMain = $("#includeMain");
    const includeYouth = $("#includeYouth");
    const toast = $("#toast");

    let currentStep = 0;
    let guestCounter = 0;
    let toastTimer;

    const MAIN_NIGHTS = 3;
    const YOUTH_NIGHTS = 1;


    const mainRates = {
        // Single: exactly 1 person
        single_1_0: {
            price: 136,
            adults: 1,
            children: 0,
            label: "Single · 1 person"
        },

        // Twin: exactly 2 people
        twin_2_0: {
            price: 190,
            adults: 2,
            children: 0,
            label: "Twin · 2 adults"
        },
        twin_1_1: {
            price: 196,
            adults: 1,
            children: 1,
            label: "Twin · 1 adult + 1 child"
        },

        // Double: exactly 2 people
        double_2_0: {
            price: 190,
            adults: 2,
            children: 0,
            label: "Double · 2 adults"
        },
        double_1_1: {
            price: 196,
            adults: 1,
            children: 1,
            label: "Double · 1 adult + 1 child"
        },

        // Triple: exactly 3 people
        triple_3_0: {
            price: 270,
            adults: 3,
            children: 0,
            label: "Triple · 3 adults"
        },
        triple_2_1: {
            price: 250,
            adults: 2,
            children: 1,
            label: "Triple · 2 adults + 1 child"
        },
        triple_1_2: {
            price: 256,
            adults: 1,
            children: 2,
            label: "Triple · 1 adult + 2 children"
        },

        // Quadruple: only the two approved combinations
        quad_4_0: {
            price: 340,
            adults: 4,
            children: 0,
            label: "Quadruple · 4 adults"
        },
        quad_2_2: {
            price: 310,
            adults: 2,
            children: 2,
            label: "Quadruple · 2 adults + 2 children"
        }
    };


    const roomNames = {
        single: "Single room",
        twin: "Twin room",
        double: "Double room",
        triple: "Triple room",
        quad: "Quadruple room"
    };

    const youthRates = {
        single: { price: 136, capacity: 1, label: "Single room" },
        double: { price: 190, capacity: 2, label: "Double room" }
    };

    function money(amount) {
        return new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "GBP",
            maximumFractionDigits: 0
        }).format(amount);
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3500);
    }

    function showError(id, message) {
        const element = $("#" + id);
        if (element) element.textContent = message || "";
    }

    function setStep(index) {
        if (index < 0 || index >= panels.length) return;

        currentStep = index;

        panels.forEach((panel, i) => {
            panel.hidden = i !== index;
        });

        stepButtons.forEach((button, i) => {
            button.classList.toggle("active", i === index);
            button.classList.toggle("completed", i < index);

            if (i === index) {
                button.setAttribute("aria-current", "step");
            } else {
                button.removeAttribute("aria-current");
            }
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function isMainIncluded() {
        return includeMain.checked;
    }

    function isYouthIncluded() {
        return includeYouth.checked;
    }

    function getRoomQty(select) {
        return Math.max(0, Number.parseInt(select.value, 10) || 0);
    }

    function getMainSelection(rateSelect) {
        return mainRates[rateSelect.value];
    }

    function getTotals() {
        let mainNightly = 0;
        let youthNightly = 0;

        if (isMainIncluded()) {
            $$(".room-qty[data-retreat='main']").forEach(qtySelect => {
                const type = qtySelect.dataset.type;
                const rateSelect = $(
                    `.room-rate[data-retreat="main"][data-type="${type}"]`
                );
                const rate = rateSelect ? getMainSelection(rateSelect) : null;

                if (rate) mainNightly += getRoomQty(qtySelect) * rate.price;
            });
        }

        if (isYouthIncluded()) {
            $$(".room-qty[data-retreat='youth']").forEach(qtySelect => {
                const rate = youthRates[qtySelect.dataset.type];
                if (rate) youthNightly += getRoomQty(qtySelect) * rate.price;
            });
        }

        return {
            mainNightly,
            youthNightly,
            mainTotal: mainNightly * MAIN_NIGHTS,
            youthTotal: youthNightly * YOUTH_NIGHTS,
            total: (mainNightly * MAIN_NIGHTS) + (youthNightly * YOUTH_NIGHTS)
        };
    }

    function updateTotals() {
        const totals = getTotals();

        $("#mainSubtotal").textContent = money(totals.mainTotal);
        $("#youthSubtotal").textContent = money(totals.youthTotal);
        $("#grandTotal").textContent = money(totals.total);

        $("#mainOption").classList.toggle("section-disabled", !isMainIncluded());
        $("#youthOption").classList.toggle("section-disabled", !isYouthIncluded());

        $$("#mainOption select").forEach(select => {
            select.disabled = !isMainIncluded();
        });

        $$("#youthOption select").forEach(select => {
            select.disabled = !isYouthIncluded();
        });

        refreshRoomAssignments();
    }

    function selectedMainRooms() {
        const rooms = [];

        if (!isMainIncluded()) return rooms;

        $$(".room-qty[data-retreat='main']").forEach(qtySelect => {
            const type = qtySelect.dataset.type;
            const rateSelect = $(
                `.room-rate[data-retreat="main"][data-type="${type}"]`
            );
            const rate = rateSelect ? getMainSelection(rateSelect) : null;
            const qty = getRoomQty(qtySelect);

            if (!rate || qty === 0) return;

            for (let i = 1; i <= qty; i++) {
                rooms.push({
                    value: `main:${type}:${i}`,
                    label: `${roomNames[type]} ${i} — ${rate.label}`,
                    retreat: "main",
                    type,
                    adults: rate.adults,
                    children: rate.children
                });
            }
        });

        return rooms;
    }

    function selectedYouthRooms() {
        const rooms = [];

        if (!isYouthIncluded()) return rooms;

        $$(".room-qty[data-retreat='youth']").forEach(qtySelect => {
            const type = qtySelect.dataset.type;
            const rate = youthRates[type];
            const qty = getRoomQty(qtySelect);

            if (!rate || qty === 0) return;

            for (let i = 1; i <= qty; i++) {
                rooms.push({
                    value: `youth:${type}:${i}`,
                    label: `${rate.label} ${i} — capacity ${rate.capacity}`,
                    retreat: "youth",
                    type,
                    capacity: rate.capacity
                });
            }
        });

        return rooms;
    }

    function fillRoomSelect(select, rooms, selectedValue) {
        select.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a room";
        select.appendChild(placeholder);

        rooms.forEach(room => {
            const option = document.createElement("option");
            option.value = room.value;
            option.textContent = room.label;
            select.appendChild(option);
        });

        if (selectedValue && rooms.some(room => room.value === selectedValue)) {
            select.value = selectedValue;
        } else {
            select.value = "";
        }
    }

    function refreshRoomAssignments() {
        const mainRooms = selectedMainRooms();
        const youthRooms = selectedYouthRooms();

        $$(".guest-card").forEach(card => {
            const mainSelect = $(".guest-main-room", card);
            const youthSelect = $(".guest-youth-room", card);

            const oldMain = mainSelect.value;
            const oldYouth = youthSelect.value;

            fillRoomSelect(mainSelect, mainRooms, oldMain);
            fillRoomSelect(youthSelect, youthRooms, oldYouth);

            const mainAttending = $(".guest-main", card).checked;
            const youthAttending = $(".guest-youth", card).checked;

            mainSelect.disabled = !mainAttending || !isMainIncluded();
            youthSelect.disabled = !youthAttending || !isYouthIncluded();

            if (!mainAttending || !isMainIncluded()) mainSelect.value = "";
            if (!youthAttending || !isYouthIncluded()) youthSelect.value = "";
        });
    }

    function addGuest() {
        guestCounter += 1;

        const fragment = guestTemplate.content.cloneNode(true);
        const card = $(".guest-card", fragment);

        card.dataset.guestId = String(guestCounter);
        $(".guest-title", card).textContent = `Guest ${guestCounter}`;

        $(".remove-guest", card).addEventListener("click", () => {
            if ($$(".guest-card").length === 1) {
                showToast("At least one guest is required.");
                return;
            }

            card.remove();
            renumberGuests();
            refreshRoomAssignments();
        });

        $(".guest-main", card).addEventListener("change", refreshRoomAssignments);
        $(".guest-youth", card).addEventListener("change", refreshRoomAssignments);

        guestList.appendChild(fragment);
        refreshRoomAssignments();

        return card;
    }

    function renumberGuests() {
        $$(".guest-card").forEach((card, index) => {
            $(".guest-title", card).textContent = `Guest ${index + 1}`;
        });
    }

    function getGuests() {
        return $$(".guest-card").map((card, index) => ({
            index,
            first: $(".guest-first", card).value.trim(),
            last: $(".guest-last", card).value.trim(),
            age: $(".guest-age", card).value.trim(),
            diet: $(".guest-diet", card).value.trim(),
            allergies: $(".guest-allergies", card).value.trim(),
            main: $(".guest-main", card).checked,
            youth: $(".guest-youth", card).checked,
            mainRoom: $(".guest-main-room", card).value,
            youthRoom: $(".guest-youth-room", card).value
        }));
    }

    function validateRooms() {
        showError("roomError", "");

        const mainRooms = selectedMainRooms();
        const youthRooms = selectedYouthRooms();

        if (!isMainIncluded() && !isYouthIncluded()) {
            showError("roomError", "Please select at least one retreat.");
            return false;
        }

        if (isMainIncluded() && mainRooms.length === 0) {
            showError("roomError", "Please select at least one Main Retreat room, or untick Include.");
            return false;
        }

        if (isYouthIncluded() && youthRooms.length === 0) {
            showError("roomError", "Please select at least one Youth Retreat room, or untick Include.");
            return false;
        }

        return true;
    }

    function validateGuests() {
        showError("guestError", "");

        const guests = getGuests();
        const mainRooms = selectedMainRooms();
        const youthRooms = selectedYouthRooms();

        if (guests.length === 0) {
            showError("guestError", "Please add at least one guest.");
            return false;
        }

        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i];
            const card = $$(".guest-card")[i];

            if (!guest.first || !guest.last || guest.age === "") {
                showError("guestError", `Please enter a first name, last name and age for Guest ${i + 1}.`);
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                return false;
            }

            const age = Number(guest.age);
            if (!Number.isInteger(age) || age < 0 || age > 120) {
                showError("guestError", `Please enter a valid age for Guest ${i + 1}.`);
                return false;
            }

            if (!guest.main && !guest.youth) {
                showError("guestError", `Please select which retreat Guest ${i + 1} will attend.`);
                return false;
            }

            if (guest.main && isMainIncluded() && !guest.mainRoom) {
                showError("guestError", `Please assign Guest ${i + 1} to a Main Retreat room.`);
                return false;
            }

            if (guest.youth && isYouthIncluded() && !guest.youthRoom) {
                showError("guestError", `Please assign Guest ${i + 1} to a Youth Retreat room.`);
                return false;
            }

            if (guest.main && !isMainIncluded()) {
                showError("guestError", `Guest ${i + 1} is marked for the Main Retreat, but that retreat is not included.`);
                return false;
            }

            if (guest.youth && !isYouthIncluded()) {
                showError("guestError", `Guest ${i + 1} is marked for the Youth Retreat, but that retreat is not included.`);
                return false;
            }
        }

        // Check that each Main Retreat room has the selected adult/child mix.
        for (const room of mainRooms) {
            const assigned = guests.filter(g => g.mainRoom === room.value);
            const adults = assigned.filter(g => Number(g.age) > 12).length;
            const children = assigned.filter(g => Number(g.age) <= 12).length;

            if (adults !== room.adults || children !== room.children) {
                showError(
                    "guestError",
                    `${room.label}: this room needs ${room.adults} adult(s) and ${room.children} child(ren). Currently assigned: ${adults} adult(s) and ${children} child(ren).`
                );
                return false;
            }
        }

        // Check that each Youth Retreat room is not over capacity.
        for (const room of youthRooms) {
            const assigned = guests.filter(g => g.youthRoom === room.value);

            if (assigned.length > room.capacity) {
                showError("guestError", `${room.label} has more guests assigned than its listed capacity.`);
                return false;
            }

            if (assigned.length === 0) {
                showError("guestError", `${room.label} has no guests assigned.`);
                return false;
            }
        }

        return true;
    }

    function validateContact() {
        showError("contactError", "");

        const first = $("#first").value.trim();
        const last = $("#last").value.trim();
        const email = $("#email").value.trim();
        const phone = $("#phone").value.trim();

        if (!first || !last || !email || !phone) {
            showError("contactError", "Please complete all contact fields.");
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showError("contactError", "Please enter a valid email address.");
            $("#email").focus();
            return false;
        }

        if (!$("#acceptTerms").checked) {
            showError("contactError", "Please tick the acknowledgement before reviewing.");
            return false;
        }

        // Help populate the first guest from the lead guest contact fields.
        const firstGuest = $(".guest-card");
        if (firstGuest) {
            if (!$(".guest-first", firstGuest).value.trim()) {
                $(".guest-first", firstGuest).value = first;
            }
            if (!$(".guest-last", firstGuest).value.trim()) {
                $(".guest-last", firstGuest).value = last;
            }
        }

        return true;
    }

    function addReviewSection(title, rows) {
        const section = document.createElement("section");
        section.className = "review-section";

        const heading = document.createElement("h3");
        heading.textContent = title;
        section.appendChild(heading);

        const list = document.createElement("dl");
        list.className = "review-list";

        rows.forEach(([label, value]) => {
            const wrapper = document.createElement("div");
            wrapper.className = "review-row";

            const term = document.createElement("dt");
            term.textContent = label;

            const description = document.createElement("dd");
            description.textContent = value;

            wrapper.append(term, description);
            list.appendChild(wrapper);
        });

        section.appendChild(list);
        $("#review").appendChild(section);
    }

    function buildReview() {
        const review = $("#review");
        review.replaceChildren();

        const totals = getTotals();
        const mainRooms = selectedMainRooms();
        const youthRooms = selectedYouthRooms();
        const guests = getGuests();

        const mainRows = [
            ["Stay", isMainIncluded() ? "26–29 August 2027 · 3 nights" : "Not included"]
        ];

        if (isMainIncluded()) {
            $$(".room-qty[data-retreat='main']").forEach(qtySelect => {
                const qty = getRoomQty(qtySelect);
                if (!qty) return;

                const type = qtySelect.dataset.type;
                const rateSelect = $(
                    `.room-rate[data-retreat="main"][data-type="${type}"]`
                );
                const rate = getMainSelection(rateSelect);

                mainRows.push([
                    `${roomNames[type]} × ${qty}`,
                    `${rate.label} · ${money(rate.price * MAIN_NIGHTS * qty)}`
                ]);
            });
        }

        mainRows.push(["Main Retreat subtotal", money(totals.mainTotal)]);
        addReviewSection("Main Retreat", mainRows);

        const youthRows = [
            ["Stay", isYouthIncluded() ? "25–26 August 2027 · 1 night" : "Not included"]
        ];

        if (isYouthIncluded()) {
            $$(".room-qty[data-retreat='youth']").forEach(qtySelect => {
                const qty = getRoomQty(qtySelect);
                if (!qty) return;

                const type = qtySelect.dataset.type;
                const rate = youthRates[type];

                youthRows.push([
                    `${rate.label} × ${qty}`,
                    money(rate.price * YOUTH_NIGHTS * qty)
                ]);
            });
        }

        youthRows.push(["Youth Retreat subtotal", money(totals.youthTotal)]);
        addReviewSection("Youth Retreat", youthRows);

        const guestRows = guests.map((guest, index) => {
            const attendance = [
                guest.main ? "Main Retreat" : "",
                guest.youth ? "Youth Retreat" : ""
            ].filter(Boolean).join(" and ");

            const age = Number(guest.age);
            const ageLabel = age <= 12 ? `${age} · child pricing where applicable` :
                age < 18 ? `${age} · adult pricing` : `${age}`;

            return [
                `Guest ${index + 1}`,
                `${guest.first} ${guest.last} · Age ${ageLabel} · ${attendance}`
            ];
        });
        addReviewSection("Guests", guestRows);

        addReviewSection("Lead guest", [
            ["Name", `${$("#first").value.trim()} ${$("#last").value.trim()}`],
            ["Email", $("#email").value.trim()],
            ["Phone", $("#phone").value.trim()],
            ["Payment method", "Bank transfer"]
        ]);

        addReviewSection("Estimated total", [
            ["Main Retreat", money(totals.mainTotal)],
            ["Youth Retreat", money(totals.youthTotal)],
            ["Total estimate", money(totals.total)]
        ]);

        // Add a compact room assignment summary for the guest to check.
        const assignmentRows = [];

        guests.forEach((guest, index) => {
            if (guest.mainRoom) {
                const room = mainRooms.find(item => item.value === guest.mainRoom);
                assignmentRows.push([`Guest ${index + 1} · Main`, room ? room.label : "Room not found"]);
            }
            if (guest.youthRoom) {
                const room = youthRooms.find(item => item.value === guest.youthRoom);
                assignmentRows.push([`Guest ${index + 1} · Youth`, room ? room.label : "Room not found"]);
            }
        });

        if (assignmentRows.length) {
            addReviewSection("Room assignments", assignmentRows);
        }
    }

    // Keep the lead guest's name in sync with the first guest only when those
    // guest fields have not already been filled in.
    $("#first").addEventListener("change", () => {
        const firstGuest = $(".guest-card");
        if (firstGuest && !$(".guest-first", firstGuest).value.trim()) {
            $(".guest-first", firstGuest).value = $("#first").value.trim();
        }
    });

    $("#last").addEventListener("change", () => {
        const firstGuest = $(".guest-card");
        if (firstGuest && !$(".guest-last", firstGuest).value.trim()) {
            $(".guest-last", firstGuest).value = $("#last").value.trim();
        }
    });

    // Update estimates and room assignments whenever a selection changes.
    form.addEventListener("change", event => {
        if (
            event.target.matches(".room-qty, .room-rate") ||
            event.target === includeMain ||
            event.target === includeYouth
        ) {
            updateTotals();
        }
    });

    $("#addGuest").addEventListener("click", () => {
        addGuest();
        showToast("Guest added.");
    });

    $$("[data-next]").forEach(button => {
        button.addEventListener("click", () => {
            if (currentStep === 0) {
                if (!validateRooms()) return;
                setStep(1);
            } else if (currentStep === 1) {
                if (!validateGuests()) return;
                setStep(2);
            }
        });
    });

    $$("[data-prev]").forEach(button => {
        button.addEventListener("click", () => setStep(currentStep - 1));
    });

    stepButtons.forEach(button => {
        button.addEventListener("click", () => {
            const target = Number(button.dataset.jump);

            // Allow returning to completed steps. Do not skip forward past validation.
            if (target <= currentStep) {
                setStep(target);
            } else if (target === 1 && validateRooms()) {
                setStep(1);
            } else if (target === 2 && validateRooms() && validateGuests()) {
                setStep(2);
            } else if (
                target === 3 &&
                validateRooms() &&
                validateGuests() &&
                validateContact()
            ) {
                buildReview();
                setStep(3);
            }
        });
    });

    $("#confirmDetails").addEventListener("click", () => {
        if (!validateContact()) return;

        // Revalidate previous steps in case the user changed values.
        if (!validateRooms()) {
            setStep(0);
            return;
        }

        if (!validateGuests()) {
            setStep(1);
            return;
        }

        buildReview();
        showError("contactError", "");
        setStep(3);
    });

    form.addEventListener("submit", event => {
        event.preventDefault();

        if (!validateRooms() || !validateGuests() || !validateContact()) {
            showError(
                "submitError",
                "Please return to the relevant step and correct any incomplete details."
            );
            return;
        }

        // Deliberately no network request here. The backend has not been connected.
        form.hidden = true;
        $("#previewComplete").hidden = false;
        showToast("Preview completed. No booking was submitted.");
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $("#editBooking").addEventListener("click", () => {
        $("#previewComplete").hidden = true;
        form.hidden = false;
        setStep(0);
    });

    // Initial page setup.
    addGuest();
    updateTotals();
    setStep(0);
});
