// Check for browser support
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!window.SpeechRecognition) {
  alert("Sorry, your browser doesn't support the Web Speech API. Try Chrome or Edge.");
} else {
  const recognition = new SpeechRecognition();
  const startButton = document.getElementById('startButton');
  const output = document.getElementById('output');
  const statusDiv = document.getElementById('status');
  let isRecognizing = false; // Flag to track recognition state

  // --- Configuration ---
  recognition.continuous = true; // Keep listening even after pauses
  recognition.interimResults = true; // Show results as they come in
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

    console.log('Interim:', interimTranscript); // Log interim results
    console.log('Final:', finalTranscript);     // Log final results
    console.log('Full Event:', event);          // Log the whole event for inspection
  };

  // Fired when recognition starts
  recognition.onstart = () => {
    isRecognizing = true;
    statusDiv.textContent = 'Status: Listening...';
    startButton.textContent = 'Stop Listening';
    console.log('Speech recognition started');
  };

  // Fired when recognition ends (manually stopped, or timeout/error)
  recognition.onend = () => {
    isRecognizing = false;
    statusDiv.textContent = 'Status: Idle';
    startButton.textContent = 'Start Listening';
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

  // --- Button Control ---
  startButton.onclick = () => {
    if (isRecognizing) {
      recognition.stop(); // This will trigger the 'onend' event
    } else {
      try {
        // Clear previous output before starting again (optional)
        // output.value = '';
        recognition.start();
        // The 'onstart' event will update the state and UI
      } catch (e) {
        // Handle cases where start() might fail immediately (rare)
        console.error("Error starting recognition:", e);
        statusDiv.textContent = 'Status: Error starting - check permissions?';
        isRecognizing = false; // Reset state
        startButton.textContent = 'Start Listening';
      }
    }
  };
}