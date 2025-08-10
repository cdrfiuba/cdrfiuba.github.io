// Expand events with multiple dates into individual event objects
const expandEvents = (events) => {
    const expanded = [];
    events.forEach(event => {
        if (event.dates && Array.isArray(event.dates)) {
            // Event has multiple dates - create one event per date
            event.dates.forEach(date => {
                expanded.push({
                    ...event,
                    date: date,
                    dates: undefined // Remove dates array from individual events
                });
            });
        } else {
            // Single date event - add as is
            expanded.push(event);
        }
    });
    return expanded;
};

const calendarEvents = expandEvents(window.calendarEvents || []);
const calendarPeriods = window.calendarPeriods || [];

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábabado'];

function getPeriodForDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    
    // Find matching period
    const period = calendarPeriods.find(period => {
        const startDate = new Date(period.start_date + 'T00:00:00');
        const endDate = new Date(period.end_date + 'T00:00:00');
        return date >= startDate && date <= endDate;
    });
    
    // If it's a lectures period, calculate the week number
    if (period && period.type === 'lectures') {
        const startDate = new Date(period.start_date + 'T00:00:00');
        const diffTime = date.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor(diffDays / 7) + 1;
        
        return {
            ...period,
            name: `Semana ${weekNumber} de cursada`
        };
    }
    
    return period;
}

function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'calendar-tooltip';
    tooltip.className = 'calendar-tooltip';
    document.body.appendChild(tooltip);
    return tooltip;
}

function showTooltip(element, content, event) {
    let tooltip = document.getElementById('calendar-tooltip');
    if (!tooltip) {
        tooltip = createTooltip();
    }

    tooltip.textContent = content;
    tooltip.classList.add('show');

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Tener en cuenta el desplazamiento en la página para posicionar el tooltip
    let left = rect.left + window.pageXOffset + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top + window.pageYOffset - tooltipRect.height - 10;

    // Mover en caso de que esté fuera del área visible
    if (left < window.pageXOffset + 10) left = window.pageXOffset + 10;
    if (left + tooltipRect.width > window.pageXOffset + window.innerWidth - 10) {
        left = window.pageXOffset + window.innerWidth - tooltipRect.width - 10;
    }
    if (top < window.pageYOffset + 10) {
        top = rect.bottom + window.pageYOffset + 10;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('calendar-tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
    }
}

function renderCalendar() {
    const monthHeader = document.getElementById('current-month');
    monthHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const calendarGrid = document.getElementById('calendar-grid');
    const weekdaysContainer = document.querySelector('.calendar-weekdays');
    
    calendarGrid.innerHTML = '';
    weekdaysContainer.innerHTML = '';

    // Add weekday headers to separate container
    weekdays.forEach(weekday => {
        const weekdayElement = document.createElement('div');
        weekdayElement.className = 'weekday';
        weekdayElement.textContent = weekday;
        weekdaysContainer.appendChild(weekdayElement);
    });

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Add empty cells for previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day other-month';
        const prevMonthDay = new Date(currentYear, currentMonth, -(startingDayOfWeek - 1 - i));
        const prevDateString = `${prevMonthDay.getFullYear()}-${String(prevMonthDay.getMonth() + 1).padStart(2, '0')}-${String(prevMonthDay.getDate()).padStart(2, '0')}`;
        const prevDayEvents = calendarEvents.filter(event => event.date === prevDateString);

        // Check if previous month day is in any period
        const prevPeriod = getPeriodForDate(prevDateString);
        if (prevPeriod) {
            dayElement.classList.add(`period-${prevPeriod.type}`);
        }

        // Handle events for previous month days
        if (prevDayEvents.length > 0) {
            dayElement.classList.add('has-event');

            // Check if any event is marked as special
            const hasSpecialEvent = prevDayEvents.some(event => event.special_event);
            if (hasSpecialEvent) {
                dayElement.classList.add('special-event');
            }

            // Check if any event is cancelled
            const hasCancelledEvent = prevDayEvents.some(event => event.cancelled);
            if (hasCancelledEvent) {
                dayElement.classList.add('cancelled-event');
            }
        }

        let prevDayContent = `<div class="day-number">${prevMonthDay.getDate()}</div>`;

        if (prevDayEvents.length > 0) {
            prevDayContent += `<div class="event-preview">${prevDayEvents[0].title}</div>`;
            if (prevDayEvents.length > 1) {
                prevDayContent += `<div class="event-preview">+${prevDayEvents.length - 1} más</div>`;
            }
        }

        dayElement.innerHTML = prevDayContent;
        dayElement.addEventListener('click', () => showEventDetails(prevDateString, prevDayEvents));

        // Add hover tooltip for period and event information
        let tooltipContent = '';

        if (prevPeriod) {
            tooltipContent = prevPeriod.name;
            if (prevDayEvents.length > 0) {
                const hasSpecialEvent = prevDayEvents.some(event => event.special_event);
                const hasCancelledEvent = prevDayEvents.some(event => event.cancelled);
                if (hasSpecialEvent) {
                    tooltipContent += ' • Evento Especial';
                }
                if (hasCancelledEvent) {
                    tooltipContent += ' • Evento Cancelado';
                }
                tooltipContent += ` • ${prevDayEvents.length} evento${prevDayEvents.length > 1 ? 's' : ''}`;
            }
        } else if (prevDayEvents.length > 0) {
            const hasSpecialEvent = prevDayEvents.some(event => event.special_event);
            const hasCancelledEvent = prevDayEvents.some(event => event.cancelled);
            let eventInfo = [];
            if (hasSpecialEvent) eventInfo.push('Evento Especial');
            if (hasCancelledEvent) eventInfo.push('Evento Cancelado');
            if (eventInfo.length === 0) eventInfo.push(`${prevDayEvents.length} evento${prevDayEvents.length > 1 ? 's' : ''}`);
            tooltipContent = eventInfo.join(' • ');
        }

        if (tooltipContent) {
            dayElement.addEventListener('mouseenter', (e) => showTooltip(dayElement, tooltipContent, e));
            dayElement.addEventListener('mouseleave', hideTooltip);
            // Hide tooltip on touch/click for mobile
            dayElement.addEventListener('touchstart', hideTooltip);
            dayElement.addEventListener('click', hideTooltip);
        }

        calendarGrid.appendChild(dayElement);
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = calendarEvents.filter(event => event.date === dateString);

        // Check if day is in any period
        const dayPeriod = getPeriodForDate(dateString);
        if (dayPeriod) {
            dayElement.classList.add(`period-${dayPeriod.type}`);
        }

        if (dayEvents.length > 0) {
            dayElement.classList.add('has-event');

            // Check if any event is marked as special
            const hasSpecialEvent = dayEvents.some(event => event.special_event);
            if (hasSpecialEvent) {
                dayElement.classList.add('special-event');
            }

            // Check if any event is cancelled
            const hasCancelledEvent = dayEvents.some(event => event.cancelled);
            if (hasCancelledEvent) {
                dayElement.classList.add('cancelled-event');
            }
        }

        let dayContent = `<div class="day-number">${day}</div>`;

        if (dayEvents.length > 0) {
            dayContent += `<div class="event-preview">${dayEvents[0].title}</div>`;
            if (dayEvents.length > 1) {
                dayContent += `<div class="event-preview">+${dayEvents.length - 1} más</div>`;
            }
        }

        dayElement.innerHTML = dayContent;
        dayElement.addEventListener('click', () => showEventDetails(dateString, dayEvents));

        // Add hover tooltip for period information
        const tooltipPeriod = getPeriodForDate(dateString);
        let tooltipContent = '';

        if (tooltipPeriod) {
            tooltipContent = tooltipPeriod.name;
            if (dayEvents.length > 0) {
                const hasSpecialEvent = dayEvents.some(event => event.special_event);
                const hasCancelledEvent = dayEvents.some(event => event.cancelled);
                if (hasSpecialEvent) {
                    tooltipContent += ' • Evento Especial';
                }
                if (hasCancelledEvent) {
                    tooltipContent += ' • Evento Cancelado';
                }
                tooltipContent += ` • ${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''}`;
            }
        } else if (dayEvents.length > 0) {
            const hasSpecialEvent = dayEvents.some(event => event.special_event);
            const hasCancelledEvent = dayEvents.some(event => event.cancelled);
            let eventInfo = [];
            if (hasSpecialEvent) eventInfo.push('Evento Especial');
            if (hasCancelledEvent) eventInfo.push('Evento Cancelado');
            if (eventInfo.length === 0) eventInfo.push(`${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''}`);
            tooltipContent = eventInfo.join(' • ');
        }

        if (tooltipContent) {
            dayElement.addEventListener('mouseenter', (e) => showTooltip(dayElement, tooltipContent, e));
            dayElement.addEventListener('mouseleave', hideTooltip);
            // Hide tooltip on touch/click for mobile
            dayElement.addEventListener('touchstart', hideTooltip);
            dayElement.addEventListener('click', hideTooltip);
        }

        calendarGrid.appendChild(dayElement);
    }

    // Fill remaining cells to complete the last week
    const totalDaysDisplayed = calendarGrid.children.length; // Total days displayed (prev month + current month days)
    const remainingCells = (7 - (totalDaysDisplayed % 7)) % 7; // Days needed to complete the last week

    for (let i = 1; i <= remainingCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day other-month';
        const nextMonthDay = new Date(currentYear, currentMonth + 1, i);
        const nextDateString = `${nextMonthDay.getFullYear()}-${String(nextMonthDay.getMonth() + 1).padStart(2, '0')}-${String(nextMonthDay.getDate()).padStart(2, '0')}`;
        const nextDayEvents = calendarEvents.filter(event => event.date === nextDateString);

        // Check if next month day is in any period
        const nextPeriod = getPeriodForDate(nextDateString);
        if (nextPeriod) {
            dayElement.classList.add(`period-${nextPeriod.type}`);
        }

        // Handle events for next month days
        if (nextDayEvents.length > 0) {
            dayElement.classList.add('has-event');

            // Check if any event is marked as special
            const hasSpecialEvent = nextDayEvents.some(event => event.special_event);
            if (hasSpecialEvent) {
                dayElement.classList.add('special-event');
            }

            // Check if any event is cancelled
            const hasCancelledEvent = nextDayEvents.some(event => event.cancelled);
            if (hasCancelledEvent) {
                dayElement.classList.add('cancelled-event');
            }
        }

        let nextDayContent = `<div class="day-number">${i}</div>`;

        if (nextDayEvents.length > 0) {
            nextDayContent += `<div class="event-preview">${nextDayEvents[0].title}</div>`;
            if (nextDayEvents.length > 1) {
                nextDayContent += `<div class="event-preview">+${nextDayEvents.length - 1} más</div>`;
            }
        }

        dayElement.innerHTML = nextDayContent;
        dayElement.addEventListener('click', () => showEventDetails(nextDateString, nextDayEvents));

        // Add hover tooltip for period and event information
        let tooltipContent = '';

        if (nextPeriod) {
            tooltipContent = nextPeriod.name;
            if (nextDayEvents.length > 0) {
                const hasSpecialEvent = nextDayEvents.some(event => event.special_event);
                const hasCancelledEvent = nextDayEvents.some(event => event.cancelled);
                if (hasSpecialEvent) {
                    tooltipContent += ' • Evento Especial';
                }
                if (hasCancelledEvent) {
                    tooltipContent += ' • Evento Cancelado';
                }
                tooltipContent += ` • ${nextDayEvents.length} evento${nextDayEvents.length > 1 ? 's' : ''}`;
            }
        } else if (nextDayEvents.length > 0) {
            const hasSpecialEvent = nextDayEvents.some(event => event.special_event);
            const hasCancelledEvent = nextDayEvents.some(event => event.cancelled);
            let eventInfo = [];
            if (hasSpecialEvent) eventInfo.push('Evento Especial');
            if (hasCancelledEvent) eventInfo.push('Evento Cancelado');
            if (eventInfo.length === 0) eventInfo.push(`${nextDayEvents.length} evento${nextDayEvents.length > 1 ? 's' : ''}`);
            tooltipContent = eventInfo.join(' • ');
        }

        if (tooltipContent) {
            dayElement.addEventListener('mouseenter', (e) => showTooltip(dayElement, tooltipContent, e));
            dayElement.addEventListener('mouseleave', hideTooltip);
            // Hide tooltip on touch/click for mobile
            dayElement.addEventListener('touchstart', hideTooltip);
            dayElement.addEventListener('click', hideTooltip);
        }

        calendarGrid.appendChild(dayElement);
    }
}

function showEventDetails(date, events) {
    if (events.length === 0) return;

    // Hide tooltip when opening event details
    hideTooltip();

    const eventDetails = document.getElementById('event-details');
    const eventContent = document.getElementById('event-content');

    let content = `<h3>Eventos del ${formatDate(date)}</h3>`;

    // Check if this date is in a special period
    const currentPeriod = getPeriodForDate(date);
    if (currentPeriod) {
        content += `<div class="period-info"><strong>📅 ${currentPeriod.name}</strong></div><br>`;
    }

    events.forEach(event => {
        content += `
            <div class="event-item" style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <div class="event-type ${event.type}">${getEventTypeLabel(event.type)}</div>
                ${event.special_event ? '<div class="special-badge">✨ Evento Especial</div>' : ''}
                ${event.cancelled ? '<div class="cancelled-badge">❌ Evento Cancelado</div>' : ''}
                <h4 ${event.cancelled ? 'style="text-decoration: line-through; opacity: 0.7;"' : ''}>${event.title}</h4>
                <p><strong>Hora:</strong> ${event.time}</p>
                <p><strong>Ubicación:</strong> ${event.location}</p>
                <p>${event.description}</p>
            </div>
        `;
    });

    eventContent.innerHTML = content;
    eventDetails.style.display = 'block';
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return `${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
}

function getEventTypeLabel(type) {
    const labels = {
        workshop: 'Taller',
        competition: 'Competencia',
        lecture: 'Charla',
        hackathon: 'Hackathon',
        meeting: 'Reunión',
        presentation: 'Presentación',
    };
    return labels[type] || type;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('event-details').style.display = 'none';
        hideTooltip();
    });

    document.getElementById('event-details').addEventListener('click', (e) => {
        if (e.target.id === 'event-details') {
            document.getElementById('event-details').style.display = 'none';
            hideTooltip();
        }
    });

    // Hide tooltips on any document touch/click (for mobile)
    document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.calendar-day')) {
            hideTooltip();
        }
    });

    // Initialize calendar
    renderCalendar();
});
