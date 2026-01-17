// Modal management for battery rental status
// This function handles displaying the rental status modal with battery data

let durationInterval = null;

// Parse duration string (HH:MM:SS) to total seconds
function parseDurationToSeconds(durationStr) {
    if (!durationStr || durationStr === '--:--:--') return 0;
    const parts = durationStr.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
}

// Format seconds to HH:MM:SS
function formatSecondsToDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function showBatteryRentalModal(batteryData) {
    // Check if battery data is valid and battery is currently rented
    if (!batteryData || !batteryData.data) {
        console.log('Invalid battery data provided');
        return;
    }

    const data = batteryData.data;

    // Only show if battery is currently rented (returnTime is null)
    if (!data.returnTime && data.duration && data.amountPaid !== undefined) {
        console.log('Showing rental status modal');

        // Get modal elements
        const statusDurationElement = document.getElementById('statusDuration');
        const statusAmountElement = document.getElementById('statusAmount');
        const rentalStatusModal = document.getElementById('rentalStatus');

        // Clear any existing interval
        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }

        // Parse initial duration and convert to seconds
        const initialDuration = data.duration || '00:00:00';
        let totalSeconds = parseDurationToSeconds(initialDuration);

        // Update duration immediately
        if (statusDurationElement) {
            statusDurationElement.textContent = initialDuration;
        }

        // Update amount paid
        if (statusAmountElement) {
            statusAmountElement.textContent = `$${data.amountPaid.toFixed(2)}`;
        }

        // Show the rental status modal
        if (rentalStatusModal) {
            rentalStatusModal.style.display = 'block';
        }

        // Start live duration counter - increment every second
        durationInterval = setInterval(() => {
            totalSeconds += 1;
            if (statusDurationElement) {
                statusDurationElement.textContent = formatSecondsToDuration(totalSeconds);
            }
        }, 1000);
    } else {
        console.log('Battery is not currently rented');
        // Clear interval if running
        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }
        // Hide modal if battery is returned
        const rentalStatusModal = document.getElementById('rentalStatus');
        if (rentalStatusModal) {
            rentalStatusModal.style.display = 'none';
        }
    }
}
