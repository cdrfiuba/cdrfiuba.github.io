// Expand events with multiple dates into individual event objects
const expandEvents = (events) => {
    const expanded = [];
    events.forEach(event => {
        // Look for any property ending with "dates" that contains an array
        const dateKeys = Object.keys(event).filter(
            key => key.endsWith('dates') && Array.isArray(event[key])
        );

        if (dateKeys.length === 0) {
            // Single date event - add as is
            expanded.push(event);
            return;
        }

        dateKeys.forEach(key => {
            event[key].forEach(date => {
                expanded.push({
                    ...event,
                    date: date,
                    [key]: undefined // Remove the dates array from individual events
                });
            });
        });
    });
    return expanded;
};

const calendarEvents = expandEvents(window.calendarEvents || []);
const calendarPeriods = window.calendarPeriods || [];
const calendarHolidays = window.calendarHolidays || [];

const today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
}

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

function getHolidayForDate(dateString) {
    return calendarHolidays.includes(dateString);
}

function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'calendar-tooltip';
    tooltip.className = 'calendar-tooltip';
    document.body.appendChild(tooltip);
    return tooltip;
}

function showTooltip(element, content) {
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

function buildTooltipContent(dayEvents, period, isHoliday) {
    if (isHoliday) return 'Feriado';

    const eventInfo = [];
    if (dayEvents.some(event => event.special_event)) eventInfo.push('Evento Especial');
    if (dayEvents.some(event => event.cancelled)) eventInfo.push('Evento Cancelado');

    if (period) {
        if (dayEvents.length === 0) return period.name;
        eventInfo.push(`${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''}`);
        return [period.name, ...eventInfo].join(' • ');
    }

    if (dayEvents.length === 0) return '';
    if (eventInfo.length === 0) {
        eventInfo.push(`${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''}`);
    }
    return eventInfo.join(' • ');
}

function buildDayCell(date, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }

    const dateString = toDateString(date);
    const dayEvents = calendarEvents.filter(event => event.date === dateString);
    const isHoliday = getHolidayForDate(dateString);
    const period = getPeriodForDate(dateString);

    if (dateString === toDateString(today)) {
        dayElement.classList.add('today');
    }

    // Holidays take highest priority, then periods
    if (isHoliday) {
        dayElement.classList.add('holiday');
    } else if (period) {
        dayElement.classList.add(`period-${period.type}`);
    }

    if (dayEvents.length > 0) {
        dayElement.classList.add('has-event');
        if (dayEvents.some(event => event.special_event)) {
            dayElement.classList.add('special-event');
        }
        if (dayEvents.some(event => event.cancelled)) {
            dayElement.classList.add('cancelled-event');
        }
        if (dayEvents.some(event => event.tentative)) {
            dayElement.classList.add('tentative-event');
        }
    }

    let dayContent = `<div class="day-number">${date.getDate()}</div>`;

    // Add question mark watermark for tentative events
    if (dayEvents.some(event => event.tentative)) {
        dayContent += `<div class="tentative-watermark">?</div>`;
    }

    if (isHoliday) {
        dayContent += `<div class="holiday-preview">Feriado</div>`;
    } else if (dayEvents.length > 0) {
        dayContent += `<div class="event-preview">${escapeHtml(dayEvents[0].title)}</div>`;
        if (dayEvents.length > 1) {
            dayContent += `<div class="event-preview">+${dayEvents.length - 1} más</div>`;
        }
    }

    dayElement.innerHTML = dayContent;

    if (dayEvents.length > 0 || isHoliday) {
        dayElement.setAttribute('tabindex', '0');
        dayElement.setAttribute('role', 'button');
        dayElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showEventDetails(dateString, dayEvents, isHoliday);
            }
        });
    }
    dayElement.addEventListener('click', () => showEventDetails(dateString, dayEvents, isHoliday));

    const tooltipContent = buildTooltipContent(dayEvents, period, isHoliday);
    if (tooltipContent) {
        dayElement.addEventListener('mouseenter', () => showTooltip(dayElement, tooltipContent));
        dayElement.addEventListener('mouseleave', hideTooltip);
        // Hide tooltip on touch/click for mobile
        dayElement.addEventListener('touchstart', hideTooltip);
        dayElement.addEventListener('click', hideTooltip);
    }

    return dayElement;
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

    // Leading days from the previous month, current month, and trailing
    // days from the next month, in full weeks
    const startOffset = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        const date = new Date(currentYear, currentMonth, i - startOffset + 1);
        calendarGrid.appendChild(buildDayCell(date, date.getMonth() !== currentMonth));
    }
}

function showEventDetails(date, events, holiday = null) {
    if (!holiday) {
        holiday = getHolidayForDate(date);
    }
    if (events.length === 0 && !holiday) return;

    // Hide tooltip when opening event details
    hideTooltip();

    const eventDetails = document.getElementById('event-details');
    const eventContent = document.getElementById('event-content');

    let content = `<h3>${holiday ? 'Feriado' : 'Eventos'} del ${formatDate(date)}</h3>`;

    // Show holiday information first if it exists
    if (holiday) {
        content += `<div class="holiday-info"><strong>Feriado Nacional</strong></div><br>`;
    }

    // Check if this date is in a special period
    const currentPeriod = getPeriodForDate(date);
    if (currentPeriod && !holiday) {
        content += `<div class="period-info"><strong>📅 ${escapeHtml(currentPeriod.name)}</strong></div><br>`;
    }

    events.forEach(event => {
        content += `
            <div class="event-item" style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <div class="event-type ${escapeHtml(event.type)}">${escapeHtml(getEventTypeLabel(event.type))}</div>
                ${event.special_event ? '<div class="special-badge">✨ Evento Especial</div>' : ''}
                ${event.cancelled ? '<div class="cancelled-badge">❌ Evento Cancelado</div>' : ''}
                <h4 ${event.cancelled ? 'style="text-decoration: line-through; opacity: 0.7;"' : ''}>${escapeHtml(event.title)}</h4>
                <p><strong>Hora:</strong> ${escapeHtml(event.time)}</p>
                <p><strong>Ubicación:</strong> ${escapeHtml(event.location)}</p>
                ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const eventDetails = document.getElementById('event-details');
            if (eventDetails.style.display === 'block') {
                eventDetails.style.display = 'none';
                hideTooltip();
            }
        }
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
