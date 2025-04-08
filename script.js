document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const body = document.body;
    const monthYearElement = document.getElementById('month-year');
    const datesElement = document.getElementById('calendar-dates');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const todayButton = document.getElementById('today-btn');
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const themeOptionsContainer = document.getElementById('theme-options');
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-btn');
    const calendarViewBtn = document.getElementById('calendar-view-btn');
    const agendaViewBtn = document.getElementById('agenda-view-btn');
    const calendarViewSection = document.getElementById('calendar-view');
    const agendaViewSection = document.getElementById('agenda-view');
    const agendaListContainer = document.getElementById('agenda-list');

    // Modal Elements
    const modalOverlay = document.getElementById('event-modal');
    const modalContent = modalOverlay.querySelector('.modal-content');
    const modalTitle = document.getElementById('modal-title');
    const eventList = document.getElementById('event-list'); // For displaying in modal
    const newEventText = document.getElementById('new-event-text');
    const eventCategorySelect = document.getElementById('event-category');
    const eventTimeInput = document.getElementById('event-time');
    const eventAllDayCheckbox = document.getElementById('event-all-day');
    const addEventButton = document.getElementById('add-event-btn');
    const closeModalButton = document.getElementById('close-modal');
    const modalDateInput = document.getElementById('modal-date'); // Hidden input
    const noEntriesPlaceholder = modalOverlay.querySelector('.no-entries-placeholder');
    const agendaPlaceholder = agendaViewSection.querySelector('.no-events-placeholder');

    // --- State Variables ---
    let currentDate = new Date();
    let events = loadEvents(); // Load events from localStorage
    let currentTheme = loadThemePreference();
    let currentView = loadViewPreference(); // 'calendar' or 'agenda'
    let currentSearchTerm = '';

    // --- Constants ---
    const LOCAL_STORAGE_EVENTS_KEY = 'chronoPlanEventsV3'; // *** New key for V3 structure ***
    const LOCAL_STORAGE_THEME_KEY = 'chronoPlanTheme';
    const LOCAL_STORAGE_VIEW_KEY = 'chronoPlanView';
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const CATEGORIES = {
        personal: { name: "Personal", color: "var(--category-personal)" },
        work: { name: "Work", color: "var(--category-work)" },
        finance: { name: "Finance", color: "var(--category-finance)" },
        health: { name: "Health", color: "var(--category-health)" },
        reminder: { name: "Reminder", color: "var(--category-reminder)" },
        other: { name: "Other", color: "var(--category-other)" }
    };

    // --- Initialization ---
    function initApp() {
        setupEventListeners();
        populateCategoryOptions();
        applyTheme(currentTheme);
        switchView(currentView); // Apply saved or default view
        renderCurrentView();
        console.log("ChronoPlan v3 Initialized");
    }

    function setupEventListeners() {
        prevMonthButton.addEventListener('click', () => changeMonth(-1));
        nextMonthButton.addEventListener('click', () => changeMonth(1));
        todayButton.addEventListener('click', goToToday);
        themeToggleButton.addEventListener('click', toggleThemeOptions);
        themeOptionsContainer.addEventListener('click', handleThemeSelection);
        document.body.addEventListener('click', hideThemeOptionsOnClickOutside);
        calendarViewBtn.addEventListener('click', () => switchView('calendar'));
        agendaViewBtn.addEventListener('click', () => switchView('agenda'));
        searchInput.addEventListener('input', handleSearch);
        clearSearchButton.addEventListener('click', clearSearch);
        datesElement.addEventListener('click', handleDateCellClick); // Event delegation for date cells

        // Modal Listeners
        closeModalButton.addEventListener('click', closeModal);
        addEventButton.addEventListener('click', addEvent);
        eventAllDayCheckbox.addEventListener('change', toggleTimeInput);
        modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });
        // Listener for deleting events within the modal (event delegation)
        eventList.addEventListener('click', handleDeleteEventClick);
    }

    // --- Core Functions ---

    function renderCurrentView() {
        if (currentView === 'calendar') {
            renderCalendar();
        } else {
            renderAgendaView();
        }
    }

    function dateToString(date) {
        // Use local date components, not UTC from toISOString()
        const year = date.getFullYear();
        // getMonth() is 0-indexed, add 1. Pad with '0' if needed.
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        // getDate() returns the day of the month. Pad with '0' if needed.
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function stringToDate(dateString) {
        // Assumes YYYY-MM-DD format and prevents timezone issues on parsing
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }


    // --- Calendar View ---

    function renderCalendar() {
        datesElement.innerHTML = ''; // Clear previous dates
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        monthYearElement.textContent = `${MONTH_NAMES[month]} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

        const today = new Date();
        const todayString = dateToString(today);

        // Add blank cells
        for (let i = 0; i < startDayOfWeek; i++) {
            datesElement.appendChild(createEmptyDateCell());
        }

        // Add date cells
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = dateToString(date);
            datesElement.appendChild(createDateCell(day, date, dateString, todayString));
        }
    }

    function createEmptyDateCell() {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('date-cell', 'inactive');
        return emptyCell;
    }

    function createDateCell(day, date, dateString, todayString) {
        const dateCell = document.createElement('div');
        dateCell.classList.add('date-cell');
        dateCell.dataset.date = dateString; // Store date

        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.textContent = day;
        dayNumberSpan.classList.add('day-number');
        dateCell.appendChild(dayNumberSpan);

        if (dateString === todayString) {
            dateCell.classList.add('today');
        }

        // Add event indicators (dots)
        const dayEvents = events[dateString] || [];
        if (dayEvents.length > 0) {
            dateCell.classList.add('has-event'); // Keep general class if needed
            const indicatorsContainer = document.createElement('div');
            indicatorsContainer.classList.add('event-indicators');
            // Limit number of dots shown for performance/aesthetics
            const maxDots = 5;
            const uniqueCategories = [...new Set(dayEvents.map(e => e.category))];
            uniqueCategories.slice(0, maxDots).forEach(categoryKey => {
                const dot = document.createElement('div');
                dot.classList.add('event-indicator-dot');
                dot.style.backgroundColor = CATEGORIES[categoryKey]?.color || CATEGORIES.other.color;
                indicatorsContainer.appendChild(dot);
            });
            dateCell.appendChild(indicatorsContainer);
        }

        return dateCell;
    }

     function handleDateCellClick(event) {
        const cell = event.target.closest('.date-cell:not(.inactive)');
        if (cell && cell.dataset.date) {
             openModal(stringToDate(cell.dataset.date));
        }
    }


    function changeMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        renderCurrentView(); // Re-render calendar or agenda
    }

    function goToToday() {
        currentDate = new Date();
        renderCurrentView();
    }

    // --- Agenda View ---

    function renderAgendaView() {
        const filteredEvents = getFilteredAndSortedEvents();
        agendaListContainer.innerHTML = ''; // Clear previous list

        if (filteredEvents.length === 0) {
            agendaPlaceholder.classList.remove('hidden');
            return;
        }
        agendaPlaceholder.classList.add('hidden');

        let currentAgendaDate = null;
        let dayGroupContainer = null;

        filteredEvents.forEach(event => {
            const eventDateStr = event.date; // Date is already stored in event

            // Create new date header if date changes
            if (eventDateStr !== currentAgendaDate) {
                currentAgendaDate = eventDateStr;
                const dateHeader = document.createElement('h3');
                dateHeader.classList.add('agenda-date-header');
                const displayDate = stringToDate(eventDateStr);
                 dateHeader.textContent = displayDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                dayGroupContainer = document.createElement('div');
                dayGroupContainer.classList.add('agenda-day-group');
                dayGroupContainer.appendChild(dateHeader);
                agendaListContainer.appendChild(dayGroupContainer);
            }

            // Create and append event item
             if (dayGroupContainer) { // Ensure group exists
                const eventItem = createAgendaItemElement(event);
                dayGroupContainer.appendChild(eventItem);
            }
        });

        // Attach delete listeners after rendering (event delegation could also work)
        attachAgendaDeleteListeners();
    }

    function createAgendaItemElement(event) {
        const item = document.createElement('div');
        item.classList.add('agenda-item');
        const categoryInfo = CATEGORIES[event.category] || CATEGORIES.other;
        item.style.borderColor = categoryInfo.color; // Set left border color

        const timeDisplay = event.isAllDay ? 'All Day' : (event.time || 'Any Time');
        const timeDiv = document.createElement('div');
        timeDiv.classList.add('agenda-item-time');
        timeDiv.textContent = timeDisplay;

        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('agenda-item-details');
        const textP = document.createElement('p');
        textP.textContent = event.text;
        const categoryP = document.createElement('p');
        categoryP.classList.add('agenda-item-category');
        categoryP.textContent = `Category: ${categoryInfo.name}`;
        detailsDiv.appendChild(textP);
        detailsDiv.appendChild(categoryP);

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('agenda-item-actions');
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('agenda-delete-btn');
        deleteButton.dataset.eventId = event.id;
        deleteButton.dataset.eventDate = event.date; // Need date to find it in storage
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.setAttribute('aria-label', 'Delete this entry');
        actionsDiv.appendChild(deleteButton);

        item.appendChild(timeDiv);
        item.appendChild(detailsDiv);
        item.appendChild(actionsDiv);

        return item;
    }

     function attachAgendaDeleteListeners() {
        const deleteButtons = agendaListContainer.querySelectorAll('.agenda-delete-btn');
        deleteButtons.forEach(button => {
             // Remove existing listener to prevent duplicates if re-rendering
            button.replaceWith(button.cloneNode(true));
        });
         // Add new listener to the container using delegation
        agendaListContainer.addEventListener('click', handleAgendaDeleteClick);
    }

     function handleAgendaDeleteClick(event) {
        const button = event.target.closest('.agenda-delete-btn');
        if (button) {
            const eventId = parseInt(button.dataset.eventId, 10); // Ensure ID is number
            const eventDate = button.dataset.eventDate;
            deleteEvent(eventDate, eventId);
            renderAgendaView(); // Re-render agenda after deletion
        }
    }


    function getFilteredAndSortedEvents() {
        let allEvents = [];
        // Flatten the events object and add the date to each event object
        Object.keys(events).forEach(dateString => {
            events[dateString].forEach(event => {
                allEvents.push({ ...event, date: dateString });
            });
        });

        // Filter by search term (case-insensitive)
        const searchTerm = currentSearchTerm.toLowerCase();
        if (searchTerm) {
            allEvents = allEvents.filter(event =>
                event.text.toLowerCase().includes(searchTerm) ||
                (CATEGORIES[event.category]?.name.toLowerCase().includes(searchTerm))
            );
        }

        // Sort events: primarily by date, secondarily by time (all-day first)
        allEvents.sort((a, b) => {
            const dateComparison = a.date.localeCompare(b.date);
            if (dateComparison !== 0) {
                return dateComparison;
            }

            // Same date, sort by time
            if (a.isAllDay && !b.isAllDay) return -1; // a (all-day) comes first
            if (!a.isAllDay && b.isAllDay) return 1;  // b (all-day) comes first
            if (a.isAllDay && b.isAllDay) return 0;  // Both all-day

            // Both have times, compare them
            const timeA = a.time || "24:00"; // Treat null/empty time as end of day for sorting
            const timeB = b.time || "24:00";
            return timeA.localeCompare(timeB);
        });

        return allEvents;
    }


    // --- Search ---
    function handleSearch(event) {
        currentSearchTerm = event.target.value;
        clearSearchButton.classList.toggle('hidden', !currentSearchTerm);
        if (currentView === 'agenda') {
            renderAgendaView(); // Only re-render agenda immediately on search
        }
        // Optional: Implement calendar highlighting/dimming based on search later
    }

    function clearSearch() {
        searchInput.value = '';
        currentSearchTerm = '';
        clearSearchButton.classList.add('hidden');
        if (currentView === 'agenda') {
            renderAgendaView();
        }
        searchInput.focus();
    }


    // --- View Switching ---
    function switchView(viewToShow) {
        currentView = viewToShow;
        body.setAttribute('data-view', viewToShow);
        saveViewPreference(viewToShow);

        // Update button states
        calendarViewBtn.classList.toggle('active', viewToShow === 'calendar');
        agendaViewBtn.classList.toggle('active', viewToShow === 'agenda');

        // Show/hide sections
        calendarViewSection.classList.toggle('active', viewToShow === 'calendar');
        agendaViewSection.classList.toggle('active', viewToShow === 'agenda');

        // Render the newly selected view
        renderCurrentView();
    }


    // --- Modal Logic ---
    function openModal(date) {
        const dateString = dateToString(date);
        modalDateInput.value = dateString; // Store the selected date

        modalTitle.textContent = `Entries for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
        displayEventsInModal(dateString);
        resetAddEventForm();
        newEventText.focus();

        modalOverlay.classList.remove('hidden');
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
    }

    function resetAddEventForm() {
        newEventText.value = '';
        eventCategorySelect.selectedIndex = 0; // Reset to first category
        eventTimeInput.value = '';
        eventAllDayCheckbox.checked = false;
        toggleTimeInput(); // Ensure time input state matches checkbox
    }

    function populateCategoryOptions() {
        eventCategorySelect.innerHTML = ''; // Clear existing options
        for (const key in CATEGORIES) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = CATEGORIES[key].name;
            eventCategorySelect.appendChild(option);
        }
    }

    function toggleTimeInput() {
        eventTimeInput.disabled = eventAllDayCheckbox.checked;
        if (eventAllDayCheckbox.checked) {
            eventTimeInput.value = ''; // Clear time if all-day is checked
        }
    }

    function displayEventsInModal(dateString) {
        eventList.innerHTML = ''; // Clear previous list
        const dayEvents = events[dateString] || [];

        if (dayEvents.length === 0) {
            noEntriesPlaceholder.classList.remove('hidden');
            return;
        }

        noEntriesPlaceholder.classList.add('hidden');
        // Sort events by time for display in modal (optional but nice)
        dayEvents.sort((a, b) => {
            if (a.isAllDay && !b.isAllDay) return -1;
            if (!a.isAllDay && b.isAllDay) return 1;
            if (a.isAllDay && b.isAllDay) return 0;
            const timeA = a.time || "24:00";
            const timeB = b.time || "24:00";
            return timeA.localeCompare(timeB);
        });

        dayEvents.forEach(event => {
            eventList.appendChild(createModalEventItemElement(event, dateString));
        });
    }

    function createModalEventItemElement(event, dateString) {
        const item = document.createElement('div');
        item.classList.add('event-item');
        const categoryInfo = CATEGORIES[event.category] || CATEGORIES.other;
        item.style.borderColor = categoryInfo.color; // Use border color like agenda

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('event-item-info');

        const textP = document.createElement('p');
        textP.classList.add('event-item-text');
        textP.textContent = event.text;
        infoDiv.appendChild(textP);

        const metaP = document.createElement('p');
        metaP.classList.add('event-item-meta');
        const timeSpan = document.createElement('span');
        timeSpan.innerHTML = `<i class="fas fa-clock"></i> ${event.isAllDay ? 'All Day' : (event.time || 'Any Time')}`;
        const categorySpan = document.createElement('span');
        categorySpan.innerHTML = `<i class="fas fa-tag"></i> <span class="category-name">${categoryInfo.name}</span>`;
        metaP.appendChild(timeSpan);
        metaP.appendChild(categorySpan);
        infoDiv.appendChild(metaP);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-event-btn');
        deleteButton.dataset.eventId = event.id; // Store ID for deletion
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.setAttribute('aria-label', 'Delete this entry');

        item.appendChild(infoDiv);
        item.appendChild(deleteButton);

        return item;
    }

    function addEvent() {
        const dateString = modalDateInput.value;
        const text = newEventText.value.trim();
        const category = eventCategorySelect.value;
        const isAllDay = eventAllDayCheckbox.checked;
        const time = isAllDay ? '' : eventTimeInput.value;

        if (!text) {
            alert("Please enter event details."); // Simple validation
            newEventText.focus();
            return;
        }

        const newEvent = {
            id: Date.now(), // Use timestamp for simple unique ID
            text: text,
            category: category,
            time: time,
            isAllDay: isAllDay
        };

        if (!events[dateString]) {
            events[dateString] = [];
        }

        events[dateString].push(newEvent);
        console.log(`Event added for ${dateString}:`, newEvent);

        saveEvents();
        displayEventsInModal(dateString); // Update modal list immediately
        resetAddEventForm();           // Clear form for next entry
        renderCurrentView();           // Re-render calendar/agenda for indicators
        newEventText.focus();
    }

    function deleteEvent(dateString, eventId) {
        if (!events[dateString]) return;

        const initialLength = events[dateString].length;
        events[dateString] = events[dateString].filter(event => event.id !== eventId);

        if (events[dateString].length === 0) {
            delete events[dateString]; // Clean up empty date arrays
             console.log(`Removed date key ${dateString} as it's now empty.`);
        }

        if (events[dateString]?.length !== initialLength) {
            console.log(`Event deleted for ${dateString}, ID: ${eventId}`);
            saveEvents();
            return true; // Indicate success
        } else {
            console.warn(`Event with ID ${eventId} not found on date ${dateString}.`);
            return false; // Indicate failure/not found
        }
    }

     // Handles clicks inside the modal's event list
    function handleDeleteEventClick(event) {
        const button = event.target.closest('.delete-event-btn');
        if (button) {
            const eventId = parseInt(button.dataset.eventId, 10);
            const dateString = modalDateInput.value; // Get date from hidden input
            if (deleteEvent(dateString, eventId)) {
                displayEventsInModal(dateString); // Update modal list
                renderCurrentView(); // Update underlying view (calendar/agenda)
            }
        }
    }


    // --- LocalStorage Persistence ---

    function saveEvents() {
        try {
            localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
        } catch (e) {
            console.error("Error saving events:", e);
            alert("Could not save events. LocalStorage might be full or disabled.");
        }
    }

    function loadEvents() {
        try {
            const storedEvents = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
            return storedEvents ? JSON.parse(storedEvents) : {};
        } catch (e) {
            console.error("Error loading events:", e);
            return {};
        }
    }

    function saveThemePreference(themeName) {
        try { localStorage.setItem(LOCAL_STORAGE_THEME_KEY, themeName); }
        catch (e) { console.error("Could not save theme preference:", e); }
    }

    function loadThemePreference() {
        try {
            const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
            return savedTheme && ['light', 'dark', 'synthwave'].includes(savedTheme) ? savedTheme : 'dark';
        } catch (e) { return 'dark'; }
    }

    function saveViewPreference(viewName) {
         try { localStorage.setItem(LOCAL_STORAGE_VIEW_KEY, viewName); }
         catch (e) { console.error("Could not save view preference:", e); }
    }

     function loadViewPreference() {
        try {
            const savedView = localStorage.getItem(LOCAL_STORAGE_VIEW_KEY);
            return savedView && ['calendar', 'agenda'].includes(savedView) ? savedView : 'calendar'; // Default to calendar
        } catch (e) { return 'calendar'; }
    }


    // --- Theme Switching Logic ---

    function applyTheme(themeName) {
        body.setAttribute('data-theme', themeName);
        currentTheme = themeName;
    }

    function toggleThemeOptions(e) {
        e.stopPropagation();
        themeOptionsContainer.classList.toggle('hidden');
    }

    function handleThemeSelection(e) {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.themeValue) {
            const newTheme = e.target.dataset.themeValue;
            applyTheme(newTheme);
            saveThemePreference(newTheme);
            themeOptionsContainer.classList.add('hidden'); // Hide after selection
        }
    }

    function hideThemeOptionsOnClickOutside(e) {
        if (!themeToggleButton.contains(e.target) && !themeOptionsContainer.contains(e.target)) {
            themeOptionsContainer.classList.add('hidden');
        }
    }

    // --- Start the application ---
    initApp();

}); // End DOMContentLoaded