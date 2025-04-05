// Get all span elements
const spans = document.getElementsByTagName("span");

let selectedSpan = null;
let recognition = null;
let isRecognizing = false;

// Check for browser support
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!window.SpeechRecognition) {
  alert("Sorry, your browser doesn't support the Web Speech API. Try Chrome or Edge.");
} else {
  recognition = new SpeechRecognition();
  const output = document.getElementById('output');
  const statusDiv = document.getElementById('status');

  // --- Configuration ---
  recognition.continuous = false; // Keep listening even after pauses
  recognition.interimResults = false; // Show results as they come in
  recognition.lang = 'en-US'; // Set language (adjust as needed)

  // --- Event Handlers ---

  // Fired when a result is received
  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    // Update the textarea with the final transcript, appending new results
    // You could also display interim results separately if desired
    output.value += finalTranscript;

    updateText(finalTranscript);

    console.log('Interim:', interimTranscript); // Log interim results
    console.log('Final:', finalTranscript);     // Log final results
    console.log('Full Event:', event);          // Log the whole event for inspection
  };

  // Fired when recognition starts
  recognition.onstart = () => {
    isRecognizing = true;
    statusDiv.textContent = 'Status: Listening...';
    console.log('Speech recognition started');
  };

  // Fired when recognition ends (manually stopped, or timeout/error)
  recognition.onend = () => {
    isRecognizing = false;
    statusDiv.textContent = 'Status: Idle';
    console.log('Speech recognition ended');
  };

  // Fired on error
  recognition.onerror = (event) => {
    statusDiv.textContent = `Status: Error - ${event.error}`;
    console.error('Speech recognition error:', event.error, event.message);
    // Ensure recognition stops if an error occurs
    if (isRecognizing) {
      recognition.stop(); // This will trigger onend
    }
  };
}

// Function to start/stop speech recognition
function toggleSpeechRecognition() {
  if (recognition) {
    if (isRecognizing) {
      recognition.stop(); // This will trigger the 'onend' event
    } else {
      try {
        recognition.start();
        // The 'onstart' event will update the state and UI
      } catch (e) {
        // Handle cases where start() might fail immediately (rare)
        console.error("Error starting recognition:", e);
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Status: Error starting - check permissions?';
        isRecognizing = false; // Reset state
      }
    }
  }
}

function onSpanClick() {
  // Handle span selection
  if (selectedSpan) {
    selectedSpan.classList.remove("selected");
  }
  this.classList.add("selected");
  selectedSpan = this;

  // Toggle speech recognition
  toggleSpeechRecognition();
}

// Loop through each span and add click handler
for (let span of spans) {
  span.onclick = onSpanClick;
}

// Add click handler to last span
const lastSpan = document.getElementById('last-span');
selectedSpan = lastSpan;
lastSpan.classList.add("selected");

// Add keyboard navigation
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); // Prevent default scrolling behavior

    if (!selectedSpan) return;

    let nextSpan;
    let isAtBoundary = false;

    if (event.key === 'ArrowLeft') {
      // Move to previous span
      nextSpan = selectedSpan.previousElementSibling;
      // Check if we're at the first span
      if (!nextSpan || nextSpan.tagName !== 'SPAN') {
        isAtBoundary = true;
      }
    } else {
      // Move to next span
      nextSpan = selectedSpan.nextElementSibling;
      // Check if we're at the last span
      if (!nextSpan || nextSpan.tagName !== 'SPAN') {
        isAtBoundary = true;
      }
    }

    // Select the new span if it exists and is a span
    if (nextSpan && nextSpan.tagName === 'SPAN') {
      selectedSpan.classList.remove("selected");
      selectedSpan = nextSpan;
      selectedSpan.classList.add("selected");

      // Scroll the selected span into view if needed
      selectedSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (isAtBoundary) {
      // Optional: Provide visual feedback when at boundary
      // For example, briefly highlight the current span to indicate it's at the boundary
      selectedSpan.classList.add("boundary-flash");
      setTimeout(() => {
        selectedSpan.classList.remove("boundary-flash");
      }, 200);

      // Log to console for debugging
      console.log(`At ${event.key === 'ArrowLeft' ? 'first' : 'last'} span boundary`);
    }
  } else if (event.key === 'Enter' && selectedSpan) {
    // Start/stop speech recognition when Enter is pressed
    event.preventDefault(); // Prevent default form submission
    toggleSpeechRecognition();
  } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedSpan) {
    // Delete the selected span and select the previous one
    event.preventDefault(); // Prevent default backspace behavior

    // Don't delete the last span
    const lastSpan = document.getElementById('last-span');
    if (selectedSpan === lastSpan) {
      // Visual feedback that we can't delete the last span
      selectedSpan.classList.add("boundary-flash");
      setTimeout(() => {
        selectedSpan.classList.remove("boundary-flash");
      }, 200);
      return;
    }

    // Get the previous span before deleting the current one
    const previousSpan = selectedSpan.previousElementSibling;

    // Remove the selected span
    selectedSpan.remove();

    // Select the previous span if it exists and is a span
    if (previousSpan && previousSpan.tagName === 'SPAN') {
      selectedSpan = previousSpan;
      selectedSpan.classList.add("selected");

      // Scroll the selected span into view if needed
      selectedSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});

function splitByWords(text, element) {
  const parts = text.match(/\S+|\s+/g) || [];
  let currentSpan = element;

  // If currentSpan only contains a space, add two spans with spaces before and after
  if (currentSpan.textContent === " ") {
    const beforeSpan = document.createElement("span");
    beforeSpan.textContent = " ";
    beforeSpan.onclick = onSpanClick;
    currentSpan.insertAdjacentElement("beforebegin", beforeSpan);

    const afterSpan = document.createElement("span");
    afterSpan.textContent = " ";
    afterSpan.onclick = onSpanClick;
    currentSpan.insertAdjacentElement("afterend", afterSpan);
  }

  parts.forEach((part, index) => {
    if (index === 0) {
      currentSpan.textContent = part;
    } else {
      const span = document.createElement("span");
      span.textContent = part;
      span.onclick = onSpanClick;
      currentSpan.insertAdjacentElement("afterend", span);
      currentSpan = span;
    }
  });
}

function updateText(text) {
  if (selectedSpan) {
    const lastSpan = document.getElementById("last-span");
    if (selectedSpan === lastSpan) {
      const newSpan = document.createElement("span");
      newSpan.textContent = " ";
      newSpan.onclick = onSpanClick;
      lastSpan.insertAdjacentElement("beforebegin", newSpan);
      splitByWords(text, newSpan);
    } else {
      splitByWords(text, selectedSpan);
    }
    selectedSpan.classList.remove("selected");
    selectedSpan = null;
  }
}




