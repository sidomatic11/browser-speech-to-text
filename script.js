// script.js
// Purpose: Voice typing demo that inserts recognized text into a span-based tokenized line.
// Usage: Open index.html in a browser with Web Speech API support (Chrome/Edge).
// Dependencies: Web Speech API; HTML with #container, #status, #output, and a sentinel span #last-span.
// Notes:
// - Arrow keys move selection; Enter toggles speech; Delete/Backspace removes selected span (except sentinel).
// - We keep behavior consistent with previous version while organizing code into clearer sections.

// ---- Config / Constants ----
const CLASS_SELECTED = 'selected';
const CLASS_FLASH = 'boundary-flash';
const SPEECH_LANGUAGE = 'en-US';
const DEBUG_LOGGING_ENABLED = true;

// ---- State ----
const appState = {
  selectedSpan: null,
  isRecognizing: false,
  recognition: null,
};

// ---- DOM ----
const domRefs = {
  container: document.getElementById('container'),
  status: document.getElementById('status'),
  output: document.getElementById('output'),
  lastSpan: document.getElementById('last-span'),
};

// ---- Utilities ----
function debugLog(...args) {
  if (DEBUG_LOGGING_ENABLED) console.log(...args);
}

function updateStatus(text) {
  // Central place to update status UI so all flows stay consistent
  domRefs.status.textContent = `Status: ${text}`;
}

function setAriaSelected(span, isSelected) {
  if (!span) return;
  span.setAttribute('aria-selected', isSelected ? 'true' : 'false');
}

function selectSpan(span) {
  if (!span || span.tagName !== 'SPAN') return;

  if (appState.selectedSpan) {
    appState.selectedSpan.classList.remove(CLASS_SELECTED);
    setAriaSelected(appState.selectedSpan, false);
  }

  appState.selectedSpan = span;
  appState.selectedSpan.classList.add(CLASS_SELECTED);
  setAriaSelected(appState.selectedSpan, true);
}

function scrollSelectedIntoView() {
  if (!appState.selectedSpan) return;
  appState.selectedSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function flashBoundaryOnSelected() {
  if (!appState.selectedSpan) return;
  appState.selectedSpan.classList.add(CLASS_FLASH);
  setTimeout(() => {
    appState.selectedSpan.classList.remove(CLASS_FLASH);
  }, 200);
}

// ---- Speech Recognition ----
function initRecognition() {
  // Check for browser support early to avoid wiring unusable handlers.
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    alert("Sorry, your browser doesn't support the Web Speech API. Try Chrome or Edge.");
    return;
  }

  const recognition = new SpeechRecognitionCtor();
  appState.recognition = recognition;

  // Configuration: keep these aligned with comments to avoid confusion.
  // We only want final results in this demo; no interim streaming.
  recognition.interimResults = false; // Only final results
  // We want a single utterance per activation; not continuous.
  recognition.continuous = false; // Stop automatically after a pause
  recognition.lang = SPEECH_LANGUAGE;

  recognition.onstart = () => {
    appState.isRecognizing = true;
    updateStatus('Listening...');
    debugLog('Speech recognition started');
  };

  recognition.onend = () => {
    appState.isRecognizing = false;
    updateStatus('Idle');
    debugLog('Speech recognition ended');
  };

  recognition.onerror = (event) => {
    updateStatus(`Error - ${event.error}`);
    console.error('Speech recognition error:', event.error, event.message);
    // Ensure recognition stops if an error occurs to keep UI/state consistent
    if (appState.isRecognizing) {
      try { recognition.stop(); } catch (_) { }
    }
  };

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

    // Mirror previous behavior: append to the textarea and insert into spans
    domRefs.output.value += finalTranscript;
    insertTextAtSelection(finalTranscript);

    debugLog('Interim:', interimTranscript);
    debugLog('Final:', finalTranscript);
    debugLog('Full Event:', event);
  };
}

function startRecognition() {
  if (!appState.recognition) return;
  try {
    appState.recognition.start();
  } catch (e) {
    console.error('Error starting recognition:', e);
    updateStatus('Error starting - check permissions?');
    appState.isRecognizing = false;
  }
}

function stopRecognition() {
  if (!appState.recognition) return;
  try {
    appState.recognition.stop();
  } catch (_) { }
}

function toggleRecognition() {
  if (!appState.recognition) return;
  if (appState.isRecognizing) stopRecognition();
  else startRecognition();
}

// ---- Text Insertion ----
function splitByWords(text, anchorSpan) {
  // Split into words and whitespace to retain spacing; this keeps visual fidelity.
  const parts = text.match(/\S+|\s+/g) || [];

  // Special-case: if anchorSpan is a single space, ensure there are spaces on both sides.
  // This mirrors earlier behavior where we added before/after spaces to keep padding around inserts.
  if (anchorSpan.textContent === ' ') {
    const beforeSpan = document.createElement('span');
    beforeSpan.textContent = ' ';
    beforeSpan.setAttribute('role', 'option');
    anchorSpan.insertAdjacentElement('beforebegin', beforeSpan);

    const afterSpan = document.createElement('span');
    afterSpan.textContent = ' ';
    afterSpan.setAttribute('role', 'option');
    anchorSpan.insertAdjacentElement('afterend', afterSpan);
  }

  // Build spans incrementally to reduce layout thrash
  let currentSpan = anchorSpan;
  parts.forEach((part, index) => {
    if (index === 0) {
      currentSpan.textContent = part;
      currentSpan.setAttribute('role', 'option');
    } else {
      const span = document.createElement('span');
      span.textContent = part;
      span.setAttribute('role', 'option');
      currentSpan.insertAdjacentElement('afterend', span);
      currentSpan = span;
    }
  });

  // Return the very last created span (can be whitespace)
  return currentSpan;
}

function insertTextAtSelection(text) {
  if (!appState.selectedSpan) return;

  const lastSpan = domRefs.lastSpan;
  let spanToSelectAfterInsert = null;

  if (appState.selectedSpan === lastSpan) {
    const newSpan = document.createElement('span');
    newSpan.textContent = ' ';
    newSpan.setAttribute('role', 'option');
    lastSpan.insertAdjacentElement('beforebegin', newSpan);
    spanToSelectAfterInsert = splitByWords(text, newSpan);
  } else {
    spanToSelectAfterInsert = splitByWords(text, appState.selectedSpan);
  }

  // New behavior: select the next span after the inserted content
  if (spanToSelectAfterInsert && spanToSelectAfterInsert.tagName === 'SPAN') {
    const nextSpan = spanToSelectAfterInsert.nextElementSibling;
    if (nextSpan && nextSpan.tagName === 'SPAN') {
      selectSpan(nextSpan);
    } else {
      // Fallback to last inserted span if there is no next span
      selectSpan(spanToSelectAfterInsert);
    }
    scrollSelectedIntoView();
  }
}

// ---- Keyboard Handling ----
function handleArrowKey(direction) {
  if (!appState.selectedSpan) return;

  let nextSpan = null;
  let isAtBoundary = false;

  if (direction === 'ArrowLeft') {
    nextSpan = appState.selectedSpan.previousElementSibling;
    if (!nextSpan || nextSpan.tagName !== 'SPAN') isAtBoundary = true;
  } else {
    nextSpan = appState.selectedSpan.nextElementSibling;
    if (!nextSpan || nextSpan.tagName !== 'SPAN') isAtBoundary = true;
  }

  if (nextSpan && nextSpan.tagName === 'SPAN') {
    selectSpan(nextSpan);
    scrollSelectedIntoView();
  } else if (isAtBoundary) {
    // Provide subtle feedback that we can't move further
    flashBoundaryOnSelected();
    debugLog(`At ${direction === 'ArrowLeft' ? 'first' : 'last'} span boundary`);
  }
}

function handleDeleteBackspace() {
  if (!appState.selectedSpan) return;

  const lastSpan = domRefs.lastSpan;
  if (appState.selectedSpan === lastSpan) {
    // Can't delete sentinel; flash to indicate boundary
    flashBoundaryOnSelected();
    return;
  }

  const previousSpan = appState.selectedSpan.previousElementSibling;
  appState.selectedSpan.remove();

  if (previousSpan && previousSpan.tagName === 'SPAN') {
    selectSpan(previousSpan);
    scrollSelectedIntoView();
  } else {
    appState.selectedSpan = null;
  }
}

// ---- Events & Initialization ----
function initEvents() {
  // Event delegation for spans so newly created spans automatically work.
  domRefs.container.setAttribute('role', 'listbox');
  domRefs.container.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.tagName === 'SPAN') {
      selectSpan(target);
      toggleRecognition(); // preserve previous behavior where clicking a span toggles speech
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      handleArrowKey(event.key);
      return;
    }

    if (event.key === 'Enter') {
      if (!appState.selectedSpan) return;
      event.preventDefault();
      toggleRecognition();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!appState.selectedSpan) return;
      event.preventDefault();
      handleDeleteBackspace();
    }
  });

  // Initial selection defaults to the sentinel last span to match prior behavior
  selectSpan(domRefs.lastSpan);
}

(function init() {
  initRecognition();
  initEvents();
})();




