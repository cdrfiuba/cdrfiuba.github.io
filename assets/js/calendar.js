// Calendario de actividades. Los datos vienen de _data/calendar.yaml,
// serializados como JSON en la página (#calendar-data).

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const EVENT_TYPE_LABELS = {
    workshop: 'Taller',
    competition: 'Competencia',
    lecture: 'Charla',
    hackathon: 'Hackathon',
    meeting: 'Reunión',
    presentation: 'Presentación',
    exam: 'Evaluación',
};

// Un evento puede tener una sola fecha ("date") o varias en cualquier
// propiedad terminada en "dates" ("dates", "tentative_dates", ...).
// Acá lo desarmamos en un evento por fecha.
function expandEvents(events) {
    return events.flatMap(event => {
        const dateKeys = Object.keys(event).filter(
            key => key.endsWith('dates') && Array.isArray(event[key])
        );
        if (dateKeys.length === 0) return [event];
        return dateKeys.flatMap(key =>
            event[key].map(date => ({ ...event, date, [key]: undefined }))
        );
    });
}

const data = JSON.parse(document.getElementById('calendar-data').textContent) ?? {};
const calendarEvents = expandEvents(data.events || []);
const calendarPeriods = data.periods || [];
const calendarHolidays = data.holidays || [];

const today = new Date();
let viewDate = new Date(today.getFullYear(), today.getMonth(), 1);

function toDateString(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function parseDate(dateString) {
    return new Date(dateString + 'T00:00:00');
}

function formatDate(dateString) {
    const date = parseDate(dateString);
    return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function isHoliday(dateString) {
    return calendarHolidays.includes(dateString);
}

function getPeriodForDate(dateString) {
    const date = parseDate(dateString);
    const period = calendarPeriods.find(p =>
        date >= parseDate(p.start_date) && date <= parseDate(p.end_date)
    );
    if (!period) return null;

    if (period.type === 'lectures') {
        const diffDays = Math.floor((date - parseDate(period.start_date)) / (1000 * 60 * 60 * 24));
        return { ...period, name: `Semana ${Math.floor(diffDays / 7) + 1} de cursada` };
    }
    return period;
}

// ---- Tooltip ----

const tooltip = document.createElement('div');
tooltip.className = 'calendar-tooltip';
document.body.appendChild(tooltip);

function showTooltip(element, content) {
    tooltip.textContent = content;
    tooltip.classList.add('show');

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 10;

    // Centrado sobre la celda, sin salirse de la ventana
    let left = rect.left + window.scrollX + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.top + window.scrollY - tooltipRect.height - margin;

    const minLeft = window.scrollX + margin;
    const maxLeft = window.scrollX + window.innerWidth - tooltipRect.width - margin;
    left = Math.min(Math.max(left, minLeft), maxLeft);
    if (top < window.scrollY + margin) {
        top = rect.bottom + window.scrollY + margin;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function hideTooltip() {
    tooltip.classList.remove('show');
}

function buildTooltipContent(dayEvents, period, holiday) {
    if (holiday) return 'Feriado';

    const parts = [];
    if (period) parts.push(period.name);
    if (dayEvents.some(event => event.special_event)) parts.push('Evento Especial');
    if (dayEvents.some(event => event.cancelled)) parts.push('Evento Cancelado');
    if (dayEvents.length > 0 && (period || parts.length === 0)) {
        parts.push(`${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''}`);
    }
    return parts.join(' • ');
}

// ---- Grilla ----

function buildDayCell(date, isOtherMonth) {
    const dateString = toDateString(date);
    const dayEvents = calendarEvents.filter(event => event.date === dateString);
    const holiday = isHoliday(dateString);
    const period = getPeriodForDate(dateString);
    const hasTentative = dayEvents.some(event => event.tentative);

    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    cell.classList.toggle('other-month', isOtherMonth);
    cell.classList.toggle('today', dateString === toDateString(today));
    cell.classList.toggle('holiday', holiday);
    if (!holiday && period) cell.classList.add(`period-${period.type}`);
    if (dayEvents.length > 0) {
        cell.classList.add('has-event');
        cell.classList.toggle('special-event', dayEvents.some(event => event.special_event));
        cell.classList.toggle('cancelled-event', dayEvents.some(event => event.cancelled));
    }

    let html = `<div class="day-number">${date.getDate()}</div>`;
    if (hasTentative) {
        html += '<div class="tentative-watermark">?</div>';
    }
    if (holiday) {
        html += '<div class="holiday-preview">Feriado</div>';
    } else if (dayEvents.length > 0) {
        html += `<div class="event-preview">${escapeHtml(dayEvents[0].title)}</div>`;
        if (dayEvents.length > 1) {
            html += `<div class="event-preview">+${dayEvents.length - 1} más</div>`;
        }
    }
    cell.innerHTML = html;

    if (dayEvents.length > 0 || holiday) {
        cell.tabIndex = 0;
        cell.setAttribute('role', 'button');
        cell.addEventListener('click', () => showEventDetails(dateString, dayEvents, holiday));
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showEventDetails(dateString, dayEvents, holiday);
            }
        });
    }

    const tooltipContent = buildTooltipContent(dayEvents, period, holiday);
    if (tooltipContent) {
        cell.addEventListener('mouseenter', () => showTooltip(cell, tooltipContent));
        cell.addEventListener('mouseleave', hideTooltip);
        cell.addEventListener('touchstart', hideTooltip, { passive: true });
    }

    return cell;
}

function renderCalendar() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    document.getElementById('current-month').textContent = `${MONTH_NAMES[month]} ${year}`;

    // Semanas completas: rellena con días del mes anterior y del siguiente
    const startOffset = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const grid = document.getElementById('calendar-grid');
    grid.replaceChildren();
    for (let i = 0; i < totalCells; i++) {
        const date = new Date(year, month, i - startOffset + 1);
        grid.appendChild(buildDayCell(date, date.getMonth() !== month));
    }
}

function changeMonth(delta) {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
    renderCalendar();
}

// ---- Detalle del evento ----

const eventDetails = document.getElementById('event-details');
const closeButton = eventDetails.querySelector('.close');
let focusBeforeDetails = null;

function closeEventDetails() {
    eventDetails.hidden = true;
    hideTooltip();
    focusBeforeDetails?.focus();
}

function showEventDetails(dateString, events, holiday) {
    hideTooltip();

    let content = `<h3>${holiday ? 'Feriado' : 'Eventos'} del ${formatDate(dateString)}</h3>`;

    if (holiday) {
        content += '<div class="holiday-info"><strong>Feriado Nacional</strong></div>';
    } else {
        const period = getPeriodForDate(dateString);
        if (period) {
            content += `<div class="period-info"><strong>📅 ${escapeHtml(period.name)}</strong></div>`;
        }
    }

    for (const event of events) {
        // Solo tipos conocidos como clase CSS
        const typeClass = event.type in EVENT_TYPE_LABELS ? event.type : '';
        content += `
            <div class="event-item${event.cancelled ? ' cancelled' : ''}">
                <div class="event-type ${typeClass}">${escapeHtml(EVENT_TYPE_LABELS[event.type] || event.type)}</div>
                ${event.special_event ? '<div class="special-badge">✨ Evento Especial</div>' : ''}
                ${event.cancelled ? '<div class="cancelled-badge">❌ Evento Cancelado</div>' : ''}
                <h4>${escapeHtml(event.title)}</h4>
                <p><strong>Hora:</strong> ${escapeHtml(event.time)}</p>
                <p><strong>Ubicación:</strong> ${escapeHtml(event.location)}</p>
                ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
            </div>
        `;
    }

    document.getElementById('event-content').innerHTML = content;
    focusBeforeDetails = document.activeElement;
    eventDetails.hidden = false;
    closeButton.focus();
}

// ---- Inicialización ----

document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

closeButton.addEventListener('click', closeEventDetails);
eventDetails.addEventListener('click', (e) => {
    if (e.target === eventDetails) closeEventDetails();
});
document.addEventListener('keydown', (e) => {
    if (eventDetails.hidden) return;
    if (e.key === 'Escape') closeEventDetails();
    // El botón de cerrar es lo único enfocable: mantener el foco en el diálogo
    if (e.key === 'Tab') {
        e.preventDefault();
        closeButton.focus();
    }
});
document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.calendar-day')) hideTooltip();
}, { passive: true });

renderCalendar();
